import { contextBridge, ipcRenderer } from 'electron'

if (!process.contextIsolated) {
  throw new Error('contextIsolation must be enabled in the BrowserWindow')
}

try {
  contextBridge.exposeInMainWorld('electron', {
    sftp: {
      connect: (config: any) => ipcRenderer.invoke('sftp:connect', config),
      disconnect: () => ipcRenderer.invoke('sftp:disconnect'),
      list: (path: string) => ipcRenderer.invoke('sftp:list', path),
      download: (remotePath: string, taskId: string, isDirectory: boolean) => ipcRenderer.invoke('sftp:download', remotePath, taskId, isDirectory),
      upload: (localPath: string, remotePath: string, taskId: string) => ipcRenderer.invoke('sftp:upload', localPath, remotePath, taskId),
      delete: (remotePath: string) => ipcRenderer.invoke('sftp:delete', remotePath),
      mkdir: (remotePath: string) => ipcRenderer.invoke('sftp:mkdir', remotePath),
      selectFiles: (properties: string[]) => ipcRenderer.invoke('sftp:selectFiles', properties)
    },
    store: {
      getConnections: () => ipcRenderer.invoke('store:getConnections'),
      saveConnection: (config: any) => ipcRenderer.invoke('store:saveConnection', config),
      deleteConnection: (id: string) => ipcRenderer.invoke('store:deleteConnection', id)
    },
    crypto: {
      encrypt: (text: string) => ipcRenderer.invoke('crypto:encrypt', text),
      decrypt: (text: string) => ipcRenderer.invoke('crypto:decrypt', text)
    },
    on: (channel: string, callback: (...args: any[]) => void) => {
      const subscription = (_event: any, ...args: any[]) => callback(...args)
      ipcRenderer.on(channel, subscription)
      return () => {
        ipcRenderer.removeListener(channel, subscription)
      }
    }
  })
} catch (error) {
  console.error(error)
}
