import { readFile } from "fs/promises";
import { ProcessedFile, ProgressInfo, ProcessingError } from "../shared/types.js";
import { FileUtils } from "../shared/file-utils.js";
import { 
  LANGUAGE_MAP, 
  TEST_PATTERNS, 
  DOCUMENTATION_PATTERNS, 
  CONFIG_PATTERNS,
  COMMENT_PATTERNS,
  DEFAULT_OPTIONS 
} from "../shared/constants.js";

export class FileProcessor {
  private maxFileSize: number;
  private concurrency: number;
  private errors: ProcessingError[] = [];
  private progressCallback?: (progress: ProgressInfo) => void;

  constructor(maxFileSize: number = DEFAULT_OPTIONS.MAX_FILE_SIZE, concurrency: number = DEFAULT_OPTIONS.CONCURRENCY) {
    this.maxFileSize = maxFileSize;
    this.concurrency = concurrency;
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

  async processFile(file: ProcessedFile): Promise<{
    content: string | null;
    success: boolean;
    error?: string;
  }> {
    if (file.isDirectory || file.shouldSkip) {
      return {
        content: null,
        success: true
      };
    }

    try {
      // Read file content with proper encoding
      const content = await FileUtils.readFileSafely(file.path, this.maxFileSize);
      
      if (content === null) {
        return {
          content: null,
          success: false,
          error: 'Failed to read file content'
        };
      }

      return {
        content,
        success: true
      };
    } catch (error) {
      return {
        content: null,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async processFiles(files: ProcessedFile[]): Promise<Array<ProcessedFile & {
    content: string | null;
    processingSuccess: boolean;
    processingError?: string;
  }>> {
    const results: Array<ProcessedFile & {
      content: string | null;
      processingSuccess: boolean;
      processingError?: string;
    }> = [];
    
    const startTime = new Date();
    let processed = 0;

    // Process files in parallel batches
    for (let i = 0; i < files.length; i += this.concurrency) {
      const batch = files.slice(i, i + this.concurrency);
      
      const batchPromises = batch.map(async (file) => {
        try {
          const result = await this.processFile(file);
          return {
            ...file,
            content: result.content,
            processingSuccess: result.success,
            processingError: result.error
          };
        } catch (error) {
          const processingError: ProcessingError = {
            file: file.path,
            error: error instanceof Error ? error.message : String(error),
            phase: 'file-processing',
            timestamp: new Date(),
            recoverable: false,
            retryCount: 0
          };
          this.errors.push(processingError);
          
          return {
            ...file,
            content: null,
            processingSuccess: false,
            processingError: processingError.error
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
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
          currentFile: batch[batch.length - 1]?.relativePath,
          phase: 'file-processing',
          startTime,
          estimatedTimeRemaining: estimatedRemaining
        });
      }
    }

    return results;
  }

  // Validate file content before processing
  validateFileContent(content: string, fileInfo: ProcessedFile): {
    valid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Check for suspicious content
    if (content.length === 0) {
      warnings.push('File is empty');
    }

    // Check for very long lines (potential parsing issues)
    const lines = content.split('\n');
    const longLines = lines.filter(line => line.length > 1000);
    if (longLines.length > 0) {
      warnings.push(`File contains ${longLines.length} very long lines (>1000 chars)`);
    }

    // Check for encoding issues
    if (content.includes('\uFFFD')) {
      warnings.push('File contains replacement characters (encoding issues)');
    }

    // Check for mixed line endings
    const hasCRLF = content.includes('\r\n');
    const hasLF = content.includes('\n') && !hasCRLF;
    if (hasCRLF && hasLF) {
      warnings.push('File contains mixed line endings');
    }

    return {
      valid: warnings.length === 0,
      warnings
    };
  }

  // Extract basic file metadata
  extractFileMetadata(content: string, file: ProcessedFile): {
    lineCount: number;
    wordCount: number;
    characterCount: number;
    nonEmptyLines: number;
    commentLines: number;
    codeLines: number;
  } {
    const lines = content.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    
    // Basic comment detection (language agnostic)
    const commentLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('//') || 
             trimmed.startsWith('#') || 
             trimmed.startsWith('/*') ||
             trimmed.startsWith('*') ||
             trimmed.startsWith('<!--');
    });

    const codeLines = nonEmptyLines.length - commentLines.length;

    return {
      lineCount: lines.length,
      wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
      characterCount: content.length,
      nonEmptyLines: nonEmptyLines.length,
      commentLines: commentLines.length,
      codeLines: Math.max(0, codeLines)
    };
  }

  // Detect file language based on content and extension
  detectLanguage(file: ProcessedFile, content: string): string {
    const ext = file.extension.toLowerCase();
    return LANGUAGE_MAP[ext] || 'text';
  }

  // Check if file is likely to be a configuration file
  isConfigFile(file: ProcessedFile): boolean {
    const ext = file.extension.toLowerCase();
    const path = file.relativePath.toLowerCase();
    
    // Check extension
    const configExtensions = ['json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'properties', 'env'];
    if (configExtensions.includes(ext)) {
      return true;
    }
    
    // Check path patterns
    return CONFIG_PATTERNS.some(pattern => path.includes(pattern));
  }

  // Check if file is likely to be a test file
  isTestFile(file: ProcessedFile): boolean {
    return TEST_PATTERNS.some(pattern => 
      file.relativePath.toLowerCase().includes(pattern)
    );
  }

  // Check if file is likely to be a documentation file
  isDocumentationFile(file: ProcessedFile): boolean {
    const ext = file.extension.toLowerCase();
    const path = file.relativePath.toLowerCase();
    
    // Check extension
    const docExtensions = ['md', 'markdown', 'rst', 'txt', 'adoc'];
    if (docExtensions.includes(ext)) {
      return true;
    }
    
    // Check path patterns
    return DOCUMENTATION_PATTERNS.some(pattern => path.includes(pattern));
  }
}
