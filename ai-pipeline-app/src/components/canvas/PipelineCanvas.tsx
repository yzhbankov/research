// ============================================================================
// Pipeline Canvas - Visual Graph Editor with pan, zoom, and drag
// ============================================================================

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { PipelineNode, PipelineEdge } from '../../models/types';

const NODE_W = 240;
const NODE_H = 80;

interface PipelineCanvasProps {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  onNodeMove: (nodeId: string, position: { x: number; y: number }) => void;
  onNodeSelect: (nodeId: string | null) => void;
  onConnect: (source: string, target: string) => void;
  onRemoveNode: (nodeId: string) => void;
  onRemoveEdge: (edgeId: string) => void;
  selectedNodeId: string | null;
  executingNodeIds: Set<string>;
  completedNodeIds: Set<string>;
  failedNodeIds: Set<string>;
}

interface ViewState {
  x: number;
  y: number;
  scale: number;
}

export const PipelineCanvas: React.FC<PipelineCanvasProps> = ({
  nodes,
  edges,
  onNodeMove,
  onNodeSelect,
  onConnect,
  onRemoveNode,
  onRemoveEdge,
  selectedNodeId,
  executingNodeIds,
  completedNodeIds,
  failedNodeIds,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>({ x: 0, y: 0, scale: 1 });

  // Drag state refs (not state to avoid re-renders during drag)
  const dragRef = useRef<{
    type: 'node' | 'pan' | null;
    nodeId?: string;
    startMouse: { x: number; y: number };
    startPos: { x: number; y: number };
  }>({ type: null, startMouse: { x: 0, y: 0 }, startPos: { x: 0, y: 0 } });

  // --- Auto-fit on first load or when nodes change dramatically ---
  const fitToView = useCallback(() => {
    if (nodes.length === 0 || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const padding = 60;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.position.x);
      minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + NODE_W);
      maxY = Math.max(maxY, n.position.y + NODE_H);
    }

    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;
    const scale = Math.min(1, rect.width / contentW, rect.height / contentH);
    const x = (rect.width - contentW * scale) / 2 - (minX - padding) * scale;
    const y = (rect.height - contentH * scale) / 2 - (minY - padding) * scale;

    setView({ x, y, scale });
  }, [nodes]);

  // Track node count to auto-fit when templates load
  const prevNodeCount = useRef(nodes.length);
  useEffect(() => {
    if (nodes.length > 0 && nodes.length !== prevNodeCount.current) {
      fitToView();
    }
    prevNodeCount.current = nodes.length;
  }, [nodes.length, fitToView]);

  // --- Mouse handlers ---
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    // Pan: click on empty canvas
    dragRef.current = {
      type: 'pan',
      startMouse: { x: e.clientX, y: e.clientY },
      startPos: { x: view.x, y: view.y },
    };

    const handleMove = (ev: MouseEvent) => {
      const d = dragRef.current;
      if (d.type === 'pan') {
        setView((v) => ({
          ...v,
          x: d.startPos.x + (ev.clientX - d.startMouse.x),
          y: d.startPos.y + (ev.clientY - d.startMouse.y),
        }));
      } else if (d.type === 'node' && d.nodeId) {
        const dx = (ev.clientX - d.startMouse.x) / view.scale;
        const dy = (ev.clientY - d.startMouse.y) / view.scale;
        onNodeMove(d.nodeId, {
          x: Math.round(d.startPos.x + dx),
          y: Math.round(d.startPos.y + dy),
        });
      }
    };

    const handleUp = () => {
      dragRef.current = { type: null, startMouse: { x: 0, y: 0 }, startPos: { x: 0, y: 0 } };
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [view, onNodeMove]);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, node: PipelineNode) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    dragRef.current = {
      type: 'node',
      nodeId: node.id,
      startMouse: { x: e.clientX, y: e.clientY },
      startPos: { x: node.position.x, y: node.position.y },
    };

    let moved = false;

    const handleMove = (ev: MouseEvent) => {
      const d = dragRef.current;
      if (d.type !== 'node' || !d.nodeId) return;
      const dx = (ev.clientX - d.startMouse.x) / view.scale;
      const dy = (ev.clientY - d.startMouse.y) / view.scale;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      onNodeMove(d.nodeId, {
        x: Math.round(d.startPos.x + dx),
        y: Math.round(d.startPos.y + dy),
      });
    };

    const handleUp = () => {
      if (!moved) {
        onNodeSelect(node.id);
      }
      dragRef.current = { type: null, startMouse: { x: 0, y: 0 }, startPos: { x: 0, y: 0 } };
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }, [view.scale, onNodeMove, onNodeSelect]);

  // --- Zoom ---
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setView((v) => {
      const newScale = Math.min(3, Math.max(0.15, v.scale * zoomFactor));
      const ratio = newScale / v.scale;
      return {
        scale: newScale,
        x: mx - (mx - v.x) * ratio,
        y: my - (my - v.y) * ratio,
      };
    });
  }, []);

  const handlePaneClick = useCallback((e: React.MouseEvent) => {
    // Only deselect if the click target is the background rect
    if ((e.target as SVGElement).getAttribute('data-pane') === 'true') {
      setConnectFrom(null);
      onNodeSelect(null);
    }
  }, [onNodeSelect]);

  const handleOutputPort = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setConnectFrom(nodeId);
  }, []);

  const handleInputPort = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (connectFrom && connectFrom !== nodeId) {
      onConnect(connectFrom, nodeId);
    }
    setConnectFrom(null);
  }, [connectFrom, onConnect]);

  const hasInput = (type: string) => type !== 'input';
  const hasOutput = (type: string) => type !== 'output';

  // Edge path helper: cubic bezier
  const edgePath = useCallback((sx: number, sy: number, ex: number, ey: number) => {
    const dx = Math.abs(ex - sx) * 0.5;
    return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${ex - dx} ${ey}, ${ex} ${ey}`;
  }, []);

  return (
    <div className="pipeline-canvas relative" style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Connection hint */}
      {connectFrom && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg">
          Click an input port (left circle) on the target node
          <button onClick={() => setConnectFrom(null)} className="ml-2 text-indigo-200 hover:text-white">
            Cancel
          </button>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
        <button
          onClick={() => setView((v) => ({ ...v, scale: Math.min(3, v.scale * 1.2) }))}
          className="w-8 h-8 bg-white border border-gray-300 rounded shadow-sm text-gray-600 hover:bg-gray-50 text-lg leading-none"
        >+</button>
        <button
          onClick={() => setView((v) => ({ ...v, scale: Math.max(0.15, v.scale / 1.2) }))}
          className="w-8 h-8 bg-white border border-gray-300 rounded shadow-sm text-gray-600 hover:bg-gray-50 text-lg leading-none"
        >-</button>
        <button
          onClick={fitToView}
          className="w-8 h-8 bg-white border border-gray-300 rounded shadow-sm text-gray-500 hover:bg-gray-50 text-xs leading-none"
          title="Fit to view"
        >Fit</button>
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        onClick={handlePaneClick}
        style={{ cursor: dragRef.current.type === 'pan' ? 'grabbing' : 'grab' }}
      >
        {/* Grid pattern */}
        <defs>
          <pattern id="grid-small" width={20} height={20} patternUnits="userSpaceOnUse"
            patternTransform={`translate(${view.x},${view.y}) scale(${view.scale})`}>
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f1f5f9" strokeWidth={0.5 / view.scale} />
          </pattern>
          <pattern id="grid-large" width={100} height={100} patternUnits="userSpaceOnUse"
            patternTransform={`translate(${view.x},${view.y}) scale(${view.scale})`}>
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#e2e8f0" strokeWidth={0.5 / view.scale} />
          </pattern>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
          </marker>
        </defs>

        {/* Background */}
        <rect width="100%" height="100%" fill="#fafbfc" data-pane="true" />
        <rect width="100%" height="100%" fill="url(#grid-small)" data-pane="true" />
        <rect width="100%" height="100%" fill="url(#grid-large)" data-pane="true" />

        {/* World-space group with pan+zoom transform */}
        <g transform={`translate(${view.x},${view.y}) scale(${view.scale})`}>
          {/* Edges */}
          {edges.map((edge) => {
            const src = nodes.find((n) => n.id === edge.source);
            const tgt = nodes.find((n) => n.id === edge.target);
            if (!src || !tgt) return null;

            const x1 = src.position.x + NODE_W;
            const y1 = src.position.y + NODE_H / 2;
            const x2 = tgt.position.x;
            const y2 = tgt.position.y + NODE_H / 2;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;

            return (
              <g key={edge.id}>
                <path d={edgePath(x1, y1, x2, y2)} fill="none" stroke="#6366f1" strokeWidth={2} markerEnd="url(#arrowhead)" />
                {/* Delete button on hover */}
                <g onClick={(e) => { e.stopPropagation(); onRemoveEdge(edge.id); }} style={{ cursor: 'pointer' }}>
                  <circle cx={mx} cy={my} r={10} fill="white" stroke="#e2e8f0" strokeWidth={1} className="opacity-0 hover:opacity-100 transition-opacity" />
                  <text x={mx} y={my + 4} textAnchor="middle" fontSize={12} fill="#ef4444" className="opacity-0 hover:opacity-100 transition-opacity pointer-events-none">x</text>
                </g>
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isExecuting = executingNodeIds.has(node.id);
            const isCompleted = completedNodeIds.has(node.id);
            const isFailed = failedNodeIds.has(node.id);

            const fillColor =
              node.type === 'input' ? '#dcfce7' :
              node.type === 'output' ? '#fef2f2' :
              node.type === 'condition' ? '#fef9c3' :
              node.type === 'code' ? '#cffafe' : '#eef2ff';
            const strokeColor =
              isSelected ? '#3b82f6' :
              isExecuting ? '#eab308' :
              isCompleted ? '#22c55e' :
              isFailed ? '#ef4444' : '#c7d2fe';

            return (
              <g
                key={node.id}
                transform={`translate(${node.position.x},${node.position.y})`}
                onMouseDown={(e) => handleNodeMouseDown(e as unknown as React.MouseEvent, node)}
                style={{ cursor: 'grab' }}
              >
                {/* Shadow */}
                <rect x={2} y={2} width={NODE_W} height={NODE_H} rx={8} fill="rgba(0,0,0,0.06)" />
                {/* Body */}
                <rect width={NODE_W} height={NODE_H} rx={8} fill={fillColor} stroke={strokeColor}
                  strokeWidth={isSelected ? 3 : 1.5} />

                {/* Executing pulse ring */}
                {isExecuting && (
                  <rect width={NODE_W} height={NODE_H} rx={8} fill="none" stroke="#eab308" strokeWidth={2}>
                    <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />
                  </rect>
                )}

                <text x={NODE_W / 2} y={32} textAnchor="middle" fontSize={14} fontWeight="600" fill="#1e293b">
                  {node.data.label}
                </text>
                <text x={NODE_W / 2} y={52} textAnchor="middle" fontSize={11} fill="#64748b">
                  {node.type === 'agent' ? node.data.agentConfig?.role ?? 'agent' : node.type === 'code' ? 'code executor' : node.type}
                </text>
                {node.type === 'agent' && node.data.agentConfig && (
                  <text x={NODE_W / 2} y={68} textAnchor="middle" fontSize={9} fill="#94a3b8">
                    {node.data.agentConfig.provider} / {node.data.agentConfig.model}
                  </text>
                )}
                {node.type === 'code' && node.data.codeConfig && (
                  <text x={NODE_W / 2} y={68} textAnchor="middle" fontSize={9} fill="#94a3b8">
                    JS / {(node.data.codeConfig.timeout / 1000)}s timeout{node.data.codeConfig.allowNetwork ? ' / network' : ''}
                  </text>
                )}

                {/* Input port */}
                {hasInput(node.type) && (
                  <g onClick={(e) => handleInputPort(e as unknown as React.MouseEvent, node.id)} style={{ cursor: connectFrom ? 'pointer' : 'default' }}>
                    <circle cx={0} cy={NODE_H / 2} r={connectFrom ? 9 : 6} fill={connectFrom ? '#6366f1' : '#94a3b8'} stroke="white" strokeWidth={2}>
                      {connectFrom && <animate attributeName="r" values="6;9;6" dur="1s" repeatCount="indefinite" />}
                    </circle>
                  </g>
                )}

                {/* Output port */}
                {hasOutput(node.type) && (
                  <g onClick={(e) => handleOutputPort(e as unknown as React.MouseEvent, node.id)} style={{ cursor: 'pointer' }}>
                    <circle cx={NODE_W} cy={NODE_H / 2} r={6} fill={connectFrom === node.id ? '#6366f1' : '#94a3b8'} stroke="white" strokeWidth={2} />
                  </g>
                )}

                {/* Delete button */}
                {isSelected && (
                  <g onClick={(e) => { e.stopPropagation(); onRemoveNode(node.id); }} style={{ cursor: 'pointer' }}>
                    <circle cx={NODE_W - 8} cy={-8} r={10} fill="#ef4444" />
                    <text x={NODE_W - 8} y={-4} textAnchor="middle" fontSize={13} fontWeight="bold" fill="white">x</text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};
