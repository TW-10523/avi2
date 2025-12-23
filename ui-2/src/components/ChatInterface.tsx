import { useState, useRef, useEffect, useCallback } from 'react';
// Suggested/recommended questions to display in tiles (customize as needed)
const RECOMMENDED_QUESTIONS = [
  'What is the company’s annual leave policy?',
  'How can I apply for Overtime?',
  'Tell me about the employee health insurance.',
  'What are the official working hours?',
  'How do I request sick leave?',
  'Does the company offer training programs?',
];
// Recommendation Tiles Component
function RecommendationTiles({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {RECOMMENDED_QUESTIONS.map((q, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(q)}
          className="px-3 py-2 rounded-xl bg-white/10 text-slate-200 hover:bg-blue-600 hover:text-white border border-white/10 text-xs transition-colors shadow"
          style={{maxWidth: 270, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}
          title={q}
        >
          {q}
        </button>
      ))}
    </div>
  );
}
import { 
  Send, Bot, User, Globe, Languages, Copy, ThumbsUp, ThumbsDown, 
  RefreshCw, Check, Share2, Plus, Trash2, StopCircle,
  Download
} from 'lucide-react';
import { Message } from '../types';
import { useLang } from '../context/LanguageContext';
import { listTask, listTaskOutput, addTask, deleteTaskOutput, sendFeedbackToCache } from '../api/task';
import ChatExport from './ChatExport';
import { ConfirmDialog } from './ui/FeedbackComponents';
import { useToast } from '../context/ToastContext';
import PDFPreview, { SourceCitation } from './PDFPreview';

interface ChatInterfaceProps {
  onSaveToHistory: (query: string, answer: string, source: any) => void;
}

interface ChatTask {
  id: string;
  title: string;
  createdAt: string;
}

interface TaskOutput {
  id: number;
  metadata: string;
  content: string;
  status: string;
  feedback?: { emoji?: string };
  sort: number;
}

// Dual language output interface
interface DualLanguageContent {
  isDualLanguage: boolean;
  japanese?: string;
  translated?: string;
  targetLanguage?: string;
  rawContent: string;
}

// Parse dual-language output from backend - handles multiple formats
function parseDualLanguageContent(content: string): DualLanguageContent {
  // Clean up content - remove debug markers
  let cleanContent = content
    .replace(/<!--DUAL_LANG_START-->/g, '')
    .replace(/<!--DUAL_LANG_END-->/g, '')
    .trim();
  
  // Try to parse JSON format first (new format)
  // More robust regex that handles potential line breaks and whitespace
  const jsonMatch = cleanContent.match(/\{[^}]*"dualLanguage"\s*:\s*true[^}]*\}/s) || 
                   cleanContent.match(/\{[\s\S]*?"dualLanguage"\s*:\s*true[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('[parseDualLanguageContent] Parsed JSON successfully');
      console.log(`  - targetLanguage: ${parsed.targetLanguage}`);
      console.log(`  - japanese: ${typeof parsed.japanese} (${parsed.japanese?.substring(0, 50)}...)`);
      console.log(`  - translated: ${typeof parsed.translated} (${parsed.translated?.substring(0, 50)}...)`);
      
      if (parsed.dualLanguage) {
        // Extract actual text content, cleaning any nested JSON
        let jaText = parsed.japanese || '';
        let enText = parsed.translated || '';
        
        console.log('[parseDualLanguageContent] Before cleaning:');
        console.log(`  - jaText length: ${jaText.length}`);
        console.log(`  - enText length: ${enText.length}`);
        
        // If japanese or translated fields contain JSON, extract the actual text
        if (typeof jaText === 'string' && jaText.includes('"dualLanguage"')) {
          try {
            const nestedJson = JSON.parse(jaText.match(/\{[\s\S]*\}/)?.[0] || '{}');
            jaText = nestedJson.japanese || nestedJson.translated || jaText.replace(/\{[^}]*\}/g, '').trim();
          } catch { /* use as-is */ }
        }
        if (typeof enText === 'string' && enText.includes('"dualLanguage"')) {
          try {
            const nestedJson = JSON.parse(enText.match(/\{[\s\S]*\}/)?.[0] || '{}');
            enText = nestedJson.translated || nestedJson.english || enText.replace(/\{[^}]*\}/g, '').trim();
          } catch { /* use as-is */ }
        }
        
        // Clean any remaining JSON artifacts from the text
        jaText = jaText.replace(/\{[^}]*"dualLanguage"[^}]*\}/g, '').trim();
        enText = enText.replace(/\{[^}]*"dualLanguage"[^}]*\}/g, '').trim();
        
        console.log('[parseDualLanguageContent] Final values:');
        console.log(`  - jaText: ${jaText.substring(0, 50)}...`);
        console.log(`  - enText: ${enText.substring(0, 50)}...`);
        console.log(`  - targetLanguage from JSON: ${parsed.targetLanguage}`);
        
        return {
          isDualLanguage: true,
          japanese: jaText,
          translated: enText,
          targetLanguage: parsed.targetLanguage || 'en',
          rawContent: enText || jaText,
        };
      }
    } catch (e) {
      console.error('[parseDualLanguageContent] JSON parse error:', e);
      console.error('[parseDualLanguageContent] Failed JSON string:', jsonMatch[0]?.substring(0, 200));
      // Continue to other formats
    }
  }
  
  // Try [EN]/[JA] format
  const enMatch = cleanContent.match(/\[EN\]\s*([\s\S]*?)(?=\[JA\]|$)/i);
  const jaMatch = cleanContent.match(/\[JA\]\s*([\s\S]*?)(?=\[EN\]|$)/i);
  
  if (enMatch && jaMatch) {
    const englishText = enMatch[1].trim();
    const japaneseText = jaMatch[1].trim();
    
    // Determine user language based on order in content
    const enIndex = cleanContent.indexOf('[EN]');
    const jaIndex = cleanContent.indexOf('[JA]');
    const userLangFirst = enIndex < jaIndex ? 'en' : 'ja';
    
    // Assign based on user language: user's language is the original, other is translation
    return {
      isDualLanguage: true,
      japanese: japaneseText,           // Always store Japanese text in 'japanese' field
      translated: englishText,          // Always store English text in 'translated' field
      targetLanguage: userLangFirst,    // Store which language the user asked in
      rawContent: content,
    };
  }
  
  // Try splitting by common separators (---) 
  const parts = cleanContent.split(/\n---+\n/);
  if (parts.length >= 2) {
    // Check if second part looks like Japanese
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(parts[1]);
    if (hasJapanese) {
      return {
        isDualLanguage: true,
        japanese: parts[1].trim(),
        translated: parts[0].trim(),
        targetLanguage: 'en',
        rawContent: content,
      };
    }
  }
  
  // Return clean content as single language
  return { isDualLanguage: false, rawContent: cleanContent };
}

// Action buttons component for bot messages (ChatGPT style)
interface MessageActionsProps {
  content: string;
  messageId: string;
  onFeedback?: (messageId: string, feedback: 'like' | 'dislike') => void;
  onRegenerate?: () => void;
}

function MessageActions({ content, messageId, onFeedback, onRegenerate }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);

  const handleCopy = async () => {
    // Parse and extract clean text
    const parsed = parseDualLanguageContent(content);
    let textToCopy = parsed.rawContent;
    
    if (parsed.isDualLanguage && parsed.translated && parsed.japanese) {
      textToCopy = `${parsed.translated}\n\n---\n\n${parsed.japanese}`;
    }
    
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (type: 'like' | 'dislike') => {
    setFeedback(type);
    onFeedback?.(messageId, type);
  };

  const handleShare = async () => {
    const parsed = parseDualLanguageContent(content);
    const textToShare = parsed.isDualLanguage 
      ? (parsed.translated || parsed.japanese || parsed.rawContent)
      : parsed.rawContent;
    
    if (navigator.share) {
      await navigator.share({ text: textToShare });
    } else {
      await navigator.clipboard.writeText(textToShare);
      alert('Content copied to clipboard!');
    }
  };

  return (
    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/10">
      {/* Copy */}
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        title="Copy"
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
      </button>

      {/* Like */}
      <button
        onClick={() => handleFeedback('like')}
        className={`p-1.5 rounded-md transition-colors ${
          feedback === 'like' 
            ? 'text-green-400 bg-green-400/20' 
            : 'text-slate-400 hover:text-white hover:bg-white/10'
        }`}
        title="Good response"
      >
        <ThumbsUp className="w-4 h-4" />
      </button>

      {/* Dislike */}
      <button
        onClick={() => handleFeedback('dislike')}
        className={`p-1.5 rounded-md transition-colors ${
          feedback === 'dislike' 
            ? 'text-red-400 bg-red-400/20' 
            : 'text-slate-400 hover:text-white hover:bg-white/10'
        }`}
        title="Bad response"
      >
        <ThumbsDown className="w-4 h-4" />
      </button>

      {/* Share */}
      <button
        onClick={handleShare}
        className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        title="Share"
      >
        <Share2 className="w-4 h-4" />
      </button>

      {/* Regenerate */}
      <button
        onClick={onRegenerate}
        className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        title="Regenerate response"
      >
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
  );
}

// Component for displaying dual-language content side by side
// User's language is shown first (column 1), translation second (column 2)
function DualLanguageMessage({ content }: { content: DualLanguageContent }) {
  const [showBoth, setShowBoth] = useState(false);

  // Determine which language is primary (user's language) and which is secondary (translation)
  const isUserJapanese = content.targetLanguage === 'ja';
  const primaryLang = isUserJapanese ? '日本語' : 'English';
  const secondaryLang = isUserJapanese ? 'English' : '日本語';
  const primaryContent = isUserJapanese ? content.japanese : content.translated;
  const secondaryContent = isUserJapanese ? content.translated : content.japanese;

  console.log('[DualLanguageMessage] Display logic:');
  console.log(`  - content.targetLanguage: ${content.targetLanguage}`);
  console.log(`  - isUserJapanese: ${isUserJapanese}`);
  console.log(`  - primaryLang: ${primaryLang}`);
  console.log(`  - primaryContent: ${primaryContent?.substring(0, 50)}...`);
  console.log(`  - showBoth: ${showBoth}`);

  return (
    <div className="w-full">
      {/* Display user's language first (instant view) */}
      {!showBoth ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 pb-2">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-medium text-blue-400">{primaryLang}</span>
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-white">
            {primaryContent}
          </p>
          {/* "Both Languages" button at bottom */}
          <button
            onClick={() => setShowBoth(true)}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-colors"
            title="Show both languages"
          >
            <Languages className="w-3.5 h-3.5" />
            <span>Both Languages</span>
          </button>
        </div>
      ) : (
        /* Side by side display - Both languages */
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            {/* Column 1: User's language (Primary) */}
            <div className="p-3 rounded-lg bg-blue-900/20 border border-blue-500/30">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-blue-500/20">
                <Globe className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-medium text-blue-400">{primaryLang}</span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-white">
                {primaryContent}
              </p>
            </div>
            
            {/* Column 2: Translation (Secondary) */}
            <div className="p-3 rounded-lg bg-emerald-900/20 border border-emerald-500/30">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-emerald-500/20">
                <span className="text-xs font-medium text-emerald-400">{secondaryLang}</span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-white">
                {secondaryContent}
              </p>
            </div>
          </div>
          {/* Close Both Languages button */}
          <button
            onClick={() => setShowBoth(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-colors"
            title="Show only your language"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{primaryLang} Only</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function ChatInterface({ onSaveToHistory }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: 'Hello! I\'m your HR Policy Assistant. I can help you with questions about company policies, benefits, leave, remote work, and more. You can ask in English or Japanese (日本語でも質問できます).',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatList, setChatList] = useState<ChatTask[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  // const [showHistory, setShowHistory] = useState(false);
  const [fieldSort, setFieldSort] = useState(0);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [pdfPreview, setPdfPreview] = useState<{ filename: string; page: number; highlight?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Get translations
  const { t } = useLang();
  
  // Toast notifications from context
  const toast = useToast();

  // Show toast notification (wrapper for compatibility)
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (type === 'success') toast.success(message);
    else if (type === 'error') toast.error(message);
    else toast.info(message);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat list on mount
  useEffect(() => {
    loadChatList();
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const loadChatList = async () => {
    try {
      const response = await listTask({ pageNum: 1, pageSize: 100 });
      if (response.code === 200 && response.result?.rows) {
        const chats = response.result.rows.map((task: any) => ({
          id: task.id,
          title: task.formData || task.form_data || t('chat.newChat'),
          createdAt: task.createdAt,
        }));
        setChatList(chats);
      }
    } catch (error) {
      console.error('Failed to load chat list:', error);
    }
  };

  // Load chat messages helper (currently unused; sidebar selection not present)
  // const loadChatMessages = async (taskId: string) => { /* ... */ };

  // selectChat reserved for future sidebar list usage
  // const selectChat = (chatId: string) => {
  //   setCurrentChatId(chatId);
  //   loadChatMessages(chatId);
  //   setShowHistory(false);
  // };

  const startNewChat = () => {
    setCurrentChatId(null);
    setMessages([{
      id: '1',
      type: 'bot',
      content: t('chat.askQuestion'),
      timestamp: new Date(),
    }]);
    setFieldSort(0);
  };

  // const deleteChat = async (chatId: string, e: React.MouseEvent) => {
  //   e.stopPropagation();
  //   try {
  //     await deleteTaskOutput(chatId);
  //     setChatList(prev => prev.filter(chat => chat.id !== chatId));
  //     if (currentChatId === chatId) {
  //       startNewChat();
  //     }
  //   } catch (error) {
  //     console.error('Failed to delete chat:', error);
  //   }
  // };

  const pollForResponse = useCallback((taskId: string, newFieldSort: number) => {
    let attempts = 0;
    const maxAttempts = 180; // up to 3 minutes, reset on progress
    let lastContentLength = 0;

    pollingRef.current = setInterval(async () => {
      attempts++;

      try {
        const response = await listTaskOutput({ pageNum: 1, pageSize: 1000, taskId });
        if (response.code === 200 && response.result?.rows) {
          // Find output matching the sort field (try exact match first, then +1)
          const latestOutput = response.result.rows.find(
            (o: TaskOutput) => o.sort === newFieldSort || o.sort === newFieldSort + 1
          ) || response.result.rows
            .filter((o: TaskOutput) => o.sort >= newFieldSort)
            .sort((a: TaskOutput, b: TaskOutput) => b.sort - a.sort)[0];

          if (latestOutput) {
            const contentText = latestOutput.content || '';
            const contentLen = contentText.length;

            // Update message even if content is empty (to show status)
            setMessages(prev => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              if (updated[lastIndex]?.type === 'bot' &&
                  (!updated[lastIndex].taskOutputId || updated[lastIndex].taskOutputId === latestOutput.id)) {
                updated[lastIndex] = {
                  ...updated[lastIndex],
                  content: contentText,
                  status: latestOutput.status,
                  taskOutputId: latestOutput.id,
                };
              }
              return updated;
            });

            // Reset timeout counter if content grows
            if (contentLen > lastContentLength) {
              lastContentLength = contentLen;
              attempts = 0; // give more time on progress
            }

            // Stop polling only when terminal status
            if (latestOutput.status === 'FINISHED' || latestOutput.status === 'FAILED' || latestOutput.status === 'CANCEL') {
              setIsTyping(false);
              if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
              }
              if (contentText) {
                const lastUser = [...messages].reverse().find(m => m.type === 'user');
                onSaveToHistory(lastUser?.content || '', contentText, { document: 'HR Policy', page: 1 });
              }
            }
          } else if (attempts > 5) {
            console.log('[DEBUG] No output found. All outputs:', response.result.rows.map((o: TaskOutput) => ({
              id: o.id,
              sort: o.sort,
              status: o.status,
              hasContent: !!o.content
            })));
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }

      if (attempts >= maxAttempts) {
        setIsTyping(false);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        // Only show timeout if no content ever arrived
        if (lastContentLength === 0) {
          setMessages(prev => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            if (updated[lastIndex]?.type === 'bot' && !updated[lastIndex].content) {
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: '⏱️ Response timeout. Please try again.',
              };
            }
            return updated;
          });
        }
      }
    }, 1000);
  }, [messages, onSaveToHistory]);

  const handleSend = async (overrideInput?: string) => {
    const payload = (overrideInput ?? input).trim();
    if (!payload || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: payload,
      timestamp: new Date(),
    };

    const botPlaceholder: Message = {
      id: (Date.now() + 1).toString(),
      type: 'bot',
      content: '',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage, botPlaceholder]);
    const currentInput = payload;
    if (overrideInput === undefined) setInput('');
    setIsTyping(true);

    try {
      let taskId = currentChatId;
      
      // Step 1: For new chats, first create an empty chat to get taskId
      if (!taskId) {
        const createResponse = await addTask({
          type: 'CHAT',
          formData: {}, // Empty formData creates new chat
        });
        
        if (createResponse.code === 200 && createResponse.result?.taskId) {
          taskId = createResponse.result.taskId;
          setCurrentChatId(taskId);
          setFieldSort(0);
        } else {
          throw new Error('Failed to create chat');
        }
      }

      const newFieldSort = fieldSort + 1;
      setFieldSort(newFieldSort);

      // Step 2: Send the actual message with taskId
      const response = await addTask({
        type: 'CHAT',
        formData: {
          prompt: currentInput,
          fieldSort: newFieldSort,
          fileId: [],
          allFileSearch: true,
          useMcp: false,
          taskId: taskId,
        },
      });

      if (response.code === 200 && response.result?.taskId) {
        const taskId = response.result.taskId;
        if (!currentChatId) {
          setCurrentChatId(taskId);
          loadChatList();
        }
        pollForResponse(taskId, newFieldSort);
      } else {
        setIsTyping(false);
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].content = 'Sorry, there was an error processing your request.';
          return updated;
        });
      }
    } catch (error) {
      console.error('Send error:', error);
      setIsTyping(false);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].content = 'Sorry, there was an error connecting to the server.';
        return updated;
      });
    }
  };

  const handleFeedback = async (messageId: string, emoji: string, taskOutputId?: number) => {
    if (!taskOutputId) return;
    
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    try {
      await sendFeedbackToCache({
        taskOutputId,
        emoji,
        outputContent: message.content,
        question: '', // Could be improved to find the user question
      });
      
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, feedback: { emoji } } : m
      ));
    } catch (error) {
      console.error('Feedback error:', error);
    }
  };

  // Stop generation
  const stopGeneration = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsTyping(false);
    setMessages(prev => {
      const updated = [...prev];
      const lastMsg = updated[updated.length - 1];
      if (lastMsg?.type === 'bot' && !lastMsg.content) {
        updated[updated.length - 1] = {
          ...lastMsg,
          content: '⏹️ Generation stopped by user.',
        };
      }
      return updated;
    });
    showToast('Generation stopped', 'info');
  };

  // Clear current chat
  const clearChat = () => {
    setMessages([{
      id: '1',
      type: 'bot',
      content: t('chat.askQuestion'),
      timestamp: new Date(),
    }]);
    setCurrentChatId(null);
    setFieldSort(0);
    showToast(t('chat.chatSaved'), 'success');
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send (without shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Escape to stop generation
    if (e.key === 'Escape' && isTyping) {
      stopGeneration();
    }
  };

  // Handle input change - no auto-resize to prevent scroll
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  // Handler for recommendation tile click
  const handleRecommendationSelect = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  // Regenerate: resend the previous user prompt relative to a bot message
  const regenerateAt = (botMessageId: string) => {
    if (isTyping) return;
    const idx = messages.findIndex(m => m.id === botMessageId);
    if (idx <= 0) return;
    const prevUser = [...messages].slice(0, idx).reverse().find(m => m.type === 'user');
    if (!prevUser) return;
    showToast('Regenerating...', 'info');
    handleSend(prevUser.content);
  };

  return (
    <div className="flex h-full">
      {/* Chat Export Dialog */}
      {showExportDialog && (
        <ChatExport
          messages={messages.map(m => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.content,
            timestamp: m.timestamp?.toLocaleTimeString(),
          }))}
          chatTitle={chatList.find(c => c.id === currentChatId)?.title || 'Chat Export'}
          onClose={() => setShowExportDialog(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDelete !== null}
        title="Delete Chat"
        message={`Are you sure you want to delete "${confirmDelete?.title || 'this chat'}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={async () => {
          if (confirmDelete) {
            try {
              await deleteTaskOutput(confirmDelete.id);
              setChatList(prev => prev.filter(c => c.id !== confirmDelete.id));
              if (currentChatId === confirmDelete.id) {
                startNewChat();
              }
              showToast('Chat deleted', 'success');
            } catch (error) {
              showToast('Failed to delete chat', 'error');
            }
            setConfirmDelete(null);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
            } animate-fadeIn`}
          >
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                message.type === 'user'
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                  : 'bg-gradient-to-br from-green-500 to-emerald-600'
              }`}
            >
              {message.type === 'user' ? (
                <User className="w-5 h-5 text-white" />
              ) : (
                <Bot className="w-5 h-5 text-white" />
              )}
            </div>

            <div
              className={`flex-1 max-w-[80%] ${
                message.type === 'user' ? 'items-end' : 'items-start'
              } flex flex-col gap-2`}
            >
              <div
                className={`px-4 py-3 rounded-2xl ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-white border border-white/20'
                }`}
              >
                {message.type === 'bot' ? (
                  message.content ? (
                    (() => {
                      const parsed = parseDualLanguageContent(message.content);
                      if (parsed.isDualLanguage) {
                        return (
                          <>
                            <DualLanguageMessage content={parsed} />
                            <MessageActions 
                              content={message.content} 
                              messageId={message.id}
                              onFeedback={(id, fb) => {
                                const emoji = fb === 'like' ? '👍' : '👎';
                                handleFeedback(id, emoji, message.taskOutputId);
                                showToast(fb === 'like' ? 'Thanks for your feedback!' : 'We\'ll improve!', 'success');
                              }}
                              onRegenerate={() => regenerateAt(message.id)}
                            />
                          </>
                        );
                      }
                      return (
                        <>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </p>
                          <MessageActions 
                            content={message.content} 
                            messageId={message.id}
                            onFeedback={(id, fb) => {
                              const emoji = fb === 'like' ? '👍' : '👎';
                              handleFeedback(id, emoji, message.taskOutputId);
                              showToast(fb === 'like' ? 'Thanks for your feedback!' : 'We\'ll improve!', 'success');
                            }}
                            onRegenerate={() => regenerateAt(message.id)}
                          />
                        </>
                      );
                    })()
                  ) : (
                    // Show typing indicator when content is empty
                    <div className="flex gap-1">
                      <div
                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <div
                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <div
                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  )
                ) : (
                  <div className="group/msg relative">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                    {/* Edit button for user messages */}
                    {message.type === 'user' && !isTyping && (
                      <button
                        onClick={() => {
                          setInput(message.content);
                          inputRef.current?.focus();
                        }}
                        className="absolute -right-8 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover/msg:opacity-100 text-slate-400 hover:text-white transition-opacity"
                        title="Edit & resend"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {message.source && (
                <SourceCitation
                  document={message.source.document}
                  page={message.source.page}
                  excerpt={message.content.slice(0, 100)}
                  onClick={() => setPdfPreview({
                    filename: message.source!.document,
                    page: message.source!.page,
                    highlight: message.content.slice(0, 50),
                  })}
                />
              )}

              <span className="text-xs text-slate-400 px-2">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* PDF Preview Modal */}
      {pdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setPdfPreview(null)} />
          <div className="relative w-full max-w-4xl">
            <PDFPreview
              filename={pdfPreview.filename}
              pageNumber={pdfPreview.page}
              highlightText={pdfPreview.highlight}
              onClose={() => setPdfPreview(null)}
            />
          </div>
        </div>
      )}

      {/* Input Area with Recommendation Tiles */}
      <div className="p-4 border-t border-white/10 bg-black/20">
        {/* Recommendation Tiles */}
        <RecommendationTiles onSelect={handleRecommendationSelect} />

        {/* Action buttons */}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={startNewChat}
            className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            title={t('chat.newChat')}
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={clearChat}
            className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            title={t('chat.clearHistory')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
          
          {/* Separator */}
          <div className="w-px h-5 bg-white/10" />
          
          {/* Export Chat */}
          <button
            onClick={() => setShowExportDialog(true)}
            className="p-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            title={t('chat.exportChat')}
          >
            <Download className="w-4 h-4" />
          </button>
          
          {isTyping && (
            <button
              onClick={stopGeneration}
              className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors flex items-center gap-1"
              title={`${t('chat.stop')} (Esc)`}
            >
              <StopCircle className="w-4 h-4" />
              <span className="text-xs">{t('chat.stop')}</span>
            </button>
          )}
          <div className="flex-1" />
          <span className="text-xs text-slate-500">
            {input.length > 0 && `${input.length} chars`}
          </span>
        </div>

        {/* Input field */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.askQuestion')}
              rows={1}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              style={{ minHeight: '48px', maxHeight: '150px' }}
            />
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className="px-6 py-3 h-fit bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2 self-end"
          >
            <Send className="w-5 h-5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>

        {/* Keyboard hints */}
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
          <span><kbd className="px-1 py-0.5 bg-white/10 rounded text-[10px]">Enter</kbd> to send</span>
          <span><kbd className="px-1 py-0.5 bg-white/10 rounded text-[10px]">Shift+Enter</kbd> new line</span>
          {isTyping && <span><kbd className="px-1 py-0.5 bg-white/10 rounded text-[10px]">Esc</kbd> stop</span>}
        </div>
      </div>
      </div>

      <style>{`
        /* Recommendation Tiles responsiveness (optional improvement) */
        .recommendation-tile {
          transition: background 0.2s, color 0.2s;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
