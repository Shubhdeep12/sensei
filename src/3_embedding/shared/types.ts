/**
 * EMBEDDING PHASE TYPES
 *
 * Type definitions specific to the Embedding phase
 */

// Vector embedding types
export interface VectorEmbedding {
  id: string;
  chunkId: string;
  vector: number[];
  metadata: EmbeddingMetadata;
  model: string;
  dimensions: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmbeddingMetadata {
  filePath: string;
  chunkType: string;
  language: string;
  symbols: string[];
  features: string[];
  bugs: string[];
  context: string;
  size: number;
  complexity: number;
  quality: number;
}

// Vector database types
export interface VectorDatabase {
  name: string;
  type: 'pinecone' | 'weaviate' | 'chroma' | 'qdrant' | 'milvus';
  configuration: DatabaseConfiguration;
  status: 'active' | 'inactive' | 'error';
  metrics: DatabaseMetrics;
}

export interface DatabaseConfiguration {
  dimensions: number;
  metric: 'cosine' | 'euclidean' | 'dot';
  pods?: number;
  replicas?: number;
  shards?: number;
  endpoint?: string;
  apiKey?: string;
}

export interface DatabaseMetrics {
  totalVectors: number;
  indexSize: number;
  queryLatency: number;
  throughput: number;
  errorRate: number;
  lastUpdated: Date;
}

// Index types
export interface VectorIndex {
  id: string;
  name: string;
  database: string;
  configuration: IndexConfiguration;
  status: 'creating' | 'ready' | 'updating' | 'error';
  metrics: IndexMetrics;
}

export interface IndexConfiguration {
  dimensions: number;
  metric: string;
  pods: number;
  replicas: number;
  shards: number;
  podType: string;
  environment: string;
}

export interface IndexMetrics {
  vectorCount: number;
  indexSize: number;
  queryLatency: number;
  throughput: number;
  lastUpdated: Date;
}

// Query types
export interface VectorQuery {
  vector: number[];
  topK: number;
  filter?: QueryFilter;
  includeMetadata: boolean;
  includeValues: boolean;
}

export interface QueryFilter {
  [key: string]: any;
}

export interface QueryResult {
  id: string;
  score: number;
  metadata?: EmbeddingMetadata;
  values?: number[];
}

// Update types
export interface VectorUpdate {
  id: string;
  vector?: number[];
  metadata?: Partial<EmbeddingMetadata>;
  operation: 'upsert' | 'update' | 'delete';
}

export interface BatchUpdate {
  updates: VectorUpdate[];
  batchSize: number;
  parallel: boolean;
}

// Embedding results
export interface EmbeddingResults {
  embeddings: VectorEmbedding[];
  database: VectorDatabase;
  index: VectorIndex;
  stats: EmbeddingStats;
  performance: PerformanceMetrics;
}

export interface EmbeddingStats {
  totalEmbeddings: number;
  totalChunks: number;
  averageDimensions: number;
  processingTime: number;
  successRate: number;
  byModel: Map<string, number>;
  byLanguage: Map<string, number>;
}

export interface PerformanceMetrics {
  generationTime: number;
  storageTime: number;
  indexTime: number;
  totalTime: number;
  memoryUsage: number;
  cpuUsage: number;
}
