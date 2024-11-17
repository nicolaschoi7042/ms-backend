#!/usr/bin/env python
# -*- coding: utf-8 -*-
import base64

PROTOCOL_LENGTH = 4

PROTOCOL_VERS = b"VERS"
PROTOCOL_ACK = b"ACK "
PROTOCOL_FAIL = b"FAIL"
PROTOCOL_AUTH = b"AUTH"
# file transfer protocol
PROTOCOL_INFO = b"INFO"
PROTOCOL_DATA = b"DATA"
PROTOCOL_BASH = b"BASH"
PROTOCOL_COMP = b"COMP"
PROTOCOL_LOGS = b"LOGS"
PROTOCOL_STEP = b"STEP"
PROTOCOL_DCHK = b"DCHK"
# morrow log protocol
PROTOCOL_MLOG = b"MLOG"
PROTOCOL_MDAT = b"MDAT"
PROTOCOL_MINF = b"MINF"


MAX_BUFFER_SIZE = 1024
MAX_CHUNK_SIZE = (1024 * 64) - 8  # packet header(4)+ protocol header(4)

MR_UPDATE_PORT = 12341
FS_UPDATE_PORT = 12342


lookup_table = {
    "0": "r",
    "1": "e",
    "2": "n",
    "3": "d",
    "4": "s",
    "5": "h",
    "6": "a",
    "7": "i",
    "8": "o",
    "9": "u",
    ".": "P",
    ":": "S",
    "-": "T",
    "/": "L",
    " ": "D",
}


def transform(text):
    return "".join(lookup_table.get(char, char) for char in text)


def reverse_transform(text):
    reverse_lookup_table = {v: k for k, v in lookup_table.items()}
    return "".join(reverse_lookup_table.get(char, char) for char in text)


def encode_auth_token(ip, port):
    # 아이피와 포트를 문자열로 결합
    data = f"{transform(ip)}:{transform(str(port))}"

    # Base64로 인코딩
    encoded_data = base64.b64encode(data.encode("utf-8")).decode("utf-8")
    return encoded_data


def decode_auth_token(encoded_data):
    # Base64로 디코딩
    decoded_data = base64.b64decode(encoded_data).decode("utf-8")
    # 아이피와 포트를 분리
    ip, port = decoded_data.split(":")
    # 아이피와 포트를 반환
    ip = reverse_transform(ip)
    port = reverse_transform(port)
    return ip, int(port)


def get_ip_address():
    import socket

    import psutil

    # Try to get the IP address from the hostname
    # try:
    #     for info in socket.getaddrinfo(socket.gethostname(), None):
    #         print(info)
    #         if info[0] == socket.AF_INET:
    #             ip = info[4][0]
    #             if ip.startswith("192.168.0.72"):
    #                 return ip
    # except socket.error:
    #     pass
    # eno1: Ethernet Network Onboard 1: port , enp2s0: Ethernet Network PCI, 2: PCI number, s0: Slot number
    # return first ip address of eno1
    interfce_name = "eno1"
    try:
        addrs = psutil.net_if_addrs()
        if interfce_name in addrs:
            for addr in addrs[interfce_name]:
                if addr.family == socket.AF_INET:
                    return addr.address
    except psutil.AccessDenied:
        pass
    except Exception:
        pass

    # Fallback to connecting to an external server to get the IP address
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
        return ip
    except socket.error:
        return "192.168.0.72"


if __name__ == "__main__":

    addr = get_ip_address()
    print(addr)
    mixed_string = encode_auth_token(addr, 21911)
    print(mixed_string)
    print(decode_auth_token(mixed_string))

    import re

    filename = "mr1.0.0_241017_1823_80.enc.tar.gz"
    # 정규 표현식을 사용하여 원하는 부분 추출
    match = re.match(r"^(.*)\.enc\.tar\.gz$", filename)
    if match:
        base = match.group(1)
        print(base)  # 결과: 'mr1.0.0_241017_1823_80'

    import os
    import subprocess

    path_to_directory = os.path.expanduser("/home/jimmy/catkin_ws/src/utils/packages")
    log_string = ""
    with os.scandir(path_to_directory) as entries:
        for entry in entries:
            if entry.is_file() and entry.name.endswith(".whl"):
                pip_bash_path = f"pip install {entry.path}"
                result = subprocess.run(
                    pip_bash_path, shell=True, capture_output=True, text=True
                )
                log_string += result.stdout
    print(log_string)
