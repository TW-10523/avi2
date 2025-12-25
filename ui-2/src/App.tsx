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
import { getToken } from './api/auth';
 
 
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

  // Local persistence for read states across refresh
  const getReadSets = () => {
    try {
      const n = JSON.parse(localStorage.getItem('read_notification_ids') || '[]');
      const m = JSON.parse(localStorage.getItem('read_message_ids') || '[]');
      return { n: new Set<number>(n), m: new Set<number>(m) };
    } catch {
      return { n: new Set<number>(), m: new Set<number>() };
    }
  };
  const addReadId = (notificationId?: number, messageId?: number) => {
    const { n, m } = getReadSets();
    let changedN = false, changedM = false;
    if (typeof notificationId === 'number') { n.add(notificationId); changedN = true; }
    if (typeof messageId === 'number') { m.add(messageId); changedM = true; }
    if (changedN) localStorage.setItem('read_notification_ids', JSON.stringify(Array.from(n)));
    if (changedM) localStorage.setItem('read_message_ids', JSON.stringify(Array.from(m)));
  };
  const applyPersistentRead = (arr: any[]) => {
    if (!Array.isArray(arr)) return [];
    const { n, m } = getReadSets();
    return arr.map((it) => {
      if (!it) return it; // Defensive check
      // If marked as read in localStorage, always preserve that state
      if (it?.notificationId != null && n.has(it.notificationId)) {
        return { ...it, read: true };
      }
      if (it?.messageId != null && m.has(it.messageId)) {
        return { ...it, read: true };
      }
      // Otherwise preserve existing read state or default to false
      return { ...it, read: it.read ?? false };
    });
  };
  // Compose role-specific notification list consistently
  const composeNotifications = (
    role: 'admin' | 'user',
    server: any[] = [],
    inbox: any[] = [],
    localMsgs: any[] = []
  ) => {
    // Deduplicate messages by ID to prevent duplicates from multiple sources
    const messageMap = new Map<string, any>();

    if (role === 'admin') {
      // Admin sees:
      // 1. User queries (from inbox - recipient_type='admin', sender_type='user')
      // 2. Admin's own sent messages (from inbox - sender_type='admin')
      // 3. Local messages sent by admin
      const allMessages = [...inbox];
      
      // Add local messages where admin is the sender
      const localAdminMsgs = (localMsgs || []).filter((m: any) => m.senderRole === 'admin');
      allMessages.push(...localAdminMsgs);

      // Deduplicate and mark admin-sent messages for visual distinction
      for (const msg of allMessages) {
        if (msg && msg.id) {
          const enriched = {
            ...msg,
            isAdminSent: msg.senderRole === 'admin',
          };
          messageMap.set(msg.id, enriched);
        }
      }
    } else {
      // User sees:
      // 1. Server notifications (admin broadcasts/messages)
      // 2. Inbox messages (admin replies)
      // 3. Local messages from admin
      const allMessages = [...(server || []), ...(inbox || [])];
      
      // Add local messages where admin is the sender
      const localAdminMsgs = (localMsgs || []).filter((m: any) => m.role === 'admin');
      allMessages.push(...localAdminMsgs);

      // Deduplicate
      for (const msg of allMessages) {
        if (msg && msg.id) {
          messageMap.set(msg.id, msg);
        }
      }
    }

    // Return deduplicated, sorted array
    const result = Array.from(messageMap.values());
    result.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return result;
  };
 
  // Load notifications from backend (fallback to localStorage) and when user changes
  useEffect(() => {
    if (user) {
      const load = async () => {
        try {
          const token = getToken();
          
          // Fetch inbox messages - for users: admin replies, for admins: user queries
          let inboxMapped: any[] = [];
          try {
            const inboxRes = await fetch('/dev-api/api/messages/inbox', {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const inboxData = await inboxRes.json();
            if (inboxData?.code === 200 && Array.isArray(inboxData.result?.messages)) {
              const raw = inboxData.result.messages.map((m: any) => {
                if (user.role === 'admin') {
                  // For admins: these are user queries
                  return {
                    id: `msg-${m.id}`,
                    messageId: m.id,
                    sender: m.sender_id,
                    senderRole: 'user',
                    role: 'user',
                    subject: m.subject || '',
                    text: m.content,
                    message: m.content,
                    timestamp: new Date(m.created_at || Date.now()).getTime(),
                    read: !!m.is_read,
                  };
                } else {
                  // For users: these are admin replies
                  return {
                    id: `msg-${m.id}`,
                    messageId: m.id,
                    sender: m.sender_id,
                    senderRole: 'admin',
                    role: 'admin',
                    subject: m.subject || '',
                    text: m.content,
                    message: m.content,
                    timestamp: new Date(m.created_at || Date.now()).getTime(),
                    read: !!m.is_read,
                  };
                }
              });
              inboxMapped = applyPersistentRead(raw);
            }
          } catch (err) {
            console.error('Failed to fetch inbox messages:', err);
          }

          // Fetch backend notifications (optional - may fail)
          let mappedServer: any[] = [];
          try {
            const res = await apiGetNotifications(false);
            if (res?.code === 200 && Array.isArray(res.result)) {
              mappedServer = res.result.map((n: any) => ({
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
              mappedServer = applyPersistentRead(mappedServer);
            }
          } catch (err) {
            console.error('Failed to fetch notifications:', err);
            // Continue with inbox messages only
          }

          // Merge with local messages (for same-session unsynced items)
          let local: any[] = [];
          try {
            const storedMessages = localStorage.getItem('notifications_messages');
            local = storedMessages ? JSON.parse(storedMessages) : [];
            if (!Array.isArray(local)) local = [];
          } catch {
            local = [];
          }
          
          const combined = composeNotifications(user.role as any, mappedServer, inboxMapped, local);
          setNotifications(Array.isArray(combined) ? combined : []);
          const unread = Array.isArray(combined) ? combined.filter((m: any) => !(m.read ?? false)).length : 0;
          setUnreadCount(unread);
        } catch (e) {
          console.error('Error loading notifications:', e);
          // Fallback: try to at least show inbox messages
          try {
            const token = getToken();
            const inboxRes = await fetch('/dev-api/api/messages/inbox', {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const inboxData = await inboxRes.json();
            if (inboxData?.code === 200 && Array.isArray(inboxData.result?.messages)) {
              const raw = inboxData.result.messages.map((m: any) => {
                if (user.role === 'admin') {
                  return {
                    id: `msg-${m.id}`,
                    messageId: m.id,
                    sender: m.sender_id,
                    senderRole: 'user',
                    role: 'user',
                    subject: m.subject || '',
                    text: m.content,
                    message: m.content,
                    timestamp: new Date(m.created_at || Date.now()).getTime(),
                    read: !!m.is_read,
                  };
                } else {
                  return {
                    id: `msg-${m.id}`,
                    messageId: m.id,
                    sender: m.sender_id,
                    senderRole: 'admin',
                    role: 'admin',
                    subject: m.subject || '',
                    text: m.content,
                    message: m.content,
                    timestamp: new Date(m.created_at || Date.now()).getTime(),
                    read: !!m.is_read,
                  };
                }
              });
              const inboxMapped = applyPersistentRead(raw);
              const storedMessages = localStorage.getItem('notifications_messages');
              let local: any[] = [];
              try {
                local = storedMessages ? JSON.parse(storedMessages) : [];
                if (!Array.isArray(local)) local = [];
              } catch {
                local = [];
              }
              const combined = composeNotifications(user.role as any, [], inboxMapped, local);
              setNotifications(Array.isArray(combined) ? combined : []);
              const unread = Array.isArray(combined) ? combined.filter((m: any) => !(m.read ?? false)).length : 0;
              setUnreadCount(unread);
            } else {
              // Final fallback to localStorage only
              const storedMessages = localStorage.getItem('notifications_messages');
              if (storedMessages) {
                const allMessages = JSON.parse(storedMessages);
                const combined = composeNotifications(user.role as any, [], [], allMessages);
                setNotifications(Array.isArray(combined) ? combined : []);
                const unread = Array.isArray(combined) ? combined.filter((m: any) => !(m.read ?? false)).length : 0;
                setUnreadCount(unread);
              } else {
                setNotifications([]);
                setUnreadCount(0);
              }
            }
          } catch (err) {
            console.error('Error in fallback notification loading:', err);
            // Final fallback to localStorage only
            try {
              const storedMessages = localStorage.getItem('notifications_messages');
              if (storedMessages) {
                const allMessages = JSON.parse(storedMessages);
                const combined = composeNotifications(user.role as any, [], [], allMessages);
                setNotifications(Array.isArray(combined) ? combined : []);
                const unread = Array.isArray(combined) ? combined.filter((m: any) => !(m.read ?? false)).length : 0;
                setUnreadCount(unread);
              } else {
                setNotifications([]);
                setUnreadCount(0);
              }
            } catch (finalErr) {
              console.error('Error loading notifications from localStorage:', finalErr);
              setNotifications([]);
              setUnreadCount(0);
            }
          }
        }
      };
      load();
 
      // Poll for new notifications every 2 seconds
      const interval = setInterval(() => {
        (async () => {
          try {
            const token = getToken();
            
            // Fetch inbox messages first (most important)
            let inboxMapped: any[] = [];
            try {
              const inboxRes = await fetch('/dev-api/api/messages/inbox', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              const inboxData = await inboxRes.json();
              if (inboxData?.code === 200 && Array.isArray(inboxData.result?.messages)) {
                const raw = inboxData.result.messages.map((m: any) => {
                  if (user.role === 'admin') {
                    return {
                      id: `msg-${m.id}`,
                      messageId: m.id,
                      sender: m.sender_id,
                      senderRole: 'user',
                      role: 'user',
                      subject: m.subject || '',
                      text: m.content,
                      message: m.content,
                      timestamp: new Date(m.created_at || Date.now()).getTime(),
                      read: !!m.is_read,
                    };
                  } else {
                    return {
                      id: `msg-${m.id}`,
                      messageId: m.id,
                      sender: m.sender_id,
                      senderRole: 'admin',
                      role: 'admin',
                      subject: m.subject || '',
                      text: m.content,
                      message: m.content,
                      timestamp: new Date(m.created_at || Date.now()).getTime(),
                      read: !!m.is_read,
                    };
                  }
                });
                inboxMapped = applyPersistentRead(raw);
              }
            } catch (err) {
              // Continue with other sources
            }

            // Fetch backend notifications (optional)
            let mappedServer: any[] = [];
            try {
              const res = await apiGetNotifications(false);
              if (res?.code === 200 && Array.isArray(res.result)) {
                mappedServer = res.result.map((n: any) => ({
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
                mappedServer = applyPersistentRead(mappedServer);
              }
            } catch (err) {
              // Continue with inbox messages only
            }

            // Merge with local messages
            let local: any[] = [];
            try {
              const storedMessages = localStorage.getItem('notifications_messages');
              local = storedMessages ? JSON.parse(storedMessages) : [];
              if (!Array.isArray(local)) local = [];
            } catch {
              local = [];
            }

            const combined = composeNotifications(user.role as any, mappedServer, inboxMapped, local);
            setNotifications(Array.isArray(combined) ? combined : []);
            const unread = Array.isArray(combined) ? combined.filter((m: any) => !(m.read ?? false)).length : 0;
            setUnreadCount(unread);
          } catch (e) {
            // Silently ignore polling errors to avoid console spam
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
    if (!item || !item.id) return;
    
    try {
      // Persist read id locally FIRST so future reloads remain read
      addReadId(item.notificationId, item.messageId);

      // Update local state immediately for instant UI feedback
      setNotifications(prevNotifications =>
        prevNotifications.map(n => (n.id === item.id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Also persist to localStorage so polling stays consistent (local messages only)
      try {
        const stored = localStorage.getItem('notifications_messages');
        if (stored) {
          const all = JSON.parse(stored);
          const updated = all.map((m: any) => (m.id === item.id ? { ...m, read: true } : m));
          localStorage.setItem('notifications_messages', JSON.stringify(updated));
        }
      } catch (err) {
        console.error('Failed to update localStorage:', err);
      }

      // Mark server-side read for backend-backed items (fire and forget)
      const token = getToken();
      if (item.notificationId) {
        apiMarkNotificationRead(item.notificationId).catch(err => {
          console.error('Failed to mark notification as read:', err);
        });
      } else if (item.messageId) {
        fetch(`/dev-api/api/messages/mark-read/${item.messageId}`, {
          method: 'PUT',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }).catch(err => {
          console.error('Failed to mark message as read:', err);
        });
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
        onSaveToHistory={handleSaveToHistory}
        history={history}
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
 
 