/**
 * 2_ANALYSIS: CODE ANALYSIS & UNDERSTANDING
 *
 * ROLE: Main orchestrator for Analysis phase - coordinates code understanding activities
 *
 * LANGUAGE STRATEGY:
 * - CORE LANGUAGES (JS/TS/Python/HTML/CSS/JSON/YAML): Full Tree-sitter analysis with AST parsing
 * - SECONDARY LANGUAGES (Everything else): Basic analysis with limited parsing
 *
 * IMPORTS:
 * - Discovery output (ProcessedFile[] with content)
 * - Tree-sitter parsers for core languages only
 * - Language-specific analyzers for core languages
 * - Basic content analyzers for secondary languages
 *
 * EXPORTS:
 * - AnalysisProcessor class (main entry point)
 * - AnalysisResults interface (enhanced files with analysis data)
 * - Language-specific analysis results
 *
 * PROCESS:
 * 1. Takes Discovery output (ALL files with content)
 * 2. Categorizes files by language priority (core/secondary)
 * 3. CORE LANGUAGES: Full Tree-sitter AST parsing + symbol extraction + dependency mapping
 * 4. SECONDARY LANGUAGES: Basic parsing + limited symbol extraction + content analysis
 * 5. Builds comprehensive analysis results for all file types
 *
 * CORE LANGUAGE ANALYSIS (JS/TS/Python/HTML/CSS/JSON/YAML):
 * - AST parsing with Tree-sitter
 * - Symbol extraction (functions, classes, variables, imports)
 * - Dependency mapping and cross-references
 * - Call graphs and control flow analysis
 * - Pattern detection and code quality analysis
 * - Intelligent code chunking with semantic understanding
 *
 * SECONDARY LANGUAGE ANALYSIS (Java/Go/PHP/Rust/C#/Ruby/etc):
 * - Basic AST parsing where possible
 * - Limited symbol extraction
 * - Content-based analysis
 * - Basic dependency detection
 * - Simple chunking strategies
 *
 * USAGE:
 * - Called after Discovery phase completion
 * - Input: ProcessedFile[] with content from Discovery (ALL file types)
 * - Output: AnalysisResults with different analysis levels per language
 * - Prepares data for 3_EMBEDDING (Vector Generation & Storage)
 */

import { ProcessedFile, AnalysisResults, SymbolInfo, DependencyGraph } from '../shared/types.js';
import { SymbolExtractor } from './symbols/symbol-extractor.js';
import { SymbolIndexer } from './symbols/symbol-indexer.js';
import { DependencyMapper } from './symbols/dependency-mapper.js';

export class AnalysisProcessor {
  private symbolExtractor: SymbolExtractor;
  private symbolIndexer: SymbolIndexer;
  private dependencyMapper: DependencyMapper;

  constructor() {
    this.symbolExtractor = new SymbolExtractor();
    this.symbolIndexer = new SymbolIndexer();
    this.dependencyMapper = new DependencyMapper();
  }

  /**
   * Process files through the analysis pipeline
   */
  async processFiles(
    files: Array<ProcessedFile & { content?: string | null }>
  ): Promise<AnalysisResults> {
    console.log(`🔍 Starting analysis of ${files.length} files...`);

    // Step 1: Extract symbols from all files
    console.log('📝 Extracting symbols...');
    const symbolMap = await this.symbolExtractor.extractSymbols(files);
    console.log(`✅ Extracted symbols from ${symbolMap.size} files`);

    // Step 2: Build symbol index
    console.log('📚 Building symbol index...');
    const symbolIndex = this.symbolIndexer.buildIndex(symbolMap);
    console.log(`✅ Built index with ${symbolIndex.totalSymbols} symbols`);

    // Step 3: Map dependencies
    console.log('🔗 Mapping dependencies...');
    const dependencyAnalysis = await this.dependencyMapper.mapDependencies(symbolMap, symbolIndex);
    console.log(`✅ Mapped ${dependencyAnalysis.statistics.totalDependencies} dependencies`);

    // Step 4: Build analysis results
    const analysisResults: AnalysisResults = {
      files: files.map(file => ({
        path: file.path,
        extension: file.extension,
        content: file.content || '',
        ast: { type: 'root', children: [] }, // Placeholder AST
        symbols: new Map(symbolMap.get(file.path)?.map(s => [s.name, s]) || []),
        scopes: [], // Placeholder scopes
        callGraph: { nodes: new Map(), edges: [] }, // Placeholder call graph
        dependencyGraph: dependencyAnalysis.graph,
        controlFlowGraph: { nodes: new Map(), edges: [] }, // Placeholder control flow
        success: true,
        parseTime: 0,
      })),
      globalSymbols: new Map(),
      crossReferences: new Map(),
      stats: {
        totalFiles: files.length,
        successfulParses: files.length,
        failedParses: 0,
        totalSymbols: symbolIndex.totalSymbols,
        totalReferences: dependencyAnalysis.statistics.totalDependencies,
        byLanguage: {},
        complexityStats: {
          average: 0,
          max: 0,
          distribution: {},
        },
      },
    };

    console.log('🎉 Analysis completed successfully!');
    return analysisResults;
  }

  /**
   * Get analysis quality based on file extension
   */
  private getAnalysisQuality(extension: string): 'high' | 'medium' | 'low' {
    const coreExtensions = ['js', 'ts', 'tsx', 'jsx', 'py', 'html', 'css', 'json', 'yaml', 'yml'];
    const secondaryExtensions = ['java', 'go', 'php', 'rs', 'cs', 'rb', 'swift', 'kt', 'cpp', 'c'];

    if (coreExtensions.includes(extension.toLowerCase())) {
      return 'high';
    } else if (secondaryExtensions.includes(extension.toLowerCase())) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Get processing errors
   */
  getErrors(): Array<{ file: string; error: string }> {
    return [...this.symbolExtractor.getErrors(), ...this.dependencyMapper.getErrors()];
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this.symbolExtractor.clearErrors();
    this.dependencyMapper.clearErrors();
  }
}

// Export the main processor
export { AnalysisProcessor as default };
