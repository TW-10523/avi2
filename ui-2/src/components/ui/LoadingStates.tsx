/**
 * Loading States - Professional loading indicators for enterprise UX
 */
import { Loader2, Bot, FileText, Search, Sparkles } from 'lucide-react';

// Typing indicator for chat
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg max-w-md">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm text-slate-400 ml-2">AI is thinking...</span>
    </div>
  );
}

// Processing stages indicator
export function ProcessingStages({ stage }: { stage: 'searching' | 'analyzing' | 'generating' | 'translating' }) {
  const stages = {
    searching: { icon: Search, text: 'Searching documents...', color: 'text-blue-400' },
    analyzing: { icon: FileText, text: 'Analyzing content...', color: 'text-yellow-400' },
    generating: { icon: Sparkles, text: 'Generating response...', color: 'text-purple-400' },
    translating: { icon: Bot, text: 'Translating...', color: 'text-green-400' },
  };

  const current = stages[stage];
  const Icon = current.icon;

  return (
    <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
      <div className={`${current.color}`}>
        <Icon className="w-5 h-5 animate-pulse" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          <span className="text-sm text-slate-300">{current.text}</span>
        </div>
        <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full ${current.color.replace('text-', 'bg-')} rounded-full animate-progress`} />
        </div>
      </div>
    </div>
  );
}

// Skeleton loader for chat messages
export function MessageSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-slate-700" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-700 rounded w-3/4" />
          <div className="h-4 bg-slate-700 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

// File upload progress
export function UploadProgress({ filename, progress }: { filename: string; progress: number }) {
  return (
    <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
      <div className="flex items-center gap-3 mb-2">
        <FileText className="w-5 h-5 text-blue-400" />
        <span className="text-sm text-slate-300 truncate flex-1">{filename}</span>
        <span className="text-xs text-slate-400">{progress}%</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// Page loading spinner
export function PageLoader() {
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-700 rounded-full" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin" />
        </div>
        <span className="text-slate-400">Loading...</span>
      </div>
    </div>
  );
}

// Empty state
export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-500" />
      </div>
      <h3 className="text-lg font-medium text-slate-300 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-4">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
