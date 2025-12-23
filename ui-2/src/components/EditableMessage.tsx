/**
 * Editable Message - Allow users to edit their sent messages
 */
import { useState, useRef, useEffect } from 'react';
import { User, Edit2, Check, X, RotateCcw } from 'lucide-react';

interface EditableMessageProps {
  content: string;
  timestamp?: string;
  onEdit: (newContent: string) => void;
  onResend?: (content: string) => void;
  isEditable?: boolean;
}

export default function EditableMessage({
  content,
  timestamp,
  onEdit,
  onResend,
  isEditable = true,
}: EditableMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editedContent]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedContent(content);
  };

  const handleSave = () => {
    if (editedContent.trim() && editedContent !== content) {
      onEdit(editedContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="group flex gap-3 p-4 flex-row-reverse">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
        <User className="w-5 h-5 text-white" />
      </div>

      {/* Content */}
      <div className="flex flex-col items-end max-w-[80%]">
        {isEditing ? (
          /* Edit mode */
          <div className="w-full">
            <div className="bg-blue-600/20 border border-blue-500/50 rounded-2xl rounded-br-md p-1">
              <textarea
                ref={textareaRef}
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-white px-3 py-2 resize-none focus:outline-none min-h-[60px]"
                placeholder="Edit your message..."
              />
              <div className="flex items-center justify-end gap-2 px-2 pb-2">
                <button
                  onClick={handleCancel}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                  title="Cancel (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSave}
                  className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  title="Save (Enter)"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1 text-right">
              Press Enter to save, Shift+Enter for new line
            </p>
          </div>
        ) : (
          /* View mode */
          <>
            <div className="bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-3">
              <p className="whitespace-pre-wrap">{content}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 mt-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {timestamp && (
                <span className="text-xs text-slate-500 mr-2">{timestamp}</span>
              )}
              
              {isEditable && (
                <button
                  onClick={handleEdit}
                  className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 transition-colors"
                  title="Edit message"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}

              {onResend && (
                <button
                  onClick={() => onResend(content)}
                  className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 transition-colors"
                  title="Resend message"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
