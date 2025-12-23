/**
 * Chat Export - Export conversation as PDF or TXT
 */
import { useState } from 'react';
import { Download, FileText, File, X, Loader2, Copy, Check } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface ChatExportProps {
  messages: Message[];
  chatTitle?: string;
  onClose: () => void;
}

export default function ChatExport({ messages, chatTitle = 'Chat Export', onClose }: ChatExportProps) {
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatMessages = () => {
    const header = `# ${chatTitle}\nExported on: ${new Date().toLocaleString()}\n${'='.repeat(50)}\n\n`;
    
    const content = messages.map((msg) => {
      const role = msg.role === 'user' ? '👤 You' : '🤖 AI Assistant';
      const time = msg.timestamp || '';
      return `${role}${time ? ` (${time})` : ''}:\n${msg.content}\n`;
    }).join('\n' + '-'.repeat(40) + '\n\n');

    return header + content;
  };

  const exportAsTxt = () => {
    setExporting(true);
    try {
      const content = formatMessages();
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chatTitle.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const exportAsMarkdown = () => {
    setExporting(true);
    try {
      const header = `# ${chatTitle}\n\n*Exported on: ${new Date().toLocaleString()}*\n\n---\n\n`;
      
      const content = messages.map((msg) => {
        const role = msg.role === 'user' ? '**You:**' : '**AI Assistant:**';
        return `${role}\n\n${msg.content}\n`;
      }).join('\n---\n\n');

      const fullContent = header + content;
      const blob = new Blob([fullContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chatTitle.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const exportAsJson = () => {
    setExporting(true);
    try {
      const data = {
        title: chatTitle,
        exportedAt: new Date().toISOString(),
        messageCount: messages.length,
        messages: messages.map((msg, i) => ({
          id: i + 1,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        })),
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chatTitle.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const copyToClipboard = async () => {
    const content = formatMessages();
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Download className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Export Chat</h2>
              <p className="text-xs text-slate-500">{messages.length} messages</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3">
          <p className="text-sm text-slate-400 mb-4">
            Choose a format to export your conversation:
          </p>

          {/* Export options */}
          <button
            onClick={exportAsTxt}
            disabled={exporting}
            className="w-full flex items-center gap-4 p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-slate-300" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">Plain Text (.txt)</p>
              <p className="text-xs text-slate-500">Simple text format, readable anywhere</p>
            </div>
          </button>

          <button
            onClick={exportAsMarkdown}
            disabled={exporting}
            className="w-full flex items-center gap-4 p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <File className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">Markdown (.md)</p>
              <p className="text-xs text-slate-500">Formatted text with styling</p>
            </div>
          </button>

          <button
            onClick={exportAsJson}
            disabled={exporting}
            className="w-full flex items-center gap-4 p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <File className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">JSON (.json)</p>
              <p className="text-xs text-slate-500">Structured data for developers</p>
            </div>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-2 bg-slate-800 text-xs text-slate-500">or</span>
            </div>
          </div>

          <button
            onClick={copyToClipboard}
            className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white font-medium"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy to Clipboard
              </>
            )}
          </button>
        </div>

        {/* Loading overlay */}
        {exporting && (
          <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
