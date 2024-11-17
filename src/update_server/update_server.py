#!/usr/bin/env python
# -*- coding: utf-8 -*-
import argparse
import asyncio
import base64
import os
import re
import shutil
import socket
import socketserver
import struct
import subprocess
import sys
import threading
import time

cwd = os.path.dirname(os.path.abspath(__file__))
os.sys.path.append(cwd)

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
    decode_auth_token,
    get_ip_address,
)

MR_INSTALL_SCRIPT = "mr_update.sh"
FS_INSTALL_SCRIPT = "fs_update.sh"
DECRYPT_SCRIPT = "script.sh"

VERSION_IDENTIFIER = "software_version"
MR_VERNAME_PREFIX = "MR"
FS_VERNAME_PREFIX = "FS"

version = "1.0.0"
# 1.0.0 - 2024. 10. 23 initial release


class RequestHandler(socketserver.BaseRequestHandler):

    def setup(self):
        self.request.settimeout(None)
        self.filename = ""  # file name
        self.filesize = 0  # file size

        self.file_stream = None  # file object
        self.datasize = 0  # recved data size

        self.is_auth_verified = False
        self.is_info_verified = False  # file info verified
        self.is_data_verified = False  # file data verified

        self.install_directory = os.path.expanduser("~/catkin_ws/")
        self.save_directory = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            f"rundwn_{self.server.server_address[1]}",
        )
        self.decrypted_name = ""  # decrypted directory
        self.log_string = ""
        self.version_prefix = (
            MR_VERNAME_PREFIX
            if self.server.server_address[1] == MR_UPDATE_PORT
            else FS_VERNAME_PREFIX
        )
        self.update_script = (
            MR_INSTALL_SCRIPT
            if self.server.server_address[1] == MR_UPDATE_PORT
            else FS_INSTALL_SCRIPT
        )
        self.decrypt_script = DECRYPT_SCRIPT

    def _cleanup(self):
        self.datasize = 0
        if self.file_stream:
            self.file_stream.close()
            self.file_stream = None

        shutil.rmtree(self.save_directory, ignore_errors=True)

    def excute_bash(self, command, async_mode=True, show_progress=False):
        if async_mode:
            asyncio.run(self.async_excute_bash(command, show_progress))
        else:
            self.sync_excute_bash(command)

    def sync_excute_bash(self, command):
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
        )
        # add log string
        self.log_string += "\n\n" + result.stdout
        if result.stderr:
            self.log_string += "\n\n====== stderr ======\n\n"
            self.log_string += result.stderr

        # print("log string: " + self.log_string)

    async def async_excute_bash(self, command, show_progress=False):
        # Create a subprocess
        process = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            limit=1024 * 1024 * 3,
        )

        if show_progress:
            progress = 1
            while True:
                # Send a processing packet every 5 seconds
                self._send_packet(
                    PROTOCOL_STEP + f"Processing... {progress}/100".encode("utf-8")
                )
                if progress <= 99:
                    progress += 1
                await asyncio.sleep(5)

                # Check if the process has terminated
                if process.returncode is not None:
                    break

        # Get the output
        stdout, stderr = await process.communicate()
        # stdout = process.stdout
        # stderr = process.stderr

        # add log string
        self.log_string += "\n\n" + stdout.decode()
        if stderr:
            self.log_string += "\n\n====== stderr ======\n\n"
            self.log_string += stderr.decode()

        # print("log string: " + self.log_string)
        if show_progress:
            for i in range(progress, 101):
                self._send_packet(
                    PROTOCOL_STEP + f"Processing... {i}/100".encode("utf-8")
                )

    def process_message(self, msg_bytes):
        # recv message
        command, data = msg_bytes[:PROTOCOL_LENGTH], msg_bytes[PROTOCOL_LENGTH:]

        if command == PROTOCOL_VERS:
            self._send_packet(PROTOCOL_VERS + version.encode())

        elif command == PROTOCOL_AUTH:
            # authentication
            _, port = decode_auth_token(data.decode())
            if port == self.client_address[1]:
                self.is_auth_verified = True
                self._send_packet(PROTOCOL_ACK)

                print("Authentication successful.")
            else:
                self._send_packet(PROTOCOL_FAIL + b"Authentication failed.")
                print("Authentication failed.")
        else:
            if not self.is_auth_verified:
                self._send_packet(PROTOCOL_FAIL + b"Authentication required.")
                return

            if command == PROTOCOL_INFO:
                # get file information
                self.filename, self.filesize = data.decode().split(",")
                self.filesize = int(self.filesize)
                # check if file is valid
                match = re.match(r"^(.*)\.enc\.tar\.gz$", self.filename)
                if match:
                    self.decrypted_name = match.group(1)
                    self.is_info_verified = True
                else:
                    self._send_packet(PROTOCOL_FAIL + b"Info verification failed.")
                    self.is_info_verified = False
                    return

                # create save directory
                shutil.rmtree(self.save_directory, ignore_errors=True)
                os.makedirs(self.save_directory, exist_ok=True)
                # create file object
                self.file_stream = open(
                    os.path.join(self.save_directory, self.filename), "wb"
                )
                self._send_packet(PROTOCOL_ACK)

                print("File information received.")
            elif command == PROTOCOL_DATA:
                if not self.is_info_verified:
                    self._send_packet(PROTOCOL_FAIL + b"Info verification failed.")
                    return

                # write data to file
                self.datasize += len(data)
                self.file_stream.write(data)

                if self.datasize == self.filesize:
                    self.file_stream.close()
                    os.system("sync & sync")

                    print("File transmission completed.")
                    self._send_packet(PROTOCOL_ACK)

            elif command == PROTOCOL_DCHK:
                if self.datasize != self.filesize:
                    self._send_packet(PROTOCOL_FAIL + b"File size mismatch.")
                    return

                # move bash script to save directory
                shutil.copy(
                    os.path.join(cwd, self.decrypt_script),
                    self.save_directory,
                )

                # decrypt file
                self.excute_bash(
                    f"cd {self.save_directory} && ./{self.decrypt_script} decrypt {self.filename} {base64.b64decode('cm9ib2VeXjIxMDkwMQ==').decode('ascii')}"
                )
                # check if directory exists
                decrypt_output_directory = os.path.join(
                    self.save_directory, self.decrypted_name
                )  # ~/catkin_ws/rundwn/mr1.0.0_241017_1823_80
                if not os.path.exists(decrypt_output_directory):
                    self._send_packet(PROTOCOL_FAIL + b"File decryption failed.")
                    self.is_data_verified = False
                # check if file is valid
                elif VERSION_IDENTIFIER not in self.log_string:
                    self._send_packet(PROTOCOL_FAIL + b"File is not valid.")
                    self.is_data_verified = False
                else:
                    pos = self.log_string.find(VERSION_IDENTIFIER) + len(
                        VERSION_IDENTIFIER
                    )
                    # print(self.log_string[pos : pos + 10])
                    if self.log_string.find(self.version_prefix, pos, pos + 10) == -1:
                        self._send_packet(PROTOCOL_FAIL + b"File is not compatible.")
                        self.is_data_verified = False
                    else:
                        self.is_data_verified = True

                if not self.is_data_verified:
                    # clean up save directory
                    shutil.rmtree(self.save_directory, ignore_errors=True)
                    return

                # move decrypted directory to install directory
                target_directory = os.path.join(
                    self.install_directory, self.decrypted_name
                )  # ~/catkin_ws/mr1.0.0_241017_1823_80
                shutil.rmtree(target_directory, ignore_errors=True)
                shutil.move(decrypt_output_directory, target_directory)
                # clean up save directory
                shutil.rmtree(self.save_directory, ignore_errors=True)

                # copy bash script to install directory
                try:
                    # run script in update new version
                    decrypt_bash_directory = cwd.replace(
                        "catkin_ws/src", f"catkin_ws/{self.decrypted_name}"
                    )
                    # ~/catkin_ws/mr1.0.0_241017_1823_80/integration/morow/morow/util/update
                    # ~/catkin_ws/mr1.0.0_241017_1823_80/ui/robot-api/src/update_server/
                    shutil.copy(
                        os.path.join(decrypt_bash_directory, self.update_script),
                        self.install_directory,
                    )
                except Exception as e:
                    self.log_string += str(e)
                    shutil.copy(
                        os.path.join(cwd, self.update_script),
                        self.install_directory,
                    )
                os.system("sync & sync")

                print("File verification completed.")
                self._send_packet(PROTOCOL_ACK)

            elif command == PROTOCOL_BASH:
                if not self.is_data_verified:
                    self._send_packet(PROTOCOL_FAIL + b"File is not valid.")
                    return

                # configure bash script
                bash_commands = [
                    (
                        f"cd {self.install_directory} && ./{self.update_script} update {self.decrypted_name} build",
                        "Updating workspace...",
                    ),
                ]

                # run bash script
                for command in bash_commands:
                    self._send_packet(PROTOCOL_STEP + command[1].encode("utf-8"))
                    # execute bash script
                    self.excute_bash(command[0], show_progress=True)

                build_error_count = 0
                match = re.search(
                    r"\[build\]\s+Failed:\s+([0-9]|[1-9][0-9]|1[0-9]{2}|200)\s+packages failed\.",
                    self.log_string,
                )
                if match:
                    build_error_count = int(match.group(1))

                if build_error_count > 0:
                    self._send_packet(PROTOCOL_FAIL + b"Build failed.")
                else:
                    self._send_packet(PROTOCOL_ACK + b"Build completed.")

                # sync
                os.system("sync & sync")
                print("bash script completed.")

            elif command == PROTOCOL_LOGS:
                # send logs
                self._send_packet(PROTOCOL_ACK + self.log_string.encode("utf-8"))

                print("Logs sent successfully.")

            elif command == PROTOCOL_MLOG:
                log_type = data.decode()
                # check if directory exists
                log_directory = os.path.expanduser(f"~/shared/Logs/morow/{log_type}")
                if not os.path.exists(log_directory):
                    self._send_packet(PROTOCOL_FAIL + b"Directory not found.")
                    return
                # scan directory and send files
                with os.scandir(log_directory) as entries:
                    for entry in entries:
                        if entry.is_file() and entry.name.endswith(".log"):
                            # send file info
                            stat_info = entry.stat()
                            file_info = f"{entry.name},{stat_info.st_size}".encode(
                                "utf-8"
                            )
                            self._send_packet(PROTOCOL_MINF + file_info)

                            # send file
                            with open(entry.path, "rb") as f:
                                while True:
                                    data = f.read(MAX_CHUNK_SIZE)
                                    if not data:
                                        break
                                    self._send_packet(PROTOCOL_MDAT + data)
                            # send progress(file name)
                            self._send_packet(
                                PROTOCOL_STEP + entry.name.encode("utf-8")
                            )

                self._send_packet(PROTOCOL_ACK)
            else:
                # unknown command
                self._send_packet(PROTOCOL_FAIL)

    def _read_packet(self):
        def _read_bytes(n):
            # n 바이트 만큼의 데이터를 수신
            data = bytearray()
            while len(data) < n:
                packet = self.request.recv(n - len(data))
                if not packet:
                    return None
                data.extend(packet)
            return data

        raw_msglen = _read_bytes(4)
        if not raw_msglen:
            return None
        msglen = struct.unpack(">I", raw_msglen)[0]

        return _read_bytes(msglen)

    def _send_packet(self, msg_bytes):
        if not isinstance(msg_bytes, bytes):
            msg_bytes = msg_bytes.encode("utf-8")

        msglen_bytes = struct.pack(">I", len(msg_bytes))
        self.request.sendall(msglen_bytes + msg_bytes)

    def handle(self):
        while True:
            try:
                msg_bytes = self._read_packet()
                if not msg_bytes:
                    break
                # print("msg len: ", len(msg_bytes))
                self.process_message(msg_bytes)
            except socket.timeout as e:
                print("timeout")
            except ConnectionResetError as e:
                print("ConnectionResetError")
            except Exception as e:
                print(e)

    def finish(self):
        self.request.close()
        self._cleanup()


class UpdateServer(socketserver.ThreadingMixIn, socketserver.TCPServer):

    allow_reuse_address = True
    daemon_threads = True

    def __init__(self, ipaddress="localhost", port=MR_UPDATE_PORT):
        socketserver.TCPServer.__init__(self, (ipaddress, port), RequestHandler)

    def start(self, run_foreground=False):
        print(
            "Update Server started. ({0}:{1})".format(
                self.server_address[0], self.server_address[1]
            )
        )
        if run_foreground:
            self.serve_forever()
        else:
            server_thread = threading.Thread(target=self.serve_forever)
            server_thread.daemon = True
            server_thread.start()

    def stop(self):
        self.shutdown()
        self.server_close()
        print("Update Server stopped.")


def main(argv):
    parser = argparse.ArgumentParser(description="Update Server Client")
    parser.add_argument("--ipaddress", type=str, default=get_ip_address())
    parser.add_argument("--port", type=int, default=FS_UPDATE_PORT)
    opts = parser.parse_args(argv)

    server = UpdateServer(ipaddress=opts.ipaddress, port=opts.port)
    server.start(run_foreground=True)


if __name__ == "__main__":
    main(sys.argv[1:])
