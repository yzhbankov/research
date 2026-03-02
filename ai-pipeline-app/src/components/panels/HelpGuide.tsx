import React from 'react';

interface HelpGuideProps {
  onClose: () => void;
}

const STEPS = [
  {
    icon: '1',
    title: 'Set up API Keys',
    desc: 'Click "API Keys" in the toolbar and enter your OpenAI, Anthropic, or Google AI key. Keys are stored in memory only — never persisted or sent elsewhere.',
  },
  {
    icon: '2',
    title: 'Build your pipeline',
    desc: 'Add nodes from the left sidebar: Input (data source), AI Agent (LLM call), Condition (branching), and Output (result). Or pick a Quick Template for a ready-made pipeline.',
  },
  {
    icon: '3',
    title: 'Connect nodes',
    desc: 'Click the right-side port (gray circle) of a source node, then click the left-side port of the target node. A curved arrow will appear linking them.',
  },
  {
    icon: '4',
    title: 'Configure agents',
    desc: 'Click an AI Agent node to open its config panel on the right. Choose provider, model, set a system prompt, user prompt template, temperature, and more.',
  },
  {
    icon: '5',
    title: 'Run the pipeline',
    desc: 'Type your input text in the toolbar, then click "Run Pipeline". The execution dashboard shows live progress, per-node status, output, tokens used, and cost.',
  },
];

const SHORTCUTS = [
  { keys: 'Drag node', desc: 'Move a node on the canvas' },
  { keys: 'Drag canvas', desc: 'Pan the view' },
  { keys: 'Scroll wheel', desc: 'Zoom in / out' },
  { keys: 'Click node', desc: 'Select it (agent nodes open config)' },
  { keys: 'Red x on node', desc: 'Delete selected node' },
  { keys: 'x on edge', desc: 'Hover edge midpoint to delete connection' },
  { keys: 'Fit button', desc: 'Fit all nodes into view' },
];

export const HelpGuide: React.FC<HelpGuideProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-semibold text-gray-800">How to use Pipeline Studio</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            x
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-5 overflow-y-auto">
          {/* Steps */}
          <div className="space-y-4">
            {STEPS.map((step) => (
              <div key={step.icon} className="flex gap-3">
                <div className="shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center">
                  {step.icon}
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">{step.title}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Shortcuts */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Canvas Controls
            </h3>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
              {SHORTCUTS.map((s) => (
                <div key={s.keys} className="flex items-center gap-3 text-sm">
                  <span className="shrink-0 font-mono text-xs bg-white border border-gray-200 rounded px-2 py-0.5 text-gray-600 min-w-[120px]">
                    {s.keys}
                  </span>
                  <span className="text-gray-500">{s.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <div className="text-sm font-semibold text-indigo-700 mb-1">Quick start tip</div>
            <div className="text-sm text-indigo-600">
              Try a Quick Template from the left sidebar — it loads a fully configured pipeline with connected nodes and pre-written prompts. Just add your API key and click Run!
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-200 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
