import { createHash } from 'crypto';
import { readFile, stat, access, constants } from 'fs/promises';
import { detect } from 'chardet';
import { join } from 'path';

export interface FileInfo {
  path: string;
  size: number;
  encoding: string;
  hash: string;
  isReadable: boolean;
  isBinary: boolean;
  lastModified: Date;
  permissions: string;
}

export interface DuplicateFile {
  hash: string;
  files: string[];
  size: number;
}

export class FileUtils {
  private static readonly LARGE_FILE_THRESHOLD = 10 * 1024 * 1024; // 10MB
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly BINARY_EXTENSIONS = new Set([
    'exe', 'dll', 'so', 'dylib', 'bin', 'obj', 'o', 'a', 'lib',
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'ico', 'svg',
    'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm',
    'mp3', 'wav', 'flac', 'aac', 'ogg', 'wma',
    'zip', 'tar', 'gz', 'bz2', '7z', 'rar', 'dmg', 'iso',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'ttf', 'otf', 'woff', 'woff2', 'eot'
  ]);

  static async getFileInfo(filePath: string): Promise<FileInfo | null> {
    try {
      const stats = await stat(filePath);
      const size = stats.size;
      
      // Check if file is readable
      let isReadable = false;
      try {
        await access(filePath, constants.R_OK);
        isReadable = true;
      } catch {
        isReadable = false;
      }

      // Detect encoding
      let encoding = 'utf-8';
      if (isReadable && size > 0 && size < this.LARGE_FILE_THRESHOLD) {
        try {
          const buffer = await readFile(filePath);
          const detected = detect(buffer);
          // Map detected encodings to Node.js supported encodings
          if (detected) {
            if (detected.includes('ISO-8859-1') || detected.includes('windows-1252')) {
              encoding = 'latin1';
            } else if (detected.includes('ISO-8859-2') || detected.includes('windows-1250')) {
              encoding = 'latin1';
            } else if (detected.includes('EUC-KR')) {
              encoding = 'utf-8'; // Fallback to UTF-8
            } else if (detected === 'UTF-8' || detected === 'utf-8') {
              encoding = 'utf-8';
            } else {
              encoding = 'utf-8'; // Default fallback
            }
          }
        } catch {
          encoding = 'utf-8';
        }
      }

      // Check if binary
      const ext = filePath.split('.').pop()?.toLowerCase() || '';
      const isBinary = this.BINARY_EXTENSIONS.has(ext) || await this.isBinaryContent(filePath, size);

      // Generate hash
      const hash = await this.generateFileHash(filePath, size);

      return {
        path: filePath,
        size,
        encoding,
        hash,
        isReadable,
        isBinary,
        lastModified: stats.mtime,
        permissions: stats.mode.toString(8)
      };
    } catch (error) {
      console.warn(`Failed to get file info for ${filePath}:`, error);
      return null;
    }
  }

  private static async isBinaryContent(filePath: string, size: number): Promise<boolean> {
    if (size === 0) return false;
    
    try {
      const buffer = await readFile(filePath);
      const sampleSize = Math.min(8192, size);
      const sample = buffer.subarray(0, sampleSize);
      
      // Check for null bytes or high percentage of non-printable characters
      let nullBytes = 0;
      let nonPrintable = 0;
      
      for (let i = 0; i < sample.length; i++) {
        const byte = sample[i];
        if (byte === 0) nullBytes++;
        if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) nonPrintable++;
      }
      
      return nullBytes > 0 || (nonPrintable / sample.length) > 0.3;
    } catch {
      return false;
    }
  }

  private static async generateFileHash(filePath: string, size: number): Promise<string> {
    try {
      if (size > this.LARGE_FILE_THRESHOLD) {
        // For large files, hash only the first and last chunks
        const chunkSize = 64 * 1024; // 64KB
        const buffer = await readFile(filePath);
        const firstChunk = buffer.subarray(0, chunkSize);
        const lastChunk = size > chunkSize * 2 
          ? buffer.subarray(size - chunkSize, size)
          : Buffer.alloc(0);
        
        const combined = Buffer.concat([firstChunk, lastChunk]);
        return createHash('sha256').update(combined).digest('hex');
      } else {
        const buffer = await readFile(filePath);
        return createHash('sha256').update(buffer).digest('hex');
      }
    } catch {
      return '';
    }
  }

  static async findDuplicateFiles(filePaths: string[]): Promise<DuplicateFile[]> {
    const hashMap = new Map<string, string[]>();
    
    for (const filePath of filePaths) {
      const fileInfo = await this.getFileInfo(filePath);
      if (fileInfo && fileInfo.hash) {
        if (!hashMap.has(fileInfo.hash)) {
          hashMap.set(fileInfo.hash, []);
        }
        hashMap.get(fileInfo.hash)!.push(filePath);
      }
    }

    const duplicates: DuplicateFile[] = [];
    for (const [hash, files] of hashMap.entries()) {
      if (files.length > 1) {
        const firstFile = await this.getFileInfo(files[0]);
        duplicates.push({
          hash,
          files,
          size: firstFile?.size || 0
        });
      }
    }

    return duplicates;
  }

  static shouldSkipFile(filePath: string, size: number): { skip: boolean; reason?: string } {
    if (size > this.MAX_FILE_SIZE) {
      return { skip: true, reason: 'File too large' };
    }

    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    if (this.BINARY_EXTENSIONS.has(ext)) {
      return { skip: true, reason: 'Binary file' };
    }

    return { skip: false };
  }

  static async readFileSafely(filePath: string, maxSize: number = this.MAX_FILE_SIZE): Promise<string | null> {
    try {
      const stats = await stat(filePath);
      if (stats.size > maxSize) {
        console.warn(`File ${filePath} too large (${stats.size} bytes), skipping`);
        return null;
      }

      const fileInfo = await this.getFileInfo(filePath);
      if (!fileInfo || !fileInfo.isReadable) {
        return null;
      }

      const buffer = await readFile(filePath);
      return buffer.toString(fileInfo.encoding as BufferEncoding);
    } catch (error) {
      console.warn(`Failed to read file ${filePath}:`, error);
      return null;
    }
  }

  static getFileSizeCategory(size: number): string {
    if (size === 0) return 'empty';
    if (size < 1024) return 'tiny';
    if (size < 1024 * 1024) return 'small';
    if (size < 10 * 1024 * 1024) return 'medium';
    if (size < 100 * 1024 * 1024) return 'large';
    return 'huge';
  }
}
