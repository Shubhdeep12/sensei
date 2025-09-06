import { readFile } from "fs/promises";
import { ProcessedFile } from "../shared/types.js";
import { FileUtils } from "../shared/file-utils.js";

export class FileProcessor {
  private maxFileSize: number;

  constructor(maxFileSize: number = 100 * 1024 * 1024) {
    this.maxFileSize = maxFileSize;
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
    const results = [];

    for (const file of files) {
      const result = await this.processFile(file);
      results.push({
        ...file,
        content: result.content,
        processingSuccess: result.success,
        processingError: result.error
      });
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
    
    // Language detection based on file extension
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'groovy': 'groovy',
      'css': 'css',
      'scss': 'scss',
      'html': 'html',
      'xml': 'xml',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
      'dockerfile': 'dockerfile'
    };

    return languageMap[ext] || 'text';
  }

  // Check if file is likely to be a configuration file
  isConfigFile(file: ProcessedFile): boolean {
    const configExtensions = [
      'json', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'properties',
      'env', 'env.local', 'env.production', 'env.development',
      'dockerfile', 'docker-compose.yml', 'package.json', 'tsconfig.json',
      'webpack.config.js', 'babel.config.js', 'eslint.config.js'
    ];

    return configExtensions.includes(file.extension.toLowerCase()) ||
           file.relativePath.includes('config') ||
           file.relativePath.includes('settings');
  }

  // Check if file is likely to be a test file
  isTestFile(file: ProcessedFile): boolean {
    const testPatterns = [
      'test', 'spec', 'specs', '__tests__', 'tests',
      '.test.', '.spec.', '.e2e.', '.integration.'
    ];

    return testPatterns.some(pattern => 
      file.relativePath.toLowerCase().includes(pattern)
    );
  }

  // Check if file is likely to be a documentation file
  isDocumentationFile(file: ProcessedFile): boolean {
    const docExtensions = ['md', 'markdown', 'rst', 'txt', 'adoc'];
    const docPatterns = ['readme', 'changelog', 'license', 'contributing', 'docs'];

    return docExtensions.includes(file.extension.toLowerCase()) ||
           docPatterns.some(pattern => 
             file.relativePath.toLowerCase().includes(pattern)
           );
  }
}
