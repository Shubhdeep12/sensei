/**
 * SYMBOL INDEXER
 *
 * ROLE: Builds and manages symbol index for fast lookup and retrieval
 *
 * IMPORTS:
 * - SymbolInfo from shared/types
 * - DependencyGraph from shared/types
 * - Indexing algorithms and data structures
 *
 * EXPORTS:
 * - SymbolIndexer class
 * - Index building methods
 * - Index query utilities
 * - Index optimization methods
 *
 * PROCESS:
 * 1. Builds symbol index from extracted symbols
 * 2. Creates fast lookup structures
 * 3. Optimizes index for query performance
 * 4. Provides search and retrieval methods
 * 5. Maintains index consistency and updates
 *
 * INDEX STRUCTURES:
 * - Symbol Map: name -> SymbolInfo
 * - Type Index: type -> SymbolInfo[]
 * - File Index: file -> SymbolInfo[]
 * - Scope Index: scope -> SymbolInfo[]
 * - Dependency Index: symbol -> dependencies
 * - Usage Index: symbol -> usages
 *
 * INDEX FEATURES:
 * - Fast symbol lookup by name
 * - Type-based symbol filtering
 * - File-based symbol grouping
 * - Scope-based symbol organization
 * - Dependency relationship queries
 * - Usage pattern analysis
 *
 * QUERY METHODS:
 * - findSymbol(name): Find symbol by name
 * - findSymbolsByType(type): Find symbols by type
 * - findSymbolsInFile(file): Find symbols in file
 * - findSymbolsInScope(scope): Find symbols in scope
 * - findDependencies(symbol): Find symbol dependencies
 * - findUsages(symbol): Find symbol usages
 *
 * USAGE:
 * - Called by AnalysisProcessor after symbol extraction
 * - Input: SymbolInfo[] from SymbolExtractor
 * - Output: SymbolIndex with optimized lookup structures
 * - Used by code chunking and metadata enrichment
 */

import { SymbolInfo, Reference } from '../../shared/types.js';

export interface SymbolIndex {
  // Primary indexes
  byName: Map<string, SymbolInfo[]>;
  byType: Map<string, SymbolInfo[]>;
  byFile: Map<string, SymbolInfo[]>;
  byScope: Map<string, SymbolInfo[]>;

  // Secondary indexes
  byExported: Map<boolean, SymbolInfo[]>;
  byImported: Map<boolean, SymbolInfo[]>;
  bySignature: Map<string, SymbolInfo[]>;

  // Cross-reference indexes
  byDependencies: Map<string, string[]>; // symbolId -> dependencyIds
  byDependents: Map<string, string[]>; // symbolId -> dependentIds

  // Metadata
  totalSymbols: number;
  lastUpdated: Date;
  fileCount: number;
}

export class SymbolIndexer {
  private index: SymbolIndex;
  private symbolIdMap: Map<string, string> = new Map(); // filePath:name -> symbolId

  constructor() {
    this.index = this.createEmptyIndex();
  }

  /**
   * Build symbol index from extracted symbols
   */
  buildIndex(symbolMap: Map<string, SymbolInfo[]>): SymbolIndex {
    this.index = this.createEmptyIndex();
    this.symbolIdMap.clear();

    let symbolId = 0;

    // Process all symbols and build indexes
    for (const [filePath, symbols] of symbolMap) {
      for (const symbol of symbols) {
        const id = `symbol_${symbolId++}`;
        const key = `${filePath}:${symbol.name}`;

        this.symbolIdMap.set(key, id);

        // Add to primary indexes
        this.addToIndex(this.index.byName, symbol.name, symbol);
        this.addToIndex(this.index.byType, symbol.type, symbol);
        this.addToIndex(this.index.byFile, filePath, symbol);
        this.addToIndex(this.index.byScope, symbol.scope, symbol);

        // Add to secondary indexes
        this.addToIndex(this.index.byExported, symbol.isExported, symbol);
        this.addToIndex(this.index.byImported, symbol.isImported, symbol);

        if (symbol.signature) {
          this.addToIndex(this.index.bySignature, symbol.signature, symbol);
        }

        this.index.totalSymbols++;
      }
    }

    this.index.fileCount = symbolMap.size;
    this.index.lastUpdated = new Date();

    return this.index;
  }

  /**
   * Find symbol by name
   */
  findSymbol(name: string): SymbolInfo[] {
    return this.index.byName.get(name) || [];
  }

  /**
   * Find symbols by type
   */
  findSymbolsByType(type: string): SymbolInfo[] {
    return this.index.byType.get(type) || [];
  }

  /**
   * Find symbols in file
   */
  findSymbolsInFile(filePath: string): SymbolInfo[] {
    return this.index.byFile.get(filePath) || [];
  }

  /**
   * Find symbols in scope
   */
  findSymbolsInScope(scope: string): SymbolInfo[] {
    return this.index.byScope.get(scope) || [];
  }

  /**
   * Find exported symbols
   */
  findExportedSymbols(): SymbolInfo[] {
    return this.index.byExported.get(true) || [];
  }

  /**
   * Find imported symbols
   */
  findImportedSymbols(): SymbolInfo[] {
    return this.index.byImported.get(true) || [];
  }

  /**
   * Find symbols by signature
   */
  findSymbolsBySignature(signature: string): SymbolInfo[] {
    return this.index.bySignature.get(signature) || [];
  }

  /**
   * Find symbols by partial name match
   */
  findSymbolsByNamePattern(pattern: string): SymbolInfo[] {
    const results: SymbolInfo[] = [];
    const regex = new RegExp(pattern, 'i');

    for (const [name, symbols] of this.index.byName) {
      if (regex.test(name)) {
        results.push(...symbols);
      }
    }

    return results;
  }

  /**
   * Find symbols by type pattern
   */
  findSymbolsByTypePattern(pattern: string): SymbolInfo[] {
    const results: SymbolInfo[] = [];
    const regex = new RegExp(pattern, 'i');

    for (const [type, symbols] of this.index.byType) {
      if (regex.test(type)) {
        results.push(...symbols);
      }
    }

    return results;
  }

  /**
   * Get symbol statistics
   */
  getStatistics(): {
    totalSymbols: number;
    fileCount: number;
    byType: { [type: string]: number };
    byScope: { [scope: string]: number };
    exportedCount: number;
    importedCount: number;
    lastUpdated: Date;
  } {
    const byType: { [type: string]: number } = {};
    const byScope: { [scope: string]: number } = {};

    for (const [type, symbols] of this.index.byType) {
      byType[type] = symbols.length;
    }

    for (const [scope, symbols] of this.index.byScope) {
      byScope[scope] = symbols.length;
    }

    return {
      totalSymbols: this.index.totalSymbols,
      fileCount: this.index.fileCount,
      byType,
      byScope,
      exportedCount: this.index.byExported.get(true)?.length || 0,
      importedCount: this.index.byImported.get(true)?.length || 0,
      lastUpdated: this.index.lastUpdated,
    };
  }

  /**
   * Get all symbols
   */
  getAllSymbols(): SymbolInfo[] {
    const allSymbols: SymbolInfo[] = [];
    for (const symbols of this.index.byName.values()) {
      allSymbols.push(...symbols);
    }
    return allSymbols;
  }

  /**
   * Get symbols by multiple criteria
   */
  findSymbolsByCriteria(criteria: {
    name?: string;
    type?: string;
    filePath?: string;
    scope?: string;
    exported?: boolean;
    imported?: boolean;
    signature?: string;
  }): SymbolInfo[] {
    let results: SymbolInfo[] = [];

    // Start with all symbols if no criteria
    if (Object.keys(criteria).length === 0) {
      return this.getAllSymbols();
    }

    // Apply filters
    if (criteria.name) {
      results = this.findSymbol(criteria.name);
    } else if (criteria.type) {
      results = this.findSymbolsByType(criteria.type);
    } else if (criteria.filePath) {
      results = this.findSymbolsInFile(criteria.filePath);
    } else if (criteria.scope) {
      results = this.findSymbolsInScope(criteria.scope);
    } else if (criteria.exported !== undefined) {
      results = this.index.byExported.get(criteria.exported) || [];
    } else if (criteria.imported !== undefined) {
      results = this.index.byImported.get(criteria.imported) || [];
    } else if (criteria.signature) {
      results = this.findSymbolsBySignature(criteria.signature);
    } else {
      results = this.getAllSymbols();
    }

    // Apply additional filters
    if (criteria.name && criteria.name !== results[0]?.name) {
      results = results.filter(s => s.name === criteria.name);
    }
    if (criteria.type && criteria.type !== results[0]?.type) {
      results = results.filter(s => s.type === criteria.type);
    }
    if (criteria.filePath && criteria.filePath !== results[0]?.name) {
      results = results.filter(s => s.name === criteria.filePath);
    }
    if (criteria.scope && criteria.scope !== results[0]?.scope) {
      results = results.filter(s => s.scope === criteria.scope);
    }
    if (criteria.exported !== undefined) {
      results = results.filter(s => s.isExported === criteria.exported);
    }
    if (criteria.imported !== undefined) {
      results = results.filter(s => s.isImported === criteria.imported);
    }
    if (criteria.signature && criteria.signature !== results[0]?.signature) {
      results = results.filter(s => s.signature === criteria.signature);
    }

    return results;
  }

  /**
   * Update symbol references (called by dependency mapper)
   */
  updateSymbolReferences(symbolId: string, references: Reference[]): void {
    // Find symbol by ID and update references
    for (const [name, symbols] of this.index.byName) {
      for (const symbol of symbols) {
        const key = `${symbol.name}:${symbol.type}`;
        if (this.symbolIdMap.get(key) === symbolId) {
          symbol.references = references;
          break;
        }
      }
    }
  }

  /**
   * Add symbol to index
   */
  private addToIndex<T>(index: Map<T, SymbolInfo[]>, key: T, symbol: SymbolInfo): void {
    if (!index.has(key)) {
      index.set(key, []);
    }
    index.get(key)!.push(symbol);
  }

  /**
   * Create empty index structure
   */
  private createEmptyIndex(): SymbolIndex {
    return {
      byName: new Map(),
      byType: new Map(),
      byFile: new Map(),
      byScope: new Map(),
      byExported: new Map(),
      byImported: new Map(),
      bySignature: new Map(),
      byDependencies: new Map(),
      byDependents: new Map(),
      totalSymbols: 0,
      lastUpdated: new Date(),
      fileCount: 0,
    };
  }

  /**
   * Clear all indexes
   */
  clear(): void {
    this.index = this.createEmptyIndex();
    this.symbolIdMap.clear();
  }

  /**
   * Get index size
   */
  getSize(): number {
    return this.index.totalSymbols;
  }

  /**
   * Check if index is empty
   */
  isEmpty(): boolean {
    return this.index.totalSymbols === 0;
  }
}
