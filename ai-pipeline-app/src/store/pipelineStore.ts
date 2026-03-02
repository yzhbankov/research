// ============================================================================
// Global Application State (Zustand)
// ============================================================================
// Central state management for the pipeline editor, execution, and UI.
// ============================================================================

import {
  Pipeline,
  PipelineNode,
  PipelineEdge,
  PipelineExecution,
  AgentConfig,
  AgentRole,
  AIProvider,
  PipelineSettings,
} from '../models/types';

// ---- State Shape ----

export interface PipelineStore {
  // Pipeline definition
  pipeline: Pipeline;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;

  // Execution
  currentExecution: PipelineExecution | null;
  executionHistory: PipelineExecution[];
  isExecuting: boolean;

  // UI state
  sidebarTab: 'nodes' | 'config' | 'templates' | 'history';
  zoomLevel: number;
  isDirty: boolean;

  // API keys (stored in memory only)
  apiKeys: Record<string, string>;

  // Actions - Pipeline
  setPipeline: (pipeline: Pipeline) => void;
  updatePipelineInfo: (info: Partial<Pick<Pipeline, 'name' | 'description' | 'tags'>>) => void;
  updateSettings: (settings: Partial<PipelineSettings>) => void;

  // Actions - Nodes
  addNode: (node: PipelineNode) => void;
  updateNode: (nodeId: string, data: Partial<PipelineNode>) => void;
  removeNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;

  // Actions - Edges
  addEdge: (edge: PipelineEdge) => void;
  removeEdge: (edgeId: string) => void;
  selectEdge: (edgeId: string | null) => void;

  // Actions - Agent Config
  updateAgentConfig: (nodeId: string, config: Partial<AgentConfig>) => void;

  // Actions - Execution
  setExecution: (execution: PipelineExecution | null) => void;
  addExecutionToHistory: (execution: PipelineExecution) => void;

  // Actions - UI
  setSidebarTab: (tab: PipelineStore['sidebarTab']) => void;
  setZoomLevel: (level: number) => void;
  setApiKey: (provider: string, key: string) => void;
}

// ---- Default Values ----

export function createDefaultAgentConfig(overrides?: Partial<AgentConfig>): AgentConfig {
  return {
    id: crypto.randomUUID(),
    name: 'New Agent',
    description: '',
    role: 'transformer' as AgentRole,
    provider: 'openai' as AIProvider,
    model: 'gpt-4o-mini',
    systemPrompt: 'You are a helpful assistant.',
    userPromptTemplate: '{{input}}',
    temperature: 0.7,
    maxTokens: 1024,
    topP: 1,
    inputSchema: { type: 'text' },
    outputSchema: { type: 'text' },
    retryPolicy: { maxRetries: 2, backoffMs: 1000, backoffMultiplier: 2 },
    timeout: 30000,
    enableStreaming: false,
    tools: [],
    guardrails: [],
    metadata: {},
    ...overrides,
  };
}

export function createDefaultPipeline(): Pipeline {
  return {
    id: crypto.randomUUID(),
    name: 'Untitled Pipeline',
    description: '',
    version: '0.1.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    authorId: '',
    nodes: [],
    edges: [],
    globalVariables: {},
    settings: {
      maxExecutionTime: 300000,
      enableLogging: true,
      logLevel: 'info',
      enableCaching: false,
      cacheTTL: 3600,
      errorHandling: 'stop',
    },
    tags: [],
    isPublic: false,
    isTemplate: false,
  };
}

// Note: In the real app this would be:
// export const usePipelineStore = create<PipelineStore>((set, get) => ({ ... }));
// Omitted here since we can't install deps in this prototype.
// The store shape above documents the complete state management design.
