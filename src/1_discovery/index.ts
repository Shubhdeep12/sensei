import { RepositoryScanner } from "./repository-scanner.js";
import { FileProcessor } from "./file-processor.js";
import { DiscoveryResults, ProcessedFile, ProgressInfo, ProcessingError } from "../shared/types.js";
import { DEFAULT_OPTIONS, PROCESSING_PHASES } from "../shared/constants.js";

export class DiscoveryProcessor {
  private scanner: RepositoryScanner;
  private processor: FileProcessor;
  private progressCallback?: (progress: ProgressInfo) => void;
  private errors: ProcessingError[] = [];

  constructor(folderPath: string, options: {
    maxFileSize?: number;
    skipBinaryFiles?: boolean;
    concurrency?: number;
  } = {}) {
    this.scanner = new RepositoryScanner(folderPath, options);
    this.processor = new FileProcessor(
      options.maxFileSize || DEFAULT_OPTIONS.MAX_FILE_SIZE, 
      options.concurrency || DEFAULT_OPTIONS.CONCURRENCY
    );
  }

  setProgressCallback(callback: (progress: ProgressInfo) => void) {
    this.progressCallback = callback;
    this.scanner.setProgressCallback(callback);
    this.processor.setProgressCallback(callback);
  }

  getErrors(): ProcessingError[] {
    return [
      ...this.scanner.getErrors(),
      ...this.processor.getErrors(),
      ...this.errors
    ];
  }

  clearErrors() {
    this.scanner.clearErrors();
    this.processor.clearErrors();
    this.errors = [];
  }

  async process(): Promise<DiscoveryResults & {
    processedFiles: Array<ProcessedFile & {
      content: string | null;
      processingSuccess: boolean;
      processingError?: string;
      metadata?: {
        lineCount: number;
        wordCount: number;
        characterCount: number;
        nonEmptyLines: number;
        commentLines: number;
        codeLines: number;
        language: string;
        isConfigFile: boolean;
        isTestFile: boolean;
        isDocumentationFile: boolean;
      };
    }>;
    errors: ProcessingError[];
  }> {
    console.log("=== PHASE 1: DATA INGESTION & DISCOVERY ===");
    
    try {
      // Step 1: Scan repository
      console.log("🔍 Scanning repository...");
      const scanResults = await this.scanner.scanRepository();
      console.log(`Scanned ${scanResults.files.length} files`);
      console.log(`Found ${scanResults.stats.actualFiles} actual files`);
      console.log(`Skipped ${scanResults.stats.skippedFiles} files`);

      // Step 2: Process files (read content, extract metadata)
      console.log("📄 Processing files...");
      const processedFiles = await this.processor.processFiles(scanResults.files);
      
      // Step 3: Add metadata to each file
      console.log("🏷️  Enriching files with metadata...");
      const enrichedFiles = processedFiles.map(file => {
        try {
          if (file.content) {
            const metadata = this.processor.extractFileMetadata(file.content, file);
            const language = this.processor.detectLanguage(file, file.content);
            
            return {
              ...file,
              metadata: {
                ...metadata,
                language,
                isConfigFile: this.processor.isConfigFile(file),
                isTestFile: this.processor.isTestFile(file),
                isDocumentationFile: this.processor.isDocumentationFile(file)
              }
            };
          }
          return file;
        } catch (error) {
          const processingError: ProcessingError = {
            file: file.path,
            error: error instanceof Error ? error.message : String(error),
            phase: PROCESSING_PHASES.DISCOVERY,
            timestamp: new Date(),
            recoverable: true,
            retryCount: 0
          };
          this.errors.push(processingError);
          
          return {
            ...file,
            processingSuccess: false,
            processingError: processingError.error
          };
        }
      });

      // Step 4: Generate summary
      this.printSummary(scanResults, enrichedFiles);

      // Step 5: Report errors if any
      const allErrors = this.getErrors();
      if (allErrors.length > 0) {
        console.log(`\n⚠️  Processing completed with ${allErrors.length} errors:`);
        allErrors.forEach(error => {
          console.log(`  - ${error.file}: ${error.error} (${error.phase})`);
        });
      }

      return {
        ...scanResults,
        processedFiles: enrichedFiles,
        errors: allErrors
      };
    } catch (error) {
      const processingError: ProcessingError = {
        file: 'discovery-processor',
        error: error instanceof Error ? error.message : String(error),
        phase: PROCESSING_PHASES.DISCOVERY,
        timestamp: new Date(),
        recoverable: false,
        retryCount: 0
      };
      this.errors.push(processingError);
      
      console.error("❌ Discovery phase failed:", error);
      throw error;
    }
  }

  private printSummary(scanResults: DiscoveryResults, processedFiles: any[]) {
    console.log("\n=== DISCOVERY SUMMARY ===");
    console.log(`Total items: ${scanResults.stats.totalFiles}`);
    console.log(`Directories: ${scanResults.stats.directories}`);
    console.log(`Actual files: ${scanResults.stats.actualFiles}`);
    console.log(`Skipped files: ${scanResults.stats.skippedFiles}`);
    console.log(`File types found: ${scanResults.stats.extensions}`);

    // Git information
    if (scanResults.gitInfo.isGitRepo) {
      console.log("\nGit Repository Info:");
      console.log(`Current branch: ${scanResults.gitInfo.currentBranch}`);
      console.log(`Total branches: ${scanResults.gitInfo.branches.length}`);
      console.log(`Total tags: ${scanResults.gitInfo.tags.length}`);
      console.log(`Total commits: ${scanResults.gitInfo.commitCount}`);
      if (scanResults.gitInfo.remoteUrl) {
        console.log(`Remote URL: ${scanResults.gitInfo.remoteUrl}`);
      }
    }

    // File size statistics
    console.log("\nFile Size Distribution:");
    console.log(`Tiny (<1KB): ${scanResults.stats.fileSizeStats.tiny}`);
    console.log(`Small (1KB-1MB): ${scanResults.stats.fileSizeStats.small}`);
    console.log(`Medium (1MB-10MB): ${scanResults.stats.fileSizeStats.medium}`);
    console.log(`Large (10MB-100MB): ${scanResults.stats.fileSizeStats.large}`);
    console.log(`Huge (>100MB): ${scanResults.stats.fileSizeStats.huge}`);

    // Encoding statistics
    console.log("\nFile Encoding Distribution:");
    Object.entries(scanResults.stats.encodingStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([encoding, count]) => {
        console.log(`  ${encoding}: ${count} files`);
      });

    // Language distribution
    const languageStats: { [language: string]: number } = {};
    processedFiles.forEach(file => {
      if (file.metadata?.language) {
        languageStats[file.metadata.language] = (languageStats[file.metadata.language] || 0) + 1;
      }
    });

    console.log("\nLanguage Distribution:");
    Object.entries(languageStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([language, count]) => {
        console.log(`  ${language}: ${count} files`);
      });

    // File type distribution
    const fileTypeStats = {
      configFiles: processedFiles.filter(f => f.metadata?.isConfigFile).length,
      testFiles: processedFiles.filter(f => f.metadata?.isTestFile).length,
      documentationFiles: processedFiles.filter(f => f.metadata?.isDocumentationFile).length,
      codeFiles: processedFiles.filter(f => 
        f.metadata?.language && 
        !f.metadata.isConfigFile && 
        !f.metadata.isTestFile && 
        !f.metadata.isDocumentationFile
      ).length
    };

    console.log("\nFile Type Distribution:");
    console.log(`Code files: ${fileTypeStats.codeFiles}`);
    console.log(`Config files: ${fileTypeStats.configFiles}`);
    console.log(`Test files: ${fileTypeStats.testFiles}`);
    console.log(`Documentation files: ${fileTypeStats.documentationFiles}`);

    // Duplicate files
    if (scanResults.duplicates.length > 0) {
      console.log("\nDuplicate Files Found:");
      console.log(`Total duplicate groups: ${scanResults.duplicates.length}`);
      scanResults.duplicates.forEach(dup => {
        console.log(`  Hash: ${dup.hash.substring(0, 8)}... (${dup.files.length} files, ${dup.size} bytes)`);
      });
    }

    console.log("\n=== DISCOVERY COMPLETE ===");
  }

  // Get files ready for Analysis phase
  getFilesForAnalysis(processedFiles: any[]): ProcessedFile[] {
    return processedFiles
      .filter(file => 
        !file.isDirectory && 
        !file.shouldSkip && 
        file.processingSuccess && 
        file.content
      )
      .map(file => ({
        path: file.path,
        relativePath: file.relativePath,
        extension: file.extension,
        fileInfo: file.fileInfo,
        gitInfo: file.gitInfo,
        isDirectory: file.isDirectory,
        shouldSkip: file.shouldSkip,
        skipReason: file.skipReason
      }));
  }
}

// Export for use in main orchestrator
export { RepositoryScanner, FileProcessor };
export type { DiscoveryResults, ProcessedFile };
