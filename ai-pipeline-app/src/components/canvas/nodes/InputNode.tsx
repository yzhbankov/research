// ============================================================================
// Input Node - Entry point for pipeline data
// ============================================================================

import React from 'react';
import { InputNodeConfig } from '../../../models/types';

interface InputNodeProps {
  data: {
    label: string;
    inputConfig?: InputNodeConfig;
  };
  selected?: boolean;
}

const SOURCE_ICONS: Record<string, string> = {
  manual: '✏️',
  file: '📁',
  api: '🌐',
  webhook: '🔗',
};

export const InputNode: React.FC<InputNodeProps> = ({ data, selected }) => {
  const config = data.inputConfig;
  const icon = config ? SOURCE_ICONS[config.source] ?? '📥' : '📥';

  return (
    <div
      className={`
        input-node
        bg-green-50 rounded-lg shadow-md border-2 p-3 min-w-[180px]
        ${selected ? 'border-green-500 shadow-lg' : 'border-green-200'}
      `}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <div>
          <div className="font-semibold text-sm text-green-800">{data.label}</div>
          <div className="text-xs text-green-600">
            {config?.source ?? 'input'} • {config?.dataType ?? 'text'}
          </div>
        </div>
      </div>

      {/* Output handle only */}
      <div className="absolute -right-2 top-1/2 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
    </div>
  );
};
