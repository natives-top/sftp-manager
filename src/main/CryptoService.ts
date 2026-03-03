import { safeStorage } from 'electron';
import crypto from 'crypto';

const FALLBACK_KEY = crypto.scryptSync('sftp-manager-fallback-key-2024', 'salt', 32);

export class CryptoService {
  encrypt(text: string): string {
    if (!text) return text;
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(text).toString('base64');
    }
    // Fallback AES-256-GCM
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', FALLBACK_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `fallback|${iv.toString('hex')}|${authTag}|${encrypted}`;
  }

  decrypt(encryptedData: string): string {
    if (!encryptedData) return encryptedData;
    if (encryptedData.startsWith('fallback|')) {
      try {
        const parts = encryptedData.split('|');
        const iv = Buffer.from(parts[1], 'hex');
        const authTag = Buffer.from(parts[2], 'hex');
        const encryptedText = parts[3];
        const decipher = crypto.createDecipheriv('aes-256-gcm', FALLBACK_KEY, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch (e) {
        console.error('Fallback decryption failed', e);
        return '';
      }
    }
    
    if (safeStorage && safeStorage.isEncryptionAvailable()) {
      try {
        return safeStorage.decryptString(Buffer.from(encryptedData, 'base64'));
      } catch (e) {
        console.error('safeStorage decryption failed', e);
        return '';
      }
    }
    return '';
  }
}
