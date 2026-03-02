// ============================================================================
// Node Palette - Sidebar with draggable node types
// ============================================================================
// Users drag nodes from this palette onto the canvas to build their pipeline.
// ============================================================================

import React from 'react';

interface PaletteItem {
  type: string;
  label: string;
  icon: string;
  description: string;
  color: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  {
    type: 'input',
    label: 'Input',
    icon: '📥',
    description: 'Data entry point: manual text, file upload, API, or webhook',
    color: 'bg-green-100 border-green-300',
  },
  {
    type: 'agent',
    label: 'AI Agent',
    icon: '🤖',
    description: 'Configurable AI agent with custom prompt and model',
    color: 'bg-indigo-100 border-indigo-300',
  },
  {
    type: 'condition',
    label: 'Condition',
    icon: '🔀',
    description: 'Branch pipeline based on a condition expression',
    color: 'bg-amber-100 border-amber-300',
  },
  {
    type: 'loop',
    label: 'Loop',
    icon: '🔁',
    description: 'Repeat a section of the pipeline until a condition is met',
    color: 'bg-purple-100 border-purple-300',
  },
  {
    type: 'parallel',
    label: 'Parallel',
    icon: '⚡',
    description: 'Execute multiple agents simultaneously',
    color: 'bg-cyan-100 border-cyan-300',
  },
  {
    type: 'output',
    label: 'Output',
    icon: '📤',
    description: 'Result collector: display, save to file, API, or email',
    color: 'bg-red-100 border-red-300',
  },
];

interface NodePaletteProps {
  onAddNode: (type: string) => void;
}

export const NodePalette: React.FC<NodePaletteProps> = ({ onAddNode }) => {
  const handleDragStart = (e: React.DragEvent, item: PaletteItem) => {
    e.dataTransfer.setData('application/pipeline-node', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="node-palette p-4">
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">
        Pipeline Nodes
      </h3>
      <p className="text-xs text-gray-400 mb-4">
        Drag nodes onto the canvas or click to add
      </p>

      <div className="space-y-2">
        {PALETTE_ITEMS.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => handleDragStart(e, item)}
            onClick={() => onAddNode(item.type)}
            className={`
              ${item.color}
              border rounded-lg p-3 cursor-grab active:cursor-grabbing
              hover:shadow-md transition-shadow duration-150
            `}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium text-sm text-gray-800">{item.label}</span>
            </div>
            <p className="text-xs text-gray-500 pl-8">{item.description}</p>
          </div>
        ))}
      </div>

      {/* Quick Templates Section */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">
          Quick Templates
        </h3>
        <div className="space-y-2">
          {[
            { name: 'Content Writer', desc: '3-agent blog writing pipeline', agents: 3 },
            { name: 'Data Analyst', desc: 'Analyze + summarize + format', agents: 3 },
            { name: 'Customer Support', desc: 'Classify + route + respond', agents: 4 },
            { name: 'Code Review', desc: 'Analyze + suggest + validate', agents: 3 },
          ].map((tmpl) => (
            <button
              key={tmpl.name}
              className="w-full text-left bg-gray-50 border border-gray-200 rounded-lg p-2.5
                         hover:bg-gray-100 transition-colors"
            >
              <div className="text-sm font-medium text-gray-700">{tmpl.name}</div>
              <div className="text-xs text-gray-400">
                {tmpl.desc} ({tmpl.agents} agents)
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
