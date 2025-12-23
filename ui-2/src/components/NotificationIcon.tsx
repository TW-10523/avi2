import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { getToken } from '../api/auth';

interface NotificationIconProps {
  onClick: () => void;
}

export default function NotificationIcon({ onClick }: NotificationIconProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const token = getToken();
        const response = await fetch('/dev-api/api/messages/unread-count', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await response.json();
        if (data.code === 200) {
          setUnreadCount(data.result.count);
        }
      } catch (err) {
        console.error('Failed to fetch unread count:', err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      onClick={onClick}
      className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
      title="Notifications"
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
