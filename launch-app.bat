@echo off
REM 启动 SFTP 文件管理应用
REM 这个脚本自动定位真实应用程序并运行它

setlocal enabledelayedexpansion

REM 获取脚本所在的目录
set SCRIPT_DIR=%~dp0

REM 查找app文件夹
if exist "%SCRIPT_DIR%现代化 SFTP 文件管理-win32-x64\现代化 SFTP 文件管理.exe" (
    start "" "%SCRIPT_DIR%现代化 SFTP 文件管理-win32-x64\现代化 SFTP 文件管理.exe"
    exit /b 0
)

REM 备选位置
if exist "%SCRIPT_DIR%win32-x64\现代化 SFTP 文件管理.exe" (
    start "" "%SCRIPT_DIR%win32-x64\现代化 SFTP 文件管理.exe"
    exit /b 0
)

REM 如果找不到,显示错误
echo 错误: 无法找到应用程序文件!
echo 请确保应用程序文件夹未被移动或删除。
pause
exit /b 1
