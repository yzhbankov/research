// ============================================================================
// Output Node - Exit point that collects pipeline results
// ============================================================================

import React from 'react';
import { OutputNodeConfig } from '../../../models/types';

interface OutputNodeProps {
  data: {
    label: string;
    outputConfig?: OutputNodeConfig;
  };
  selected?: boolean;
}

const DEST_ICONS: Record<string, string> = {
  display: '🖥️',
  file: '💾',
  api: '🌐',
  webhook: '🔗',
  email: '📧',
};

export const OutputNode: React.FC<OutputNodeProps> = ({ data, selected }) => {
  const config = data.outputConfig;
  const icon = config ? DEST_ICONS[config.destination] ?? '📤' : '📤';

  return (
    <div
      className={`
        output-node
        bg-red-50 rounded-lg shadow-md border-2 p-3 min-w-[180px]
        ${selected ? 'border-red-500 shadow-lg' : 'border-red-200'}
      `}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <div>
          <div className="font-semibold text-sm text-red-800">{data.label}</div>
          <div className="text-xs text-red-600">
            {config?.destination ?? 'output'} • {config?.dataType ?? 'text'}
          </div>
        </div>
      </div>

      {/* Input handle only */}
      <div className="absolute -left-2 top-1/2 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
    </div>
  );
};
