/**
 * ANALYSIS PHASE TYPES
 *
 * Type definitions specific to the Analysis phase
 */

// Symbol types
export interface SymbolInfo {
  id: string;
  name: string;
  type: 'function' | 'class' | 'variable' | 'import' | 'export' | 'interface' | 'type' | 'enum';
  filePath: string;
  line: number;
  column: number;
  signature?: string;
  scope: string;
  visibility: 'public' | 'private' | 'protected' | 'internal';
  documentation?: string;
  dependencies: string[];
  dependents: string[];
}

export interface SymbolIndex {
  symbols: Map<string, SymbolInfo>;
  byType: Map<string, SymbolInfo[]>;
  byFile: Map<string, SymbolInfo[]>;
  byScope: Map<string, SymbolInfo[]>;
  dependencies: Map<string, string[]>;
  usages: Map<string, string[]>;
}

// Chunk types
export interface CodeChunk {
  id: string;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  type: 'function' | 'class' | 'module' | 'feature' | 'test' | 'documentation';
  size: number;
  context: ChunkContext;
  metadata: ChunkMetadata;
  symbols: string[];
  dependencies: string[];
}

export interface ChunkContext {
  surroundingCode: string;
  fileContext: FileContext;
  projectContext: ProjectContext;
  semanticContext: SemanticContext;
}

export interface ChunkMetadata {
  language: string;
  complexity: number;
  quality: number;
  features: string[];
  bugs: BugPattern[];
  tests: string[];
  documentation: string;
  lastModified: Date;
  author?: string;
}

// Feature types
export interface FeatureInfo {
  id: string;
  name: string;
  type: 'api' | 'model' | 'utility' | 'config' | 'test' | 'documentation';
  description: string;
  parameters: ParameterInfo[];
  returns: ReturnInfo;
  usage: UsageInfo[];
  examples: string[];
  tests: string[];
  documentation: string;
}

export interface FeatureMap {
  features: Map<string, FeatureInfo>;
  byType: Map<string, FeatureInfo[]>;
  byFile: Map<string, FeatureInfo[]>;
}

// Bug types
export interface BugPattern {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  location: {
    file: string;
    line: number;
    column: number;
  };
  context: string;
  fix?: string;
  examples: string[];
}

// Context types
export interface FileContext {
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  language: string;
  module: string;
  package?: string;
}

export interface ProjectContext {
  projectName: string;
  projectType: string;
  framework?: string;
  version: string;
  dependencies: string[];
  structure: string[];
}

export interface SemanticContext {
  purpose: string;
  functionality: string[];
  behavior: string;
  relationships: string[];
  patterns: string[];
}

// Parameter and return types
export interface ParameterInfo {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  defaultValue?: any;
}

export interface ReturnInfo {
  type: string;
  description?: string;
  examples?: any[];
}

export interface UsageInfo {
  file: string;
  line: number;
  context: string;
  type: 'call' | 'import' | 'export' | 'reference';
}

// Analysis results
export interface AnalysisResults {
  files: IndexedFile[];
  symbolIndex: SymbolIndex;
  featureMap: FeatureMap;
  chunks: CodeChunk[];
  metadata: Map<string, ChunkMetadata>;
  stats: AnalysisStats;
}

export interface IndexedFile {
  filePath: string;
  symbols: SymbolInfo[];
  chunks: CodeChunk[];
  features: FeatureInfo[];
  bugs: BugPattern[];
  metadata: ChunkMetadata;
}

export interface AnalysisStats {
  totalFiles: number;
  totalSymbols: number;
  totalChunks: number;
  totalFeatures: number;
  totalBugs: number;
  averageChunkSize: number;
  averageComplexity: number;
  averageQuality: number;
  byLanguage: Map<string, number>;
  byType: Map<string, number>;
}
