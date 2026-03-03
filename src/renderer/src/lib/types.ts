export type TransferTask = {
  id: string;
  type: 'upload' | 'download';
  filename: string;
  localPath: string;
  remotePath: string;
  status: 'pending' | 'transferring' | 'completed' | 'error';
  progress: number;
  totalSize: number;
  transferredSize: number;
  error?: string;
};
