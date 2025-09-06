# 1_DISCOVERY: Data Discovery & Ingestion

## Overview
The Discovery phase is responsible for finding, scanning, and preprocessing all files in a repository. It acts as the foundation for all subsequent analysis phases.

## Sensei Theme
**"A Sensei first observes and understands the student's current state before beginning training"**

## Phase Purpose
- **Repository Scanning**: Discover all files and directories
- **File Preprocessing**: Read, validate, and prepare files for analysis
- **Metadata Extraction**: Gather file information, Git history, and statistics
- **Quality Filtering**: Remove binary files, large files, and irrelevant content

## File Structure
```
src/1_discovery/
├── README.md                    # This overview
├── index.ts                     # Main Discovery orchestrator
├── repository-scanner.ts        # File system traversal and Git integration
├── file-processor.ts           # File reading, validation, and preprocessing
└── shared/                     # Shared utilities
    ├── file-utils.ts           # File operations and utilities
    ├── git-integration.ts      # Git repository analysis
    └── types.ts                # Common type definitions
```

## Data Flow
```
Repository → Repository Scanner → File Processor → Discovery Results
     ↓              ↓                    ↓
  File List → File Content → Enhanced Files
```

## Output
- **ProcessedFile[]**: Files with content, metadata, and Git information
- **Repository Statistics**: File counts, size distribution, language breakdown
- **Quality Metrics**: Encoding stats, duplicate detection, file health
- **Git Information**: Branch history, commit data, remote URLs

## Next Phase
Discovery output feeds into **2_ANALYSIS** for code parsing and understanding.
