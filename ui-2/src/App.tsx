import { useState, useEffect } from 'react';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';
import LoginPage from './components/LoginPage';
import HomePage from './components/HomePage';
import Popup from './components/Popup';
import ChatInterface from './components/ChatInterface';
import HistoryPage from './components/HistoryPage';
import ProfilePopup from './components/ProfilePopup';
import AdminDashboard from './components/AdminDashboard';
// @ts-ignore
import Messenger from './components/Messenger';
// @ts-ignore
import ContactAdminPopup from './components/ContactAdminPopup';
import BroadcastModal from './components/BroadcastModal';
import { User, FeatureType, HistoryItem } from './types';
import { getNotifications as apiGetNotifications, markNotificationRead as apiMarkNotificationRead, createSupportTicket } from './api/support';
 
 
function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [activeFeature, setActiveFeature] = useState<FeatureType | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showContactAdminModal, setShowContactAdminModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
 
  // Load notifications from backend (fallback to localStorage) and when user changes
  useEffect(() => {
    if (user) {
      const load = async () => {
        try {
          // Prefer backend notifications
          const res = await apiGetNotifications(false);
          if (res?.code === 200 && Array.isArray(res.result)) {
            const mapped = res.result.map((n: any) => ({
              id: `srv-${n.id}`,
              notificationId: n.id,
              sender: 'admin',
              senderRole: 'admin',
              role: 'admin',
              subject: n.title || '',
              text: n.message,
              message: n.message,
              timestamp: new Date(n.created_at || n.createdAt || Date.now()).getTime(),
              read: !!n.is_read,
            }));

            // Merge with local messages (for same-session unsynced items)
            const storedMessages = localStorage.getItem('notifications_messages');
            const local = storedMessages ? JSON.parse(storedMessages) : [];
            const filteredLocal = local.filter((m: any) => (user.role === 'admin' ? m.role === 'user' : m.role === 'admin'));
            // Filter server notifications so admins do not see admin messages
            const filteredServer = user.role === 'admin' ? [] : mapped;
            const combined = [...filteredServer, ...filteredLocal];
            setNotifications(combined);
            const unread = combined.filter((m: any) => !m.read).length;
            setUnreadCount(unread);
          }
        } catch (e) {
          // Fallback to localStorage only
          const storedMessages = localStorage.getItem('notifications_messages');
          if (storedMessages) {
            try {
              const allMessages = JSON.parse(storedMessages);
              const filteredNotifications = allMessages.filter((m: any) => {
                if (user.role === 'admin') return m.role === 'user';
                return m.role === 'admin';
              });
              setNotifications(filteredNotifications);
              const unreadCount = filteredNotifications.filter((m: any) => !m.read).length;
              setUnreadCount(unreadCount);
            } catch (err) {
              console.error('Error loading notifications:', err);
            }
          }
        }
      };
      load();
 
      // Poll for new notifications every 2 seconds
      const interval = setInterval(() => {
        (async () => {
          try {
            const res = await apiGetNotifications(false);
            if (res?.code === 200 && Array.isArray(res.result)) {
              const mapped = res.result.map((n: any) => ({
                id: `srv-${n.id}`,
                notificationId: n.id,
                sender: 'admin',
                senderRole: 'admin',
                role: 'admin',
                subject: n.title || '',
                text: n.message,
                message: n.message,
                timestamp: new Date(n.created_at || n.createdAt || Date.now()).getTime(),
                read: !!n.is_read,
              }));
              const storedMessages = localStorage.getItem('notifications_messages');
              const local = storedMessages ? JSON.parse(storedMessages) : [];
              const filteredLocal = local.filter((m: any) => (user.role === 'admin' ? m.role === 'user' : m.role === 'admin'));
              const filteredServer = user.role === 'admin' ? [] : mapped;
              const combined = [...filteredServer, ...filteredLocal];
              setNotifications(combined);
              const unread = combined.filter((m: any) => !m.read).length;
              setUnreadCount(unread);
            }
          } catch (e) {
            // ignore transient errors
          }
        })();
      }, 2000);
 
      return () => clearInterval(interval);
    }
  }, [user]);
 
  const handleLogin = (userData: User) => {
    setUser(userData);
  };
 
  const handleLogout = () => {
    setUser(null);
    setActiveFeature(null);
    setShowProfile(false);
  };
 
  const handleFeatureClick = (feature: FeatureType) => {
    if (feature === 'contact-admin') {
      setShowContactAdminModal(true);
      return;
    }
    if (feature === 'message') {
      setShowBroadcastModal(true);
      return;
    }
    setActiveFeature(feature);
    setShowProfile(false);
  };
 
  const handleProfileClick = () => {
    setShowProfile(true);
    setActiveFeature(null);
  };
 
  const handleMarkAsRead = async (item: any) => {
    try {
      // Update filtered state
      setNotifications(prevNotifications =>
        prevNotifications.map(n => (n.id === item.id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Also persist to localStorage so polling stays consistent
      const stored = localStorage.getItem('notifications_messages');
      if (stored) {
        const all = JSON.parse(stored);
        const updated = all.map((m: any) => (m.id === item.id ? { ...m, read: true } : m));
        localStorage.setItem('notifications_messages', JSON.stringify(updated));

        // Recompute filtered notifications after persist
        const filtered = updated.filter((m: any) => {
          if (user?.role === 'admin') return m.role === 'user';
          return m.role === 'admin';
        });
        setNotifications(filtered);
        const unread = filtered.filter((m: any) => !m.read).length;
        setUnreadCount(unread);
      }

      // If it's a backend notification, mark it read server-side too
      if (item.notificationId) {
        try { await apiMarkNotificationRead(item.notificationId); } catch { /* ignore */ }
      }
    } catch (e) {
      console.error('Failed to mark as read:', e);
    }
  };
 
  const handleContactAdminSubmit = async (data: { subject: string; message: string }) => {
    setIsSubmitting(true);
    try {
      // Create message object
      const now = new Date();
      const newMessage = {
        id: Date.now().toString(),
        sender: user?.name || 'User',
        senderRole: user?.role,
        role: user?.role,
        subject: data.subject || '',
        text: data.message || '',
        message: data.message || '',
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString('en-US'),
        timestamp: now.getTime(),
        read: false,
      };
 
      // Store in localStorage
      const storedMessages = localStorage.getItem('notifications_messages');
      const allMessages = storedMessages ? JSON.parse(storedMessages) : [];
      allMessages.unshift(newMessage); // Add at beginning for newest first
      localStorage.setItem('notifications_messages', JSON.stringify(allMessages));
 
      // Update notifications state
      const filteredNotifications = allMessages.filter((m: any) => {
        if (user?.role === 'admin') return m.role === 'user';
        return m.role === 'admin';
      });
      setNotifications(filteredNotifications);
 
      // Call API to create support ticket if user (via proxy helper)
      if (user?.role === 'user') {
        try {
          await createSupportTicket({ subject: data.subject || 'No Subject', message: data.message });
        } catch (apiError) {
          console.error('API error:', apiError);
        }
      }
 
      setShowContactAdminModal(false);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
 
  const handleSendToAll = async (message: string) => {
    try {
      // Create broadcast message object
      const now = new Date();
      const broadcastMessage = {
        id: Date.now().toString(),
        sender: user?.name || 'Admin',
        senderRole: 'admin',
        role: 'admin',
        subject: 'Broadcast Message',
        text: message,
        message: message,
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString('en-US'),
        timestamp: now.getTime(),
        read: false,
      };
 
      // Store in localStorage
      const storedMessages = localStorage.getItem('notifications_messages');
      const allMessages = storedMessages ? JSON.parse(storedMessages) : [];
      allMessages.unshift(broadcastMessage); // Add at beginning for newest first
      localStorage.setItem('notifications_messages', JSON.stringify(allMessages));
 
      // Update notifications state for all users (will be filtered based on user role)
      // This is a simulation - in production, this would be sent to the backend
      // The backend would then notify all connected user sessions
      const filteredNotifications = allMessages.filter((m: any) => {
        if (user?.role === 'admin') return m.role === 'user';
        return m.role === 'admin';
      });
      setNotifications(filteredNotifications);
 
      // TODO: Call API to broadcast message to all users
      console.log('Broadcasting to all users:', message);
      alert('Message sent to all users');
    } catch (error) {
      console.error('Error broadcasting:', error);
      alert('Failed to broadcast message');
    }
  };
 
  const handleClosePopup = () => {
    setActiveFeature(null);
    setShowProfile(false);
  };
 
  const handleSaveToHistory = (query: string, answer: string, source: any) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      query,
      answer,
      timestamp: new Date(),
      source: {
        document: source.document,
        page: source.page,
      },
    };
    setHistory((prev) => [newItem, ...prev]);
  };
 
  const getPopupTitle = (): string => {
    if (showProfile) return 'Profile';
    switch (activeFeature) {
      case 'chat':
        return 'Ask HR Bot';
      case 'documents':
        return 'Document Viewer';
      case 'history':
        return 'Conversation History';
      case 'notifications':
        return 'Messages';
      case 'admin':
        return 'Admin Dashboard';
      default:
        return '';
    }
  };
 
  const getPopupContent = () => {
    if (showProfile && user) {
      return <ProfilePopup user={user} onLogout={handleLogout} />;
    }
 
    switch (activeFeature) {
      case 'chat':
        return <ChatInterface onSaveToHistory={handleSaveToHistory} />;
      case 'history':
        return <HistoryPage history={history} />;
      case 'notifications':
        return <Messenger user={user} onUnreadCountChange={setUnreadCount} onNotificationsChange={setNotifications} />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return null;
    }
  };
 
  if (!user) {
    return (
      <ToastProvider>
        <LoginPage onLogin={handleLogin} />
      </ToastProvider>

    );
  }
 
  return (
    <ToastProvider>
      <HomePage
        user={user}
        onFeatureClick={handleFeatureClick}
        onProfileClick={handleProfileClick}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        unreadCount={unreadCount}
        onSendToAll={handleSendToAll}
      />
 
      <ContactAdminPopup
        isOpen={showContactAdminModal}
        onClose={() => setShowContactAdminModal(false)}
        onSend={handleContactAdminSubmit}
        isSubmitting={isSubmitting}
      />

      <BroadcastModal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
      />
 
      <Popup
        isOpen={activeFeature !== null || showProfile}
        onClose={handleClosePopup}
        title={getPopupTitle()}
        maxWidth={activeFeature === 'admin' ? 'max-w-6xl' : 'max-w-4xl'}
      >
        {getPopupContent()}
      </Popup>
    </ToastProvider>
  );
}
 
function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
 
export default App;
 
 