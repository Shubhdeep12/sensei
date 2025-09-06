// Shared types and interfaces used across phases

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

export interface GitInfo {
  isGitRepo: boolean;
  currentBranch?: string;
  branches: string[];
  tags: string[];
  lastCommit?: {
    hash: string;
    message: string;
    author: string;
    date: string;
  };
  commitCount: number;
  remoteUrl?: string;
}

export interface FileGitInfo {
  path: string;
  lastModified: string;
  author: string;
  commitHash: string;
  commitMessage: string;
  lineCount: number;
  isTracked: boolean;
}

// Discovery phase specific types
export interface ProcessedFile {
  path: string;
  relativePath: string;
  extension: string;
  fileInfo: FileInfo;
  gitInfo?: FileGitInfo | null;
  isDirectory: boolean;
  shouldSkip: boolean;
  skipReason?: string;
}

export interface DiscoveryResults {
  files: ProcessedFile[];
  gitInfo: GitInfo;
  duplicates: DuplicateFile[];
  stats: {
    totalFiles: number;
    directories: number;
    actualFiles: number;
    skippedFiles: number;
    extensions: number;
    byExtension: Array<{
      extension: string;
      count: number;
    }>;
    fileSizeStats: {
      tiny: number;
      small: number;
      medium: number;
      large: number;
      huge: number;
    };
    encodingStats: { [encoding: string]: number };
  };
}

// Analysis phase specific types
export interface ASTNode {
  type: string;
  children?: ASTNode[];
  value?: any;
  start?: number;
  end?: number;
  [key: string]: any;
}

export interface SymbolInfo {
  name: string;
  type: 'function' | 'class' | 'variable' | 'import' | 'export' | 'interface' | 'type' | 'enum';
  scope: string;
  declaration: ASTNode;
  references: Reference[];
  lineStart: number;
  lineEnd: number;
  columnStart: number;
  columnEnd: number;
  signature?: string;
  docstring?: string;
  isExported: boolean;
  isImported: boolean;
}

export interface Reference {
  filePath: string;
  line: number;
  column: number;
  context: string;
  type: 'definition' | 'usage' | 'import' | 'export';
}

export interface Scope {
  name: string;
  type: 'global' | 'function' | 'class' | 'module' | 'block';
  parent?: string;
  symbols: Map<string, SymbolInfo>;
  startLine: number;
  endLine: number;
}

export interface TypeInfo {
  name: string;
  kind: 'primitive' | 'object' | 'array' | 'function' | 'union' | 'intersection' | 'generic';
  properties?: Map<string, TypeInfo>;
  parameters?: TypeInfo[];
  returnType?: TypeInfo;
  baseType?: string;
}

export interface CallGraphNode {
  id: string;
  name: string;
  filePath: string;
  line: number;
  type: 'function' | 'method' | 'constructor';
  signature: string;
}

export interface CallGraphEdge {
  from: string;
  to: string;
  callType: 'direct' | 'indirect' | 'callback' | 'async';
  line: number;
  frequency: number;
}

export interface CallGraph {
  nodes: Map<string, CallGraphNode>;
  edges: CallGraphEdge[];
}

export interface DependencyGraph {
  nodes: Map<string, string>; // symbolId -> filePath
  edges: Array<{
    from: string;
    to: string;
    type: 'import' | 'export' | 'inheritance' | 'composition' | 'usage';
    weight: number;
  }>;
}

export interface ControlFlowGraph {
  nodes: Map<string, {
    id: string;
    type: 'entry' | 'exit' | 'statement' | 'condition' | 'loop' | 'function';
    line: number;
    label?: string;
  }>;
  edges: Array<{
    from: string;
    to: string;
    condition?: string;
    type: 'normal' | 'conditional' | 'loop' | 'exception';
  }>;
}

export interface ParsedFile {
  path: string;
  extension: string;
  content: string;
  ast: ASTNode;
  symbols: Map<string, SymbolInfo>;
  scopes: Scope[];
  callGraph: CallGraph;
  dependencyGraph: DependencyGraph;
  controlFlowGraph: ControlFlowGraph;
  success: boolean;
  error?: string;
  parseTime: number;
}

export interface AnalysisResults {
  files: ParsedFile[];
  globalSymbols: Map<string, SymbolInfo>;
  crossReferences: Map<string, Reference[]>;
  stats: {
    totalFiles: number;
    successfulParses: number;
    failedParses: number;
    totalSymbols: number;
    totalReferences: number;
    byLanguage: { [language: string]: number };
    complexityStats: {
      average: number;
      max: number;
      distribution: { [range: string]: number };
    };
  };
}
