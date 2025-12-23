import { useState } from 'react';
import { MessageSquare, Clock, X, Send, RefreshCw } from 'lucide-react';

export default function ContactAdminModal({ 
  isOpen, 
  onClose, 
  onSend, 
  user, 
  supportTickets = [],
  loadingTickets = false,
  onRefreshTickets
}) {
  const [activeTab, setActiveTab] = useState('send');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (!message.trim()) {
      alert('Please enter a message');
      return;
    }
    if (onSend && user) {
      onSend({ subject, message });
    }
    setSubject('');
    setMessage('');
    onClose();
  };

  const lastThreeTickets = supportTickets.slice(-3).reverse();

  const handleClearQueries = () => {
    if (window.confirm('Are you sure you want to clear all your queries? This action cannot be undone.')) {
      console.log('Clear all queries');
    }
  };

  if (!isOpen) return null;

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxHeight: '600px', display: 'flex', flexDirection: 'column' }}>
        <div className="flex items-center justify-between mb-4">
          <h2>Contact Admin</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">×</button>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-white/10 justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('send')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'send'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Send Message
            </button>
            <button
              onClick={() => setActiveTab('queries')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'queries'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-4 h-4" />
              My Queries ({lastThreeTickets.length})
              {loadingTickets && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            </button>
          </div>
          {activeTab === 'queries' && lastThreeTickets.length > 0 && (
            <button
              onClick={handleClearQueries}
              className="px-3 py-1 text-xs font-medium text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 rounded transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Send Message Tab */}
        {activeTab === 'send' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              className="modal-input"
              type="text"
              placeholder="Subject (optional)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            
            <textarea
              className="modal-textarea"
              placeholder="Your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ flex: 1 }}
            />
            
            <div className="modal-buttons">
              <button className="cancel-btn" onClick={onClose}>
                Cancel
              </button>
              <button className="send-btn" onClick={handleSend}>
                Send
              </button>
            </div>
          </div>
        )}

        {/* My Queries Tab - Shows support tickets asked to admin */}
        {activeTab === 'queries' && (
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '12px' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-slate-300">Questions Asked to Admin</p>
              {onRefreshTickets && (
                <button
                  onClick={onRefreshTickets}
                  disabled={loadingTickets}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                  title="Refresh support tickets"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingTickets ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>

            {lastThreeTickets.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>
                <p>No support tickets yet</p>
                <p style={{ fontSize: '12px', marginTop: '8px' }}>Questions you ask to admin will appear here</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {lastThreeTickets.map((ticket, idx) => (
                  <div
                    key={ticket.id || idx}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    {ticket.question && (
                      <p style={{ color: '#60a5fa', fontSize: '12px', fontWeight: '500', marginBottom: '6px' }}>
                        Subject: {ticket.question}
                      </p>
                    )}
                    <p style={{ color: '#fff', fontSize: '13px', lineHeight: '1.5', marginBottom: '8px' }}>
                      {ticket.message}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        <Clock className="w-3 h-3 inline mr-1" />
                        {formatDate(ticket.timestamp)}
                      </span>
                      {ticket.status && (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: ticket.status === 'RESOLVED' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(249, 115, 22, 0.2)',
                          color: ticket.status === 'RESOLVED' ? '#86efac' : '#fdba74',
                        }}>
                          {ticket.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


