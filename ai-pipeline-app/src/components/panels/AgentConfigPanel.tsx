// ============================================================================
// Agent Configuration Panel
// ============================================================================
// Right-side panel for configuring a selected agent node:
// - Name, role, and description
// - AI provider and model selection
// - System prompt editor (full-featured textarea)
// - User prompt template with variable interpolation
// - Temperature, max tokens, and other parameters
// - I/O schema configuration
// - Retry policy and guardrails
// ============================================================================

import React, { useState } from 'react';
import {
  AgentConfig,
  AgentRole,
  AIProvider,
  DataType,
} from '../../models/types';

interface AgentConfigPanelProps {
  config: AgentConfig;
  onChange: (updates: Partial<AgentConfig>) => void;
  onClose: () => void;
}

const AI_PROVIDERS: { value: AIProvider; label: string; models: string[] }[] = [
  {
    value: 'openai',
    label: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-preview', 'o1-mini'],
  },
  {
    value: 'anthropic',
    label: 'Anthropic',
    models: ['claude-opus-4-20250514', 'claude-sonnet-4-20250514', 'claude-haiku-4-5-20251001'],
  },
  {
    value: 'google',
    label: 'Google AI',
    models: ['gemini-2.0-flash', 'gemini-2.0-pro'],
  },
  {
    value: 'local',
    label: 'Local / Ollama',
    models: ['llama3.1', 'codellama', 'mistral', 'custom'],
  },
];

const AGENT_ROLES: { value: AgentRole; label: string; description: string }[] = [
  { value: 'generator', label: 'Generator', description: 'Creates content from scratch' },
  { value: 'transformer', label: 'Transformer', description: 'Modifies or transforms input' },
  { value: 'analyzer', label: 'Analyzer', description: 'Analyzes input and produces insights' },
  { value: 'validator', label: 'Validator', description: 'Validates data against criteria' },
  { value: 'router', label: 'Router', description: 'Routes data to different paths' },
  { value: 'aggregator', label: 'Aggregator', description: 'Combines multiple inputs' },
  { value: 'custom', label: 'Custom', description: 'User-defined behavior' },
];

const DATA_TYPES: DataType[] = ['text', 'json', 'structured', 'image', 'audio', 'file'];

export const AgentConfigPanel: React.FC<AgentConfigPanelProps> = ({
  config,
  onChange,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'prompt' | 'io' | 'advanced'>('general');

  const selectedProvider = AI_PROVIDERS.find((p) => p.value === config.provider);

  return (
    <div className="agent-config-panel w-96 bg-white border-l border-gray-200 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Agent Configuration</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl"
          aria-label="Close panel"
        >
          x
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {(['general', 'prompt', 'io', 'advanced'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-sm font-medium capitalize
              ${activeTab === tab
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'}
            `}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        {/* ---- General Tab ---- */}
        {activeTab === 'general' && (
          <>
            {/* Agent Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => onChange({ name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                           focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., Content Writer"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={config.description}
                onChange={(e) => onChange({ description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm resize-none
                           focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={2}
                placeholder="What does this agent do?"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={config.role}
                onChange={(e) => onChange({ role: e.target.value as AgentRole })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                           focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {AGENT_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label} — {role.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Provider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">AI Provider</label>
              <select
                value={config.provider}
                onChange={(e) => {
                  const provider = e.target.value as AIProvider;
                  const models = AI_PROVIDERS.find((p) => p.value === provider)?.models ?? [];
                  onChange({ provider, model: models[0] ?? '' });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                           focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {AI_PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <select
                value={config.model}
                onChange={(e) => onChange({ model: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                           focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {selectedProvider?.models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* ---- Prompt Tab ---- */}
        {activeTab === 'prompt' && (
          <>
            {/* System Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System Prompt
                <span className="text-gray-400 font-normal ml-1">
                  (defines agent personality and behavior)
                </span>
              </label>
              <textarea
                value={config.systemPrompt}
                onChange={(e) => onChange({ systemPrompt: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                           font-mono resize-vertical
                           focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={8}
                placeholder="You are a helpful assistant that..."
              />
              <div className="text-xs text-gray-400 mt-1">
                {config.systemPrompt.length} characters
              </div>
            </div>

            {/* User Prompt Template */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Prompt Template
                <span className="text-gray-400 font-normal ml-1">
                  (use {'{{input}}'} for pipeline data)
                </span>
              </label>
              <textarea
                value={config.userPromptTemplate}
                onChange={(e) => onChange({ userPromptTemplate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                           font-mono resize-vertical
                           focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={5}
                placeholder={'Analyze the following text:\n\n{{input}}'}
              />
              <div className="text-xs text-gray-400 mt-1">
                Available variables: {'{{input}}'}, {'{{fieldName}}'} for structured data
              </div>
            </div>

            {/* Temperature Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperature: {config.temperature}
              </label>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={config.temperature}
                onChange={(e) => onChange({ temperature: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>Precise (0)</span>
                <span>Creative (2)</span>
              </div>
            </div>

            {/* Max Tokens */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
              <input
                type="number"
                value={config.maxTokens}
                onChange={(e) => onChange({ maxTokens: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                           focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                min={1}
                max={128000}
              />
            </div>
          </>
        )}

        {/* ---- I/O Tab ---- */}
        {activeTab === 'io' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Input Data Type
              </label>
              <select
                value={config.inputSchema.type}
                onChange={(e) =>
                  onChange({ inputSchema: { ...config.inputSchema, type: e.target.value as DataType } })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {DATA_TYPES.map((dt) => (
                  <option key={dt} value={dt}>{dt}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Output Data Type
              </label>
              <select
                value={config.outputSchema.type}
                onChange={(e) =>
                  onChange({ outputSchema: { ...config.outputSchema, type: e.target.value as DataType } })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {DATA_TYPES.map((dt) => (
                  <option key={dt} value={dt}>{dt}</option>
                ))}
              </select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-xs text-blue-700">
                For structured data types, define field schemas in the JSON editor below.
                This enables validation between connected nodes.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Output Schema (JSON)
              </label>
              <textarea
                value={JSON.stringify(config.outputSchema, null, 2)}
                onChange={(e) => {
                  try {
                    const schema = JSON.parse(e.target.value);
                    onChange({ outputSchema: schema });
                  } catch {
                    // Don't update on invalid JSON
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                rows={6}
              />
            </div>
          </>
        )}

        {/* ---- Advanced Tab ---- */}
        {activeTab === 'advanced' && (
          <>
            {/* Streaming */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700">Enable Streaming</div>
                <div className="text-xs text-gray-400">Stream tokens as they're generated</div>
              </div>
              <button
                onClick={() => onChange({ enableStreaming: !config.enableStreaming })}
                className={`w-10 h-6 rounded-full transition-colors ${
                  config.enableStreaming ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    config.enableStreaming ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Retry Policy */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Retry Policy</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Max Retries</label>
                  <input
                    type="number"
                    value={config.retryPolicy.maxRetries}
                    onChange={(e) =>
                      onChange({
                        retryPolicy: {
                          ...config.retryPolicy,
                          maxRetries: parseInt(e.target.value, 10),
                        },
                      })
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    min={0}
                    max={10}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Backoff (ms)</label>
                  <input
                    type="number"
                    value={config.retryPolicy.backoffMs}
                    onChange={(e) =>
                      onChange({
                        retryPolicy: {
                          ...config.retryPolicy,
                          backoffMs: parseInt(e.target.value, 10),
                        },
                      })
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    min={100}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Multiplier</label>
                  <input
                    type="number"
                    value={config.retryPolicy.backoffMultiplier}
                    onChange={(e) =>
                      onChange({
                        retryPolicy: {
                          ...config.retryPolicy,
                          backoffMultiplier: parseFloat(e.target.value),
                        },
                      })
                    }
                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    min={1}
                    step={0.5}
                  />
                </div>
              </div>
            </div>

            {/* Timeout */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timeout (seconds)
              </label>
              <input
                type="number"
                value={config.timeout / 1000}
                onChange={(e) => onChange({ timeout: parseFloat(e.target.value) * 1000 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                min={1}
                max={300}
              />
            </div>

            {/* Top P */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Top P: {config.topP}
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={config.topP}
                onChange={(e) => onChange({ topP: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
