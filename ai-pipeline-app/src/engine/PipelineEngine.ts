// ============================================================================
// AI Pipeline Studio - Pipeline Execution Engine
// ============================================================================
// This engine handles the execution of AI agent pipelines by:
// 1. Topologically sorting nodes to determine execution order
// 2. Running each node (agent) with proper input/output wiring
// 3. Managing state, retries, streaming, and error handling
// ============================================================================

import {
  Pipeline,
  PipelineNode,
  PipelineEdge,
  PipelineExecution,
  NodeExecution,
  ExecutionStatus,
  ExecutionMetrics,
  AgentConfig,
  TokenUsage,
} from '../models/types';
import { AIProviderAdapter, createProviderAdapter } from './providers';
import { EventEmitter } from './EventEmitter';

export interface EngineEvents {
  'pipeline:start': { executionId: string; pipelineId: string };
  'pipeline:complete': { executionId: string; metrics: ExecutionMetrics };
  'pipeline:error': { executionId: string; error: string };
  'node:start': { executionId: string; nodeId: string };
  'node:complete': { executionId: string; nodeId: string; output: unknown };
  'node:error': { executionId: string; nodeId: string; error: string };
  'node:stream': { executionId: string; nodeId: string; chunk: string };
}

export class PipelineEngine {
  private events = new EventEmitter<EngineEvents>();
  private executions = new Map<string, PipelineExecution>();
  private abortControllers = new Map<string, AbortController>();

  // ---- Public API ----

  /** Execute a pipeline with the given input data */
  async execute(
    pipeline: Pipeline,
    input: Record<string, unknown>,
    apiKeys: Record<string, string>
  ): Promise<PipelineExecution> {
    const executionId = crypto.randomUUID();
    const execution = this.initExecution(executionId, pipeline, input);
    const abortController = new AbortController();
    this.abortControllers.set(executionId, abortController);

    this.events.emit('pipeline:start', {
      executionId,
      pipelineId: pipeline.id,
    });

    try {
      // Build adjacency graph and topological order
      const sortedNodes = this.topologicalSort(pipeline.nodes, pipeline.edges);
      const outputMap = new Map<string, unknown>();

      // Seed input nodes
      for (const node of pipeline.nodes.filter((n) => n.type === 'input')) {
        const key = node.data.inputConfig?.source === 'manual' ? node.data.label : node.id;
        outputMap.set(node.id, input[key] ?? input[node.data.label] ?? null);
        this.markNodeComplete(execution, node.id, outputMap.get(node.id));
      }

      // Execute nodes in topological order
      for (const node of sortedNodes) {
        if (abortController.signal.aborted) {
          execution.status = 'cancelled';
          break;
        }
        if (node.type === 'input') continue; // Already seeded

        const nodeInput = this.gatherNodeInput(node, pipeline.edges, outputMap);

        if (node.type === 'agent' && node.data.agentConfig) {
          const result = await this.executeAgentNode(
            execution,
            node,
            node.data.agentConfig,
            nodeInput,
            apiKeys,
            abortController.signal
          );
          outputMap.set(node.id, result);
        } else if (node.type === 'condition' && node.data.conditionConfig) {
          const result = this.evaluateCondition(
            node.data.conditionConfig.expression,
            nodeInput
          );
          outputMap.set(node.id, { ...nodeInput as object, __branch: result });
          this.markNodeComplete(execution, node.id, outputMap.get(node.id));
        } else if (node.type === 'output') {
          outputMap.set(node.id, nodeInput);
          this.markNodeComplete(execution, node.id, nodeInput);
        }
      }

      // Collect final output from output nodes
      const outputNodes = pipeline.nodes.filter((n) => n.type === 'output');
      const finalOutput: Record<string, unknown> = {};
      for (const outNode of outputNodes) {
        finalOutput[outNode.data.label] = outputMap.get(outNode.id);
      }

      execution.output = finalOutput;
      execution.status = execution.status === 'cancelled' ? 'cancelled' : 'completed';
      execution.completedAt = new Date().toISOString();
      execution.metrics = this.computeMetrics(execution);

      this.events.emit('pipeline:complete', {
        executionId,
        metrics: execution.metrics,
      });
    } catch (err) {
      execution.status = 'failed';
      execution.completedAt = new Date().toISOString();
      execution.error = {
        code: 'PIPELINE_ERROR',
        message: err instanceof Error ? err.message : String(err),
        recoverable: false,
      };
      this.events.emit('pipeline:error', {
        executionId,
        error: execution.error.message,
      });
    }

    this.executions.set(executionId, execution);
    this.abortControllers.delete(executionId);
    return execution;
  }

  /** Cancel a running pipeline execution */
  cancel(executionId: string): void {
    const controller = this.abortControllers.get(executionId);
    controller?.abort();
  }

  /** Subscribe to engine events */
  on<K extends keyof EngineEvents>(event: K, handler: (data: EngineEvents[K]) => void) {
    return this.events.on(event, handler);
  }

  /** Retrieve execution by id */
  getExecution(executionId: string): PipelineExecution | undefined {
    return this.executions.get(executionId);
  }

  /** Validate pipeline structure before execution */
  validate(pipeline: Pipeline): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (pipeline.nodes.length === 0) {
      errors.push('Pipeline has no nodes');
    }

    const inputNodes = pipeline.nodes.filter((n) => n.type === 'input');
    if (inputNodes.length === 0) {
      errors.push('Pipeline must have at least one input node');
    }

    const outputNodes = pipeline.nodes.filter((n) => n.type === 'output');
    if (outputNodes.length === 0) {
      errors.push('Pipeline must have at least one output node');
    }

    // Check for cycles
    try {
      this.topologicalSort(pipeline.nodes, pipeline.edges);
    } catch {
      errors.push('Pipeline contains a cycle — execution order cannot be determined');
    }

    // Check agent nodes have configs
    for (const node of pipeline.nodes.filter((n) => n.type === 'agent')) {
      if (!node.data.agentConfig) {
        errors.push(`Agent node "${node.data.label}" (${node.id}) has no configuration`);
      } else if (!node.data.agentConfig.systemPrompt.trim()) {
        errors.push(`Agent "${node.data.agentConfig.name}" has an empty system prompt`);
      }
    }

    // Check unconnected nodes
    const connectedIds = new Set<string>();
    for (const edge of pipeline.edges) {
      connectedIds.add(edge.source);
      connectedIds.add(edge.target);
    }
    for (const node of pipeline.nodes) {
      if (!connectedIds.has(node.id)) {
        errors.push(`Node "${node.data.label}" (${node.id}) is not connected to any other node`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ---- Private Helpers ----

  private initExecution(
    id: string,
    pipeline: Pipeline,
    input: Record<string, unknown>
  ): PipelineExecution {
    return {
      id,
      pipelineId: pipeline.id,
      status: 'running',
      startedAt: new Date().toISOString(),
      input,
      nodeExecutions: pipeline.nodes.map((n) => ({
        nodeId: n.id,
        status: 'idle' as ExecutionStatus,
        retryCount: 0,
      })),
      metrics: {
        totalDuration: 0,
        totalTokens: 0,
        totalCost: 0,
        nodesExecuted: 0,
        nodesFailed: 0,
      },
    };
  }

  private async executeAgentNode(
    execution: PipelineExecution,
    node: PipelineNode,
    config: AgentConfig,
    input: unknown,
    apiKeys: Record<string, string>,
    signal: AbortSignal
  ): Promise<unknown> {
    const nodeExec = execution.nodeExecutions.find((n) => n.nodeId === node.id)!;
    nodeExec.status = 'running';
    nodeExec.startedAt = new Date().toISOString();
    nodeExec.input = input;

    this.events.emit('node:start', {
      executionId: execution.id,
      nodeId: node.id,
    });

    const apiKey = apiKeys[config.provider];
    if (!apiKey) {
      throw new Error(`No API key configured for provider: ${config.provider}`);
    }

    let lastError: Error | null = null;
    const maxAttempts = config.retryPolicy.maxRetries + 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (signal.aborted) throw new Error('Execution cancelled');

      try {
        const adapter = createProviderAdapter(config.provider, apiKey);
        const prompt = this.renderTemplate(config.userPromptTemplate, input);

        const result = await adapter.chat({
          model: config.model,
          systemPrompt: config.systemPrompt,
          userMessage: prompt,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          stream: config.enableStreaming,
          onStream: config.enableStreaming
            ? (chunk: string) =>
                this.events.emit('node:stream', {
                  executionId: execution.id,
                  nodeId: node.id,
                  chunk,
                })
            : undefined,
        });

        nodeExec.status = 'completed';
        nodeExec.completedAt = new Date().toISOString();
        nodeExec.output = result.content;
        nodeExec.tokenUsage = result.usage;
        nodeExec.duration =
          new Date(nodeExec.completedAt).getTime() -
          new Date(nodeExec.startedAt!).getTime();

        this.events.emit('node:complete', {
          executionId: execution.id,
          nodeId: node.id,
          output: result.content,
        });

        return result.content;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        nodeExec.retryCount = attempt + 1;

        if (attempt < maxAttempts - 1) {
          const delay =
            config.retryPolicy.backoffMs *
            Math.pow(config.retryPolicy.backoffMultiplier, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    nodeExec.status = 'failed';
    nodeExec.completedAt = new Date().toISOString();
    nodeExec.error = {
      code: 'AGENT_EXECUTION_FAILED',
      message: lastError?.message ?? 'Unknown error',
      recoverable: true,
    };

    this.events.emit('node:error', {
      executionId: execution.id,
      nodeId: node.id,
      error: nodeExec.error.message,
    });

    throw lastError;
  }

  private gatherNodeInput(
    node: PipelineNode,
    edges: PipelineEdge[],
    outputMap: Map<string, unknown>
  ): unknown {
    const incomingEdges = edges.filter((e) => e.target === node.id);

    if (incomingEdges.length === 0) return null;
    if (incomingEdges.length === 1) return outputMap.get(incomingEdges[0].source);

    // Multiple inputs: merge into an object keyed by source label or edge label
    const merged: Record<string, unknown> = {};
    for (const edge of incomingEdges) {
      const key = edge.label ?? edge.source;
      merged[key] = outputMap.get(edge.source);
    }
    return merged;
  }

  private renderTemplate(template: string, input: unknown): string {
    if (typeof input === 'string') {
      return template.replace(/\{\{input\}\}/g, input);
    }
    let result = template;
    if (input && typeof input === 'object') {
      for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value ?? ''));
      }
    }
    // Replace remaining {{input}} with JSON stringified input
    result = result.replace(/\{\{input\}\}/g, JSON.stringify(input));
    return result;
  }

  private evaluateCondition(expression: string, input: unknown): string {
    // Simple expression evaluator for conditions like "input.score > 0.8"
    try {
      const fn = new Function('input', `return ${expression}`);
      return fn(input) ? 'true' : 'false';
    } catch {
      return 'false';
    }
  }

  private markNodeComplete(
    execution: PipelineExecution,
    nodeId: string,
    output: unknown
  ): void {
    const nodeExec = execution.nodeExecutions.find((n) => n.nodeId === nodeId);
    if (nodeExec) {
      nodeExec.status = 'completed';
      nodeExec.output = output;
      nodeExec.completedAt = new Date().toISOString();
    }
  }

  private computeMetrics(execution: PipelineExecution): ExecutionMetrics {
    let totalTokens = 0;
    let totalCost = 0;
    let nodesExecuted = 0;
    let nodesFailed = 0;

    for (const nodeExec of execution.nodeExecutions) {
      if (nodeExec.status === 'completed') nodesExecuted++;
      if (nodeExec.status === 'failed') nodesFailed++;
      if (nodeExec.tokenUsage) {
        totalTokens += nodeExec.tokenUsage.totalTokens;
        totalCost += nodeExec.tokenUsage.estimatedCost;
      }
    }

    const startTime = new Date(execution.startedAt).getTime();
    const endTime = execution.completedAt
      ? new Date(execution.completedAt).getTime()
      : Date.now();

    return {
      totalDuration: endTime - startTime,
      totalTokens,
      totalCost,
      nodesExecuted,
      nodesFailed,
    };
  }

  /** Kahn's algorithm for topological sort */
  private topologicalSort(
    nodes: PipelineNode[],
    edges: PipelineEdge[]
  ): PipelineNode[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    for (const node of nodes) {
      inDegree.set(node.id, 0);
      adjacency.set(node.id, []);
    }

    for (const edge of edges) {
      adjacency.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }

    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) queue.push(id);
    }

    const sorted: PipelineNode[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(nodeMap.get(current)!);

      for (const neighbor of adjacency.get(current)!) {
        const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }

    if (sorted.length !== nodes.length) {
      throw new Error('Pipeline contains a cycle');
    }

    return sorted;
  }
}
