import React, { useState, useCallback } from 'react';
import { FileDropZone } from './FileDropZone';
import { parseFile, ParsedFileResult } from '@/utils/fileParsers';

type SourceMode = 'manual' | 'file';

interface FileInfo {
  name: string;
  size: number;
  extension: string;
  charCount: number;
  lineCount: number;
}

interface InputConfigPanelProps {
  label: string;
  inputData: string;
  onLabelChange: (label: string) => void;
  onInputDataChange: (data: string) => void;
  onClose: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const InputConfigPanel: React.FC<InputConfigPanelProps> = ({
  label,
  inputData,
  onLabelChange,
  onInputDataChange,
  onClose,
}) => {
  const [sourceMode, setSourceMode] = useState<SourceMode>('manual');
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFileSelect = useCallback(
    async (file: File) => {
      setIsParsing(true);
      setParseError(null);

      const result: ParsedFileResult = await parseFile(file);

      setIsParsing(false);

      if (result.success) {
        setFileInfo({
          name: result.metadata.name,
          size: result.metadata.size,
          extension: result.metadata.extension,
          charCount: result.metadata.charCount,
          lineCount: result.metadata.lineCount,
        });
        onInputDataChange(result.text);
      } else {
        setParseError(result.error ?? 'Unknown error');
      }
    },
    [onInputDataChange]
  );

  const handleRemoveFile = useCallback(() => {
    setFileInfo(null);
    setParseError(null);
    onInputDataChange('');
  }, [onInputDataChange]);

  return (
    <div className="w-96 bg-white border-l border-gray-200 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-lg">📥</span>
          <h2 className="text-lg font-semibold text-gray-800">Input Node</h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl"
          aria-label="Close panel"
        >
          x
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Node Label */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Node Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm
                       focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="e.g., Blog Topic"
          />
        </div>

        {/* Input Data */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Input Data
            <span className="text-gray-400 font-normal ml-1">
              (this text will be passed to the pipeline)
            </span>
          </label>

          {/* Source mode toggle */}
          <div className="flex rounded-md border border-gray-300 mb-3 overflow-hidden">
            <button
              onClick={() => setSourceMode('manual')}
              className={`flex-1 px-3 py-1.5 text-sm font-medium transition-colors ${
                sourceMode === 'manual'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Manual
            </button>
            <button
              onClick={() => setSourceMode('file')}
              className={`flex-1 px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-300 ${
                sourceMode === 'file'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              File
            </button>
          </div>

          {/* Manual mode */}
          {sourceMode === 'manual' && (
            <>
              <textarea
                value={inputData}
                onChange={(e) => onInputDataChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono
                           resize-vertical focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                rows={12}
                placeholder="Enter the data that will flow into the pipeline..."
              />
              <div className="text-xs text-gray-400 mt-1">
                {inputData.length} characters | {inputData.split('\n').length} lines
              </div>
            </>
          )}

          {/* File mode */}
          {sourceMode === 'file' && (
            <div className="space-y-3">
              {/* Error banner */}
              {parseError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {parseError}
                </div>
              )}

              {/* Loading state */}
              {isParsing && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
                  <svg
                    className="animate-spin h-5 w-5 text-indigo-500"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Parsing file...
                </div>
              )}

              {/* Drop zone (no file loaded, not parsing) */}
              {!fileInfo && !isParsing && (
                <FileDropZone onFileSelect={handleFileSelect} />
              )}

              {/* File loaded */}
              {fileInfo && !isParsing && (
                <>
                  {/* File metadata card */}
                  <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {fileInfo.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatFileSize(fileInfo.size)} &middot; .{fileInfo.extension} &middot;{' '}
                        {fileInfo.charCount.toLocaleString()} chars &middot; {fileInfo.lineCount.toLocaleString()} lines
                      </div>
                    </div>
                    <button
                      onClick={handleRemoveFile}
                      className="ml-2 text-xs text-red-500 hover:text-red-700 font-medium shrink-0"
                    >
                      Remove
                    </button>
                  </div>

                  {/* Read-only preview */}
                  <textarea
                    value={inputData}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm font-mono
                               bg-gray-50 text-gray-600 resize-vertical"
                    rows={10}
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* Hint */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="text-sm font-semibold text-green-700 mb-1">How it works</div>
          <div className="text-xs text-green-600 space-y-1">
            <p>This data is the starting point of your pipeline. It will be passed to the first connected agent node.</p>
            <p>Agent nodes reference this data using <code className="bg-green-100 px-1 rounded">{'{{input}}'}</code> in their user prompt template.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
