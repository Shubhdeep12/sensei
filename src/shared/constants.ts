/**
 * SHARED CONSTANTS
 * 
 * Centralized constants used across all phases of the Sensei pipeline
 * This ensures consistency and makes maintenance easier
 */

// File extensions supported by the pipeline
// PHASE STRATEGY:
// Phase 1 (Discovery): Process ALL file types
// Phase 2 (Analysis): CORE languages get full Tree-sitter analysis, SECONDARY get basic analysis
// Phase 3 (Embedding): Embed ALL files with different strategies based on language priority

// CORE LANGUAGES: Only these get full Tree-sitter analysis in Phase 2
export const CORE_LANGUAGES = {
  // Frontend Web
  JAVASCRIPT: ['js', 'jsx', 'mjs', 'cjs'],
  TYPESCRIPT: ['ts', 'tsx', 'mts', 'cts'],
  HTML: ['html', 'htm', 'xhtml'],
  CSS: ['css', 'scss', 'sass', 'less'],
  
  // Backend Web
  PYTHON: ['py', 'pyw', 'pyi'],
  
  // Data & Config
  JSON: ['json', 'jsonc'],
  YAML: ['yaml', 'yml'],
  ENV: ['env', 'env.local', 'env.production', 'env.development']
} as const;

// SECONDARY LANGUAGES: Everything else - basic analysis in Phase 2
export const SECONDARY_LANGUAGES = {
  // Backend
  JAVA: ['java'],
  GO: ['go'],
  PHP: ['php', 'phtml'],
  RUST: ['rs'],
  CSHARP: ['cs'],
  RUBY: ['rb', 'rbw'],
  SCALA: ['scala', 'sc'],
  GROOVY: ['groovy', 'gvy'],
  
  // Mobile
  SWIFT: ['swift'],
  KOTLIN: ['kt', 'kts'],
  
  // System
  CPP: ['cpp', 'cc', 'cxx', 'c++'],
  C: ['c', 'h'],
  
  // Database
  SQL: ['sql', 'psql', 'mysql', 'sqlite'],
  
  // Infrastructure
  DOCKERFILE: ['dockerfile', 'Dockerfile'],
  SHELL: ['sh', 'bash', 'zsh'],
  
  // Data
  XML: ['xml', 'xsd', 'xslt'],
  TOML: ['toml'],
  INI: ['ini', 'cfg', 'conf'],
  PROPERTIES: ['properties', 'props'],
  
  // Documentation
  MARKDOWN: ['md', 'markdown', 'mdown', 'mkdn'],
  RESTRUCTURED_TEXT: ['rst', 'rest'],
  TEXT: ['txt', 'text'],
  ADOC: ['adoc', 'asciidoc'],
  
  // Other
  LOG: ['log'],
  LOCK: ['lock'],
  IGNORE: ['gitignore', 'dockerignore', 'eslintignore']
} as const;

// SUPPORTED_EXTENSIONS: Combination of CORE and SECONDARY languages
export const SUPPORTED_EXTENSIONS = {
  ...CORE_LANGUAGES,
  ...SECONDARY_LANGUAGES
} as const;

// LANGUAGE PRIORITY LEVELS
export const LANGUAGE_PRIORITY = {
  CORE: 1,      // Phase 2: Full Tree-sitter analysis
  SECONDARY: 2  // Phase 2: Basic analysis only
} as const;

// Flatten all extensions into arrays for easy lookup
export const ALL_SUPPORTED_EXTENSIONS = Object.values(SUPPORTED_EXTENSIONS).flat();

// CORE EXTENSIONS: Only these get full Tree-sitter analysis in Phase 2
export const CORE_EXTENSIONS = Object.values(CORE_LANGUAGES).flat();

// SECONDARY EXTENSIONS: Everything else - basic analysis in Phase 2
export const SECONDARY_EXTENSIONS = Object.values(SECONDARY_LANGUAGES).flat();

// Helper functions for language priority
export const getLanguagePriority = (extension: string): number => {
  if (CORE_EXTENSIONS.some(ext => ext === extension)) return LANGUAGE_PRIORITY.CORE;
  return LANGUAGE_PRIORITY.SECONDARY; // Everything else is secondary
};

export const isCoreLanguage = (extension: string): boolean => {
  return CORE_EXTENSIONS.some(ext => ext === extension);
};

export const isSecondaryLanguage = (extension: string): boolean => {
  return !isCoreLanguage(extension); // Everything that's not core is secondary
};

// File types for categorization
export const FILE_TYPES = {
  SOURCE_CODE: 'source_code',
  CONFIG: 'config',
  TEST: 'test',
  DOCUMENTATION: 'documentation',
  BUILD: 'build',
  DATA: 'data',
  LOG: 'log',
  TEMPORARY: 'temporary',
  BINARY: 'binary',
  IGNORED: 'ignored'
} as const;

// Language detection mapping
export const LANGUAGE_MAP: Record<string, string> = {
  // JavaScript
  'js': 'javascript',
  'jsx': 'javascript',
  'mjs': 'javascript',
  'cjs': 'javascript',
  
  // TypeScript
  'ts': 'typescript',
  'tsx': 'typescript',
  'mts': 'typescript',
  'cts': 'typescript',
  
  // Python
  'py': 'python',
  'pyw': 'python',
  'pyi': 'python',
  
  // Java
  'java': 'java',
  
  // C#
  'cs': 'csharp',
  
  // Go
  'go': 'go',
  
  // Rust
  'rs': 'rust',
  
  // C/C++
  'c': 'c',
  'h': 'c',
  'cpp': 'cpp',
  'cc': 'cpp',
  'cxx': 'cpp',
  'c++': 'cpp',
  
  // PHP
  'php': 'php',
  'phtml': 'php',
  
  // Ruby
  'rb': 'ruby',
  'rbw': 'ruby',
  
  // Swift
  'swift': 'swift',
  
  // Kotlin
  'kt': 'kotlin',
  'kts': 'kotlin',
  
  // Scala
  'scala': 'scala',
  'sc': 'scala',
  
  // Groovy
  'groovy': 'groovy',
  'gvy': 'groovy',
  
  // Web
  'html': 'html',
  'htm': 'html',
  'xhtml': 'html',
  'css': 'css',
  'scss': 'scss',
  'sass': 'sass',
  'less': 'less',
  'xml': 'xml',
  'xsd': 'xml',
  'xslt': 'xml',
  
  // Data
  'json': 'json',
  'jsonc': 'json',
  'yaml': 'yaml',
  'yml': 'yaml',
  'toml': 'toml',
  'ini': 'ini',
  'cfg': 'ini',
  'conf': 'ini',
  'properties': 'properties',
  'props': 'properties',
  
  // Documentation
  'md': 'markdown',
  'markdown': 'markdown',
  'mdown': 'markdown',
  'mkdn': 'markdown',
  'rst': 'restructuredtext',
  'rest': 'restructuredtext',
  'txt': 'text',
  'text': 'text',
  'adoc': 'asciidoc',
  'asciidoc': 'asciidoc',
  
  // Configuration
  'dockerfile': 'dockerfile',
  'Dockerfile': 'dockerfile',
  'makefile': 'makefile',
  'Makefile': 'makefile',
  'mk': 'makefile',
  'env': 'environment',
  'env.local': 'environment',
  'env.production': 'environment',
  'env.development': 'environment',
  
  // Shell
  'sh': 'shell',
  'bash': 'shell',
  'zsh': 'shell',
  'fish': 'shell',
  'csh': 'shell',
  'tcsh': 'shell',
  
  // SQL
  'sql': 'sql',
  'psql': 'sql',
  'mysql': 'sql',
  'sqlite': 'sql',
  
  // Other
  'log': 'log',
  'lock': 'lock',
  'gitignore': 'ignore',
  'dockerignore': 'ignore',
  'eslintignore': 'ignore'
} as const;

// Binary file extensions that should be skipped
export const BINARY_EXTENSIONS = new Set([
  // Executables
  'exe', 'dll', 'so', 'dylib', 'bin', 'obj', 'o', 'a', 'lib',
  
  // Images
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'ico', 'svg', 'webp', 'avif',
  
  // Videos
  'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp',
  
  // Audio
  'mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'opus',
  
  // Archives
  'zip', 'tar', 'gz', 'bz2', '7z', 'rar', 'dmg', 'iso', 'xz', 'zst',
  
  // Documents
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp',
  
  // Fonts
  'ttf', 'otf', 'woff', 'woff2', 'eot', 'ttc',
  
  // Other
  'db', 'sqlite', 'sqlite3', 'db3', 's3db', 'sl3'
]);

// File size thresholds
export const FILE_SIZE_THRESHOLDS = {
  TINY: 1024,                    // 1KB
  SMALL: 1024 * 1024,           // 1MB
  MEDIUM: 10 * 1024 * 1024,     // 10MB
  LARGE: 100 * 1024 * 1024,     // 100MB
  HUGE: 1024 * 1024 * 1024      // 1GB
} as const;

// File size categories
export const FILE_SIZE_CATEGORIES = {
  EMPTY: 'empty',
  TINY: 'tiny',
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  HUGE: 'huge'
} as const;

// Test file patterns
export const TEST_PATTERNS = [
  'test', 'spec', 'specs', '__tests__', 'tests',
  '.test.', '.spec.', '.e2e.', '.integration.',
  'test-', 'spec-', 'e2e-', 'integration-'
];

// Documentation file patterns
export const DOCUMENTATION_PATTERNS = [
  'readme', 'changelog', 'license', 'contributing', 'docs',
  'documentation', 'guide', 'tutorial', 'api', 'reference'
];

// Configuration file patterns
export const CONFIG_PATTERNS = [
  'config', 'settings', 'configuration', 'setup',
  'webpack', 'babel', 'eslint', 'prettier', 'jest',
  'vite', 'rollup', 'parcel', 'tsconfig', 'package'
];

// Comment patterns for different languages
export const COMMENT_PATTERNS = {
  javascript: ['//', '/*', '*/', '*'],
  typescript: ['//', '/*', '*/', '*'],
  python: ['#', '"""', "'''"],
  java: ['//', '/*', '*/', '*'],
  csharp: ['//', '/*', '*/', '*'],
  go: ['//', '/*', '*/'],
  rust: ['//', '/*', '*/'],
  cpp: ['//', '/*', '*/', '*'],
  c: ['//', '/*', '*/', '*'],
  php: ['//', '#', '/*', '*/', '*'],
  ruby: ['#', '=begin', '=end'],
  swift: ['//', '/*', '*/'],
  kotlin: ['//', '/*', '*/'],
  scala: ['//', '/*', '*/'],
  groovy: ['//', '/*', '*/', '#'],
  html: ['<!--', '-->'],
  css: ['/*', '*/'],
  xml: ['<!--', '-->'],
  json: [], // JSON doesn't support comments
  yaml: ['#'],
  toml: ['#'],
  ini: [';', '#'],
  properties: ['#', '!'],
  markdown: ['<!--', '-->'],
  shell: ['#'],
  sql: ['--', '/*', '*/'],
  dockerfile: ['#'],
  makefile: ['#']
} as const;

// Default processing options
export const DEFAULT_OPTIONS = {
  MAX_FILE_SIZE: 100 * 1024 * 1024,  // 100MB
  CONCURRENCY: 10,
  SKIP_BINARY_FILES: true,
  SKIP_EMPTY_FILES: true,
  SKIP_LARGE_FILES: true,
  LARGE_FILE_THRESHOLD: 10 * 1024 * 1024,  // 10MB
  ENABLE_PROGRESS_REPORTING: true,
  ENABLE_ERROR_RECOVERY: true,
  MAX_RETRIES: 3
} as const;

// Processing phases
export const PROCESSING_PHASES = {
  DISCOVERY: 'discovery',
  ANALYSIS: 'analysis',
  EMBEDDING: 'embedding'
} as const;

// Error types
export const ERROR_TYPES = {
  FILE_READ_ERROR: 'file_read_error',
  FILE_WRITE_ERROR: 'file_write_error',
  PARSE_ERROR: 'parse_error',
  VALIDATION_ERROR: 'validation_error',
  NETWORK_ERROR: 'network_error',
  PERMISSION_ERROR: 'permission_error',
  NOT_FOUND_ERROR: 'not_found_error',
  TIMEOUT_ERROR: 'timeout_error',
  UNKNOWN_ERROR: 'unknown_error'
} as const;

// Progress update intervals (in milliseconds)
export const PROGRESS_UPDATE_INTERVALS = {
  FAST: 100,      // 100ms for fast operations
  NORMAL: 500,    // 500ms for normal operations
  SLOW: 1000      // 1s for slow operations
} as const;

// Chunk size limits for different content types
export const CHUNK_SIZE_LIMITS = {
  CODE: 2000,           // 2000 characters for code
  DOCUMENTATION: 3000,  // 3000 characters for documentation
  CONFIG: 1000,         // 1000 characters for config files
  DATA: 5000,           // 5000 characters for data files
  DEFAULT: 2000         // Default chunk size
} as const;

// Priority levels for file processing
export const FILE_PRIORITY = {
  HIGH: 1,      // Entry points, main files
  NORMAL: 2,    // Regular source files
  LOW: 3,       // Documentation, config
  IGNORE: 4     // Files to skip
} as const;

// File importance indicators
export const IMPORTANCE_INDICATORS = {
  ENTRY_POINTS: ['index', 'main', 'app', 'server', 'client'],
  CONFIG_FILES: ['package.json', 'tsconfig.json', 'webpack.config.js', 'vite.config.js'],
  TEST_FILES: ['test', 'spec', '__tests__'],
  DOCUMENTATION: ['readme', 'changelog', 'license', 'contributing']
} as const;
