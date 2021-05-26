#!/bin/sh
cd /home/turnerb/Twitch-watcher/
pm2 --name Twitch-watcher start npm -- start
sleep 12h
pm2 delete Twitch-watcher
