import { useState, useEffect } from 'react';
import { X, Mail, Send, CheckCircle, User } from 'lucide-react';
import { getToken } from '../api/auth';

interface Message {
  id: number;
  sender_id: string;
  subject: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface AdminNotificationsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminNotifications({ isOpen, onClose }: AdminNotificationsProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
    }
  }, [isOpen]);

  const fetchMessages = async () => {
    try {
      const token = getToken();
      const response = await fetch('/dev-api/api/messages/inbox', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      if (data.code === 200) {
        const fetchedMessages = data.result.messages || [];
        // Apply localStorage read state persistence
        try {
          const readIds = JSON.parse(localStorage.getItem('read_message_ids') || '[]');
          const readSet = new Set<number>(Array.isArray(readIds) ? readIds : []);
          const messagesWithReadState = fetchedMessages.map((m: Message) => ({
            ...m,
            is_read: readSet.has(m.id) || m.is_read,
          }));
          setMessages(messagesWithReadState);
        } catch {
          setMessages(fetchedMessages);
        }
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (msgId: number) => {
    try {
      const token = getToken();
      await fetch(`/dev-api/api/messages/mark-read/${msgId}`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      // Update local state immediately for instant UI feedback
      setMessages(messages.map(m => m.id === msgId ? { ...m, is_read: true } : m));
      
      // Persist to localStorage for cross-refresh consistency
      try {
        const readIds = JSON.parse(localStorage.getItem('read_message_ids') || '[]');
        const readSet = new Set<number>(Array.isArray(readIds) ? readIds : []);
        if (!readSet.has(msgId)) {
          readSet.add(msgId);
          localStorage.setItem('read_message_ids', JSON.stringify(Array.from(readSet)));
        }
      } catch (err) {
        console.error('Failed to persist read state:', err);
      }
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const sendReply = async (msg: Message) => {
    if (!replyContent.trim()) return;

    setSending(true);
    try {
      const token = getToken();
      const response = await fetch('/dev-api/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          subject: `Re: ${msg.subject}`,
          content: replyContent,
          recipientId: msg.sender_id,
          parentId: msg.id,
        }),
      });

      const data = await response.json();
      if (data.code === 200) {
        setSuccessMsg(`Reply sent to ${msg.sender_id}`);
        setReplyContent('');
        setReplyingTo(null);
        // Mark original as read
        await markAsRead(msg.id);
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Messages & Queries</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {successMsg && (
          <div className="mx-4 mt-4 p-3 bg-green-600/20 border border-green-500 rounded-lg flex items-center gap-2 text-green-400">
            <CheckCircle className="w-5 h-5" />
            {successMsg}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No messages yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isAdminSent = msg.sender_id === 'admin';
                return (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg ${
                      isAdminSent
                        ? 'bg-green-900/20 border border-green-500/30'
                        : msg.is_read
                        ? 'bg-gray-700/50'
                        : 'bg-blue-900/30 border border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isAdminSent ? 'bg-green-600' : 'bg-gray-600'}`}>
                        <User className="w-5 h-5 text-gray-300" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isAdminSent ? 'text-green-400' : 'text-blue-400'}`}>
                            {isAdminSent ? 'Admin (You)' : msg.sender_id}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(msg.created_at).toLocaleString()}
                          </span>
                          {isAdminSent && (
                            <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">Sent</span>
                          )}
                          {!msg.is_read && !isAdminSent && (
                            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">New</span>
                          )}
                        </div>
                        <h3 className="font-medium text-white mt-1">{msg.subject}</h3>
                        <p className="text-gray-300 text-sm mt-1">{msg.content}</p>

                        <div className="flex items-center gap-2 mt-2">
                          {!msg.is_read && !isAdminSent && (
                            <button
                              onClick={() => markAsRead(msg.id)}
                              className="text-xs px-2 py-1 rounded bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 transition-colors"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>

                        {!isAdminSent && replyingTo === msg.id ? (
                          <div className="mt-3 space-y-2">
                            <textarea
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                              placeholder="Type your reply..."
                              rows={3}
                              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => sendReply(msg)}
                                disabled={sending || !replyContent.trim()}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm px-4 py-1.5 rounded-lg flex items-center gap-1"
                              >
                                <Send className="w-3 h-3" />
                                {sending ? 'Sending...' : 'Send'}
                              </button>
                              <button
                                onClick={() => { setReplyingTo(null); setReplyContent(''); }}
                                className="text-gray-400 hover:text-white text-sm px-3 py-1.5"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : !isAdminSent ? (
                          <button
                            onClick={() => setReplyingTo(msg.id)}
                            className="mt-2 text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            Quick Reply
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
