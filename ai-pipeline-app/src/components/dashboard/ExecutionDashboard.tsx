// ============================================================================
// Pipeline Execution Dashboard
// ============================================================================
// Real-time monitoring panel shown during and after pipeline execution.
// Displays:
// - Overall pipeline status and progress bar
// - Per-node execution status with timing
// - Token usage and cost metrics
// - Streaming output from agents
// - Error details with retry information
// ============================================================================

import React, { useState } from 'react';
import {
  PipelineExecution,
  NodeExecution,
  ExecutionStatus,
  ExecutionMetrics,
} from '../../models/types';

interface ExecutionDashboardProps {
  execution: PipelineExecution;
  nodeLabels: Record<string, string>; // nodeId -> label
  onCancel?: () => void;
  onRetry?: () => void;
}

const STATUS_STYLES: Record<ExecutionStatus, { color: string; label: string; icon: string }> = {
  idle: { color: 'text-gray-400', label: 'Idle', icon: '--' },
  queued: { color: 'text-blue-400', label: 'Queued', icon: '..' },
  running: { color: 'text-yellow-500', label: 'Running', icon: '>>' },
  completed: { color: 'text-green-500', label: 'Completed', icon: 'OK' },
  failed: { color: 'text-red-500', label: 'Failed', icon: '!!' },
  cancelled: { color: 'text-gray-500', label: 'Cancelled', icon: 'XX' },
  paused: { color: 'text-orange-400', label: 'Paused', icon: '||' },
};

export const ExecutionDashboard: React.FC<ExecutionDashboardProps> = ({
  execution,
  nodeLabels,
  onCancel,
  onRetry,
}) => {
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'nodes' | 'output' | 'metrics'>('nodes');

  const completedCount = execution.nodeExecutions.filter(
    (n) => n.status === 'completed'
  ).length;
  const totalCount = execution.nodeExecutions.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="execution-dashboard bg-gray-900 text-gray-100 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800">
        <div className="flex items-center gap-3">
          <span className={`text-lg font-mono ${STATUS_STYLES[execution.status].color}`}>
            [{STATUS_STYLES[execution.status].icon}]
          </span>
          <div>
            <div className="font-semibold text-sm">
              Pipeline Execution
              <span className="text-gray-400 font-normal ml-2 text-xs">
                {execution.id.slice(0, 8)}
              </span>
            </div>
            <div className={`text-xs ${STATUS_STYLES[execution.status].color}`}>
              {STATUS_STYLES[execution.status].label}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {execution.status === 'running' && onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
            >
              Cancel
            </button>
          )}
          {execution.status === 'failed' && onRetry && (
            <button
              onClick={onRetry}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
            >
              Retry
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-2">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Progress</span>
          <span>
            {completedCount}/{totalCount} nodes ({Math.round(progressPercent)}%)
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              execution.status === 'failed' ? 'bg-red-500' :
              execution.status === 'completed' ? 'bg-green-500' :
              'bg-indigo-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex border-b border-gray-700">
        {(['nodes', 'output', 'metrics'] as const).map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`flex-1 px-3 py-2 text-xs font-medium capitalize
              ${activeView === view
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-gray-500 hover:text-gray-300'}
            `}
          >
            {view}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {/* Nodes View */}
        {activeView === 'nodes' && (
          <div className="space-y-2">
            {execution.nodeExecutions.map((nodeExec) => (
              <NodeExecutionRow
                key={nodeExec.nodeId}
                nodeExec={nodeExec}
                label={nodeLabels[nodeExec.nodeId] ?? nodeExec.nodeId}
                isExpanded={expandedNode === nodeExec.nodeId}
                onToggle={() =>
                  setExpandedNode(
                    expandedNode === nodeExec.nodeId ? null : nodeExec.nodeId
                  )
                }
              />
            ))}
          </div>
        )}

        {/* Output View */}
        {activeView === 'output' && (
          <div className="space-y-3">
            {execution.output ? (
              <pre className="text-xs font-mono text-green-300 whitespace-pre-wrap bg-gray-800 rounded p-3">
                {JSON.stringify(execution.output, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-gray-400">
                {execution.status === 'running'
                  ? 'Waiting for pipeline to complete...'
                  : 'No output available'}
              </p>
            )}
          </div>
        )}

        {/* Metrics View */}
        {activeView === 'metrics' && (
          <MetricsView metrics={execution.metrics} />
        )}
      </div>
    </div>
  );
};

// ---- Sub-components ----

const NodeExecutionRow: React.FC<{
  nodeExec: NodeExecution;
  label: string;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ nodeExec, label, isExpanded, onToggle }) => {
  const statusStyle = STATUS_STYLES[nodeExec.status];

  return (
    <div className="bg-gray-800 rounded-md overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-3 py-2 text-left">
        <span className={`font-mono text-xs ${statusStyle.color}`}>
          [{statusStyle.icon}]
        </span>
        <span className="text-sm flex-1">{label}</span>
        {nodeExec.duration && (
          <span className="text-xs text-gray-400">{nodeExec.duration}ms</span>
        )}
        {nodeExec.tokenUsage && (
          <span className="text-xs text-gray-500">
            {nodeExec.tokenUsage.totalTokens} tokens
          </span>
        )}
        <span className="text-gray-500 text-xs">{isExpanded ? 'v' : '>'}</span>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {nodeExec.input !== undefined && (
            <div>
              <div className="text-xs text-gray-400 mb-1">Input:</div>
              <pre className="text-xs font-mono text-blue-300 bg-gray-900 rounded p-2 max-h-24 overflow-auto">
                {typeof nodeExec.input === 'string'
                  ? nodeExec.input
                  : JSON.stringify(nodeExec.input, null, 2)}
              </pre>
            </div>
          )}
          {nodeExec.output !== undefined && (
            <div>
              <div className="text-xs text-gray-400 mb-1">Output:</div>
              <pre className="text-xs font-mono text-green-300 bg-gray-900 rounded p-2 max-h-24 overflow-auto">
                {typeof nodeExec.output === 'string'
                  ? nodeExec.output
                  : JSON.stringify(nodeExec.output, null, 2)}
              </pre>
            </div>
          )}
          {nodeExec.error && (
            <div className="text-xs text-red-400 bg-red-900/30 rounded p-2">
              Error: {nodeExec.error.message}
              {nodeExec.retryCount > 0 && ` (${nodeExec.retryCount} retries)`}
            </div>
          )}
          {nodeExec.tokenUsage && (
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div>
                <div className="text-gray-500">Prompt</div>
                <div>{nodeExec.tokenUsage.promptTokens}</div>
              </div>
              <div>
                <div className="text-gray-500">Completion</div>
                <div>{nodeExec.tokenUsage.completionTokens}</div>
              </div>
              <div>
                <div className="text-gray-500">Total</div>
                <div>{nodeExec.tokenUsage.totalTokens}</div>
              </div>
              <div>
                <div className="text-gray-500">Cost</div>
                <div>${nodeExec.tokenUsage.estimatedCost.toFixed(4)}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MetricsView: React.FC<{ metrics: ExecutionMetrics }> = ({ metrics }) => (
  <div className="grid grid-cols-2 gap-4">
    <MetricCard label="Total Duration" value={`${(metrics.totalDuration / 1000).toFixed(1)}s`} />
    <MetricCard label="Total Tokens" value={metrics.totalTokens.toLocaleString()} />
    <MetricCard label="Estimated Cost" value={`$${metrics.totalCost.toFixed(4)}`} />
    <MetricCard label="Nodes Executed" value={`${metrics.nodesExecuted}`} />
    <MetricCard label="Nodes Failed" value={`${metrics.nodesFailed}`} color={metrics.nodesFailed > 0 ? 'text-red-400' : undefined} />
  </div>
);

const MetricCard: React.FC<{ label: string; value: string; color?: string }> = ({
  label,
  value,
  color,
}) => (
  <div className="bg-gray-800 rounded-md p-3">
    <div className="text-xs text-gray-400">{label}</div>
    <div className={`text-lg font-semibold mt-1 ${color ?? 'text-white'}`}>{value}</div>
  </div>
);
