@echo on
REM This will get admin privileges, then check to see if Choco is installed, if not, install it, then install npm and nodejs
REM and then check to see if there has already been a config.json file generated after the first run, and if not, 
REM it will install the Twitch-Watcher program, if it has been generated, it will simply run it.
REM Get Admin Privileges to install Choco
:: BatchGotAdmin
:-------------------------------------
REM  --> Check for permissions
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"

REM --> If error flag set, we do not have admin.
if '%errorlevel%' NEQ '0' (
    echo Requesting administrative privileges...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"

    "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )
    pushd "%CD%"
    CD /D "%~dp0"
:--------------------------------------
REM check to see if choco is installed
choco -v > NUL

IF %ERRORLEVEL% NEQ 0 ( 
REM if choco is not installed, install it.
@"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -InputFormat None -ExecutionPolicy Bypass -Command "[System.Net.ServicePointManager]::SecurityProtocol = 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))" && SET "PATH=%PATH%;%ALLUSERSPROFILE%\chocolatey\bin"
REM refresh the environmental variables so choco is available as a command
refreshenv

REM npm -v 
REM echo %ERRORLEVEL%
REM IF %ERRORLEVEL% NEQ 0 (
REM set choco to not require a "y" for every package
choco feature enable -n=allowGlobalConfirmation
REM install and nodejs (and with it, npm)
)
choco install nodejs
REM refresh environmental variables one more time to get npm on the cmd line
refreshenv
REM check if chromium is installed (assuming a 64bit machine here), if it's not, then install chromium
IF NOT EXIST "%programfiles(x86)%\Google\Chrome\Application\chrome.exe" (
    choco install chromium -y
)

