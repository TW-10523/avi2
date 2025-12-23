/**
 * Document Card - Clean document display with actions
 */
import { useState } from 'react';
import { 
  FileText, MoreVertical, Download, Trash2, Eye, 
  Calendar, HardDrive, CheckCircle2, AlertCircle
} from 'lucide-react';

interface DocumentCardProps {
  id: number;
  filename: string;
  size: number;
  uploadedAt: string;
  status?: 'indexed' | 'processing' | 'failed';
  onView?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
}

export function DocumentCard({
  id: _id,
  filename,
  size,
  uploadedAt,
  status = 'indexed',
  onView,
  onDownload,
  onDelete,
}: DocumentCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getFileIcon = () => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const colors: Record<string, string> = {
      pdf: 'text-red-400 bg-red-500/10',
      doc: 'text-blue-400 bg-blue-500/10',
      docx: 'text-blue-400 bg-blue-500/10',
      txt: 'text-slate-400 bg-slate-500/10',
      default: 'text-purple-400 bg-purple-500/10',
    };
    return colors[ext || 'default'] || colors.default;
  };

  const statusConfig = {
    indexed: { icon: CheckCircle2, color: 'text-green-400', label: 'Indexed' },
    processing: { icon: AlertCircle, color: 'text-yellow-400', label: 'Processing' },
    failed: { icon: AlertCircle, color: 'text-red-400', label: 'Failed' },
  };

  const StatusIcon = statusConfig[status].icon;

  return (
    <div className="group relative bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl p-4 transition-all duration-200">
      <div className="flex items-start gap-4">
        {/* File icon */}
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getFileIcon()}`}>
          <FileText className="w-6 h-6" />
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-slate-200 truncate pr-8" title={filename}>
            {filename}
          </h3>
          
          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3" />
              {formatSize(size)}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(uploadedAt)}
            </span>
            <span className={`flex items-center gap-1 ${statusConfig[status].color}`}>
              <StatusIcon className="w-3 h-3" />
              {statusConfig[status].label}
            </span>
          </div>
        </div>

        {/* Actions menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-all"
            aria-label="Document actions"
            aria-expanded={showMenu}
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
                {onView && (
                  <button
                    onClick={() => { onView(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                )}
                {onDownload && (
                  <button
                    onClick={() => { onDownload(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => { onDelete(); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentCard;
