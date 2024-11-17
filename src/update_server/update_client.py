#!/usr/bin/env python
# -*- coding: utf-8 -*-
import asyncio
import os
import socket
import struct
from datetime import datetime
from os.path import exists

import aiofiles

# from tqdm import tqdm # 난독화시 오류 발생으로 제외

os.sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from update_util import (
    FS_UPDATE_PORT,
    MAX_CHUNK_SIZE,
    MR_UPDATE_PORT,
    PROTOCOL_ACK,
    PROTOCOL_AUTH,
    PROTOCOL_BASH,
    PROTOCOL_DATA,
    PROTOCOL_DCHK,
    PROTOCOL_FAIL,
    PROTOCOL_INFO,
    PROTOCOL_LENGTH,
    PROTOCOL_LOGS,
    PROTOCOL_MDAT,
    PROTOCOL_MINF,
    PROTOCOL_MLOG,
    PROTOCOL_STEP,
    PROTOCOL_VERS,
    encode_auth_token,
    get_ip_address,
)


class UpdateClient:
    def __init__(
        self,
    ):
        self.filename = ""
        self.filepath = ""
        self.filesize = 0

        self.pattern = r"^mr.*\.gz$"
        self.filetype = 0

        self.reader = None
        self.writer = None

        self.connected = False
        self.host = get_ip_address()
        self.port = MR_UPDATE_PORT  # FS_UPDATE_PORT

        self.fnLogDebug = None
        self.log_prefix = ""
        self.log_details = ""
        self.protocol_version = ""
        self.loop = asyncio.get_event_loop()

    def log_debug(self, msg):
        log_string = self.log_prefix + msg

        if self.fnLogDebug is not None:
            self.fnLogDebug(log_string)
        else:
            print(log_string)

    async def _send_packet(self, msg_bytes):
        if not isinstance(msg_bytes, bytes):
            msg_bytes = msg_bytes.encode("utf-8")

        msglen_bytes = struct.pack(">I", len(msg_bytes))
        self.writer.write(msglen_bytes + msg_bytes)
        await self.writer.drain()

    async def _read_bytes(self, n):
        # n 바이트 만큼의 데이터를 수신
        data = bytearray()
        while len(data) < n:
            packet = await self.reader.read(n - len(data))
            if not packet:
                return None
            data.extend(packet)
        return data

    async def _read_packet(self):
        raw_msglen = await self._read_bytes(4)
        if not raw_msglen:
            return None
        msglen = struct.unpack(">I", raw_msglen)[0]

        return await self._read_bytes(msglen)

    async def _async_connect(self, host="", port=MR_UPDATE_PORT):
        self.log_prefix = "[MR] " if port == MR_UPDATE_PORT else "[FS] "
        self.log_debug("Connecting to server...")

        if host != "":
            self.host = host
        self.port = port

        result = False
        try:
            # connect to server
            self.reader, self.writer = await asyncio.wait_for(
                asyncio.open_connection(self.host, self.port), timeout=5
            )
            self.log_debug("Connected successfully.")
            self.connected = True
            result = True

            # request version information
            await self._send_packet(PROTOCOL_VERS)
            response = await self._read_packet()
            if response[:PROTOCOL_LENGTH] == PROTOCOL_FAIL:
                raise Exception(response[PROTOCOL_LENGTH:].decode())
            elif response[:PROTOCOL_LENGTH] == PROTOCOL_VERS:
                self.protocol_version = response[PROTOCOL_LENGTH:].decode()

        except (asyncio.TimeoutError, socket.gaierror, ConnectionRefusedError):
            self.log_debug("Connection timed out.")

        return result

    async def _async_authenticate(self):
        # generate authentication token
        local_address, local_port = self.writer.get_extra_info("sockname")
        auth_info = encode_auth_token(local_address, local_port).encode()

        # send authentication token
        await self._send_packet(PROTOCOL_AUTH + auth_info)

        # wait for ACK
        response = await self._read_packet()
        if response[:PROTOCOL_LENGTH] != PROTOCOL_ACK:
            raise Exception(response[PROTOCOL_LENGTH:].decode())

        self.log_debug("Authentication successful.")

    async def _async_send_info(self):
        # check if file is selected
        if len(self.filename) == 0:
            raise Exception("No file selected.")

        # generate file information
        file_info = f"{os.path.basename(self.filename)},{self.filesize}".encode()

        # send file information
        await self._send_packet(PROTOCOL_INFO + file_info)

        # wait for ACK
        response = await self._read_packet()
        if response[:PROTOCOL_LENGTH] != PROTOCOL_ACK:
            raise Exception(response[PROTOCOL_LENGTH:].decode())

        self.log_debug("File information transmitted.")

    async def _async_send_file(self, show_progress=False):

        # if show_progress:
        #     bar = tqdm(
        #         range(self.filesize),
        #         f"Sending {self.filename}",
        #         unit="B",
        #         unit_scale=True,
        #         unit_divisor=1024,
        #     )

        # read and send file data
        async with aiofiles.open(self.filepath, "rb") as f:
            while True:
                # read file data
                data = await f.read(MAX_CHUNK_SIZE)  # 64 KB buffer
                if not data:
                    break

                # send file data
                await self._send_packet(PROTOCOL_DATA + data)
                # show progress
                # if show_progress:
                #     bar.update(len(data))

        # wait for ACK
        response = await self._read_packet()
        if response[:PROTOCOL_LENGTH] != PROTOCOL_ACK:
            raise Exception("File data transmission failed.")

        self.log_debug("File data transmitted.")

        await self._send_packet(PROTOCOL_DCHK)

        response = await self._read_packet()
        # self.log_debug(response)
        if response[:PROTOCOL_LENGTH] != PROTOCOL_ACK:
            raise Exception(response[PROTOCOL_LENGTH:].decode())

        self.log_debug("File data check successful.")

    async def _async_recv_file(self, save_dir, logtype="eventlog"):
        # send log request
        await self._send_packet(PROTOCOL_MLOG + logtype.encode())

        filename, filesize, datasize = "", 0, 0
        file_stream = None
        # wait for ACK
        while True:
            response = await self._read_packet()
            command, data = response[:PROTOCOL_LENGTH], response[PROTOCOL_LENGTH:]

            if command == PROTOCOL_ACK:
                break
            elif command == PROTOCOL_FAIL:
                raise Exception(data.decode())
            elif command == PROTOCOL_MINF:
                datasize = 0
                filename, filesize = data.decode().split(",")
                filesize = int(filesize)

                file_stream = await aiofiles.open(
                    os.path.join(save_dir, filename), "wb"
                )
            elif command == PROTOCOL_MDAT:
                datasize += len(data)
                await file_stream.write(data)
                if datasize == filesize:
                    await file_stream.close()
                    os.system("sync & sync")

            elif command == PROTOCOL_STEP:
                if datasize == filesize:
                    self.log_debug(data.decode())
                else:
                    self.log_debug("Log data error.")
            else:
                self.log_debug(f"Unknown command: {command.decode()}")
                return

        self.log_debug(f"{logtype} data received.")

    async def _async_send_bash(self):
        # send bash script
        await self._send_packet(PROTOCOL_BASH)
        self.log_debug("The update will take a few minutes. Please wait...")

        # wait for ACK
        while True:
            response = await self._read_packet()
            if response[:PROTOCOL_LENGTH] == PROTOCOL_FAIL:
                raise Exception(response[PROTOCOL_LENGTH:].decode())
            elif response[:PROTOCOL_LENGTH] == PROTOCOL_ACK:
                self.log_debug(response[PROTOCOL_LENGTH:].decode())
                break
            elif response[:PROTOCOL_LENGTH] == PROTOCOL_STEP:
                self.log_debug(response[PROTOCOL_LENGTH:].decode())

        self.log_debug("bash script execution successful.")

    async def _async_send_logs(self, save=False):
        # send logs request
        await self._send_packet(PROTOCOL_LOGS)

        # wait for ACK
        response = await self._read_packet()
        if response[:PROTOCOL_LENGTH] != PROTOCOL_ACK:
            raise Exception("Logs request failed.")

        self.log_details = response[PROTOCOL_LENGTH:].decode()
        if save == True:
            with open(
                os.path.join(
                    os.path.dirname(self.filepath),
                    f'logs_{self.filename}_{datetime.now().strftime("%y%m%d_%H%M%S")}.txt',
                ),
                "w",
            ) as f:
                f.write(self.log_details)

        self.log_debug("Logs request successful.")

    async def _async_close(self):
        if self.connected:
            self.log_debug("Closing connection...")
            self.writer.close()
            await self.writer.wait_closed()

    async def _async_update(self, save_logs=False, show_progress=False):
        if not self.connected:
            return False

        result = True
        try:
            await self._async_authenticate()
            await self._async_send_info()
            await self._async_send_file(show_progress)
            await self._async_send_bash()
        except (
            ConnectionRefusedError,
            ConnectionResetError,
            TimeoutError,
            ConnectionError,
            OSError,
        ) as e:
            result = False
            self.log_debug(str(e))
        except Exception as e:
            result = False
            self.log_debug(str(e))
        finally:
            await self._async_send_logs(save_logs)
            # await self._async_close()

        return result

    async def _async_request_log(self, saving_dir, log_type="eventlog"):
        if not self.connected:
            return False

        result = True
        try:
            await self._async_authenticate()
            await self._async_recv_file(saving_dir, log_type)
        except (
            ConnectionRefusedError,
            ConnectionResetError,
            TimeoutError,
            ConnectionError,
            OSError,
        ) as e:
            result = False
            self.log_debug(str(e))
        except Exception as e:
            result = False
            self.log_debug(str(e))

        return result

    def connect(self, host=get_ip_address(), port=MR_UPDATE_PORT):
        result = True
        try:
            result = self.loop.run_until_complete(self._async_connect(host, port))
        except Exception as e:
            result = False
            self.log_debug(str(e))

        return result

    def update(self, save_logs=False, show_progress=False):
        if not self.connected:
            return False

        return self.loop.run_until_complete(
            self._async_update(save_logs, show_progress)
        )

    def request_log(self, saving_dir, log_type="eventlog"):
        if not self.connected:
            return False

        return self.loop.run_until_complete(
            self._async_request_log(saving_dir, log_type)
        )

    def close(self):
        if self.connected:
            self.loop.run_until_complete(self._async_close())

    def select_file(self, filepath):
        if exists(filepath):
            self.filepath = filepath
            self.filename = os.path.basename(filepath)
            self.filesize = os.path.getsize(filepath)
            return True
        else:
            self.log_debug("File not found.")
            return False


class MorowClient:
    def __init__(
        self, host=get_ip_address(), ports: list = [MR_UPDATE_PORT, FS_UPDATE_PORT]
    ):
        self.host = host
        self.ports = ports
        self.update_client = [UpdateClient() for _ in ports]
        self.loop = asyncio.get_event_loop()

    async def async_connect(self):
        tasks = []
        for i, port in enumerate(self.ports):
            tasks.append(self.update_client[i]._async_connect(self.host, port))

        results = await asyncio.gather(*tasks)
        if all(results):
            print("Both connections were successful.")
        else:
            print("One or both connections failed.")
        return all(results)

    async def async_update(self, update_files, save_logs=False, show_progress=False):
        tasks = []
        for i, (_, update_file) in enumerate(zip(self.ports, update_files)):
            if not self.update_client[i].select_file(update_file):
                print(f"File not found: {update_file}")
                continue
            tasks.append(self.update_client[i]._async_update(save_logs, show_progress))

        results = await asyncio.gather(*tasks)
        if all(results):
            print("Both updates were successful.")
        else:
            print("One or both updates failed.")
        return all(results)

    async def async_close(self):
        tasks = []
        for client in self.update_client:
            tasks.append(client._async_close())

        await asyncio.gather(*tasks)

    def connect(self):
        return self.loop.run_until_complete(self.async_connect())

    def update(self, files, save_logs=False, show_progress=False):
        return self.loop.run_until_complete(
            self.async_update(files, save_logs, show_progress)
        )

    def request_log(self, saving_dir, log_type="eventlog"):
        self.update_client[0].request_log(saving_dir, log_type)

    def close(self):
        # asyncio.run(self.async_close())
        self.loop.run_until_complete(self.async_close())

    def set_fnLogDebug(self, fnLogDebug):
        for client in self.update_client:
            client.fnLogDebug = fnLogDebug

    def get_log_details(self):
        return [client.log_details for client in self.update_client]


if __name__ == "__main__":

    # from threading import Thread

    files = [
        "/home/jimmy/catkin_ws/update/mr1.1.0_241014_1911_42.enc.tar.gz",
        "/home/jimmy/catkin_ws/update/fs1.1.0_241014_1912_18.enc.tar.gz",
    ]
    host = get_ip_address()
    ports = [MR_UPDATE_PORT, FS_UPDATE_PORT]

    update = MorowClient(host, ports)
    update.set_fnLogDebug(print)

    update.connect()
    # thread = Thread(target=update.connect)
    # thread.start()
    # thread.join()

    update.update(files, save_logs=True, show_progress=True)
    # update.request_log("/home/jimmy/catkin_ws/update", "eventlog")
    update.close()
