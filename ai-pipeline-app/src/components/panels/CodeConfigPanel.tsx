// ============================================================================
// Code Config Panel - Configuration for Code Execution nodes
// ============================================================================

import React from 'react';
import { CodeExecutionConfig } from '../../models/types';

interface CodeConfigPanelProps {
  config: CodeExecutionConfig;
  onChange: (updates: Partial<CodeExecutionConfig>) => void;
  onClose: () => void;
}

export const CodeConfigPanel: React.FC<CodeConfigPanelProps> = ({ config, onChange, onClose }) => {
  return (
    <aside className="w-80 bg-white border-l border-gray-200 overflow-y-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Code Executor Config
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          x
        </button>
      </div>

      {/* Language */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-500 mb-1">Language</label>
        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
          JavaScript
        </div>
      </div>

      {/* Timeout */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Timeout: {(config.timeout / 1000).toFixed(1)}s
        </label>
        <input
          type="range"
          min={1000}
          max={30000}
          step={1000}
          value={config.timeout}
          onChange={(e) => onChange({ timeout: Number(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>1s</span>
          <span>30s</span>
        </div>
      </div>

      {/* Allow Network */}
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.allowNetwork}
            onChange={(e) => onChange({ allowNetwork: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Allow network access (fetch)</span>
        </label>
        <p className="text-xs text-gray-400 mt-1 ml-6">
          Enable fetch() for HTTP requests within executed code
        </p>
      </div>

      {/* Auto-fix retries */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Auto-fix retries: {config.autoFixRetries}
        </label>
        <input
          type="range"
          min={0}
          max={5}
          step={1}
          value={config.autoFixRetries}
          onChange={(e) => onChange({ autoFixRetries: Number(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0 (off)</span>
          <span>5</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          When code fails, send the error back to the upstream AI agent to generate fixed code and retry automatically.
        </p>
      </div>

      {/* How it works */}
      <div className="mt-6 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
        <h4 className="text-xs font-semibold text-cyan-700 mb-2">How it works</h4>
        <ul className="text-xs text-cyan-600 space-y-1">
          <li>Receives output from the previous node</li>
          <li>If input looks like code, executes it directly</li>
          <li>If input is data, passes it through as-is</li>
          <li>The <code className="bg-cyan-100 px-1 rounded">input</code> variable holds the raw input</li>
          <li>Use <code className="bg-cyan-100 px-1 rounded">return</code> to pass data to the next node</li>
        </ul>
      </div>
    </aside>
  );
};
