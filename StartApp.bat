@echo off
REM set color to light purple text on a black background.
Color 0D
IF NOT EXIST config.json (
    REM if the config.json file does not exist (assume it hasn't been installed)
    REM then install the twitch watcher program
npm install
)
REM start the twitch water program
npm start