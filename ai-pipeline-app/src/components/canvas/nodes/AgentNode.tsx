// ============================================================================
// Agent Node - Visual representation of an AI agent in the pipeline
// ============================================================================

import React from 'react';
import { AgentConfig } from '../../../models/types';

interface AgentNodeProps {
  data: {
    label: string;
    agentConfig?: AgentConfig;
    isExecuting?: boolean;
    isCompleted?: boolean;
    isFailed?: boolean;
  };
  selected?: boolean;
}

const ROLE_ICONS: Record<string, string> = {
  generator: '🔮',
  transformer: '🔄',
  analyzer: '🔍',
  validator: '✅',
  router: '🔀',
  aggregator: '📦',
  custom: '⚙️',
};

const PROVIDER_COLORS: Record<string, string> = {
  openai: '#10a37f',
  anthropic: '#d4a574',
  google: '#4285f4',
  local: '#64748b',
  custom: '#8b5cf6',
};

export const AgentNode: React.FC<AgentNodeProps> = ({ data, selected }) => {
  const config = data.agentConfig;
  const roleIcon = config ? ROLE_ICONS[config.role] ?? '⚙️' : '⚙️';
  const providerColor = config ? PROVIDER_COLORS[config.provider] ?? '#64748b' : '#64748b';

  return (
    <div
      className={`
        agent-node
        bg-white rounded-lg shadow-md border-2 p-3 min-w-[200px]
        transition-all duration-200
        ${selected ? 'border-blue-500 shadow-lg' : 'border-indigo-200'}
        ${data.isExecuting ? 'border-yellow-400 animate-pulse' : ''}
        ${data.isCompleted ? 'border-green-500' : ''}
        ${data.isFailed ? 'border-red-500' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{roleIcon}</span>
        <div className="flex-1">
          <div className="font-semibold text-sm text-gray-800">{data.label}</div>
          <div className="text-xs text-gray-500">{config?.role ?? 'agent'}</div>
        </div>
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: providerColor }}
          title={config?.provider ?? 'unknown'}
        />
      </div>

      {/* Model Badge */}
      {config && (
        <div className="text-xs bg-gray-100 rounded px-2 py-0.5 text-gray-600 mb-1">
          {config.model}
        </div>
      )}

      {/* Prompt Preview */}
      {config?.systemPrompt && (
        <div className="text-xs text-gray-400 truncate mt-1" title={config.systemPrompt}>
          {config.systemPrompt.slice(0, 50)}
          {config.systemPrompt.length > 50 ? '...' : ''}
        </div>
      )}

      {/* Connection handles (visual indicators) */}
      <div className="absolute -left-2 top-1/2 w-4 h-4 bg-indigo-400 rounded-full border-2 border-white" />
      <div className="absolute -right-2 top-1/2 w-4 h-4 bg-indigo-400 rounded-full border-2 border-white" />
    </div>
  );
};
