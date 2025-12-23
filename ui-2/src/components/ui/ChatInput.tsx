/**
 * Enhanced Chat Input - Rich input with suggestions and file attachments
 */
import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Paperclip, X, Loader2, Sparkles } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string, attachments?: File[]) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  suggestions?: string[];
  maxLength?: number;
  allowAttachments?: boolean;
}

export function ChatInput({
  onSend,
  onTyping,
  disabled = false,
  placeholder = 'Type your message...',
  suggestions = [],
  maxLength = 4000,
  allowAttachments = true,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Notify typing status
  useEffect(() => {
    onTyping?.(message.length > 0);
  }, [message, onTyping]);

  const handleSend = () => {
    if (message.trim() || attachments.length > 0) {
      onSend(message.trim(), attachments.length > 0 ? attachments : undefined);
      setMessage('');
      setAttachments([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  const remainingChars = maxLength - message.length;
  const isNearLimit = remainingChars < 100;

  return (
    <div className="relative">
      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-slate-400">Suggested questions</span>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 rounded-lg text-sm"
            >
              <Paperclip className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-300 max-w-32 truncate">{file.name}</span>
              <button
                onClick={() => removeAttachment(i)}
                className="text-slate-500 hover:text-slate-300"
                aria-label="Remove attachment"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input container */}
      <div
        className={`
          relative flex items-end gap-2 p-3 bg-slate-800 border rounded-2xl transition-all duration-200
          ${isFocused ? 'border-blue-500/50 ring-2 ring-blue-500/20' : 'border-slate-700'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {/* Attachment button */}
        {allowAttachments && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="p-2 text-slate-400 hover:text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
              aria-label="Attach files"
            >
              <Paperclip className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true);
            setShowSuggestions(suggestions.length > 0 && message.length === 0);
          }}
          onBlur={() => {
            setIsFocused(false);
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 resize-none focus:outline-none text-sm leading-relaxed"
          style={{ maxHeight: '200px' }}
          aria-label="Message input"
        />

        {/* Character count */}
        {isNearLimit && (
          <span className={`text-xs ${remainingChars < 20 ? 'text-red-400' : 'text-slate-500'}`}>
            {remainingChars}
          </span>
        )}

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && attachments.length === 0)}
          className={`
            p-2.5 rounded-xl transition-all duration-200
            ${message.trim() || attachments.length > 0
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }
          `}
          aria-label="Send message"
        >
          {disabled ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Keyboard hint */}
      <div className="mt-1.5 flex items-center justify-between px-2">
        <span className="text-xs text-slate-600">
          Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-500">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-500">Shift+Enter</kbd> for new line
        </span>
      </div>
    </div>
  );
}

export default ChatInput;
