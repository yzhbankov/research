// ============================================================================
// Pipeline Canvas - Visual Graph Editor
// ============================================================================
// The main drag-and-drop canvas where users visually build their AI pipelines.
// Uses ReactFlow for the graph rendering and interaction.
//
// Key features:
// - Drag nodes from the sidebar onto the canvas
// - Connect nodes by drawing edges between ports
// - Select nodes to configure them in the side panel
// - Zoom, pan, and minimap navigation
// ============================================================================

import React, { useCallback, useMemo } from 'react';

// In production, these would be ReactFlow imports:
// import ReactFlow, {
//   Background, Controls, MiniMap,
//   addEdge, useNodesState, useEdgesState,
//   Connection, NodeTypes
// } from 'reactflow';

import { PipelineNode, PipelineEdge } from '../../models/types';
import { AgentNode } from './nodes/AgentNode';
import { InputNode } from './nodes/InputNode';
import { OutputNode } from './nodes/OutputNode';
import { ConditionNode } from './nodes/ConditionNode';

interface PipelineCanvasProps {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  onNodesChange: (nodes: PipelineNode[]) => void;
  onEdgesChange: (edges: PipelineEdge[]) => void;
  onNodeSelect: (nodeId: string | null) => void;
  onConnect: (source: string, target: string) => void;
  selectedNodeId: string | null;
  executingNodeIds: Set<string>;
  completedNodeIds: Set<string>;
  failedNodeIds: Set<string>;
}

/** Custom node type registry for ReactFlow */
const nodeTypes = {
  agent: AgentNode,
  input: InputNode,
  output: OutputNode,
  condition: ConditionNode,
};

export const PipelineCanvas: React.FC<PipelineCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeSelect,
  onConnect,
  selectedNodeId,
  executingNodeIds,
  completedNodeIds,
  failedNodeIds,
}) => {
  // Transform nodes to include execution status styling
  const styledNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        className: [
          selectedNodeId === node.id ? 'ring-2 ring-blue-500' : '',
          executingNodeIds.has(node.id) ? 'animate-pulse ring-2 ring-yellow-400' : '',
          completedNodeIds.has(node.id) ? 'ring-2 ring-green-500' : '',
          failedNodeIds.has(node.id) ? 'ring-2 ring-red-500' : '',
        ]
          .filter(Boolean)
          .join(' '),
      })),
    [nodes, selectedNodeId, executingNodeIds, completedNodeIds, failedNodeIds]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: PipelineNode) => {
      onNodeSelect(node.id);
    },
    [onNodeSelect]
  );

  const handlePaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  const handleConnect = useCallback(
    (params: { source: string; target: string }) => {
      onConnect(params.source, params.target);
    },
    [onConnect]
  );

  // ReactFlow rendering (placeholder structure for prototype)
  return (
    <div className="pipeline-canvas" style={{ width: '100%', height: '100%' }}>
      {/*
        <ReactFlow
          nodes={styledNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          onConnect={handleConnect}
          fitView
          snapToGrid
          snapGrid={[16, 16]}
          defaultEdgeOptions={{
            animated: true,
            style: { stroke: '#6366f1', strokeWidth: 2 },
          }}
        >
          <Background color="#e2e8f0" gap={16} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              switch (node.type) {
                case 'input': return '#22c55e';
                case 'output': return '#ef4444';
                case 'agent': return '#6366f1';
                case 'condition': return '#f59e0b';
                default: return '#94a3b8';
              }
            }}
          />
        </ReactFlow>
      */}

      {/* Prototype visual representation */}
      <div className="canvas-placeholder">
        <svg width="100%" height="100%" viewBox="0 0 1200 800">
          {/* Grid background */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Render edges */}
          {edges.map((edge) => {
            const sourceNode = nodes.find((n) => n.id === edge.source);
            const targetNode = nodes.find((n) => n.id === edge.target);
            if (!sourceNode || !targetNode) return null;

            return (
              <line
                key={edge.id}
                x1={sourceNode.position.x + 120}
                y1={sourceNode.position.y + 40}
                x2={targetNode.position.x}
                y2={targetNode.position.y + 40}
                stroke="#6366f1"
                strokeWidth={2}
                markerEnd="url(#arrowhead)"
              />
            );
          })}

          {/* Arrow marker */}
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
            </marker>
          </defs>

          {/* Render nodes */}
          {styledNodes.map((node) => (
            <g
              key={node.id}
              transform={`translate(${node.position.x}, ${node.position.y})`}
              onClick={(e) => handleNodeClick(e as unknown as React.MouseEvent, node)}
              style={{ cursor: 'pointer' }}
            >
              <rect
                width={240}
                height={80}
                rx={8}
                fill={
                  node.type === 'input' ? '#dcfce7' :
                  node.type === 'output' ? '#fef2f2' :
                  node.type === 'condition' ? '#fef9c3' :
                  '#eef2ff'
                }
                stroke={
                  selectedNodeId === node.id ? '#3b82f6' :
                  executingNodeIds.has(node.id) ? '#eab308' :
                  completedNodeIds.has(node.id) ? '#22c55e' :
                  failedNodeIds.has(node.id) ? '#ef4444' :
                  '#c7d2fe'
                }
                strokeWidth={selectedNodeId === node.id ? 3 : 1.5}
              />
              <text x={120} y={35} textAnchor="middle" fontSize={14} fontWeight="600" fill="#1e293b">
                {node.data.label}
              </text>
              <text x={120} y={55} textAnchor="middle" fontSize={11} fill="#64748b">
                {node.type === 'agent'
                  ? node.data.agentConfig?.role ?? 'agent'
                  : node.type}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};
