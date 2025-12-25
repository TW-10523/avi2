import { useState, useEffect, useRef } from 'react';
import { Bell, Mail, MailOpen, Users, Send } from 'lucide-react';
import { User } from '../types';
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

interface NotificationDropdownProps {
  user: User;
  notifications?: any[];
  onMarkAsRead?: (item: any) => void;
  unreadCount?: number;
  onSendToAll?: (message: string) => void;
}

export default function NotificationDropdown({
  user,
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchUnreadCount();
    fetchMessages(); // Fetch messages on mount too
    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchMessages();
    }, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) fetchMessages();
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const token = getToken();
      const res = await fetch('/dev-api/api/messages/unread-count', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.code === 200) setUnreadCount(data.result.count);
    } catch (err) {
      console.error('Failed to fetch unread count');
    }
  };

  const fetchMessages = async () => {
    try {
      const token = getToken();
      const res = await fetch('/dev-api/api/messages/inbox', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      console.log('[Notifications] Fetched messages:', data);
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
          setUnreadCount(messagesWithReadState.filter((m: Message) => !m.is_read).length);
        } catch {
          setMessages(fetchedMessages);
          setUnreadCount(fetchedMessages.filter((m: Message) => !m.is_read).length);
        }
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      const token = getToken();
      await fetch(`/dev-api/api/messages/mark-read/${id}`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      // Update local state immediately
      setMessages(messages.map(m => m.id === id ? { ...m, is_read: true } : m));
      setUnreadCount(Math.max(0, unreadCount - 1));
      
      // Persist to localStorage for cross-refresh consistency
      try {
        const readIds = JSON.parse(localStorage.getItem('read_message_ids') || '[]');
        const readSet = new Set<number>(Array.isArray(readIds) ? readIds : []);
        if (!readSet.has(id)) {
          readSet.add(id);
          localStorage.setItem('read_message_ids', JSON.stringify(Array.from(readSet)));
        }
      } catch (err) {
        console.error('Failed to persist read state:', err);
      }
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
      
      // Update local state immediately
      const unreadIds = messages.filter(m => !m.is_read).map(m => m.id);
      setMessages(messages.map(m => ({ ...m, is_read: true })));
      setUnreadCount(0);
      
      // Persist all unread IDs to localStorage
      try {
        const readIds = JSON.parse(localStorage.getItem('read_message_ids') || '[]');
        const readSet = new Set<number>(Array.isArray(readIds) ? readIds : []);
        unreadIds.forEach(id => readSet.add(id));
        localStorage.setItem('read_message_ids', JSON.stringify(Array.from(readSet)));
      } catch (err) {
        console.error('Failed to persist read state:', err);
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const sendReply = async (msg: Message) => {
    if (!replyContent.trim()) return;
    setSending(true);
    try {
      const token = getToken();
      const res = await fetch('/dev-api/api/messages/send', {
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
      const data = await res.json();
      if (data.code === 200) {
        setSuccessMsg('Reply sent!');
        setReplyContent('');
        setReplyingTo(null);
        markAsRead(msg.id);
        setTimeout(() => setSuccessMsg(''), 2000);
      }
    } catch (err) {}
    setSending(false);
  };

  const sendBroadcast = async () => {
    if (!broadcastSubject.trim() || !broadcastContent.trim()) return;
    setSending(true);
    try {
      const token = getToken();
      const res = await fetch('/dev-api/api/messages/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ subject: broadcastSubject, content: broadcastContent }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setSuccessMsg('Broadcast sent to all users!');
        setBroadcastSubject('');
        setBroadcastContent('');
        setShowBroadcast(false);
        setTimeout(() => setSuccessMsg(''), 2000);
      }
    } catch (err) {}
    setSending(false);
  };

  const sendToAdmin = async () => {
    if (!replyContent.trim()) return;
    setSending(true);
    try {
      const token = getToken();
      const res = await fetch('/dev-api/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          subject: 'User Query',
          content: replyContent,
        }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setSuccessMsg('Message sent to admin!');
        setReplyContent('');
        setTimeout(() => setSuccessMsg(''), 2000);
      }
    } catch (err) {}
    setSending(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-white/10 rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6 text-slate-300 hover:text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden z-50">
          <div className="p-3 border-b border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-white">
              {isAdmin ? 'User Queries' : 'Notifications'}
            </h3>
            <div className="flex gap-2">
              {isAdmin && (
                <button
                  onClick={() => setShowBroadcast(!showBroadcast)}
                  className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded flex items-center gap-1"
                >
                  <Users className="w-3 h-3" />
                  Message All
                </button>
              )}
              <button onClick={markAllAsRead} className="text-xs text-blue-400 hover:text-blue-300">
                Mark all read
              </button>
            </div>
          </div>

          {successMsg && (
            <div className="mx-3 mt-2 p-2 bg-green-600/20 border border-green-500 rounded text-green-400 text-sm text-center">
              {successMsg}
            </div>
          )}

          {showBroadcast && isAdmin && (
            <div className="p-3 border-b border-gray-700 bg-purple-900/20">
              <input
                type="text"
                value={broadcastSubject}
                onChange={(e) => setBroadcastSubject(e.target.value)}
                placeholder="Subject..."
                className="w-full bg-gray-700 text-white rounded px-3 py-1.5 text-sm mb-2"
              />
              <textarea
                value={broadcastContent}
                onChange={(e) => setBroadcastContent(e.target.value)}
                placeholder="Message to all users..."
                rows={2}
                className="w-full bg-gray-700 text-white rounded px-3 py-1.5 text-sm resize-none"
              />
              <button
                onClick={sendBroadcast}
                disabled={sending}
                className="mt-2 w-full bg-purple-600 hover:bg-purple-700 text-white text-sm py-1.5 rounded flex items-center justify-center gap-1"
              >
                <Send className="w-3 h-3" />
                {sending ? 'Sending...' : 'Send Broadcast'}
              </button>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Mail className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No messages</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 border-b border-gray-700 ${!msg.is_read ? 'bg-blue-900/20' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {msg.is_read ? (
                      <MailOpen className="w-4 h-4 text-gray-400 mt-1" />
                    ) : (
                      <Mail className="w-4 h-4 text-blue-400 mt-1" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-blue-400">{msg.sender_id}</span>
                        {msg.is_broadcast && (
                          <span className="text-xs bg-purple-600 text-white px-1 rounded">Broadcast</span>
                        )}
                      </div>
                      <p className="font-medium text-white text-sm truncate">{msg.subject}</p>
                      <p className="text-gray-300 text-xs mt-1 line-clamp-2">{msg.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {new Date(msg.created_at).toLocaleString()}
                        </span>
                        <div className="flex gap-2">
                          {!msg.is_read && (
                            <button
                              onClick={() => markAsRead(msg.id)}
                              className="text-xs text-blue-400 hover:text-blue-300"
                            >
                              Mark read
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => setReplyingTo(replyingTo === msg.id ? null : msg.id)}
                              className="text-xs text-green-400 hover:text-green-300"
                            >
                              Reply
                            </button>
                          )}
                        </div>
                      </div>
                      {replyingTo === msg.id && isAdmin && (
                        <div className="mt-2">
                          <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Type reply..."
                            rows={2}
                            className="w-full bg-gray-700 text-white rounded px-2 py-1 text-xs resize-none"
                          />
                          <button
                            onClick={() => sendReply(msg)}
                            disabled={sending}
                            className="mt-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded"
                          >
                            {sending ? 'Sending...' : 'Send Reply'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {!isAdmin && (
            <div className="p-3 border-t border-gray-700">
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Send a message to admin..."
                rows={2}
                className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm resize-none"
              />
              <button
                onClick={sendToAdmin}
                disabled={sending || !replyContent.trim()}
                className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm py-2 rounded flex items-center justify-center gap-1"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Sending...' : 'Contact Admin'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

