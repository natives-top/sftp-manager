import React, { useState, useEffect } from 'react'
import { Button } from './components/ui-button'
import { Input } from './components/ui-input'
import { Progress } from './components/ui-progress'
import { ScrollArea } from './components/ui-scroll-area'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from './components/ui-context-menu'
import { formatBytes } from './lib/utils'
import { useTranslation } from 'react-i18next'
import { v4 as uuidv4 } from 'uuid'
import { Server, Folder, File as FileIcon, ArrowUp, ArrowUpDown, ArrowDownAZ, ArrowUpAZ, RefreshCcw, Download, Upload, Trash2, Plug, Play, Plus, Loader2, FolderPlus, FileUp, XCircle, CheckCircle2, Globe, ChevronUp, ChevronDown, Tag, X } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { TransferTask, Bookmark } from './lib/types'

export default function App() {
  const { t, i18n } = useTranslation()
  const [connections, setConnections] = useState<any[]>([])
  const [activeConnection, setActiveConnection] = useState<any | null>(null)
  
  // Connection Form
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formConfig, setFormConfig] = useState<any>({ host: '', port: '22', username: '', password: '', alias: '' })
  const [loading, setLoading] = useState(false)
  
  // File Browser State
  const [files, setFiles] = useState<any[]>([])
  const [currentPath, setCurrentPath] = useState('/')
  const [fileLoading, setFileLoading] = useState(false)
  
  // Tasks State
  const [tasks, setTasks] = useState<TransferTask[]>([])

  // Bookmarks State
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])

  // New Folder State
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  // Confirm Delete State
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<any | null>(null)

  // Sort State
  type SortKey = 'name' | 'size' | 'modifyTime'
  type SortDir = 'asc' | 'desc'
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // Load history on mount
  useEffect(() => {
    window.electron.store.getConnections().then(setConnections)

    // Listen for progress updates
    const cleanup = window.electron.on('transfer:progress', (data) => {
      setTasks(prev => prev.map(task => 
        task.id === data.id ? { 
          ...task, 
          progress: data.progress, 
          transferredSize: data.transferredSize, 
          totalSize: data.totalSize,
          status: data.progress === 100 ? 'completed' : 'transferring'
        } : task
      ))
    })

    return cleanup;
  }, [])

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault()
    let pwd = formConfig.password
    if (pwd) {
       pwd = await window.electron.crypto.encrypt(pwd)
    }
    const newConfig = { ...formConfig, password: pwd }
    const updated = await window.electron.store.saveConnection(newConfig)
    setConnections(updated)
    setIsFormOpen(false)
  }

  const handleDeleteConnection = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = await window.electron.store.deleteConnection(id)
    setConnections(updated)
  }

  const handleConnect = async (config: any) => {
    if (activeConnection?.id === config.id) {
      const homePath = config.username === 'root' ? '/root' : `/home/${config.username}`;
      loadFiles(homePath);
      return;
    }

    setLoading(true)
    let pwd = config.password
    if (pwd) {
      pwd = await window.electron.crypto.decrypt(pwd)
    }
    const connectConfig = { ...config, password: pwd }
    
    const res = await window.electron.sftp.connect(connectConfig)
    setLoading(false)
    if (res.success) {
      setActiveConnection(config)
      const bm = await window.electron.store.getBookmarks(config.id)
      setBookmarks(bm || [])
      loadFiles('/')
    } else {
      toast.error(t('Failed to connect') + ': ' + res.error)
      setActiveConnection(null)
    }
  }

  const handleDisconnect = async () => {
    await window.electron.sftp.disconnect()
    setActiveConnection(null)
    setFiles([])
    setTasks([])
    setBookmarks([])
  }

  const loadFiles = async (path: string) => {
    setFileLoading(true)
    const res = await window.electron.sftp.list(path)
    setFileLoading(false)
    if (res.success) {
      setFiles(res.data)
      setCurrentPath(path)
    } else {
      toast.error(t('Error loading files') + ': ' + res.error)
      if (res.error && res.error.includes('No SFTP connection')) {
        setActiveConnection(null)
      }
    }
  }

  const navigateUp = () => {
    if (currentPath === '/') return
    const parent = currentPath.split('/').slice(0, -1).join('/') || '/'
    loadFiles(parent)
  }

  const handleDoubleClick = (file: any) => {
    if (file.type === 'd') {
      const newPath = currentPath.endsWith('/') ? currentPath + file.name : currentPath + '/' + file.name
      loadFiles(newPath)
    }
  }

  const handleDownload = async (file: any) => {
    const remotePath = currentPath.endsWith('/') ? currentPath + file.name : currentPath + '/' + file.name
    const isDir = file.type === 'd';
    
    const taskId = uuidv4();
    const newTask: TransferTask = {
      id: taskId,
      type: 'download',
      filename: file.name,
      localPath: '', 
      remotePath: remotePath,
      status: 'pending',
      progress: 0,
      totalSize: file.size || 0,
      transferredSize: 0
    };
    
    setTasks(prev => [newTask, ...prev])

    const res = await window.electron.sftp.download(remotePath, taskId, isDir)
    
    if (res.success) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed', progress: 100 } : t))
    } else if (res.canceled) {
      setTasks(prev => prev.filter(t => t.id !== taskId))
    } else {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error', error: res.error } : t))
    }
  }

  const handleUploadFile = async () => {
    const paths = await window.electron.sftp.selectFiles(['openFile', 'multiSelections'])
    if (paths && paths.length > 0) {
      uploadLocalPaths(paths)
    }
  }

  const handleUploadFolder = async () => {
    const paths = await window.electron.sftp.selectFiles(['openDirectory', 'multiSelections'])
    if (paths && paths.length > 0) {
      uploadLocalPaths(paths)
    }
  }

  const uploadLocalPaths = async (paths: string[]) => {
    for (const localPath of paths) {
      // Split by both / and \ to handle cross-platform local paths safely without regex bugs
      const parts = localPath.split(/[\\/]/)
      const filename = parts[parts.length - 1] || t('unknown');
      const taskId = uuidv4();
      
      const newTask: TransferTask = {
        id: taskId,
        type: 'upload',
        filename: filename,
        localPath: localPath,
        remotePath: currentPath,
        status: 'pending',
        progress: 0,
        totalSize: 0, 
        transferredSize: 0
      };
      
      setTasks(prev => [newTask, ...prev])

      const res = await window.electron.sftp.upload(localPath, currentPath, taskId)
      
      if (res.success) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'completed', progress: 100 } : t))
      } else {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error', error: res.error } : t))
      }
    }
    loadFiles(currentPath)
  }

  const handleDelete = (file: any) => {
    setConfirmDeleteFile(file)
  }

  const executeDelete = async (file: any) => {
    setConfirmDeleteFile(null)
    const remotePath = currentPath.endsWith('/') ? currentPath + file.name : currentPath + '/' + file.name
    const res = await window.electron.sftp.delete(remotePath)
    if (res.success) {
      toast.success(t('Delete success'))
      loadFiles(currentPath)
    } else {
      toast.error(t('Delete failed') + ': ' + res.error)
    }
  }

  const handleMkdir = () => {
    setNewFolderName('');
    setShowNewFolder(true);
  }

  const submitMkdir = async () => {
    if (!newFolderName.trim()) return;
    const name = newFolderName.trim();
    const newPath = currentPath.endsWith('/') ? currentPath + name : currentPath + '/' + name;
    const res = await window.electron.sftp.mkdir(newPath);
    if (res.success) {
      setShowNewFolder(false);
      toast.success(t('Mkdir success'));
      loadFiles(currentPath);
    } else {
      toast.error(t('Mkdir failed') + ': ' + res.error);
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!activeConnection) return

    const filesToUpload = Array.from(e.dataTransfer.files)
    if (filesToUpload.length === 0) return

    const paths = filesToUpload.map(f => (f as any).path).filter(Boolean)
    if (paths.length > 0) {
      uploadLocalPaths(paths)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const clearCompletedTasks = () => {
    setTasks(prev => prev.filter(t => t.status !== 'completed' && t.status !== 'error'))
  }

  const handleAddBookmark = async (file: any) => {
    if (!activeConnection) return
    const fullPath = currentPath.endsWith('/') ? currentPath + file.name : currentPath + '/' + file.name
    // Check if bookmark already exists for this path
    const exists = bookmarks.some(b => b.path === fullPath)
    if (exists) {
      toast.info(t('Bookmark exists'))
      return
    }
    const bookmark: Bookmark = {
      id: uuidv4(),
      connectionId: activeConnection.id,
      name: file.name,
      path: fullPath,
      isDirectory: file.type === 'd'
    }
    await window.electron.store.addBookmark(bookmark)
    setBookmarks(prev => [...prev, bookmark])
    toast.success(t('Bookmark added'))
  }

  const handleDeleteBookmark = async (bookmarkId: string) => {
    if (!activeConnection) return
    await window.electron.store.deleteBookmark(activeConnection.id, bookmarkId)
    setBookmarks(prev => prev.filter(b => b.id !== bookmarkId))
    toast.success(t('Bookmark removed'))
  }

  // Sort files: directories first, then by sortKey/sortDir
  const sortedFiles = React.useMemo(() => {
    const sorted = [...files].sort((a, b) => {
      // directories always come first
      if (a.type === 'd' && b.type !== 'd') return -1
      if (a.type !== 'd' && b.type === 'd') return 1

      let cmp = 0
      if (sortKey === 'name') {
        cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      } else if (sortKey === 'size') {
        cmp = (a.size || 0) - (b.size || 0)
      } else if (sortKey === 'modifyTime') {
        cmp = new Date(a.modifyTime).getTime() - new Date(b.modifyTime).getTime()
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [files, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
    return sortDir === 'asc' 
      ? <ChevronUp className="h-3 w-3 ml-1" /> 
      : <ChevronDown className="h-3 w-3 ml-1" />
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-64 border-r bg-muted/30 flex flex-col flex-shrink-0">
        <div className="p-4 border-b">
          <Button 
            className="w-full justify-start shadow-sm" 
            onClick={() => {
              setFormConfig({ host: '', port: '22', username: '', password: '', alias: '' })
              setIsFormOpen(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('New Connection')}
          </Button>
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-4">
            <h3 className="text-sm font-medium mb-3 text-muted-foreground">{t('History')}</h3>
            <div className="space-y-2">
              {connections.map(conn => (
                <div key={conn.id}>
                  <div 
                    className={`flex items-center justify-between p-3 rounded-md cursor-pointer border transition-colors ${
                      activeConnection?.id === conn.id ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-accent/50'
                    }`}
                    onClick={() => !loading && handleConnect(conn)}
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <Server className={`h-4 w-4 flex-shrink-0 ${activeConnection?.id === conn.id ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="truncate">
                        <div className="text-sm font-medium truncate">{conn.alias || conn.host}</div>
                        <div className="text-xs text-muted-foreground truncate">{conn.username}@{conn.host}</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive flex-shrink-0" onClick={(e) => handleDeleteConnection(conn.id, e)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {/* Bookmarks for this connection */}
                  {activeConnection?.id === conn.id && bookmarks.length > 0 && (
                    <div className="ml-4 mt-1 mb-1 space-y-1">
                      <div className="text-xs text-muted-foreground font-medium flex items-center px-1 py-0.5">
                        <Tag className="h-3 w-3 mr-1" />{t('Bookmarks')}
                      </div>
                      {bookmarks.map(bm => (
                        <div 
                          key={bm.id}
                          className="flex items-center justify-between group px-2 py-1 rounded hover:bg-accent/50 cursor-pointer text-xs"
                          onClick={() => {
                            if (bm.isDirectory) {
                              loadFiles(bm.path)
                            } else {
                              // Navigate to the parent directory of the bookmarked file
                              const parent = bm.path.split('/').slice(0, -1).join('/') || '/'
                              loadFiles(parent)
                            }
                          }}
                          title={bm.path}
                        >
                          <div className="flex items-center space-x-1.5 overflow-hidden">
                            {bm.isDirectory ? <Folder className="h-3 w-3 text-blue-500 flex-shrink-0" /> : <FileIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
                            <span className="truncate">{bm.name}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-4 w-4 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive flex-shrink-0"
                            onClick={(e) => { e.stopPropagation(); handleDeleteBookmark(bm.id) }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {connections.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">{t('No connections')}</div>
              )}
            </div>
          </div>
        </ScrollArea>
        <div className="p-3 border-t">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start text-muted-foreground"
            onClick={() => {
              const newLang = i18n.language === 'en' ? 'zh' : 'en';
              i18n.changeLanguage(newLang);
              localStorage.setItem('app-language', newLang);
            }}
          >
            <Globe className="h-4 w-4 mr-2" />
            {i18n.language === 'en' ? 'English' : '中文'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
        {isFormOpen ? (
          <div className="p-8 max-w-md mx-auto w-full flex flex-col justify-center h-full">
            <h2 className="text-2xl font-bold mb-6">{t('New Connection')}</h2>
            <form onSubmit={handleSaveConnection} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('Name')} (Alias)</label>
                <Input value={formConfig.alias} onChange={e => setFormConfig({...formConfig, alias: e.target.value})} placeholder={t('Production Server')} />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3 space-y-2">
                  <label className="text-sm font-medium">{t('Host')}</label>
                  <Input required value={formConfig.host} onChange={e => setFormConfig({...formConfig, host: e.target.value})} placeholder="192.168.1.1" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('Port')}</label>
                  <Input required value={formConfig.port} onChange={e => setFormConfig({...formConfig, port: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('Username')}</label>
                <Input required value={formConfig.username} onChange={e => setFormConfig({...formConfig, username: e.target.value})} placeholder="root" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('Password')}</label>
                <Input type="password" value={formConfig.password} onChange={e => setFormConfig({...formConfig, password: e.target.value})} placeholder={t('Leave blank if using key (not fully supported yet)')} />
              </div>
              <div className="flex space-x-3 pt-4">
                <Button type="submit" className="flex-1">{t('Save Connection')}</Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsFormOpen(false)}>{t('Cancel')}</Button>
              </div>
            </form>
          </div>
        ) : !activeConnection ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            {loading ? (
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>{t('Connecting...')}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <Plug className="h-16 w-16 mb-4 opacity-20" />
                <p>{t('Select a connection from the sidebar or create a new one.')}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 border-b bg-card">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <Button variant="outline" size="icon" onClick={navigateUp} disabled={currentPath === '/' || fileLoading}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => loadFiles(currentPath)} disabled={fileLoading}>
                  <RefreshCcw className={`h-4 w-4 ${fileLoading ? 'animate-spin' : ''}`} />
                </Button>
                <div className="px-3 py-1.5 bg-muted rounded-md text-sm truncate flex-1 font-mono">
                  {currentPath}
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <Button variant="secondary" onClick={handleUploadFile}><FileUp className="h-4 w-4 mr-2" /> {t('Upload File')}</Button>
                <Button variant="secondary" onClick={handleUploadFolder}><FolderPlus className="h-4 w-4 mr-2" /> {t('Upload Folder')}</Button>
                <Button variant="secondary" onClick={handleMkdir}><Plus className="h-4 w-4 mr-2" /> {t('New Folder')}</Button>
                <Button variant="destructive" onClick={handleDisconnect}>{t('Disconnect')}</Button>
              </div>
            </div>

            {/* File List */}
            <ScrollArea 
              className="flex-1 bg-background" 
              onDrop={handleDrop} 
              onDragOver={handleDragOver}
            >
              {files.length === 0 && !fileLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-10">
                  <Folder className="h-12 w-12 opacity-20 mb-4" />
                  <p>{t('Directory is empty')}</p>
                  <p className="text-xs mt-2 opacity-50">{t('Drag and drop files here to upload')}</p>
                </div>
              ) : (
                <div className="min-w-full inline-block align-middle">
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground w-1/2 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('name')}>
                          <span className="inline-flex items-center">{t('Name')}<SortIcon column="name" /></span>
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('size')}>
                          <span className="inline-flex items-center">{t('Size')}<SortIcon column="size" /></span>
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('modifyTime')}>
                          <span className="inline-flex items-center">{t('Modified')}<SortIcon column="modifyTime" /></span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sortedFiles.map((file, i) => (
                        <ContextMenu key={i}>
                          <ContextMenuTrigger asChild>
                            <tr 
                              className="hover:bg-accent/50 cursor-pointer group transition-colors"
                              onDoubleClick={() => handleDoubleClick(file)}
                            >
                              <td className="px-4 py-3 flex items-center space-x-3">
                                {file.type === 'd' ? (
                                  <Folder className="h-5 w-5 text-blue-500 fill-blue-500/20" />
                                ) : (
                                  <FileIcon className="h-5 w-5 text-muted-foreground" />
                                )}
                                <span className="font-medium truncate">{file.name}</span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {file.type === 'd' ? '--' : formatBytes(file.size)}
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {new Date(file.modifyTime).toLocaleString()}
                              </td>
                            </tr>
                          </ContextMenuTrigger>
                          <ContextMenuContent className="w-48">
                            <ContextMenuItem onClick={() => handleDownload(file)}>
                              <Download className="mr-2 h-4 w-4" />
                              <span>{t('Download')}</span>
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => handleAddBookmark(file)}>
                              <Tag className="mr-2 h-4 w-4" />
                              <span>{t('Bookmark')}</span>
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => handleDelete(file)} className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>{t('Delete')}</span>
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ScrollArea>

            {/* Task Panel */}
            {tasks.length > 0 && (
              <div className="h-48 border-t bg-card flex flex-col flex-shrink-0">
                <div className="px-4 py-2 border-b flex items-center justify-between bg-muted/30">
                  <h3 className="font-medium text-sm flex items-center"><Play className="h-4 w-4 mr-2" />{t('Tasks')}</h3>
                  <Button variant="ghost" size="sm" onClick={clearCompletedTasks} className="h-7 text-xs">
                    {t('Clear Completed')}
                  </Button>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-2">
                    {tasks.map(task => (
                      <div key={task.id} className="bg-background border rounded-md p-3 flex flex-col space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2 truncate">
                            {task.type === 'upload' ? <Upload className="h-4 w-4 text-blue-500" /> : <Download className="h-4 w-4 text-green-500" />}
                            <span className="font-medium truncate max-w-[200px]" title={task.filename}>{task.filename}</span>
                            <span className="text-xs text-muted-foreground">
                              {task.status === 'completed' && <CheckCircle2 className="h-3 w-3 text-green-500 inline mr-1" />}
                              {task.status === 'error' && <XCircle className="h-3 w-3 text-red-500 inline mr-1" />}
                              {t(task.status)}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {formatBytes(task.transferredSize)} / {formatBytes(task.totalSize)}
                          </span>
                        </div>
                        {task.status === 'error' ? (
                          <div className="text-xs text-red-500 truncate">{task.error}</div>
                        ) : (
                          <Progress value={task.progress} className="h-1.5" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </div>

      {/* New Folder Dialog */}
      {showNewFolder && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg border w-80">
            <h3 className="text-lg font-medium mb-4">{t('New Folder')}</h3>
            <Input 
              value={newFolderName} 
              onChange={e => setNewFolderName(e.target.value)} 
              placeholder={t('Folder Name')}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') submitMkdir()
                if (e.key === 'Escape') setShowNewFolder(false)
              }}
            />
            <div className="flex justify-end space-x-2 mt-4">
              <Button variant="outline" onClick={() => setShowNewFolder(false)}>{t('Cancel')}</Button>
              <Button onClick={submitMkdir}>{t('Save')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {confirmDeleteFile && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg border w-80">
            <h3 className="text-lg font-medium mb-2">{t('Are you sure?')}</h3>
            <p className="text-sm text-muted-foreground mb-4 break-all">
              {t('This action cannot be undone.')}
              <br />
              <span className="font-semibold mt-1 inline-block">{confirmDeleteFile.name}</span>
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setConfirmDeleteFile(null)}>{t('Cancel')}</Button>
              <Button variant="destructive" onClick={() => executeDelete(confirmDeleteFile)}>{t('Delete')}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Sonner Toast Notifications */}
      <Toaster position="top-center" richColors closeButton />
    </div>
  )
}
