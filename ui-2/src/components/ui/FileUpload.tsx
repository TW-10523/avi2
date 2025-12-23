/**
 * Enhanced File Upload Component - Drag & drop with progress
 */
import { useState, useRef, useCallback } from 'react';
import { Upload, File, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface FileUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  accept?: string;
  maxSize?: number; // in MB
  multiple?: boolean;
  disabled?: boolean;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export function FileUpload({
  onUpload,
  accept = '.pdf,.doc,.docx,.txt',
  maxSize = 10,
  multiple = true,
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const maxBytes = maxSize * 1024 * 1024;
    if (file.size > maxBytes) {
      return `File too large. Max size is ${maxSize}MB`;
    }
    
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase());
    if (!acceptedTypes.some(t => extension === t || file.type.includes(t.replace('.', '')))) {
      return 'File type not supported';
    }
    
    return null;
  };

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    const newUploadingFiles: UploadingFile[] = [];

    Array.from(files).forEach(file => {
      const error = validateFile(file);
      if (error) {
        newUploadingFiles.push({ file, progress: 0, status: 'error', error });
      } else {
        validFiles.push(file);
        newUploadingFiles.push({ file, progress: 0, status: 'uploading' });
      }
    });

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    if (validFiles.length > 0) {
      try {
        // Simulate progress
        for (let i = 0; i <= 100; i += 10) {
          await new Promise(r => setTimeout(r, 100));
          setUploadingFiles(prev => 
            prev.map(f => 
              validFiles.includes(f.file) && f.status === 'uploading'
                ? { ...f, progress: Math.min(i, 90) }
                : f
            )
          );
        }

        await onUpload(validFiles);

        setUploadingFiles(prev =>
          prev.map(f =>
            validFiles.includes(f.file)
              ? { ...f, progress: 100, status: 'success' }
              : f
          )
        );
      } catch (error) {
        setUploadingFiles(prev =>
          prev.map(f =>
            validFiles.includes(f.file)
              ? { ...f, status: 'error', error: 'Upload failed' }
              : f
          )
        );
      }
    }
  }, [onUpload, maxSize, accept]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  }, [disabled, handleFiles]);

  const removeFile = (index: number) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearCompleted = () => {
    setUploadingFiles(prev => prev.filter(f => f.status === 'uploading'));
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
          ${disabled 
            ? 'border-slate-700 bg-slate-800/30 cursor-not-allowed opacity-50' 
            : isDragging
              ? 'border-blue-500 bg-blue-500/10 scale-[1.02]'
              : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50'
          }
        `}
        role="button"
        aria-label="Upload files"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => e.key === 'Enter' && !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center gap-3">
          <div className={`
            w-14 h-14 rounded-full flex items-center justify-center transition-colors
            ${isDragging ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-400'}
          `}>
            <Upload className="w-6 h-6" />
          </div>
          
          <div>
            <p className="text-sm font-medium text-slate-300">
              {isDragging ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              or click to browse • Max {maxSize}MB per file
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {accept.split(',').map(type => (
              <span key={type} className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400">
                {type.trim()}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* File list */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">
              {uploadingFiles.filter(f => f.status === 'success').length} of {uploadingFiles.length} uploaded
            </span>
            {uploadingFiles.some(f => f.status !== 'uploading') && (
              <button
                onClick={clearCompleted}
                className="text-xs text-slate-500 hover:text-slate-400"
              >
                Clear completed
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {uploadingFiles.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg border border-slate-700"
              >
                <File className="w-5 h-5 text-slate-400 flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 truncate">{item.file.name}</p>
                  
                  {item.status === 'uploading' && (
                    <div className="mt-1.5 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  
                  {item.status === 'error' && (
                    <p className="text-xs text-red-400 mt-0.5">{item.error}</p>
                  )}
                </div>

                <div className="flex-shrink-0">
                  {item.status === 'uploading' && (
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  )}
                  {item.status === 'success' && (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  )}
                  {item.status === 'error' && (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                </div>

                <button
                  onClick={() => removeFile(index)}
                  className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-400"
                  aria-label="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
