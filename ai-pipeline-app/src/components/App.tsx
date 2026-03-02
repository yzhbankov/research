// ============================================================================
// AI Pipeline Studio - Main Application Shell
// ============================================================================

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { PipelineCanvas } from './canvas/PipelineCanvas';
import { AgentConfigPanel } from './panels/AgentConfigPanel';
import { NodePalette } from './panels/NodePalette';
import { ExecutionDashboard } from './dashboard/ExecutionDashboard';
import { ApiKeysModal } from './panels/ApiKeysModal';
import { HelpGuide } from './panels/HelpGuide';
import { InputConfigPanel } from './panels/InputConfigPanel';
import { OutputResultPanel } from './panels/OutputResultPanel';
import { CodeConfigPanel } from './panels/CodeConfigPanel';
import { NodeIOPanel } from './panels/NodeIOPanel';
import {
  Pipeline,
  PipelineNode,
  PipelineEdge,
  PipelineExecution,
  AIProvider,
  CodeExecutionConfig,
} from '../models/types';
import { createDefaultAgentConfig, createDefaultPipeline } from '../store/pipelineStore';
import { PipelineEngine } from '../engine';

export const App: React.FC = () => {
  // ---- State ----
  const [pipeline, setPipeline] = useState<Pipeline>(createDefaultPipeline());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [execution, setExecution] = useState<PipelineExecution | null>(null);
  const [rightPanel, setRightPanel] = useState<'config' | 'execution' | 'input-config' | 'output-result' | 'code-config' | 'node-io' | null>(null);
  const [inputData, setInputData] = useState('');
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const engineRef = useRef(new PipelineEngine());
  const executionIdRef = useRef<string | null>(null);

  const selectedNode = pipeline.nodes.find((n) => n.id === selectedNodeId);
  const selectedAgentConfig = selectedNode?.data.agentConfig;

  // Determine which providers are needed by the pipeline
  const requiredProviders = useMemo(() => {
    const providers = new Set<AIProvider>();
    for (const node of pipeline.nodes) {
      if (node.type === 'agent' && node.data.agentConfig) {
        providers.add(node.data.agentConfig.provider);
      }
    }
    return providers;
  }, [pipeline.nodes]);

  const missingKeys = useMemo(() => {
    const missing: AIProvider[] = [];
    for (const provider of requiredProviders) {
      if (provider === 'local' || provider === 'custom') continue;
      if (!apiKeys[provider]?.trim()) missing.push(provider);
    }
    return missing;
  }, [requiredProviders, apiKeys]);

  const hasAgentNodes = pipeline.nodes.some((n) => n.type === 'agent');
  const canRun = pipeline.nodes.length > 0 && hasAgentNodes && missingKeys.length === 0 && !isExecuting;

  // ---- Template Loading ----
  const loadTemplate = useCallback(
    (template: Pipeline) => {
      // Generate fresh IDs so templates can be loaded multiple times
      const idMap = new Map<string, string>();
      for (const node of template.nodes) {
        idMap.set(node.id, crypto.randomUUID());
      }

      const now = new Date().toISOString();
      const newPipeline: Pipeline = {
        ...template,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        nodes: template.nodes.map((node) => ({
          ...node,
          id: idMap.get(node.id)!,
          data: {
            ...node.data,
            agentConfig: node.data.agentConfig
              ? { ...node.data.agentConfig, id: crypto.randomUUID() }
              : undefined,
          },
        })),
        edges: template.edges.map((edge) => ({
          ...edge,
          id: crypto.randomUUID(),
          source: idMap.get(edge.source)!,
          target: idMap.get(edge.target)!,
        })),
      };

      setPipeline(newPipeline);
      setSelectedNodeId(null);
      setRightPanel(null);
      setExecution(null);
      if (template.sampleInput) {
        setInputData(template.sampleInput);
      }
    },
    []
  );

  // ---- Node Management ----
  const addNode = useCallback(
    (type: string) => {
      const id = crypto.randomUUID();
      const offset = pipeline.nodes.length;
      const newNode: PipelineNode = {
        id,
        type: type as PipelineNode['type'],
        position: { x: 100 + offset * 60, y: 200 + (offset % 3) * 120 },
        data: {
          label:
            type === 'input' ? 'Input Data' :
            type === 'output' ? 'Result' :
            type === 'condition' ? 'Condition' :
            type === 'code' ? 'Code Executor' :
            `Agent ${pipeline.nodes.filter((n) => n.type === 'agent').length + 1}`,
          ...(type === 'agent' ? { agentConfig: createDefaultAgentConfig() } : {}),
          ...(type === 'input' ? { inputConfig: { dataType: 'text', source: 'manual' } } : {}),
          ...(type === 'output' ? { outputConfig: { dataType: 'text', destination: 'display' } } : {}),
          ...(type === 'condition' ? { conditionConfig: { expression: 'true', branches: [{ label: 'Yes', condition: 'true' }, { label: 'No', condition: 'false' }] } } : {}),
          ...(type === 'code' ? { codeConfig: { language: 'javascript' as const, timeout: 10000, allowNetwork: true, autoFixRetries: 3 } } : {}),
        },
      };

      setPipeline((prev) => ({
        ...prev,
        nodes: [...prev.nodes, newNode],
        updatedAt: new Date().toISOString(),
      }));
      setSelectedNodeId(id);
      if (type === 'agent') setRightPanel('config');
      else if (type === 'input') setRightPanel('input-config');
      else if (type === 'output') setRightPanel('output-result');
      else if (type === 'code') setRightPanel('code-config');
    },
    [pipeline.nodes]
  );

  const connectNodes = useCallback(
    (source: string, target: string) => {
      setPipeline((prev) => {
        // Prevent duplicate edges
        if (prev.edges.some((e) => e.source === source && e.target === target)) return prev;
        const edge: PipelineEdge = {
          id: `${source}-${target}`,
          source,
          target,
        };
        return {
          ...prev,
          edges: [...prev.edges, edge],
          updatedAt: new Date().toISOString(),
        };
      });
    },
    []
  );

  const removeNode = useCallback(
    (nodeId: string) => {
      setPipeline((prev) => ({
        ...prev,
        nodes: prev.nodes.filter((n) => n.id !== nodeId),
        edges: prev.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
        updatedAt: new Date().toISOString(),
      }));
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
        setRightPanel(null);
      }
    },
    [selectedNodeId]
  );

  const removeEdge = useCallback(
    (edgeId: string) => {
      setPipeline((prev) => ({
        ...prev,
        edges: prev.edges.filter((e) => e.id !== edgeId),
        updatedAt: new Date().toISOString(),
      }));
    },
    []
  );

  const updateAgentConfig = useCallback(
    (updates: Record<string, unknown>) => {
      if (!selectedNodeId) return;
      setPipeline((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === selectedNodeId && n.data.agentConfig
            ? { ...n, data: { ...n.data, agentConfig: { ...n.data.agentConfig!, ...updates } } }
            : n
        ),
        updatedAt: new Date().toISOString(),
      }));
    },
    [selectedNodeId]
  );

  const updateCodeConfig = useCallback(
    (updates: Partial<CodeExecutionConfig>) => {
      if (!selectedNodeId) return;
      setPipeline((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === selectedNodeId && n.data.codeConfig
            ? { ...n, data: { ...n.data, codeConfig: { ...n.data.codeConfig!, ...updates } } }
            : n
        ),
        updatedAt: new Date().toISOString(),
      }));
    },
    [selectedNodeId]
  );

  // ---- Execution helpers ----
  const executingNodeIds = new Set(
    execution?.nodeExecutions.filter((n) => n.status === 'running').map((n) => n.nodeId) ?? []
  );
  const completedNodeIds = new Set(
    execution?.nodeExecutions.filter((n) => n.status === 'completed').map((n) => n.nodeId) ?? []
  );
  const failedNodeIds = new Set(
    execution?.nodeExecutions.filter((n) => n.status === 'failed').map((n) => n.nodeId) ?? []
  );
  const nodeLabels = Object.fromEntries(pipeline.nodes.map((n) => [n.id, n.data.label]));

  const handleRun = useCallback(async () => {
    if (!canRun) {
      if (missingKeys.length > 0) setShowApiKeys(true);
      return;
    }

    setIsExecuting(true);
    setRightPanel('execution');

    const engine = engineRef.current;

    // Set up live state updates
    const unsubs: (() => void)[] = [];

    unsubs.push(engine.on('node:start', (data) => {
      setExecution((prev) => {
        if (!prev || prev.id !== data.executionId) return prev;
        return {
          ...prev,
          nodeExecutions: prev.nodeExecutions.map((ne) =>
            ne.nodeId === data.nodeId ? { ...ne, status: 'running', startedAt: new Date().toISOString() } : ne
          ),
        };
      });
    }));

    unsubs.push(engine.on('node:complete', (data) => {
      setExecution((prev) => {
        if (!prev || prev.id !== data.executionId) return prev;
        return {
          ...prev,
          nodeExecutions: prev.nodeExecutions.map((ne) =>
            ne.nodeId === data.nodeId
              ? { ...ne, status: 'completed', output: data.output, completedAt: new Date().toISOString() }
              : ne
          ),
        };
      });
    }));

    unsubs.push(engine.on('node:error', (data) => {
      setExecution((prev) => {
        if (!prev || prev.id !== data.executionId) return prev;
        return {
          ...prev,
          nodeExecutions: prev.nodeExecutions.map((ne) =>
            ne.nodeId === data.nodeId
              ? { ...ne, status: 'failed', error: { code: 'ERROR', message: data.error, recoverable: true } }
              : ne
          ),
        };
      });
    }));

    try {
      // Key input data by every input node label so the engine can resolve it
      const inputMap: Record<string, string> = { input: inputData };
      for (const node of pipeline.nodes) {
        if (node.type === 'input') inputMap[node.data.label] = inputData;
      }
      const result = await engine.execute(pipeline, inputMap, apiKeys);
      executionIdRef.current = result.id;
      setExecution(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setExecution((prev) => prev ? { ...prev, status: 'failed', error: { code: 'PIPELINE_ERROR', message: errorMsg, recoverable: false } } : prev);
    } finally {
      unsubs.forEach((fn) => fn());
      setIsExecuting(false);
    }
  }, [canRun, missingKeys, pipeline, inputData, apiKeys]);

  const handleCancel = useCallback(() => {
    if (executionIdRef.current) {
      engineRef.current.cancel(executionIdRef.current);
    }
    setIsExecuting(false);
    setExecution((prev) => prev ? { ...prev, status: 'cancelled' } : null);
  }, []);

  // ---- Render ----
  return (
    <div className="app-shell flex flex-col h-screen bg-gray-50">
      {/* ===== Top Toolbar ===== */}
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="text-xl font-bold text-indigo-600">Pipeline Studio</div>
          <input
            type="text"
            value={pipeline.name}
            onChange={(e) => setPipeline((p) => ({ ...p, name: e.target.value }))}
            className="px-2 py-1 border border-transparent hover:border-gray-300 rounded text-sm font-medium text-gray-700
                       focus:border-indigo-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Input Data Indicator */}
          {inputData ? (
            <span
              className="px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-medium rounded-md cursor-pointer hover:bg-green-100 transition-colors max-w-[200px] truncate"
              title={inputData}
              onClick={() => {
                const inputNode = pipeline.nodes.find((n) => n.type === 'input');
                if (inputNode) {
                  setSelectedNodeId(inputNode.id);
                  setRightPanel('input-config');
                }
              }}
            >
              Input: {inputData.split('\n')[0].slice(0, 30)}{inputData.length > 30 ? '...' : ''}
            </span>
          ) : (
            <span
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-400 text-xs rounded-md cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => {
                const inputNode = pipeline.nodes.find((n) => n.type === 'input');
                if (inputNode) {
                  setSelectedNodeId(inputNode.id);
                  setRightPanel('input-config');
                }
              }}
            >
              No input data — click Input node
            </span>
          )}

          {/* Run Button */}
          <button
            onClick={handleRun}
            disabled={isExecuting || pipeline.nodes.length === 0}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300
                       text-white text-sm font-medium rounded-md flex items-center gap-2
                       transition-colors"
          >
            {isExecuting ? 'Running...' : 'Run Pipeline'}
          </button>

          {/* Missing keys indicator */}
          {missingKeys.length > 0 && hasAgentNodes && (
            <button
              onClick={() => setShowApiKeys(true)}
              className="px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-md
                         hover:bg-amber-200 transition-colors"
            >
              API Keys Required
            </button>
          )}

          {/* Settings */}
          <button
            onClick={() => setShowApiKeys(true)}
            className="px-3 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md text-sm transition-colors"
          >
            API Keys
          </button>

          <button
            onClick={() => setShowHelp(true)}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full text-sm font-bold transition-colors"
            title="How to use"
          >
            ?
          </button>
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Node Palette */}
        <aside className="w-72 bg-white border-r border-gray-200 overflow-y-auto">
          <NodePalette onAddNode={addNode} onLoadTemplate={loadTemplate} />
        </aside>

        {/* Center - Canvas */}
        <main className="flex-1 relative">
          <PipelineCanvas
            nodes={pipeline.nodes}
            edges={pipeline.edges}
            onNodeMove={(nodeId, position) => {
              setPipeline((prev) => ({
                ...prev,
                nodes: prev.nodes.map((n) => n.id === nodeId ? { ...n, position } : n),
              }));
            }}
            onNodeSelect={(id) => {
              setSelectedNodeId(id);
              if (id) {
                const node = pipeline.nodes.find((n) => n.id === id);
                // After execution, show I/O panel for any node that has execution data
                const nodeExec = execution?.nodeExecutions.find((ne) => ne.nodeId === id);
                const hasExecData = nodeExec && (nodeExec.input !== undefined || nodeExec.output !== undefined || nodeExec.status !== 'idle');
                if (hasExecData) {
                  setRightPanel('node-io');
                } else if (node?.type === 'agent') setRightPanel('config');
                else if (node?.type === 'input') setRightPanel('input-config');
                else if (node?.type === 'output') setRightPanel('output-result');
                else if (node?.type === 'code') setRightPanel('code-config');
              }
            }}
            onConnect={connectNodes}
            onRemoveNode={removeNode}
            onRemoveEdge={removeEdge}
            selectedNodeId={selectedNodeId}
            executingNodeIds={executingNodeIds}
            completedNodeIds={completedNodeIds}
            failedNodeIds={failedNodeIds}
          />

          {/* Floating node count badge */}
          <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full
                          text-xs text-gray-500 shadow">
            {pipeline.nodes.length} nodes | {pipeline.edges.length} connections
          </div>
        </main>

        {/* Right Panel - Config, Input, Output, or Execution */}
        {rightPanel === 'config' && selectedAgentConfig && (
          <AgentConfigPanel
            config={selectedAgentConfig}
            onChange={updateAgentConfig}
            onClose={() => setRightPanel(null)}
          />
        )}

        {rightPanel === 'input-config' && selectedNode?.type === 'input' && (
          <InputConfigPanel
            label={selectedNode.data.label}
            inputData={inputData}
            onLabelChange={(label) => {
              setPipeline((prev) => ({
                ...prev,
                nodes: prev.nodes.map((n) =>
                  n.id === selectedNodeId ? { ...n, data: { ...n.data, label } } : n
                ),
              }));
            }}
            onInputDataChange={setInputData}
            onClose={() => setRightPanel(null)}
          />
        )}

        {rightPanel === 'output-result' && selectedNode?.type === 'output' && (
          <OutputResultPanel
            label={selectedNode.data.label}
            nodeExecution={execution?.nodeExecutions.find((ne) => ne.nodeId === selectedNodeId)}
            onClose={() => setRightPanel(null)}
          />
        )}

        {rightPanel === 'node-io' && selectedNode && (
          <NodeIOPanel
            node={selectedNode}
            nodeExecution={execution?.nodeExecutions.find((ne) => ne.nodeId === selectedNodeId)}
            onClose={() => setRightPanel(null)}
          />
        )}

        {rightPanel === 'code-config' && selectedNode?.type === 'code' && selectedNode.data.codeConfig && (
          <CodeConfigPanel
            config={selectedNode.data.codeConfig}
            onChange={updateCodeConfig}
            onClose={() => setRightPanel(null)}
          />
        )}

        {rightPanel === 'execution' && execution && (
          <aside className="w-96 border-l border-gray-200">
            <ExecutionDashboard
              execution={execution}
              nodeLabels={nodeLabels}
              onCancel={handleCancel}
              onRetry={handleRun}
            />
          </aside>
        )}
      </div>

      {/* Help Guide Modal */}
      {showHelp && <HelpGuide onClose={() => setShowHelp(false)} />}

      {/* API Keys Modal */}
      {showApiKeys && (
        <ApiKeysModal
          apiKeys={apiKeys}
          onSave={(keys) => {
            setApiKeys(keys);
            setShowApiKeys(false);
          }}
          onClose={() => setShowApiKeys(false)}
        />
      )}
    </div>
  );
};
