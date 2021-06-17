#!/bin/sh
cd /home/turnerb/Twitch-watcher/
pm2 --name Twitch-watcher-6h start npm -- start
sleep 6h
pm2 delete Twitch-watcher-6h
