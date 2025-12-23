/**
 * Chat Message Component - Enhanced message display with accessibility
 */
import { useState } from 'react';
import { 
  Bot, User, Copy, Check, ThumbsUp, ThumbsDown, 
  Languages, ChevronDown, ChevronUp, FileText, RotateCcw
} from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  englishContent?: string;
  japaneseContent?: string;
  sources?: string[];
  timestamp?: string;
  status?: 'sending' | 'sent' | 'error';
  feedback?: 'positive' | 'negative' | null;
  onFeedback?: (type: 'positive' | 'negative') => void;
  onRetry?: () => void;
  onCopy?: () => void;
}

export function ChatMessage({
  role,
  content,
  englishContent,
  japaneseContent,
  sources,
  timestamp,
  status = 'sent',
  feedback,
  onFeedback,
  onRetry,
  onCopy,
}: ChatMessageProps) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const isUser = role === 'user';
  const hasDualLanguage = englishContent && japaneseContent;

  const handleCopy = async () => {
    const textToCopy = englishContent || content;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy?.();
  };

  return (
    <div 
      className={`group flex gap-3 p-4 ${isUser ? 'flex-row-reverse' : ''}`}
      role="article"
      aria-label={`${isUser ? 'Your' : 'Assistant'} message`}
    >
      {/* Avatar */}
      <div 
        className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
          isUser 
            ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
            : 'bg-gradient-to-br from-purple-500 to-pink-500'
        }`}
        aria-hidden="true"
      >
        {isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Main message bubble */}
        <div 
          className={`rounded-2xl px-4 py-3 ${
            isUser 
              ? 'bg-blue-600 text-white rounded-br-md' 
              : 'bg-slate-800 text-slate-100 rounded-bl-md border border-slate-700'
          } ${status === 'error' ? 'border-red-500/50' : ''}`}
        >
          {/* Primary content */}
          <div className="prose prose-invert prose-sm max-w-none">
            {hasDualLanguage ? (
              <div>
                <p className="whitespace-pre-wrap">{englishContent}</p>
                
                {/* Translation toggle */}
                <button
                  onClick={() => setShowTranslation(!showTranslation)}
                  className={`mt-3 flex items-center gap-2 text-xs ${
                    isUser ? 'text-blue-200' : 'text-slate-400'
                  } hover:underline`}
                  aria-expanded={showTranslation}
                >
                  <Languages className="w-3.5 h-3.5" />
                  {showTranslation ? 'Hide Japanese' : 'Show Japanese'}
                  {showTranslation ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                
                {/* Japanese translation */}
                {showTranslation && (
                  <div className={`mt-2 pt-2 border-t ${isUser ? 'border-blue-500/30' : 'border-slate-700'}`}>
                    <p className="whitespace-pre-wrap text-sm opacity-90">{japaneseContent}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{content}</p>
            )}
          </div>

          {/* Sources */}
          {sources && sources.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowSources(!showSources)}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300"
                aria-expanded={showSources}
              >
                <FileText className="w-3.5 h-3.5" />
                {sources.length} source{sources.length > 1 ? 's' : ''}
                {showSources ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              
              {showSources && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {sources.map((source, i) => (
                    <span 
                      key={i}
                      className="px-2 py-1 bg-slate-700/50 rounded text-xs text-slate-400"
                    >
                      {source}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Message metadata and actions */}
        <div className={`flex items-center gap-2 mt-1.5 px-1 ${isUser ? 'flex-row-reverse' : ''}`}>
          {/* Timestamp */}
          {timestamp && (
            <span className="text-xs text-slate-500">{timestamp}</span>
          )}
          
          {/* Status indicator */}
          {status === 'sending' && (
            <span className="text-xs text-slate-500">Sending...</span>
          )}
          {status === 'error' && (
            <span className="text-xs text-red-400">Failed to send</span>
          )}

          {/* Actions (visible on hover) */}
          {!isUser && status === 'sent' && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Copy */}
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 transition-colors"
                aria-label="Copy message"
                title="Copy"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {/* Feedback */}
              {onFeedback && (
                <>
                  <button
                    onClick={() => onFeedback('positive')}
                    className={`p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors ${
                      feedback === 'positive' ? 'text-green-400' : 'text-slate-400 hover:text-slate-300'
                    }`}
                    aria-label="Good response"
                    aria-pressed={feedback === 'positive'}
                    title="Good response"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onFeedback('negative')}
                    className={`p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors ${
                      feedback === 'negative' ? 'text-red-400' : 'text-slate-400 hover:text-slate-300'
                    }`}
                    aria-label="Bad response"
                    aria-pressed={feedback === 'negative'}
                    title="Bad response"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {/* Retry */}
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 transition-colors"
                  aria-label="Retry"
                  title="Retry"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatMessage;
