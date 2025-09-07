import { readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import ignore from 'ignore';
import { ProcessedFile, DiscoveryResults, ProgressInfo, ProcessingError } from '../shared/types.js';
import { FileUtils } from '../shared/file-utils.js';
import { GitIntegration } from '../shared/git-integration.js';
import { DEFAULT_OPTIONS } from '../shared/constants.js';

export class RepositoryScanner {
  private folderPath: string;
  private ignoreFilter: ReturnType<typeof ignore>;
  private gitIntegration: GitIntegration;
  private maxFileSize: number;
  private skipBinaryFiles: boolean;
  private concurrency: number;
  private errors: ProcessingError[] = [];
  private progressCallback?: (progress: ProgressInfo) => void;

  constructor(
    folderPath: string,
    options: {
      maxFileSize?: number;
      skipBinaryFiles?: boolean;
      concurrency?: number;
    } = {}
  ) {
    this.folderPath = folderPath;
    this.ignoreFilter = ignore();
    this.gitIntegration = new GitIntegration(folderPath);
    this.maxFileSize = options.maxFileSize || DEFAULT_OPTIONS.MAX_FILE_SIZE;
    this.skipBinaryFiles = options.skipBinaryFiles ?? DEFAULT_OPTIONS.SKIP_BINARY_FILES;
    this.concurrency = options.concurrency || DEFAULT_OPTIONS.CONCURRENCY;
    this.loadGitignore();
  }

  setProgressCallback(callback: (progress: ProgressInfo) => void) {
    this.progressCallback = callback;
  }

  getErrors(): ProcessingError[] {
    return [...this.errors];
  }

  clearErrors() {
    this.errors = [];
  }

  private async loadGitignore() {
    try {
      const { readFile } = await import('fs/promises');
      const gitignorePath = join(this.folderPath, '.gitignore');
      const gitignoreContent = await readFile(gitignorePath, 'utf-8');
      this.ignoreFilter.add(gitignoreContent);
    } catch {
      // No .gitignore file, use default patterns
    }

    // Add common ignore patterns
    this.ignoreFilter.add([
      'node_modules/',
      '.git/',
      'dist/',
      'build/',
      '.DS_Store',
      '*.log',
      '.env*',
      'coverage/',
      '.nyc_output/',
      '*.tmp',
      '*.temp',
      '*.cache',
      '.vscode/',
      '.idea/',
      '*.swp',
      '*.swo',
      '*~',
    ]);
  }

  async scanRepository(): Promise<DiscoveryResults> {
    console.log(`Scanning repository: ${this.folderPath}`);

    // Get all files recursively
    const files = await this.getAllFiles();
    console.log(`Found ${files.length} files to process`);

    // Get Git information
    const gitInfo = await this.gitIntegration.getGitInfo();

    // Process each file
    const processedFiles = await this.processFiles(files);

    // Find duplicate files
    const filePaths = processedFiles
      .filter(f => !f.isDirectory && !f.shouldSkip)
      .map(f => join(this.folderPath, f.path));
    const duplicates = await FileUtils.findDuplicateFiles(filePaths);

    // Calculate statistics
    const stats = this.calculateStats(processedFiles);

    return {
      files: processedFiles,
      gitInfo,
      duplicates,
      stats,
    };
  }

  private async getAllFiles(): Promise<string[]> {
    try {
      const files = await readdir(this.folderPath, { recursive: true });

      const filteredFiles = files.filter(file => {
        return !this.ignoreFilter.ignores(file);
      });

      return filteredFiles;
    } catch (error) {
      console.error(`Error reading directory ${this.folderPath}:`, error);
      return [];
    }
  }

  private async processFiles(files: string[]): Promise<ProcessedFile[]> {
    const processedFiles: ProcessedFile[] = [];
    const startTime = new Date();
    let processed = 0;

    // Process files in parallel batches
    for (let i = 0; i < files.length; i += this.concurrency) {
      const batch = files.slice(i, i + this.concurrency);

      const batchPromises = batch.map(async file => {
        try {
          const filePath = join(this.folderPath, file);
          const relativePath = file;
          const extension = extname(filePath).slice(1);

          // Check if it's a directory
          const stats = await stat(filePath);
          if (stats.isDirectory()) {
            return {
              path: filePath,
              relativePath,
              extension: '',
              fileInfo: {
                path: filePath,
                size: 0,
                encoding: 'utf-8',
                hash: '',
                isReadable: true,
                isBinary: false,
                lastModified: stats.mtime,
                permissions: stats.mode.toString(8),
              },
              gitInfo: null,
              isDirectory: true,
              shouldSkip: false,
            };
          }

          // Get file information
          const fileInfo = await FileUtils.getFileInfo(filePath);
          if (!fileInfo) {
            throw new Error(`Failed to get file info for ${file}`);
          }

          // Check if we should skip this file
          const skipCheck = FileUtils.shouldSkipFile(filePath, fileInfo.size);
          if (skipCheck.skip) {
            return {
              path: filePath,
              relativePath,
              extension,
              fileInfo,
              gitInfo: null,
              isDirectory: false,
              shouldSkip: true,
              skipReason: skipCheck.reason,
            };
          }

          // Skip binary files if configured
          if (this.skipBinaryFiles && fileInfo.isBinary) {
            return {
              path: filePath,
              relativePath,
              extension,
              fileInfo,
              gitInfo: null,
              isDirectory: false,
              shouldSkip: true,
              skipReason: 'Binary file',
            };
          }

          // Get Git information for the file
          const gitFileInfo = await this.gitIntegration.getFileGitInfo(filePath);

          return {
            path: filePath,
            relativePath,
            extension,
            fileInfo,
            gitInfo: gitFileInfo,
            isDirectory: false,
            shouldSkip: false,
          };
        } catch (error) {
          const processingError: ProcessingError = {
            file: file,
            error: error instanceof Error ? error.message : String(error),
            phase: 'file-scanning',
            timestamp: new Date(),
            recoverable: true,
            retryCount: 0,
          };
          this.errors.push(processingError);

          // Return a placeholder for failed files
          return {
            path: join(this.folderPath, file),
            relativePath: file,
            extension: extname(file).slice(1),
            fileInfo: {
              path: join(this.folderPath, file),
              size: 0,
              encoding: 'utf-8',
              hash: '',
              isReadable: false,
              isBinary: false,
              lastModified: new Date(),
              permissions: '000',
            },
            gitInfo: null,
            isDirectory: false,
            shouldSkip: true,
            skipReason: `Processing error: ${processingError.error}`,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      processedFiles.push(...batchResults);
      processed += batch.length;

      // Report progress
      if (this.progressCallback) {
        const elapsed = Date.now() - startTime.getTime();
        const estimatedTotal = (elapsed / processed) * files.length;
        const estimatedRemaining = estimatedTotal - elapsed;

        this.progressCallback({
          current: processed,
          total: files.length,
          percentage: Math.round((processed / files.length) * 100),
          currentFile: batch[batch.length - 1],
          phase: 'file-scanning',
          startTime,
          estimatedTimeRemaining: estimatedRemaining,
        });
      }
    }

    return processedFiles;
  }

  private calculateStats(files: ProcessedFile[]) {
    const stats = {
      totalFiles: files.length,
      directories: files.filter(f => f.isDirectory).length,
      actualFiles: files.filter(f => !f.isDirectory).length,
      skippedFiles: files.filter(f => f.shouldSkip).length,
      extensions: 0,
      byExtension: [] as Array<{ extension: string; count: number }>,
      fileSizeStats: {
        tiny: 0,
        small: 0,
        medium: 0,
        large: 0,
        huge: 0,
      },
      encodingStats: {} as { [encoding: string]: number },
    };

    // Group by extension
    const extensionCounts: { [ext: string]: number } = {};
    files.forEach(file => {
      if (!file.isDirectory && !file.shouldSkip) {
        const ext = file.extension || 'no-extension';
        extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;

        // File size statistics
        const sizeCategory = FileUtils.getFileSizeCategory(file.fileInfo.size);
        stats.fileSizeStats[sizeCategory as keyof typeof stats.fileSizeStats]++;

        // Encoding statistics
        stats.encodingStats[file.fileInfo.encoding] =
          (stats.encodingStats[file.fileInfo.encoding] || 0) + 1;
      }
    });

    stats.extensions = Object.keys(extensionCounts).length;
    stats.byExtension = Object.entries(extensionCounts)
      .map(([ext, count]) => ({ extension: ext, count }))
      .sort((a, b) => b.count - a.count);

    return stats;
  }

  // Get supported file extensions for scanning
  getSupportedExtensions(): string[] {
    return FileUtils.getSupportedExtensions();
  }

  // Check if a file should be processed
  shouldProcessFile(filePath: string, size: number): { process: boolean; reason?: string } {
    const skipCheck = FileUtils.shouldSkipFile(filePath, size);
    return {
      process: !skipCheck.skip,
      reason: skipCheck.reason,
    };
  }
}
