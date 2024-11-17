#!/bin/bash

# set -e

# Log message function for better readability
log_message() {
    echo "$(date +'%Y-%m-%d %H:%M:%S') - $1"
}

pip_install() {
    local dir="$1"
    log_message "Installing package in $dir"
    cd "$dir" || { log_message "Failed to change directory to $dir"; return 1; }
    pip install -e . || { log_message "Failed to install package in $dir"; return 1; }
    log_message "Successfully installed package in $dir"
    log_message "-----------------------------------"
}

copy_recursive() {
    local source_directory="$1"
    local target_directory="$2"
    local target_file="$3"

    # 첫 번째 폴더에서 파일 찾기 및 복사
    find "$source_directory" -type f -name "$target_file" | while read file_path; do
        # 상대 경로 계산
        local relative_path="${file_path#$source_directory/}"

        # 두 번째 폴더에서 동일한 상대 경로로 복사
        local destination_path="$target_directory/$relative_path"

        # 디렉토리가 존재하지 않으면 생성
        #mkdir -p "$(dirname "$destination_path")"

        # 파일 복사
        cp "$file_path" "$destination_path"
    done
}

install_extra_packages() {
    log_message "Installing extra packages..."

    # 패키지 경로 설정
    local PACKAGES_PATH=~/catkin_ws/src/utils/packages

    # 패키지 폴더가 없으면 생성
    if [ ! -d "$PACKAGES_PATH" ]; then
        mkdir -p "$PACKAGES_PATH"
    fi

    cd "$PACKAGES_PATH"
    for entry in *.whl; do
        if [ -f "$entry" ]; then
            if ! pip install "$entry"; then
                log_message "Failed to install $entry"
            else
                log_message "Successfully installed $entry"
            fi
        fi
    done
}

install_morow_packages() {
    log_message "Installing morow packages..."

    cd ~/catkin_ws/src
    paths=(
        # "${PWD}/integration/morow/morow3d"
        "${PWD}/roboesim"
        "${PWD}/roboe-pm"
        "${PWD}/utils/robotics/robotics_lib"
        # "${PWD}/utils/robotics/robotics_ros/robotics_analysis"
    )
    for path in "${paths[@]}"; do
    expanded_path=$(eval echo "$path")
        if [ -d "$expanded_path" ]; then
            pip_install "$expanded_path"
            log_message "Install $expanded_path is completed"
        else
            log_message "Directory not found: $expanded_path"
            log_message "-----------------------------------"
        fi
    done
}

build_morow_catkin() {
    log_message "building morow..."

    cd ~/catkin_ws && catkin clean -y
    cd ~/catkin_ws && catkin build -DCMAKE_BUILD_TYPE=Release
    source /opt/ros/noetic/setup.bash
    source ~/catkin_ws/devel/setup.bash

    log_message "build morow is completed"
}

build_once() {
    # extra 패키지 추가
    install_extra_packages

    # morow 패키지 추가
    install_morow_packages

    # morow catkin 빌드
    build_morow_catkin
}

update() {
    OLD_VERSION_PATH="backup_$(date +'%y%m%d%H%M%S')"
    NEW_VERSION_PATH="$1"
    BUILD_CATKIN="$2"

    cd ~/catkin_ws
    # CUR_DIR=$(basename "$PWD")
    # log_message "current dir: $CUR_DIR"

    if [ -d "$NEW_VERSION_PATH" ] && [ -d src ]; then
        # 기존 폴더 백업
        log_message "backuping files..."
        mv src "$OLD_VERSION_PATH"
        mv "$NEW_VERSION_PATH" src
        sync
        sync

        # 설정 파일 복사
        log_message "copying files..."
        cp "$OLD_VERSION_PATH/integration/morow/launch/morow.launch" src/integration/morow/launch/morow.launch
        cp "$OLD_VERSION_PATH/integration/morow/morow/assets/morowConfig.yaml" src/integration/morow/morow/assets/morowConfig.yaml
        cp "$OLD_VERSION_PATH/integration/morow/morow/assets/serial_number" src/integration/morow/morow/assets/serial_number
        copy_recursive "$OLD_VERSION_PATH/integration/morow/morow/assets" "src/integration/morow/morow/assets/" "platform.yaml"
        sync
        sync

        if [ "$BUILD_CATKIN" == "build" ]; then
            build_once
        fi

    else
        log_message "Error: New version path or src directory not found."
        exit 1
    fi

    log_message "update is completed"
}

if [ "$1" == "update" ]; then
    if [ -z "$3" ]; then
        BUILD="no"
    else
        BUILD="$3"
    fi
    if [ "$BUILD" != "build" ] && [ "$BUILD" != "no" ]; then
        log_message "Usage: $0 update decrypted_dir [build | no]"
        exit 1
    fi
    update "$2" "$BUILD"

else
    log_message "Usage: $0 update decrypted_dir [build | no]"
    exit 1
fi
