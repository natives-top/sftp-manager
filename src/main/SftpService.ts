import Client from 'ssh2-sftp-client';
import { dialog, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';

export class SftpService {
  private client: Client;
  private currentConfig: any;

  constructor() {
    this.client = new Client();
  }

  async connect(config: any) {
    try {
      this.currentConfig = config;
      try {
        await this.client.end();
      } catch (e) {
        // Ignore end errors
      }
      this.client = new Client();
      await this.client.connect({
        host: config.host,
        port: config.port ? parseInt(config.port, 10) : 22,
        username: config.username,
        password: config.password,
        readyTimeout: 10000,
      });
      return { success: true };
    } catch (error: any) {
      console.error('SFTP Connect Error:', error);
      return { success: false, error: error.message };
    }
  }

  async disconnect() {
    try {
      await this.client.end();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async list(remotePath: string) {
    try {
      const list = await this.client.list(remotePath);
      const sortedList = list.sort((a, b) => {
        if (a.type === 'd' && b.type !== 'd') return -1;
        if (a.type !== 'd' && b.type === 'd') return 1;
        return a.name.localeCompare(b.name);
      });
      return { success: true, data: sortedList };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async download(window: BrowserWindow, remotePath: string, taskId: string, isDirectory: boolean) {
    try {
      const fileName = path.basename(remotePath);
      let localPath = '';
      
      if (isDirectory) {
        const result = await dialog.showOpenDialog(window, {
          properties: ['openDirectory']
        });
        if (result.canceled || result.filePaths.length === 0) return { success: false, canceled: true };
        localPath = path.join(result.filePaths[0], fileName);
      } else {
        const result = await dialog.showSaveDialog(window, {
          defaultPath: fileName
        });
        if (result.canceled || !result.filePath) return { success: false, canceled: true };
        localPath = result.filePath;
      }

      const step = (totalTransferred: number, chunk: number, total: number) => {
        window.webContents.send('transfer:progress', {
          id: taskId,
          progress: total ? (totalTransferred / total) * 100 : 0,
          transferredSize: totalTransferred,
          totalSize: total
        });
      };

      if (isDirectory) {
        await this.client.downloadDir(remotePath, localPath);
        // Note: ssh2-sftp-client downloadDir does not natively emit progress events in the same way as fastGet.
        // For MVP, we complete immediately for dirs.
        window.webContents.send('transfer:progress', {
          id: taskId,
          progress: 100,
          transferredSize: 1,
          totalSize: 1
        });
      } else {
        await this.client.fastGet(remotePath, localPath, { step });
      }

      return { success: true, localPath };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async upload(window: BrowserWindow, localPath: string, remotePath: string, taskId: string) {
    try {
      const fileName = path.basename(localPath);
      const finalRemotePath = remotePath.endsWith('/') ? `${remotePath}${fileName}` : `${remotePath}/${fileName}`;
      
      const stat = fs.statSync(localPath);
      const isDirectory = stat.isDirectory();

      const step = (totalTransferred: number, chunk: number, total: number) => {
        window.webContents.send('transfer:progress', {
          id: taskId,
          progress: total ? (totalTransferred / total) * 100 : 0,
          transferredSize: totalTransferred,
          totalSize: total
        });
      };

      if (isDirectory) {
        await this.client.uploadDir(localPath, finalRemotePath);
        // Emulate completion for directories
        window.webContents.send('transfer:progress', {
          id: taskId,
          progress: 100,
          transferredSize: 1,
          totalSize: 1
        });
      } else {
        await this.client.fastPut(localPath, finalRemotePath, { step });
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async delete(remotePath: string) {
    try {
      const stat = await this.client.stat(remotePath);
      if (stat.isDirectory) {
        await this.client.rmdir(remotePath, true);
      } else {
        await this.client.delete(remotePath);
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  async mkdir(remotePath: string) {
    try {
      await this.client.mkdir(remotePath, true);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async selectFiles(window: BrowserWindow, properties: string[]) {
    const result = await dialog.showOpenDialog(window, { properties: properties as any });
    if (result.canceled) return [];
    return result.filePaths;
  }

  async batchDownload(window: BrowserWindow, remotePaths: string[], taskIds: string[], isDirectories: boolean[]) {
    try {
      // Show directory selection dialog once for all files
      const result = await dialog.showOpenDialog(window, {
        properties: ['openDirectory']
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const baseDownloadPath = result.filePaths[0];

      // Download each file to the selected directory
      for (let i = 0; i < remotePaths.length; i++) {
        const remotePath = remotePaths[i];
        const taskId = taskIds[i];
        const isDirectory = isDirectories[i];
        const fileName = path.basename(remotePath);
        const localPath = path.join(baseDownloadPath, fileName);

        try {
          const step = (totalTransferred: number, chunk: number, total: number) => {
            window.webContents.send('transfer:progress', {
              id: taskId,
              progress: total ? (totalTransferred / total) * 100 : 0,
              transferredSize: totalTransferred,
              totalSize: total
            });
          };

          if (isDirectory) {
            await this.client.downloadDir(remotePath, localPath);
            window.webContents.send('transfer:progress', {
              id: taskId,
              progress: 100,
              transferredSize: 1,
              totalSize: 1
            });
          } else {
            await this.client.fastGet(remotePath, localPath, { step });
          }

          window.webContents.send('transfer:progress', {
            id: taskId,
            progress: 100,
            transferredSize: 1,
            totalSize: 1
          });
        } catch (error: any) {
          window.webContents.send('transfer:error', {
            id: taskId,
            error: error.message
          });
        }
      }

      return { success: true, baseDownloadPath };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
