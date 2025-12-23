import { useState, useEffect, useRef } from 'react';
import { Bell, Clock, X } from 'lucide-react';

export default function NotificationDropdown({
  user,
  notifications = [],
  onMarkAsRead,
  unreadCount = 0,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pick best available date field safely
  const getBestDate = (item) => {
    if (!item) return null;
    if (item.timestamp) return new Date(item.timestamp);
    if (item.createdAt) return new Date(item.createdAt);
    if (item.created_at) return new Date(item.created_at);
    if (item.date && item.time) return new Date(`${item.date} ${item.time}`);
    if (item.date) return new Date(item.date);
    return null;
  };

  const formatDate = (input) => {
    const d = input instanceof Date ? input : new Date(input);
    if (!d || isNaN(d.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-white/10 rounded-lg transition-colors group"
        title="Notifications"
      >
        <Bell className="w-6 h-6 text-slate-300 group-hover:text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
<div className="fixed top-20 right-6 w-96 bg-slate-900 border border-white/10 rounded-lg shadow-2xl z-50 max-h-96 flex flex-col">
          
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-white font-semibold">
              Notifications
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-sm">
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {notifications.map((item, idx) => (
                  <div key={idx} className="p-3">
                    <div
                      className={`rounded-lg border border-white/10 bg-slate-800/40 p-3 ${
                        !item.read ? 'ring-1 ring-blue-500/40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-white text-sm">
                            {item.sender}
                          </p>
                          <p className="text-slate-400 text-xs flex items-center gap-1 mt-1">
                            <Clock size={12} />
                            {formatDate(getBestDate(item))}
                          </p>
                        </div>
                        {!item.read && (
                          <span className="w-2 h-2 bg-red-500 rounded-full mt-1" />
                        )}
                      </div>

                      {item.subject && (
                        <p className="text-blue-400 text-sm font-medium mb-1">
                          {item.subject}
                        </p>
                      )}

                      <p className="text-slate-300 text-xs line-clamp-2 mb-2">
                        {item.text || item.message}
                      </p>

                      {!item.read && (
                        <button
                          onClick={() => {
                            onMarkAsRead?.(item);
                            setIsOpen(false);
                          }}
                          className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded"
                        >
                          Mark as Read
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
