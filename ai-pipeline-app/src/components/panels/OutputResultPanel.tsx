import React from 'react';
import { NodeExecution } from '../../models/types';

interface OutputResultPanelProps {
  label: string;
  nodeExecution: NodeExecution | undefined;
  onClose: () => void;
}

export const OutputResultPanel: React.FC<OutputResultPanelProps> = ({
  label,
  nodeExecution,
  onClose,
}) => {
  const status = nodeExecution?.status ?? 'idle';
  const output = nodeExecution?.output;
  const error = nodeExecution?.error;

  const outputText =
    output == null
      ? ''
      : typeof output === 'string'
        ? output
        : JSON.stringify(output, null, 2);

  const statusColor: Record<string, string> = {
    idle: 'bg-gray-100 text-gray-600',
    queued: 'bg-blue-100 text-blue-700',
    running: 'bg-amber-100 text-amber-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">📤</span>
          <h2 className="text-lg font-semibold text-gray-800">{label}</h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl"
          aria-label="Close panel"
        >
          x
        </button>
      </div>

      {/* Status Badge */}
      <div className="px-4 pt-4 shrink-0">
        <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[status] ?? statusColor.idle}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {status === 'idle' && !output && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📋</div>
            <div className="text-sm font-medium text-gray-600 mb-1">No output yet</div>
            <div className="text-xs text-gray-400">
              Run the pipeline to see the result here.
            </div>
          </div>
        )}

        {status === 'running' && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3 animate-pulse">⏳</div>
            <div className="text-sm font-medium text-gray-600">Pipeline is running...</div>
          </div>
        )}

        {status === 'failed' && error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm font-semibold text-red-700 mb-1">Error</div>
            <div className="text-sm text-red-600 font-mono whitespace-pre-wrap break-words">
              {error.message}
            </div>
          </div>
        )}

        {output != null && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">Result</label>
              <button
                onClick={() => navigator.clipboard.writeText(outputText)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Copy
              </button>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800
                            font-mono whitespace-pre-wrap break-words leading-relaxed max-h-[60vh] overflow-y-auto">
              {outputText}
            </div>
            <div className="text-xs text-gray-400">
              {outputText.length} characters
            </div>
          </div>
        )}

        {nodeExecution?.tokenUsage && (
          <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <div className="text-xs font-semibold text-indigo-700 mb-2">Token Usage</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-indigo-600">
              <div>Prompt: {nodeExecution.tokenUsage.promptTokens}</div>
              <div>Completion: {nodeExecution.tokenUsage.completionTokens}</div>
              <div>Total: {nodeExecution.tokenUsage.totalTokens}</div>
              <div>Cost: ${nodeExecution.tokenUsage.estimatedCost.toFixed(4)}</div>
            </div>
          </div>
        )}

        {nodeExecution?.duration != null && (
          <div className="mt-2 text-xs text-gray-400">
            Duration: {(nodeExecution.duration / 1000).toFixed(1)}s
          </div>
        )}
      </div>
    </div>
  );
};
