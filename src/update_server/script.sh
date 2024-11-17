#!/bin/bash

TIMESTAMP=$(date +"%y%m%d_%H%M%S")
TAR_FILE="mr1.0.0_$TIMESTAMP.tar.gz"

log_message() {
    echo "$(date +'%Y-%m-%d %H:%M:%S') - $1"
}

# 암호화 함수
encrypt() {
    SOURCE_PATH="$1"
    PASSWORD="$2"

    # 파일 압축
    log_message "packing files..."
    # tar --exclude='./.git' --exclude='./.repo' --exclude='./roboesim' --exclude='./tools' --exclude='*.tar.gz' --exclude='*/meshes' --exclude='*.csv' --exclude='*.pdf' --exclude='*.ply' --exclude='*.onnx' --exclude='*events.out.tfevents*' --exclude='*/doc' --exclude='*/morow3d/build' -czf "$TAR_FILE" -C "$SOURCE_PATH" .
    excludes=(
        './.git'
        './.repo'
        './roboesim'
        './tools'
        '*.tar.gz'
        '*/meshes'
        '*.csv'
        '*.pdf'
        '*.ply'
        '*.onnx'
        '*events.out.tfevents*'
        '*/doc'
        '*/morow3d/build'
        )

    exclude_params=()
    for pattern in "${excludes[@]}"; do
        exclude_params+=(--exclude="$pattern")
    done
    # log_message "${exclude_params[@]}"

    tar "${exclude_params[@]}" -czf "$TAR_FILE" ./*
    sync

    # 파일 이름에서 확장자 제거
    NO_EXT="${TAR_FILE%.tar.gz}"

    # enc 폴더 생성
    mkdir -p enc

    # 파일을 100MB 단위로 분할하여 enc 폴더에 저장
    log_message "splitting files..."
    split -b 100M "$TAR_FILE" enc/part_
    sync

    # 각 분할 파일을 암호화
    log_message "encrypting files..."
    for file in enc/part_*; do
        # openssl enc -aes-256-cbc -salt -in "$file" -out "$file.enc" -k "$PASSWORD" &
        openssl enc -aes-256-cbc -salt -pbkdf2 -in "$file" -out "$file.enc" -k "$PASSWORD" &
    done
    wait
    sync


    # enc 폴더 안에서 암호화된 파일을 tar.gz로 압축
    log_message "packing files..."
    (cd enc && tar -czvf "../$NO_EXT.enc.tar.gz" part_*.enc)
    sync

    # enc 폴더 및 그 안의 파일 삭제
    log_message "cleaning up..."
    rm -r enc
    rm "$TAR_FILE"
}

# 복호화 함수
decrypt() {
    ENCRYPTED_TAR_FILE="$1"
    PASSWORD="$2"

    # 파일 이름에서 확장자 제거
    NO_EXT="${ENCRYPTED_TAR_FILE%.enc.tar.gz}"

    # 압축 해제
    log_message "Unpacking files..."
    rm -rf dec
    mkdir -p dec
    if ! tar -xzvf "$ENCRYPTED_TAR_FILE" -C dec ; then
        log_message "Error unpacking $ENCRYPTED_TAR_FILE"
        exit 1
    fi
    sync
    sync


    # 각 암호화된 파일을 복호화
    log_message "Decrypting files..."
    for enc_file in dec/part_*.enc; do
        if ! openssl enc -d -aes-256-cbc -pbkdf2 -in "$enc_file" -out "${enc_file%.enc}" -k "$PASSWORD"; then
            log_message "Error decrypting $enc_file"
            exit 1
        fi
    done
    #wait
    sync
    sync


    # 확장자가 없는 파일들을 원래 파일로 병합
    log_message "Merging decrypted files..."
    (cd dec && ls part_* | grep -v '\.enc$' | xargs cat > "../$NO_EXT.dec.tar.gz")
    sync
    sync

    # 병합된 tar.gz 파일의 압축 해제
    log_message "Unpacking merged tar.gz file..."
    rm -rf "$NO_EXT"
    mkdir -p "$NO_EXT"
    if ! tar -xzf "$NO_EXT.dec.tar.gz" -C "$NO_EXT"; then
        log_message "Error unpacking $NO_EXT.dec.tar.gz"
        exit 1;
    fi
    sync
    sync

    # 임시 파일 삭제
    log_message "Cleaning up..."
    if [ -f "$NO_EXT.dec.tar.gz" ]; then
        rm "$NO_EXT.dec.tar.gz"
    else
        log_message "File '$NO_EXT.dec.tar.gz' not found. Skipping removal."
    fi
    rm -rf dec


    log_message "Checking version info..."
    if [ -f "$NO_EXT/version_info.txt" ]; then
        log_message "$(cat "$NO_EXT/version_info.txt")"
    else
        log_message "Version: Unknown"
        exit 1
    fi

    log_message "Decryption process completed."
}

if [ "$1" == "encrypt" ]; then
    encrypt "$2" "$3"
elif [ "$1" == "decrypt" ]; then
    decrypt "$2" "$3"
else
    echo "Usage: $0 encrypt <path> <password>"
    echo "Usage: $0 decrypt <path> <password>"
fi
