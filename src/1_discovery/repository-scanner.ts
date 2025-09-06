import { readdir, stat } from "fs/promises";
import { join, extname } from "path";
import ignore from "ignore";
import { ProcessedFile, DiscoveryResults } from "../shared/types.js";
import { FileUtils } from "../shared/file-utils.js";
import { GitIntegration } from "../shared/git-integration.js";

export class RepositoryScanner {
  private folderPath: string;
  private ignoreFilter: ReturnType<typeof ignore>;
  private gitIntegration: GitIntegration;
  private maxFileSize: number;
  private skipBinaryFiles: boolean;

  constructor(folderPath: string, options: {
    maxFileSize?: number;
    skipBinaryFiles?: boolean;
  } = {}) {
    this.folderPath = folderPath;
    this.ignoreFilter = ignore();
    this.gitIntegration = new GitIntegration(folderPath);
    this.maxFileSize = options.maxFileSize || 100 * 1024 * 1024; // 100MB
    this.skipBinaryFiles = options.skipBinaryFiles ?? true;
    this.loadGitignore();
  }

  private async loadGitignore() {
    try {
      const { readFile } = await import("fs/promises");
      const gitignorePath = join(this.folderPath, ".gitignore");
      const gitignoreContent = await readFile(gitignorePath, "utf-8");
      this.ignoreFilter.add(gitignoreContent);
    } catch {
      // No .gitignore file, use default patterns
    }
    
    // Add common ignore patterns
    this.ignoreFilter.add([
      "node_modules/",
      ".git/",
      "dist/",
      "build/",
      ".DS_Store",
      "*.log",
      ".env*",
      "coverage/",
      ".nyc_output/",
      "*.tmp",
      "*.temp",
      "*.cache",
      ".vscode/",
      ".idea/",
      "*.swp",
      "*.swo",
      "*~"
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
      stats
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

    for (const file of files) {
      try {
        const filePath = join(this.folderPath, file);
        const relativePath = file;
        const extension = extname(filePath).slice(1);
        
        // Check if it's a directory
        const stats = await stat(filePath);
        if (stats.isDirectory()) {
          processedFiles.push({
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
              permissions: stats.mode.toString(8)
            },
            gitInfo: null,
            isDirectory: true,
            shouldSkip: false
          });
          continue;
        }

        // Get file information
        const fileInfo = await FileUtils.getFileInfo(filePath);
        if (!fileInfo) {
          console.warn(`Failed to get file info for ${file}`);
          continue;
        }

        // Check if we should skip this file
        const skipCheck = FileUtils.shouldSkipFile(filePath, fileInfo.size);
        if (skipCheck.skip) {
          processedFiles.push({
            path: filePath,
            relativePath,
            extension,
            fileInfo,
            gitInfo: null,
            isDirectory: false,
            shouldSkip: true,
            skipReason: skipCheck.reason
          });
          continue;
        }

        // Skip binary files if configured
        if (this.skipBinaryFiles && fileInfo.isBinary) {
          processedFiles.push({
            path: filePath,
            relativePath,
            extension,
            fileInfo,
            gitInfo: null,
            isDirectory: false,
            shouldSkip: true,
            skipReason: 'Binary file'
          });
          continue;
        }

        // Get Git information for the file
        const gitFileInfo = await this.gitIntegration.getFileGitInfo(filePath);

        processedFiles.push({
          path: filePath,
          relativePath,
          extension,
          fileInfo,
          gitInfo: gitFileInfo,
          isDirectory: false,
          shouldSkip: false
        });

      } catch (error) {
        console.warn(`Failed to process file ${file}:`, error);
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
        huge: 0
      },
      encodingStats: {} as { [encoding: string]: number }
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
      reason: skipCheck.reason
    };
  }
}
