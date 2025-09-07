/**
 * DEPENDENCY MAPPER
 *
 * ROLE: Maps code dependencies and relationships for context understanding
 *
 * IMPORTS:
 * - SymbolIndex from shared/types
 * - ParsedFile from shared/types
 * - Dependency analysis algorithms
 *
 * EXPORTS:
 * - DependencyMapper class
 * - Dependency mapping methods
 * - Relationship analysis utilities
 *
 * PROCESS:
 * 1. Analyzes symbol usage and references
 * 2. Maps import/export relationships
 * 3. Identifies function calls and method invocations
 * 4. Builds dependency graph for context
 * 5. Detects circular dependencies and issues
 *
 * DEPENDENCY TYPES:
 * - Import Dependencies: What imports what
 * - Export Dependencies: What exports what
 * - Usage Dependencies: What uses what
 * - Inheritance Dependencies: Class inheritance
 * - Composition Dependencies: Object composition
 * - Interface Dependencies: Interface implementations
 * - Type Dependencies: Type usage and definitions
 * - Call Dependencies: Function/method calls
 *
 * DEPENDENCY METADATA:
 * - Source: Where the dependency comes from
 * - Target: What it depends on
 * - Type: Import, export, usage, inheritance
 * - Weight: Strength of dependency
 * - Direction: One-way or bidirectional
 * - Context: Where the dependency is used
 * - Frequency: How often it's used
 *
 * DEPENDENCY ANALYSIS:
 * - Build dependency graph from symbols
 * - Identify critical dependencies
 * - Detect circular dependencies
 * - Find orphaned symbols
 * - Analyze dependency depth
 * - Identify dependency clusters
 *
 * USAGE:
 * - Called by AnalysisProcessor after symbol extraction
 * - Input: SymbolIndex from SymbolExtractor
 * - Output: DependencyGraph with all relationships
 * - Used by code chunking and context building
 */

import { readFile } from 'fs/promises';
import { SymbolInfo, Reference, DependencyGraph } from '../../shared/types.js';
import { isCoreLanguage } from '../../shared/constants.js';
import { defaultParserRegistry } from '../../shared/parsers.js';

export interface DependencyAnalysis {
  graph: DependencyGraph;
  circularDependencies: string[][];
  orphanedSymbols: string[];
  criticalDependencies: string[];
  dependencyClusters: Map<string, string[]>;
  statistics: {
    totalDependencies: number;
    circularCount: number;
    orphanedCount: number;
    criticalCount: number;
    clusterCount: number;
  };
}

export class DependencyMapper {
  private errors: Array<{ file: string; error: string }> = [];
  private parserRegistry = defaultParserRegistry.instance;

  constructor() {}

  /**
   * Map dependencies and relationships for all symbols
   */
  async mapDependencies(
    symbolMap: Map<string, SymbolInfo[]>,
    symbolIndex: any
  ): Promise<DependencyAnalysis> {
    const graph: DependencyGraph = {
      nodes: new Map(),
      edges: [],
    };

    const circularDependencies: string[][] = [];
    const orphanedSymbols: string[] = [];
    const criticalDependencies: string[] = [];
    const dependencyClusters = new Map<string, string[]>();

    // Build dependency graph
    for (const [filePath, symbols] of symbolMap) {
      for (const symbol of symbols) {
        const symbolId = `${filePath}:${symbol.name}`;
        graph.nodes.set(symbolId, filePath);

        // Find dependencies for this symbol
        const dependencies = await this.findSymbolDependencies(symbol, filePath, symbolMap);

        // Add edges to graph
        dependencies.forEach(dep => {
          graph.edges.push({
            from: symbolId,
            to: dep.symbolId,
            type: dep.type as 'usage' | 'import' | 'export' | 'inheritance' | 'composition',
            weight: dep.weight,
          });
        });
      }
    }

    // Analyze dependencies
    const analysis = this.analyzeDependencies(graph);

    return {
      graph,
      circularDependencies: analysis.circularDependencies,
      orphanedSymbols: analysis.orphanedSymbols,
      criticalDependencies: analysis.criticalDependencies,
      dependencyClusters: analysis.dependencyClusters,
      statistics: {
        totalDependencies: graph.edges.length,
        circularCount: analysis.circularDependencies.length,
        orphanedCount: analysis.orphanedSymbols.length,
        criticalCount: analysis.criticalDependencies.length,
        clusterCount: analysis.dependencyClusters.size,
      },
    };
  }

  /**
   * Find dependencies for a specific symbol
   */
  private async findSymbolDependencies(
    symbol: SymbolInfo,
    filePath: string,
    symbolMap: Map<string, SymbolInfo[]>
  ): Promise<Array<{ symbolId: string; type: string; weight: number }>> {
    const dependencies: Array<{ symbolId: string; type: string; weight: number }> = [];

    try {
      // Read file content for analysis
      const content = await readFile(filePath, 'utf-8');
      const extension = filePath.split('.').pop()?.toLowerCase() || '';

      if (isCoreLanguage(extension)) {
        // Use Tree-sitter for core languages
        const deps = await this.findDependenciesWithTreeSitter(symbol, content, symbolMap);
        dependencies.push(...deps);
      } else {
        // Use basic analysis for secondary languages
        const deps = this.findDependenciesWithBasicAnalysis(symbol, content, symbolMap);
        dependencies.push(...deps);
      }
    } catch (error) {
      this.errors.push({
        file: filePath,
        error: `Failed to analyze dependencies: ${error instanceof Error ? error.message : String(error)}`,
      });
    }

    return dependencies;
  }

  /**
   * Find dependencies using Tree-sitter (core languages)
   */
  private async findDependenciesWithTreeSitter(
    symbol: SymbolInfo,
    content: string,
    symbolMap: Map<string, SymbolInfo[]>
  ): Promise<Array<{ symbolId: string; type: string; weight: number }>> {
    const dependencies: Array<{ symbolId: string; type: string; weight: number }> = [];

    try {
      const extension = symbol.name.split('.').pop()?.toLowerCase() || '';
      const parser = this.parserRegistry.getParser(extension);

      if (!parser) {
        return this.findDependenciesWithBasicAnalysis(symbol, content, symbolMap);
      }

      const parseResult = await parser.parse(content);
      if (!parseResult.success || !parseResult.ast) {
        return this.findDependenciesWithBasicAnalysis(symbol, content, symbolMap);
      }

      // Analyze AST for dependencies
      const deps = this.analyzeASTForDependencies(symbol, parseResult.ast, symbolMap);
      dependencies.push(...deps);
    } catch (error) {
      // Fallback to basic analysis
      return this.findDependenciesWithBasicAnalysis(symbol, content, symbolMap);
    }

    return dependencies;
  }

  /**
   * Find dependencies using basic analysis (secondary languages)
   */
  private findDependenciesWithBasicAnalysis(
    symbol: SymbolInfo,
    content: string,
    symbolMap: Map<string, SymbolInfo[]>
  ): Array<{ symbolId: string; type: string; weight: number }> {
    const dependencies: Array<{ symbolId: string; type: string; weight: number }> = [];

    // Look for symbol usage in content
    const symbolUsageRegex = new RegExp(`\\b${symbol.name}\\b`, 'g');
    const matches = content.match(symbolUsageRegex);

    if (matches) {
      // Find where this symbol is used
      for (const [filePath, symbols] of symbolMap) {
        for (const otherSymbol of symbols) {
          if (otherSymbol.name !== symbol.name && otherSymbol.name.includes(symbol.name)) {
            dependencies.push({
              symbolId: `${filePath}:${otherSymbol.name}`,
              type: 'usage',
              weight: 1,
            });
          }
        }
      }
    }

    return dependencies;
  }

  /**
   * Analyze AST for dependencies
   */
  private analyzeASTForDependencies(
    symbol: SymbolInfo,
    ast: any,
    symbolMap: Map<string, SymbolInfo[]>
  ): Array<{ symbolId: string; type: string; weight: number }> {
    const dependencies: Array<{ symbolId: string; type: string; weight: number }> = [];

    if (!ast || !ast.rootNode) {
      return dependencies;
    }

    // Traverse AST to find symbol usage
    this.traverseASTForDependencies(ast.rootNode, symbol, symbolMap, dependencies);

    return dependencies;
  }

  /**
   * Traverse AST to find dependencies
   */
  private traverseASTForDependencies(
    node: any,
    symbol: SymbolInfo,
    symbolMap: Map<string, SymbolInfo[]>,
    dependencies: Array<{ symbolId: string; type: string; weight: number }>
  ): void {
    if (!node) return;

    // Check if this node references our symbol
    if (node.text && node.text.includes(symbol.name)) {
      // Find the actual symbol being referenced
      for (const [filePath, symbols] of symbolMap) {
        for (const otherSymbol of symbols) {
          if (otherSymbol.name === symbol.name && otherSymbol !== symbol) {
            dependencies.push({
              symbolId: `${filePath}:${otherSymbol.name}`,
              type: 'usage',
              weight: 1,
            });
          }
        }
      }
    }

    // Recursively traverse children
    if (node.children) {
      node.children.forEach((child: any) => {
        this.traverseASTForDependencies(child, symbol, symbolMap, dependencies);
      });
    }
  }

  /**
   * Analyze dependencies for patterns and issues
   */
  private analyzeDependencies(graph: DependencyGraph): {
    circularDependencies: string[][];
    orphanedSymbols: string[];
    criticalDependencies: string[];
    dependencyClusters: Map<string, string[]>;
  } {
    const circularDependencies: string[][] = [];
    const orphanedSymbols: string[] = [];
    const criticalDependencies: string[] = [];
    const dependencyClusters = new Map<string, string[]>();

    // Find circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const nodeId of graph.nodes.keys()) {
      if (!visited.has(nodeId)) {
        const cycle = this.findCycle(graph, nodeId, visited, recursionStack);
        if (cycle.length > 0) {
          circularDependencies.push(cycle);
        }
      }
    }

    // Find orphaned symbols (no dependencies)
    for (const nodeId of graph.nodes.keys()) {
      const hasDependencies = graph.edges.some(edge => edge.from === nodeId);
      if (!hasDependencies) {
        orphanedSymbols.push(nodeId);
      }
    }

    // Find critical dependencies (highly connected nodes)
    const nodeDependencyCount = new Map<string, number>();
    for (const edge of graph.edges) {
      nodeDependencyCount.set(edge.from, (nodeDependencyCount.get(edge.from) || 0) + 1);
    }

    for (const [nodeId, count] of nodeDependencyCount) {
      if (count > 5) {
        // Threshold for critical dependencies
        criticalDependencies.push(nodeId);
      }
    }

    // Find dependency clusters
    const clusters = this.findDependencyClusters(graph);
    clusters.forEach((cluster, index) => {
      dependencyClusters.set(`cluster_${index}`, cluster);
    });

    return {
      circularDependencies,
      orphanedSymbols,
      criticalDependencies,
      dependencyClusters,
    };
  }

  /**
   * Find cycles in dependency graph
   */
  private findCycle(
    graph: DependencyGraph,
    nodeId: string,
    visited: Set<string>,
    recursionStack: Set<string>
  ): string[] {
    if (recursionStack.has(nodeId)) {
      return [nodeId]; // Found a cycle
    }

    if (visited.has(nodeId)) {
      return []; // Already processed
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);

    // Check all outgoing edges
    for (const edge of graph.edges) {
      if (edge.from === nodeId) {
        const cycle = this.findCycle(graph, edge.to, visited, recursionStack);
        if (cycle.length > 0) {
          recursionStack.delete(nodeId);
          return [nodeId, ...cycle];
        }
      }
    }

    recursionStack.delete(nodeId);
    return [];
  }

  /**
   * Find dependency clusters using connected components
   */
  private findDependencyClusters(graph: DependencyGraph): string[][] {
    const clusters: string[][] = [];
    const visited = new Set<string>();

    for (const nodeId of graph.nodes.keys()) {
      if (!visited.has(nodeId)) {
        const cluster: string[] = [];
        this.dfsCluster(graph, nodeId, visited, cluster);
        if (cluster.length > 1) {
          clusters.push(cluster);
        }
      }
    }

    return clusters;
  }

  /**
   * DFS to find connected components
   */
  private dfsCluster(
    graph: DependencyGraph,
    nodeId: string,
    visited: Set<string>,
    cluster: string[]
  ): void {
    visited.add(nodeId);
    cluster.push(nodeId);

    // Visit all connected nodes
    for (const edge of graph.edges) {
      if (edge.from === nodeId && !visited.has(edge.to)) {
        this.dfsCluster(graph, edge.to, visited, cluster);
      }
      if (edge.to === nodeId && !visited.has(edge.from)) {
        this.dfsCluster(graph, edge.from, visited, cluster);
      }
    }
  }

  /**
   * Get mapping errors
   */
  getErrors(): Array<{ file: string; error: string }> {
    return [...this.errors];
  }

  /**
   * Clear mapping errors
   */
  clearErrors(): void {
    this.errors = [];
  }
}
