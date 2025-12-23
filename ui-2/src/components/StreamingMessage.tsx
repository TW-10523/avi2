/**
 * Streaming Message - Typewriter effect for AI responses
 */
import { useState, useEffect, useRef } from 'react';
import { Bot, Copy, Check, ThumbsUp, ThumbsDown } from 'lucide-react';

interface StreamingMessageProps {
  content: string;
  isStreaming?: boolean;
  speed?: number; // ms per character
  onComplete?: () => void;
  onFeedback?: (type: 'positive' | 'negative') => void;
}

export default function StreamingMessage({
  content,
  isStreaming = true,
  speed = 20,
  onComplete,
  onFeedback,
}: StreamingMessageProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isTyping, setIsTyping] = useState(isStreaming);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedContent(content);
      setIsTyping(false);
      return;
    }

    indexRef.current = 0;
    setDisplayedContent('');
    setIsTyping(true);

    const typeNextChar = () => {
      if (indexRef.current < content.length) {
        // Type multiple characters at once for faster streaming
        const charsToAdd = Math.min(3, content.length - indexRef.current);
        setDisplayedContent(prev => prev + content.slice(indexRef.current, indexRef.current + charsToAdd));
        indexRef.current += charsToAdd;
        setTimeout(typeNextChar, speed);
      } else {
        setIsTyping(false);
        onComplete?.();
      }
    };

    const timer = setTimeout(typeNextChar, speed);
    return () => clearTimeout(timer);
  }, [content, isStreaming, speed, onComplete]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (type: 'positive' | 'negative') => {
    setFeedback(type);
    onFeedback?.(type);
  };

  return (
    <div className="group flex gap-3 p-4">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
        <Bot className="w-5 h-5 text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 max-w-[80%]">
        <div className="bg-slate-800 text-slate-100 rounded-2xl rounded-bl-md px-4 py-3 border border-slate-700">
          <div className="prose prose-invert prose-sm max-w-none">
            <p className="whitespace-pre-wrap">
              {displayedContent}
              {isTyping && (
                <span className="inline-block w-2 h-4 bg-blue-400 ml-1 animate-pulse" />
              )}
            </p>
          </div>
        </div>

        {/* Actions (visible when done typing) */}
        {!isTyping && (
          <div className="flex items-center gap-1 mt-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 transition-colors"
              title="Copy"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => handleFeedback('positive')}
              className={`p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors ${
                feedback === 'positive' ? 'text-green-400' : 'text-slate-400 hover:text-slate-300'
              }`}
              title="Good response"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleFeedback('negative')}
              className={`p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors ${
                feedback === 'negative' ? 'text-red-400' : 'text-slate-400 hover:text-slate-300'
              }`}
              title="Bad response"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Typing indicator component
export function TypingIndicator() {
  return (
    <div className="flex gap-3 p-4">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
        <Bot className="w-5 h-5 text-white" />
      </div>
      <div className="bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3 border border-slate-700">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
