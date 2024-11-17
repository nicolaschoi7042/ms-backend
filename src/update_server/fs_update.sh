#!/bin/bash
source ~/.bashrc

# version rev1 : decrypt command changed

# Log message function for better readability
log_message() {
    echo "$(date +'%Y-%m-%d %H:%M:%S') - $1"
}


# Main script execution
update() {
    NEW_VERSION_PATH="$1"
    local SCRIPT_DIR="$(dirname "$(realpath "$0")")"
    local DECRYPTED_SRC_UI_PATH="$SCRIPT_DIR/$NEW_VERSION_PATH"

    run_ui_shutdown

    if [[ $? -ne 0 ]]; then
        log_message "Failed to run 'ui_shutdown.sh'."
        return 1
    fi

    handle_backup_and_copy "$DECRYPTED_SRC_UI_PATH"

    # Final step: Remove the decrypted_src folder and decrypted tar file
    cd /home/roboe_fullstack/catkin_ws/
    log_message "Removing $NEW_VERSION_PATH folder..."
    if [[ -d "$NEW_VERSION_PATH" ]]; then
        rm -rf "$NEW_VERSION_PATH"
        log_message "$NEW_VERSION_PATH folder removed successfully."
    else
        log_message "$NEW_VERSION_PATH folder does not exist."
    fi

    log_message "update is completed"
}

# Function to run ui_shutdown.sh
run_ui_shutdown() {
    log_message "Shutting down UI..."
   # Kill processes on specified ports
    for port in 5555 5556 3000 3001 8000; do
        kill_processes_on_port $port
    done

    pm2 delete all
    sleep 3
    echo "UI shutdown complete."
}

# Function to handle backup and copy operations
handle_backup_and_copy() {
    local DECRYPTED_SRC_UI_PATH="$1"
    local ORIGINAL_FS="/home/roboe_fullstack/catkin_ws/src"
    local BACKUP_DIR="/home/roboe_fullstack/catkin_ws/fs_src_backup_$(date +'%y%m%d%H%M%S')"
    log_message "handle_backup_and_copy start~~~"

    if [[ ! -d "$ORIGINAL_FS" ]]; then
        log_message "Folder '$ORIGINAL_FS' not found."
        return 1
    fi

    log_message "Folder '$ORIGINAL_FS' found. Proceeding to copy it to '$BACKUP_DIR'..."
    mkdir -p "$BACKUP_DIR"
    mv "$ORIGINAL_FS"/* "$BACKUP_DIR"/

    log_message "Folder copied to '$BACKUP_DIR' successfully."
    copy_decrypted_ui "$DECRYPTED_SRC_UI_PATH" "/home/roboe_fullstack/catkin_ws/src"
}

# Function to copy decrypted UI
copy_decrypted_ui() {
    local DECRYPTED_SRC_UI_PATH="$1"
    local DOCKER_DEST_PATH="$2"
    log_message "copying decrypted_ui start~~~"

    if [ ! -d "$DOCKER_DEST_PATH" ]; then
       echo "Directory $DOCKER_DEST_PATH does not exist. Creating it..."
       mkdir -p "$DOCKER_DEST_PATH"
    else
       echo "Directory $DOCKER_DEST_PATH already exists."
    fi

    cp -r "$DECRYPTED_SRC_UI_PATH"/* "$DOCKER_DEST_PATH"/

    if [[ $? -ne 0 ]]; then
        log_message "Failed to copy 'decrypted_src' to '$DOCKER_DEST_PATH'."
        return 1
    fi

    log_message "Successfully copied 'decrypted_src' to '$DOCKER_DEST_PATH'."
    copy_robot_api_data "$BACKUP_DIR" "$ORIGINAL_FS"
}

# Function to copy robot API data
copy_robot_api_data() {
    local BACKUP_DIR="$1"
    local ORIGINAL_FS="$2"

    log_message "Copying files from '$BACKUP_DIR/ui/robot-api/prisma/data' to '$ORIGINAL_FS/ui/robot-api/prisma/data'..."
    cp -r "$BACKUP_DIR/ui/robot-api/prisma/data/"* "$ORIGINAL_FS/ui/robot-api/prisma/data/"

    if [[ $? -eq 0 ]]; then
        log_message "Files copied successfully to '$ORIGINAL_FS/ui/robot-api/prisma/data/'."
    else
        log_message "Failed to copy files to '$ORIGINAL_FS/ui/robot-api/prisma/data/'."
    fi

    run_docker_commands "$DOCKER_DEST_PATH"
}

# Function to run docker commands
run_docker_commands() {
    local DOCKER_DEST_PATH="$1"

    log_message "Do catkin build (cb) for morrow_msg..."
    cd ~/catkin_ws && catkin build --save-config --cmake-args -DCMAKE_BUILD_TYPE=Release

    log_message "Changing directory to '$DOCKER_DEST_PATH/ui/robot-api' & update db"
    cd "$DOCKER_DEST_PATH/ui/robot-api" || return 1
    npx prisma migrate deploy

    # log_message "Changing directory to '$DOCKER_DEST_PATH/ui/robot-web"
    # cd "$DOCKER_DEST_PATH/ui/robot-api" || return 1

    if [[ $? -eq 0 ]]; then
        log_message "fisnhing all update & backup."
        # run_ui_start
    else
        log_message "Failed to update & backup."
        return 1
    fi
}

# Function to run ui_start.sh
run_ui_start() {
   # Kill processes on specified ports
    for port in 5555 5556 3000 3001 8000; do
      kill_processes_on_port $port
    done

    pm2 delete all
    sleep 3

    echo "Starting the UI components..."
    start_component "robot-web" "/home/roboe_fullstack/catkin_ws/src/ui/robot-web" "pnpm start &"
    start_component "robot-api" "/home/roboe_fullstack/catkin_ws/src/ui/robot-api" "pnpm start &"
    echo "FS update completed."
}

# Function to kill processes on a specific port
kill_processes_on_port() {
    local port=$1
    # echo "Killing processes on port $port..."

    # Find PIDs of processes using the port
    log_message "killing reamined processed of ui ~~~"
    pids=$(lsof -ti :$port)

    if [ -z "$pids" ]; then
        echo ""
    else
        echo "Found processes with PIDs: $pids"
        echo "Killing processes..."
        kill -9 $pids
        echo "Processes on port $port have been terminated."
    fi
}

start_component() {
    local name=$1
    local dir=$2
    local command=$3

    echo "Starting $name..."
    cd "$dir" || { echo "Failed to change directory to $dir"; exit 1; }
    $command &
    sleep 3
}



# Start the script
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
