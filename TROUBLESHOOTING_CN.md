# 修复 ffmpeg.dll 缺失问题

## 问题描述
双击 exe 时出现错误："由于找不到 ffmpeg.dll，无法继续执行代码"

## 原因
这个错误通常是由以下之一引起的：
1. Windows Media Feature Pack 未安装
2. Visual C++ Redistributable 版本不匹配
3. 系统库损坏或过时

##解决方案

### 方案 1: 安装 Visual C++ 运行时
从微软官网下载并安装最新的 Visual C++ Redistributable (2022 版本)
- 下载地址: https://support.microsoft.com/en-us/help/2977003
- 选择 x64 版本

### 方案 2: 修复 Windows Media 库
1. 打开"控制面板" > "程序和功能"
2. 点击左侧的"启用或关闭 Windows 功能"
3. 找到并勾选 "Windows Media Player" 和相关媒体功能
4. 点击"确定"并重启计算机

### 方案 3: 更新 Windows
运行 Windows 更新以确保所有系统库都是最新的

### 方案 4: 直接运行应用
如果仍然有问题，可以尝试：
```bash
cd release\现代化 SFTP 文件管理-win32-x64
现代化 SFTP 文件管理.exe
```

## 开发者说明
- 本应用使用 Electron 框架构建
- Electron 依赖某些 Windows 系统库
- 在标准 Windows 10/11 安装上应该没有这个问题
