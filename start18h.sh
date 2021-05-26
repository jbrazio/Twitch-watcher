#!/bin/sh
cd /home/turnerb/Twitch-watcher/
#timeout 18h screen -dmS twitch-watcher npm start
pm2 --name Twitch-watcher start npm -- start
sleep 18h
pm2 delete Twitch-watcher
