// ============================================================================
// AI Pipeline Studio - Main Application Shell
// ============================================================================
// Top-level layout that composes all major UI sections:
// - Top toolbar (pipeline name, run button, settings)
// - Left sidebar (node palette, templates)
// - Center canvas (visual graph editor)
// - Right panel (agent configuration, execution dashboard)
// ============================================================================

import React, { useState, useCallback } from 'react';
import { PipelineCanvas } from './canvas/PipelineCanvas';
import { AgentConfigPanel } from './panels/AgentConfigPanel';
import { NodePalette } from './panels/NodePalette';
import { ExecutionDashboard } from './dashboard/ExecutionDashboard';
import {
  Pipeline,
  PipelineNode,
  PipelineEdge,
  PipelineExecution,
  ExecutionStatus,
} from '../models/types';
import { createDefaultAgentConfig, createDefaultPipeline } from '../store/pipelineStore';

export const App: React.FC = () => {
  // ---- State ----
  const [pipeline, setPipeline] = useState<Pipeline>(createDefaultPipeline());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [execution, setExecution] = useState<PipelineExecution | null>(null);
  const [rightPanel, setRightPanel] = useState<'config' | 'execution' | null>(null);
  const [inputData, setInputData] = useState('');

  const selectedNode = pipeline.nodes.find((n) => n.id === selectedNodeId);
  const selectedAgentConfig = selectedNode?.data.agentConfig;

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
            `Agent ${pipeline.nodes.filter((n) => n.type === 'agent').length + 1}`,
          ...(type === 'agent' ? { agentConfig: createDefaultAgentConfig() } : {}),
          ...(type === 'input' ? { inputConfig: { dataType: 'text', source: 'manual' } } : {}),
          ...(type === 'output' ? { outputConfig: { dataType: 'text', destination: 'display' } } : {}),
          ...(type === 'condition' ? { conditionConfig: { expression: 'true', branches: [{ label: 'Yes', condition: 'true' }, { label: 'No', condition: 'false' }] } } : {}),
        },
      };

      setPipeline((prev) => ({
        ...prev,
        nodes: [...prev.nodes, newNode],
        updatedAt: new Date().toISOString(),
      }));
      setSelectedNodeId(id);
      if (type === 'agent') setRightPanel('config');
    },
    [pipeline.nodes]
  );

  const connectNodes = useCallback(
    (source: string, target: string) => {
      const edge: PipelineEdge = {
        id: `${source}-${target}`,
        source,
        target,
      };
      setPipeline((prev) => ({
        ...prev,
        edges: [...prev.edges, edge],
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

  const handleRun = useCallback(() => {
    // In production, this would invoke PipelineEngine.execute()
    const mockExecution: PipelineExecution = {
      id: crypto.randomUUID(),
      pipelineId: pipeline.id,
      status: 'running' as ExecutionStatus,
      startedAt: new Date().toISOString(),
      input: { input: inputData },
      nodeExecutions: pipeline.nodes.map((n) => ({
        nodeId: n.id,
        status: 'queued' as ExecutionStatus,
        retryCount: 0,
      })),
      metrics: { totalDuration: 0, totalTokens: 0, totalCost: 0, nodesExecuted: 0, nodesFailed: 0 },
    };
    setExecution(mockExecution);
    setRightPanel('execution');
  }, [pipeline, inputData]);

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
          {/* Input Data */}
          <input
            type="text"
            value={inputData}
            onChange={(e) => setInputData(e.target.value)}
            placeholder="Enter pipeline input..."
            className="w-64 px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          />
          {/* Run Button */}
          <button
            onClick={handleRun}
            disabled={pipeline.nodes.length === 0}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300
                       text-white text-sm font-medium rounded-md flex items-center gap-2
                       transition-colors"
          >
            Run Pipeline
          </button>
          {/* Settings */}
          <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
            Settings
          </button>
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Node Palette */}
        <aside className="w-72 bg-white border-r border-gray-200 overflow-y-auto">
          <NodePalette onAddNode={addNode} />
        </aside>

        {/* Center - Canvas */}
        <main className="flex-1 relative">
          <PipelineCanvas
            nodes={pipeline.nodes}
            edges={pipeline.edges}
            onNodesChange={() => {}}
            onEdgesChange={() => {}}
            onNodeSelect={(id) => {
              setSelectedNodeId(id);
              if (id) {
                const node = pipeline.nodes.find((n) => n.id === id);
                if (node?.type === 'agent') setRightPanel('config');
              }
            }}
            onConnect={connectNodes}
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

        {/* Right Panel - Config or Execution */}
        {rightPanel === 'config' && selectedAgentConfig && (
          <AgentConfigPanel
            config={selectedAgentConfig}
            onChange={updateAgentConfig}
            onClose={() => setRightPanel(null)}
          />
        )}

        {rightPanel === 'execution' && execution && (
          <aside className="w-96 border-l border-gray-200">
            <ExecutionDashboard
              execution={execution}
              nodeLabels={nodeLabels}
              onCancel={() => {
                setExecution((prev) => prev ? { ...prev, status: 'cancelled' } : null);
              }}
              onRetry={handleRun}
            />
          </aside>
        )}
      </div>
    </div>
  );
};
