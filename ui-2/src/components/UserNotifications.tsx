import { useState, useEffect } from 'react';
import { X, Mail, MailOpen, CheckCheck, MessageSquare } from 'lucide-react';
import { getToken } from '../api/auth';

interface Message {
  id: number;
  sender_id: string;
  subject: string;
  content: string;
  is_read: boolean;
  is_broadcast: boolean;
  created_at: string;
}

interface UserNotificationsProps {
  isOpen: boolean;
  onClose: () => void;
  onContactAdmin: () => void;
}

export default function UserNotifications({ isOpen, onClose, onContactAdmin }: UserNotificationsProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

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
        setMessages(data.result.messages || []);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      const token = getToken();
      await fetch(`/dev-api/api/messages/mark-read/${id}`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setMessages(messages.map(m => m.id === id ? { ...m, is_read: true } : m));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = getToken();
      await fetch('/dev-api/api/messages/mark-all-read', {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setMessages(messages.map(m => ({ ...m, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Notifications</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No messages yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-4 rounded-lg ${msg.is_read ? 'bg-gray-700/50' : 'bg-blue-900/30 border border-blue-500/30'}`}
                >
                  <div className="flex items-start gap-3">
                    {msg.is_read ? (
                      <MailOpen className="w-5 h-5 text-gray-400 mt-1" />
                    ) : (
                      <Mail className="w-5 h-5 text-blue-400 mt-1" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-white">{msg.subject}</h3>
                        {msg.is_broadcast && (
                          <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">Broadcast</span>
                        )}
                      </div>
                      <p className="text-gray-300 text-sm mt-1">{msg.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                        {!msg.is_read && (
                          <button
                            onClick={() => markAsRead(msg.id)}
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={() => { onClose(); onContactAdmin(); }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Contact Admin
          </button>
        </div>
      </div>
    </div>
  );
}
