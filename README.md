# 现代化 SFTP 文件管理 (Modern SFTP File Manager)

A modern, fast, and local SFTP file manager built as an MVP. Designed with a cloud-drive/Windows Explorer experience in mind, completely contained within a single portable executable.

## Features
- 🌐 **Full i18n Support** (English & Chinese)
- 🖥️ **Modern UI** (Tailwind CSS + shadcn/ui)
- 🚫 **No Native Dialogs** (Custom React Modals & Sonner Toasts instead of default `alert`/`prompt`/`confirm`)
- 📁 **File Management** (Context menus, fixed-height Transfer Task history panel, Upload/Download)
- 📦 **Single Portable Executable** (No installation required)

## Tech Stack
- Electron + Vite
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui + Radix UI
- ssh2-sftp-client

## Getting Started

### Prerequisites
- Node.js (v18+)

### Development
```bash
npm install
npm run dev
```

### Build Portable `.exe`
```bash
npm run dist
```
The compiled executable will be located at `release/现代化 SFTP 文件管理.exe`.
