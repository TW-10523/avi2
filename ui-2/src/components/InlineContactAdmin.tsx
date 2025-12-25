import { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';
import { getToken } from '../api/auth';

export default function InlineContactAdmin() {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [justSent, setJustSent] = useState<{ subject: string; content: string; timestamp: number } | null>(null);

  const handleSend = async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      const token = getToken();
      const response = await fetch('/dev-api/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ subject: subject.trim(), content: content.trim() }),
      });
      const data = await response.json();
      if (data.code === 200) {
        setSuccess(true);
        setJustSent({ subject: subject.trim(), content: content.trim(), timestamp: Date.now() });
        // Optional: Write to localStorage to mirror previous popup behavior
        try {
          const stored = localStorage.getItem('notifications_messages');
          const all = stored ? JSON.parse(stored) : [];
          all.unshift({
            id: `local-${Date.now()}`,
            sender: 'You',
            senderRole: 'user',
            role: 'user',
            subject: subject.trim(),
            text: content.trim(),
            message: content.trim(),
            timestamp: Date.now(),
            read: true,
          });
          localStorage.setItem('notifications_messages', JSON.stringify(all));
        } catch {}
        setTimeout(() => {
          setSuccess(false);
          setSubject('');
          setContent('');
        }, 1600);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 border-b border-white/10 bg-black/20">
        <h2 className="text-lg font-semibold text-white">Send Message to Admin</h2>
        <p className="text-sm text-slate-400 mt-1">Use this form to contact the admin team</p>
      </div>

      <div className="p-6 space-y-4">
        {success && (
          <div className="p-3 bg-green-600/20 border border-green-500/40 rounded-lg text-green-300 flex items-center gap-2 animate-section-in">
            <CheckCircle className="w-5 h-5" />
            Message sent. Admin will respond shortly.
          </div>
        )}
        {justSent && (
          <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-slate-300 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-200 font-medium">Your message</span>
              <span className="text-xs text-slate-500">{new Date(justSent.timestamp).toLocaleString()}</span>
            </div>
            {justSent.subject && <div className="mt-1 text-xs text-slate-400">Subject: {justSent.subject}</div>}
            <p className="mt-2 text-sm whitespace-pre-wrap">{justSent.content}</p>
          </div>
        )}

        <div>
          <label className="block text-sm text-slate-300 mb-1">Subject (Optional)</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g., Leave Request, Salary Query..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">Your Message *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Please describe your question or concern in detail..."
            rows={8}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
          />
          <p className="mt-1 text-xs text-slate-500">{content.length > 0 ? `${content.length} characters` : 'Min. 1 character required'}</p>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSend}
            disabled={sending || !content.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded-lg text-white text-sm font-medium inline-flex items-center gap-2 transition-colors"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>
    </div>
  );
}
