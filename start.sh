#!/bin/bash

gnome-terminal -- bash -c "cd WebServer && ./server.py; exec bash"
gnome-terminal -- bash -c "./client2.py; exec bash"
gnome-terminal -- bash -c "./client.py; exec bash"
