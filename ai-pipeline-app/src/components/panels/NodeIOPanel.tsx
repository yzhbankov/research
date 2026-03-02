// ============================================================================
// Node I/O Panel - Shows input and output for any node after execution
// ============================================================================

import React, { useState } from 'react';
import { NodeExecution, PipelineNode } from '../../models/types';

interface NodeIOPanelProps {
  node: PipelineNode;
  nodeExecution: NodeExecution | undefined;
  onClose: () => void;
}

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  idle: { bg: 'bg-gray-100', text: 'text-gray-600' },
  queued: { bg: 'bg-blue-100', text: 'text-blue-700' },
  running: { bg: 'bg-amber-100', text: 'text-amber-700' },
  completed: { bg: 'bg-green-100', text: 'text-green-700' },
  failed: { bg: 'bg-red-100', text: 'text-red-700' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500' },
  paused: { bg: 'bg-orange-100', text: 'text-orange-700' },
};

const NODE_ICON: Record<string, string> = {
  input: '📥',
  output: '📤',
  agent: '🤖',
  condition: '🔀',
  loop: '🔁',
  parallel: '⚙️',
  code: '⚡',
};

function formatValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium shrink-0"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
};

const DataBlock: React.FC<{ label: string; value: unknown; color: string }> = ({
  label,
  value,
  color,
}) => {
  const text = formatValue(value);
  if (!text) return null;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-semibold ${color}`}>{label}</span>
        <CopyButton text={text} />
      </div>
      <pre
        className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono
                   text-gray-800 whitespace-pre-wrap break-words leading-relaxed
                   max-h-[35vh] overflow-y-auto"
      >
        {text}
      </pre>
      <div className="text-xs text-gray-400 mt-1">{text.length} chars</div>
    </div>
  );
};

export const NodeIOPanel: React.FC<NodeIOPanelProps> = ({
  node,
  nodeExecution,
  onClose,
}) => {
  const status = nodeExecution?.status ?? 'idle';
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.idle;
  const icon = NODE_ICON[node.type] ?? '📦';

  return (
    <div className="w-96 bg-white border-l border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">{icon}</span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-800 truncate">
              {node.data.label}
            </h2>
            <span className="text-xs text-gray-400">{node.type} node</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl shrink-0 ml-2"
          aria-label="Close panel"
        >
          x
        </button>
      </div>

      {/* Status */}
      <div className="px-4 pt-3 shrink-0">
        <span
          className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${badge.bg} ${badge.text}`}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
        {nodeExecution?.duration != null && (
          <span className="text-xs text-gray-400 ml-2">
            {(nodeExecution.duration / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* No execution data yet */}
        {status === 'idle' &&
          nodeExecution?.input === undefined &&
          nodeExecution?.output === undefined && (
            <div className="text-center py-10">
              <div className="text-3xl mb-2">📋</div>
              <div className="text-sm text-gray-500">No execution data yet</div>
              <div className="text-xs text-gray-400 mt-1">
                Run the pipeline to see inputs and outputs here.
              </div>
            </div>
          )}

        {/* Running state */}
        {status === 'running' && (
          <div className="text-center py-10">
            <div className="text-3xl mb-2 animate-pulse">⏳</div>
            <div className="text-sm text-gray-500">Executing...</div>
          </div>
        )}

        {/* Error */}
        {nodeExecution?.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-xs font-semibold text-red-700 mb-1">Error</div>
            <div className="text-xs text-red-600 font-mono whitespace-pre-wrap break-words">
              {nodeExecution.error.message}
            </div>
            {nodeExecution.retryCount > 0 && (
              <div className="text-xs text-red-400 mt-1">
                Retried {nodeExecution.retryCount} time(s)
              </div>
            )}
          </div>
        )}

        {/* Input */}
        {nodeExecution?.input !== undefined && (
          <DataBlock label="Input" value={nodeExecution.input} color="text-blue-600" />
        )}

        {/* Output */}
        {nodeExecution?.output !== undefined && (
          <DataBlock label="Output" value={nodeExecution.output} color="text-green-600" />
        )}

        {/* Token usage */}
        {nodeExecution?.tokenUsage && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <div className="text-xs font-semibold text-indigo-700 mb-2">Token Usage</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-indigo-600">
              <div>Prompt: {nodeExecution.tokenUsage.promptTokens}</div>
              <div>Completion: {nodeExecution.tokenUsage.completionTokens}</div>
              <div>Total: {nodeExecution.tokenUsage.totalTokens}</div>
              <div>Cost: ${nodeExecution.tokenUsage.estimatedCost.toFixed(4)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
