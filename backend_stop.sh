#!/bin/bash

# Function to kill processes on a specific port
kill_processes_on_port() {
    local port=$1
    # echo "Killing processes on port $port..."

    # Find PIDs of processes using the port
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

# Kill processes on specified ports
for port in 5555 5556 8000 8001; do
    kill_processes_on_port $port
done

# Uncomment the following lines if you want to use PM2
# echo "Deleting all PM2 processes..."
pm2 delete all
sleep 3