import React, { useState } from 'react';

const PROVIDERS = [
  { key: 'openai', label: 'OpenAI', placeholder: 'sk-...' },
  { key: 'anthropic', label: 'Anthropic', placeholder: 'sk-ant-...' },
  { key: 'google', label: 'Google AI', placeholder: 'AIza...' },
];

interface ApiKeysModalProps {
  apiKeys: Record<string, string>;
  onSave: (keys: Record<string, string>) => void;
  onClose: () => void;
}

export const ApiKeysModal: React.FC<ApiKeysModalProps> = ({ apiKeys, onSave, onClose }) => {
  const [keys, setKeys] = useState<Record<string, string>>({ ...apiKeys });
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  const handleChange = (provider: string, value: string) => {
    setKeys((prev) => ({ ...prev, [provider]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">API Keys</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            x
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          <p className="text-sm text-gray-500">
            Enter your API keys to run pipelines. Keys are stored in memory only and never sent to any server other than the provider's API.
          </p>

          {PROVIDERS.map((provider) => (
            <div key={provider.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {provider.label}
                {keys[provider.key]?.trim() && (
                  <span className="ml-2 text-green-500 text-xs font-normal">configured</span>
                )}
              </label>
              <div className="relative">
                <input
                  type={visible[provider.key] ? 'text' : 'password'}
                  value={keys[provider.key] ?? ''}
                  onChange={(e) => handleChange(provider.key, e.target.value)}
                  placeholder={provider.placeholder}
                  className="w-full px-3 py-2 pr-16 border border-gray-300 rounded-md text-sm font-mono
                             focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setVisible((v) => ({ ...v, [provider.key]: !v[provider.key] }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                >
                  {visible[provider.key] ? 'hide' : 'show'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(keys)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
