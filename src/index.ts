/**
 * SENSEI - CODE ANALYSIS & UNDERSTANDING PLATFORM
 *
 * A comprehensive platform for analyzing codebases across all programming languages
 * and file types, providing deep insights and understanding through AI-powered analysis.
 *
 * PHASE ARCHITECTURE:
 * 1_discovery  - Data Discovery & Ingestion (ALL file types)
 * 2_analysis   - Code Analysis & Chunking (CORE: deep analysis, SECONDARY: basic analysis)
 * 3_embedding  - Vector Generation & Storage (ALL file types with different strategies)
 *
 * LANGUAGE STRATEGY:
 * - Phase 1 (Discovery): Process ALL file types (86+ extensions)
 * - Phase 2 (Analysis): CORE languages get full Tree-sitter analysis, SECONDARY get basic analysis
 * - Phase 3 (Embedding): Embed ALL files with different quality levels based on language priority
 *
 * PRODUCTION PIPELINE:
 * Discovery (ALL) → Analysis (CORE + SECONDARY) → Embedding (ALL) → RAG/Agents/MCP
 */

import { DiscoveryProcessor } from './1_discovery/index.js';
import { AnalysisProcessor } from './2_analysis/index.js';
// TODO: Import EmbeddingProcessor when implemented
// import { EmbeddingProcessor } from "./3_embedding/index.js";
import { DEFAULT_OPTIONS } from './shared/constants.js';

// ============================================================================
// CORE SENSEI CLASS
// ============================================================================

export class Sensei {
  private discoveryPhase: DiscoveryProcessor;
  private analysisPhase: AnalysisProcessor;
  // TODO: Implement when EmbeddingProcessor is ready
  private embeddingPhase: any;

  constructor(
    repositoryPath: string,
    options: {
      maxFileSize?: number;
      skipBinaryFiles?: boolean;
      concurrency?: number;
    } = {}
  ) {
    // Merge with default options
    const mergedOptions = {
      maxFileSize: options.maxFileSize || DEFAULT_OPTIONS.MAX_FILE_SIZE,
      skipBinaryFiles: options.skipBinaryFiles ?? DEFAULT_OPTIONS.SKIP_BINARY_FILES,
      concurrency: options.concurrency || DEFAULT_OPTIONS.CONCURRENCY,
    };

    this.discoveryPhase = new DiscoveryProcessor(repositoryPath, mergedOptions);
    this.analysisPhase = new AnalysisProcessor();
    // TODO: Initialize embedding phase when implemented
    // this.embeddingPhase = new EmbeddingProcessor();
  }

  /**
   * Run complete Sensei analysis pipeline
   */
  async analyze(): Promise<{
    discovery: any;
    analysis?: any;
    embedding?: any;
  }> {
    console.log('=== SENSEI ANALYSIS PLATFORM ===');
    console.log('Starting comprehensive code analysis...');
    console.log('=====================================');

    // Phase 1: Discovery ✅ COMPLETED
    console.log('\n🔍 1_DISCOVERY: Data Discovery & Ingestion');
    console.log('Discovering and preprocessing files...');
    const discoveryResults = await this.discoveryPhase.process();

    // Phase 2: Analysis ✅ IMPLEMENTED
    console.log('\n🧠 2_ANALYSIS: Indexing & Chunking');
    console.log('Extracting symbols, building indexes, and mapping dependencies...');
    const analysisResults = await this.analysisPhase.processFiles(discoveryResults.processedFiles);

    // Phase 3: Embedding 🚧 TODO
    console.log('\n🔮 3_EMBEDDING: Vector Generation & Storage');
    console.log('TODO: Implement vector embeddings and vector database storage');
    // const embeddingResults = await this.embeddingPhase.process(analysisResults);

    console.log('\n✅ SENSEI PIPELINE COMPLETE');
    console.log('Ready for RAG, MCP Server, and AI Agents!');

    return {
      discovery: discoveryResults,
      analysis: analysisResults,
      // TODO: Add embedding phase results when implemented
      embedding: undefined,
    };
  }

  /**
   * Run only discovery phase ✅ COMPLETED
   */
  async discover(): Promise<any> {
    console.log('🔍 Running Discovery Phase...');
    return await this.discoveryPhase.process();
  }

  /**
   * Run only analysis phase (requires discovery results) ✅ IMPLEMENTED
   */
  async analyzeFiles(discoveryResults: any): Promise<any> {
    console.log('🧠 Running Analysis Phase...');
    return await this.analysisPhase.processFiles(discoveryResults.processedFiles);
  }
}

// ============================================================================
// LIBRARY EXPORTS
// ============================================================================

// Individual processors for advanced usage
export { DiscoveryProcessor } from './1_discovery/index.js';
export { AnalysisProcessor } from './2_analysis/index.js';
// TODO: Export EmbeddingProcessor when implemented
// export { EmbeddingProcessor } from "./3_embedding/index.js";

// Shared utilities and constants
export * from './shared/constants.js';
export * from './shared/types.js';
export * from './shared/parsers.js';
export * from './shared/file-utils.js';
export * from './shared/git-integration.js';

// ============================================================================
// CLI INTERFACE
// ============================================================================

/**
 * Main function for CLI usage and testing
 */
export async function main(
  repositoryPath: string = '../shubhdeepchhabra.in',
  options: {
    maxFileSize?: number;
    skipBinaryFiles?: boolean;
    concurrency?: number;
  } = {}
) {
  const sensei = new Sensei(repositoryPath, {
    maxFileSize: options.maxFileSize || 50 * 1024 * 1024, // 50MB limit
    skipBinaryFiles: options.skipBinaryFiles ?? true,
    concurrency: options.concurrency || 3,
  });

  try {
    const results = await sensei.analyze();
    console.log('\n📊 Analysis Results Summary:');
    console.log(`Discovery: ${results.discovery.stats.totalFiles} files processed`);
    console.log(`Analysis: ${results.analysis ? 'Completed' : 'TODO - Not implemented'}`);
    console.log(`Embedding: ${results.embedding ? 'Completed' : 'TODO - Not implemented'}`);

    if (results.analysis) {
      console.log('\n🔍 Detailed Analysis Results:');
      console.log(`- Total files analyzed: ${results.analysis.stats.totalFiles}`);
      console.log(`- Successful parses: ${results.analysis.stats.successfulParses}`);
      console.log(`- Failed parses: ${results.analysis.stats.failedParses}`);
      console.log(`- Total symbols extracted: ${results.analysis.stats.totalSymbols}`);
      console.log(`- Total references: ${results.analysis.stats.totalReferences}`);

      // Show symbol distribution by file
      console.log('\n📁 Symbol Distribution by File:');
      results.analysis.files
        .filter((file: any) => file.symbols.size > 0)
        .slice(0, 10) // Show first 10 files with symbols
        .forEach((file: any) => {
          console.log(`  ${file.path}: ${file.symbols.size} symbols`);
          // Show first few symbols
          const symbols = Array.from(file.symbols.values()).slice(0, 3);
          symbols.forEach((symbol: any) => {
            console.log(`    - ${symbol.name} (${symbol.type})`);
          });
          if (file.symbols.size > 3) {
            console.log(`    ... and ${file.symbols.size - 3} more`);
          }
        });

      // Show files with no symbols
      const filesWithNoSymbols = results.analysis.files.filter(
        (file: any) => file.symbols.size === 0
      );
      if (filesWithNoSymbols.length > 0) {
        console.log(`\n⚠️  Files with no symbols extracted: ${filesWithNoSymbols.length}`);
        filesWithNoSymbols.slice(0, 5).forEach((file: any) => {
          console.log(`  - ${file.path} (${file.extension})`);
        });
        if (filesWithNoSymbols.length > 5) {
          console.log(`  ... and ${filesWithNoSymbols.length - 5} more`);
        }
      }
    }

    return results;
  } catch (error) {
    console.error('❌ Sensei analysis failed:', error);
    throw error;
  }
}

// ============================================================================
// CLI EXECUTION
// ============================================================================

// Run if called directly from command line
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
