#!/bin/sh
cd /home/turnerb/Twitch-watcher/
pm2 --name Twitch-watcher start npm -- start 
echo "started twitch watcher, will exit in 30s"
sleep 30s
pm2 delete Twitch-watcher




