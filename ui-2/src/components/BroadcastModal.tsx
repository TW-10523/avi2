import { useState } from 'react';
import { X, Send, CheckCircle, Users } from 'lucide-react';
import { getToken } from '../api/auth';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BroadcastModal({ isOpen, onClose }: BroadcastModalProps) {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!subject.trim() || !content.trim()) return;

    setSending(true);
    try {
      // Save to database API
      const token = getToken();
      const response = await fetch('/dev-api/api/messages/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ subject, content }),
      });

      const data = await response.json();
      if (data.code === 200) {
        // Also save to localStorage for the old notification system
        const now = new Date();
        const broadcastMessage = {
          id: Date.now().toString(),
          sender: 'Admin',
          senderRole: 'admin',
          role: 'admin',
          subject: subject,
          text: content,
          message: content,
          time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          date: now.toLocaleDateString('en-US'),
          timestamp: now.getTime(),
          read: false,
        };
        const storedMessages = localStorage.getItem('notifications_messages');
        const allMessages = storedMessages ? JSON.parse(storedMessages) : [];
        allMessages.unshift(broadcastMessage); // Add at beginning for newest first
        localStorage.setItem('notifications_messages', JSON.stringify(allMessages));

        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setSubject('');
          setContent('');
          onClose();
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to broadcast:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
        {success ? (
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white">Broadcast Sent!</h3>
            <p className="text-gray-400 mt-2">Message sent to all users.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <h2 className="text-xl font-semibold text-white">Message All Users</h2>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter subject..."
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Message</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Type your message to all users..."
                  rows={4}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <button
                onClick={handleSend}
                disabled={sending || !subject.trim() || !content.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Sending...' : 'Broadcast to All Users'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
