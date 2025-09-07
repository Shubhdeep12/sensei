# 2_ANALYSIS: Indexing & Chunking

## Overview

The Analysis phase extracts symbols, creates intelligent code chunks, and builds metadata for efficient retrieval.

## Sensei Theme

**"A Sensei organizes knowledge systematically for quick access and deep understanding"**

## Phase Purpose

- **Symbol Extraction**: Functions, classes, variables, imports
- **Intelligent Chunking**: Context-aware code segmentation
- **Metadata Enrichment**: Rich context for each chunk
- **Dependency Mapping**: Code relationships and dependencies
- **Index Preparation**: Ready for embedding and vector storage

## File Structure

```
src/2_analysis/
├── README.md                    # This overview
├── index.ts                     # Main Analysis orchestrator
├── symbols/                     # Symbol extraction
│   ├── symbol-extractor.ts      # Extract symbols from AST
│   ├── dependency-mapper.ts     # Map code dependencies
│   └── symbol-indexer.ts        # Build symbol index
├── chunking/                    # Code chunking
│   ├── code-chunker.ts          # Intelligent code chunking
│   ├── context-builder.ts       # Build chunk context
│   └── chunk-optimizer.ts       # Optimize chunk sizes
├── metadata/                    # Metadata enrichment
│   ├── metadata-enricher.ts     # Add rich metadata
│   ├── feature-detector.ts      # Detect code features
│   └── bug-pattern-detector.ts  # Detect potential bugs
└── shared/                     # Shared utilities
    ├── types.ts                # Analysis-specific types
    └── utils.ts                # Common utilities
```

## Data Flow

```
Discovery Output → Symbol Extraction → Code Chunking → Metadata Enrichment → Analysis Results
                      ↓                    ↓                    ↓
                Symbol Index → Chunked Code → Rich Metadata
                      ↓                    ↓                    ↓
                Dependencies → Context → Features & Bugs
```

## Analysis Output

- **IndexedFile[]**: Files with symbols, chunks, and metadata
- **Symbol Index**: Searchable symbol database
- **Code Chunks**: Context-aware code segments
- **Dependency Graph**: Code relationships
- **Metadata**: Features, bugs, context for each chunk
- **Ready for**: 3_EMBEDDING (Vector Generation & Storage)
