#!/bin/bash
# screen -dmS twitch-watcher npm start # this works if you want it to be interactive
pm2 --name Twitch-watcher start npm -- start
#echo "started twitch-watcher, type screen -r to connect to it"
#screen npm start

