// ============================================================================
// AI Pipeline Studio - Core Type Definitions
// ============================================================================

/** Supported AI provider backends */
export type AIProvider = 'openai' | 'anthropic' | 'google' | 'local' | 'custom';

/** Supported model identifiers per provider */
export type ModelId = string;

/** Execution status for nodes and pipelines */
export type ExecutionStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

/** Data types that can flow between agents */
export type DataType = 'text' | 'json' | 'image' | 'audio' | 'file' | 'structured';

/** Agent node roles in the pipeline */
export type AgentRole =
  | 'generator'     // Creates content from scratch
  | 'transformer'   // Modifies/transforms input data
  | 'analyzer'      // Analyzes input and produces insights
  | 'validator'     // Validates data against criteria
  | 'router'        // Routes data to different paths based on conditions
  | 'aggregator'    // Combines multiple inputs into one output
  | 'custom';       // User-defined behavior

// ============================================================================
// Core Entity Interfaces
// ============================================================================

/** Configuration for an AI agent within the pipeline */
export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  role: AgentRole;

  // AI Configuration
  provider: AIProvider;
  model: ModelId;
  systemPrompt: string;
  userPromptTemplate: string;
  temperature: number;
  maxTokens: number;
  topP: number;

  // I/O Configuration
  inputSchema: DataSchema;
  outputSchema: DataSchema;

  // Behavior
  retryPolicy: RetryPolicy;
  timeout: number; // milliseconds
  enableStreaming: boolean;

  // Advanced
  tools: AgentTool[];
  guardrails: Guardrail[];
  metadata: Record<string, unknown>;
}

/** Schema definition for data flowing through the pipeline */
export interface DataSchema {
  type: DataType;
  fields?: SchemaField[];
  description?: string;
  example?: unknown;
}

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description?: string;
}

/** Retry configuration for failed agent executions */
export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
}

/** Tool/function that an agent can invoke */
export interface AgentTool {
  id: string;
  name: string;
  description: string;
  parameters: SchemaField[];
  handler: string; // Reference to handler function
}

/** Safety guardrail for agent outputs */
export interface Guardrail {
  id: string;
  name: string;
  type: 'content_filter' | 'length_limit' | 'format_check' | 'custom';
  config: Record<string, unknown>;
  enabled: boolean;
}

// ============================================================================
// Pipeline Graph Structure
// ============================================================================

/** A node in the pipeline graph (visual + logical) */
export interface PipelineNode {
  id: string;
  type: 'agent' | 'input' | 'output' | 'condition' | 'loop' | 'parallel' | 'code';
  position: { x: number; y: number };
  data: PipelineNodeData;
}

export interface PipelineNodeData {
  label: string;
  agentConfig?: AgentConfig;
  inputConfig?: InputNodeConfig;
  outputConfig?: OutputNodeConfig;
  conditionConfig?: ConditionConfig;
  loopConfig?: LoopConfig;
  parallelConfig?: ParallelConfig;
  codeConfig?: CodeExecutionConfig;
}

/** Input node: provides initial data to the pipeline */
export interface InputNodeConfig {
  dataType: DataType;
  source: 'manual' | 'file' | 'api' | 'webhook';
  defaultValue?: unknown;
  schema?: DataSchema;
}

/** Output node: collects final pipeline results */
export interface OutputNodeConfig {
  dataType: DataType;
  destination: 'display' | 'file' | 'api' | 'webhook' | 'email';
  format?: string;
}

/** Conditional branching node */
export interface ConditionConfig {
  expression: string; // e.g., "input.score > 0.8"
  branches: { label: string; condition: string }[];
}

/** Loop node: repeats connected subgraph */
export interface LoopConfig {
  maxIterations: number;
  stopCondition: string;
  loopVariable: string;
}

/** Parallel execution node */
export interface ParallelConfig {
  strategy: 'all' | 'race' | 'any';
  maxConcurrency: number;
}

/** Code execution node configuration */
export interface CodeExecutionConfig {
  language: 'javascript';
  timeout: number; // milliseconds
  allowNetwork: boolean;
  /** When code fails, ask the upstream agent to fix it and retry (max attempts) */
  autoFixRetries: number;
}

/** Connection between two nodes */
export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  data?: {
    transform?: string; // Optional data transformation expression
    condition?: string; // Optional condition for this edge
  };
}

// ============================================================================
// Pipeline Definition
// ============================================================================

/** Complete pipeline definition */
export interface Pipeline {
  id: string;
  name: string;
  description: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;

  // Graph
  nodes: PipelineNode[];
  edges: PipelineEdge[];

  // Configuration
  globalVariables: Record<string, unknown>;
  settings: PipelineSettings;

  // Metadata
  tags: string[];
  isPublic: boolean;
  isTemplate: boolean;

  /** Example input text pre-filled when loading this pipeline as a template */
  sampleInput?: string;
}

export interface PipelineSettings {
  maxExecutionTime: number; // milliseconds
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableCaching: boolean;
  cacheTTL: number;
  errorHandling: 'stop' | 'skip' | 'retry';
}

// ============================================================================
// Execution Runtime
// ============================================================================

/** Runtime state of a pipeline execution */
export interface PipelineExecution {
  id: string;
  pipelineId: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  nodeExecutions: NodeExecution[];
  error?: ExecutionError;
  metrics: ExecutionMetrics;
}

/** Execution state of a single node */
export interface NodeExecution {
  nodeId: string;
  status: ExecutionStatus;
  startedAt?: string;
  completedAt?: string;
  input?: unknown;
  output?: unknown;
  error?: ExecutionError;
  tokenUsage?: TokenUsage;
  duration?: number; // milliseconds
  retryCount: number;
}

export interface ExecutionError {
  code: string;
  message: string;
  details?: unknown;
  recoverable: boolean;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

export interface ExecutionMetrics {
  totalDuration: number;
  totalTokens: number;
  totalCost: number;
  nodesExecuted: number;
  nodesFailed: number;
}

// ============================================================================
// User & Collaboration
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  apiKeys: APIKeyConfig[];
}

export interface APIKeyConfig {
  provider: AIProvider;
  keyId: string; // Reference, never store actual key in state
  isValid: boolean;
  lastVerified?: string;
}

// ============================================================================
// Template Marketplace
// ============================================================================

export interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  pipeline: Pipeline;
  author: { id: string; name: string };
  downloads: number;
  rating: number;
  price: number; // 0 = free
  tags: string[];
  previewImageUrl?: string;
}

export type TemplateCategory =
  | 'content-creation'
  | 'data-analysis'
  | 'customer-support'
  | 'code-generation'
  | 'research'
  | 'marketing'
  | 'education'
  | 'general';
