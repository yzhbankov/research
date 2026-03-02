// ============================================================================
// Condition Node - Branching logic in the pipeline
// ============================================================================

import React from 'react';
import { ConditionConfig } from '../../../models/types';

interface ConditionNodeProps {
  data: {
    label: string;
    conditionConfig?: ConditionConfig;
  };
  selected?: boolean;
}

export const ConditionNode: React.FC<ConditionNodeProps> = ({ data, selected }) => {
  const config = data.conditionConfig;

  return (
    <div
      className={`
        condition-node
        bg-amber-50 rounded-lg shadow-md border-2 p-3 min-w-[180px]
        ${selected ? 'border-amber-500 shadow-lg' : 'border-amber-200'}
      `}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">🔀</span>
        <div className="font-semibold text-sm text-amber-800">{data.label}</div>
      </div>

      {config && (
        <div className="text-xs text-amber-600 font-mono bg-amber-100 rounded px-2 py-1">
          {config.expression.slice(0, 40)}
          {config.expression.length > 40 ? '...' : ''}
        </div>
      )}

      {config?.branches && (
        <div className="mt-1 flex gap-1">
          {config.branches.map((branch, i) => (
            <span key={i} className="text-xs bg-amber-200 rounded px-1.5 py-0.5">
              {branch.label}
            </span>
          ))}
        </div>
      )}

      {/* Input handle */}
      <div className="absolute -left-2 top-1/2 w-4 h-4 bg-amber-500 rounded-full border-2 border-white" />
      {/* Multiple output handles */}
      <div className="absolute -right-2 top-1/3 w-4 h-4 bg-amber-500 rounded-full border-2 border-white" />
      <div className="absolute -right-2 top-2/3 w-4 h-4 bg-amber-500 rounded-full border-2 border-white" />
    </div>
  );
};
