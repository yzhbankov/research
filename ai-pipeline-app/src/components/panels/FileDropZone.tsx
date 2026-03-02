import React, { useRef, useState, useCallback } from 'react';
import { Upload } from 'lucide-react';

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  accept?: string;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFileSelect,
  disabled = false,
  accept = '.pdf,.docx,.txt,.csv,.json,.md,.xlsx',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file);
    },
    [disabled, onFileSelect]
  );

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
      e.target.value = '';
    },
    [onFileSelect]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed
        cursor-pointer transition-colors
        ${disabled ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50' : ''}
        ${isDragOver && !disabled ? 'border-indigo-400 bg-indigo-50' : ''}
        ${!isDragOver && !disabled ? 'border-gray-300 hover:border-gray-400 bg-white' : ''}
      `}
    >
      <Upload className={`w-8 h-8 ${isDragOver ? 'text-indigo-500' : 'text-gray-400'}`} />
      <div className="text-sm text-gray-600 text-center">
        <span className="font-medium text-indigo-600">Drag & drop</span> or{' '}
        <span className="font-medium text-indigo-600">click to browse</span>
      </div>
      <div className="text-xs text-gray-400">
        PDF, DOCX, TXT, CSV, JSON, MD, XLSX (max 10MB)
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
};
