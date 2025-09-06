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

import { DiscoveryProcessor } from "./1_discovery/index.js";
// TODO: Import AnalysisProcessor when implemented
// import { AnalysisProcessor } from "./2_analysis/index.js";
// TODO: Import EmbeddingProcessor when implemented
// import { EmbeddingProcessor } from "./3_embedding/index.js";
import { DEFAULT_OPTIONS } from "./shared/constants.js";

export class Sensei {
  private discoveryPhase: DiscoveryProcessor;
  // TODO: Implement when AnalysisProcessor is ready
  private analysisPhase: any;
  // TODO: Implement when EmbeddingProcessor is ready
  private embeddingPhase: any;

  constructor(repositoryPath: string, options: {
    maxFileSize?: number;
    skipBinaryFiles?: boolean;
    concurrency?: number;
  } = {}) {
    // Merge with default options
    const mergedOptions = {
      maxFileSize: options.maxFileSize || DEFAULT_OPTIONS.MAX_FILE_SIZE,
      skipBinaryFiles: options.skipBinaryFiles ?? DEFAULT_OPTIONS.SKIP_BINARY_FILES,
      concurrency: options.concurrency || DEFAULT_OPTIONS.CONCURRENCY
    };
    
    this.discoveryPhase = new DiscoveryProcessor(repositoryPath, mergedOptions);
    // TODO: Initialize analysis phase when implemented
    // this.analysisPhase = new AnalysisProcessor();
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
    console.log("=== SENSEI ANALYSIS PLATFORM ===");
    console.log("Starting comprehensive code analysis...");
    console.log("=====================================");

    // Phase 1: Discovery ✅ COMPLETED
    console.log("\n🔍 1_DISCOVERY: Data Discovery & Ingestion");
    console.log("Discovering and preprocessing files...");
    const discoveryResults = await this.discoveryPhase.process();
    
    // Phase 2: Analysis 🚧 TODO
    console.log("\n🧠 2_ANALYSIS: Indexing & Chunking");
    console.log("TODO: Implement symbol extraction, code chunking, and metadata enrichment");
    // const analysisResults = await this.analysisPhase.process(discoveryResults.processedFiles);

    // Phase 3: Embedding 🚧 TODO
    console.log("\n🔮 3_EMBEDDING: Vector Generation & Storage");
    console.log("TODO: Implement vector embeddings and vector database storage");
    // const embeddingResults = await this.embeddingPhase.process(analysisResults);

    console.log("\n✅ SENSEI PIPELINE COMPLETE");
    console.log("Ready for RAG, MCP Server, and AI Agents!");

    return {
      discovery: discoveryResults,
      // TODO: Add other phase results when implemented
      analysis: undefined,
      embedding: undefined
    };
  }

  /**
   * Run only discovery phase ✅ COMPLETED
   */
  async discover(): Promise<any> {
    console.log("🔍 Running Discovery Phase...");
    return await this.discoveryPhase.process();
  }

  /**
   * Run only analysis phase (requires discovery results) 🚧 TODO
   */
  async analyzeFiles(discoveryResults: any): Promise<any> {
    console.log("🧠 Analysis Phase - TODO: Not implemented yet");
    throw new Error("Analysis phase not implemented yet");
  }

}

// Export for use as library
export { DiscoveryProcessor } from "./1_discovery/index.js";
// TODO: Export AnalysisProcessor when implemented
// export { AnalysisProcessor } from "./2_analysis/index.js";

// Export shared constants
export * from "./shared/constants.js";

// Main execution (for CLI usage)
async function main() {
  const sensei = new Sensei("../shubhdeepchhabra.in", {
    maxFileSize: 50 * 1024 * 1024, // 50MB limit
    skipBinaryFiles: true,
    concurrency: 3
  });

  try {
    const results = await sensei.analyze();
    console.log("\n📊 Analysis Results Summary:");
    console.log(`Discovery: ${results.discovery.stats.totalFiles} files processed`);
    console.log(`Analysis: ${results.analysis ? 'Completed' : 'TODO - Not implemented'}`);
    console.log(`Embedding: ${results.embedding ? 'Completed' : 'TODO - Not implemented'}`);
  } catch (error) {
    console.error("❌ Sensei analysis failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}