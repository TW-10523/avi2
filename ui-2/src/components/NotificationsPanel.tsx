import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Mail, MailOpen, Send } from 'lucide-react';

interface NotificationItem {
  id: string;
  subject?: string;
  title?: string;
  message?: string;
  text?: string;
  timestamp?: number | string | Date;
  read?: boolean;
  is_broadcast?: boolean;
  notificationId?: number;
  messageId?: number;
  senderRole?: string;
  isAdminSent?: boolean;
  sender?: string;
}

interface NotificationsPanelProps {
  items: NotificationItem[];
  title?: string;
  searchTerm?: string;
  onMarkAsRead?: (item: NotificationItem) => void;
  dimmed?: boolean; // for visual dim when typing in chat
  onSearchChange?: (value: string) => void;
}

// Helper functions to manage localStorage read state persistence
const getReadIdsFromStorage = (): { notificationIds: Set<number>; messageIds: Set<number> } => {
  try {
    const notificationIds = JSON.parse(localStorage.getItem('read_notification_ids') || '[]');
    const messageIds = JSON.parse(localStorage.getItem('read_message_ids') || '[]');
    return {
      notificationIds: new Set<number>(Array.isArray(notificationIds) ? notificationIds : []),
      messageIds: new Set<number>(Array.isArray(messageIds) ? messageIds : []),
    };
  } catch {
    return { notificationIds: new Set<number>(), messageIds: new Set<number>() };
  }
};

const addReadIdToStorage = (notificationId?: number, messageId?: number): void => {
  try {
    const { notificationIds, messageIds } = getReadIdsFromStorage();
    
    if (typeof notificationId === 'number' && !notificationIds.has(notificationId)) {
      notificationIds.add(notificationId);
      localStorage.setItem('read_notification_ids', JSON.stringify(Array.from(notificationIds)));
    }
    
    if (typeof messageId === 'number' && !messageIds.has(messageId)) {
      messageIds.add(messageId);
      localStorage.setItem('read_message_ids', JSON.stringify(Array.from(messageIds)));
    }
  } catch (err) {
    console.error('Failed to persist read state:', err);
  }
};

const isItemReadInStorage = (item: NotificationItem): boolean => {
  try {
    const { notificationIds, messageIds } = getReadIdsFromStorage();
    if (item.notificationId != null && notificationIds.has(item.notificationId)) return true;
    if (item.messageId != null && messageIds.has(item.messageId)) return true;
    return false;
  } catch {
    return false;
  }
};

export default function NotificationsPanel({ items, searchTerm = '', onMarkAsRead, dimmed = false, onSearchChange }: NotificationsPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Maintain a stable local copy to avoid UI resets on parent updates/polling
  const [localItems, setLocalItems] = useState<NotificationItem[]>([]);
  const localMapRef = useRef<Map<string, NotificationItem>>(new Map());
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize/merge incoming items with localStorage read state persistence
  useEffect(() => {
    try {
      const safeItems = Array.isArray(items) ? items : [];
      const map = new Map<string, NotificationItem>();
      
      // Process each item and sync with localStorage read state
      for (const it of safeItems) {
        if (!it || !it.id) continue; // Defensive check
        
        const existing = localMapRef.current.get(it.id);
        const storageRead = isItemReadInStorage(it);
        
        // Priority: localStorage > existing local state > server state
        // If marked as read in localStorage, always keep it read
        const finalRead = storageRead || (existing?.read ?? false) || (it.read ?? false);
        
        map.set(it.id, {
          ...it,
          read: finalRead,
        });
      }
      
      // Preserve any local items that might have been marked read but aren't in new items
      // This prevents flickering when polling updates
      localMapRef.current.forEach((existingItem, id) => {
        if (!map.has(id) && existingItem.read) {
          // Keep read items that are no longer in the list (they'll be filtered out naturally)
        }
      });
      
      localMapRef.current = map;
      setLocalItems(Array.from(map.values()));
      setIsInitialized(true);
    } catch (err) {
      console.error('Error processing notifications:', err);
      // Fallback to safe empty state
      setLocalItems([]);
      setIsInitialized(true);
    }
    // Do not depend on localItems here to prevent loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Determine if we should auto-scroll when new items arrive
  const shouldAutoScrollRef = useRef(true);
  const rememberScrollPosition = () => {
    const el = containerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) < 24;
    shouldAutoScrollRef.current = nearBottom;
  };

  useEffect(() => {
    rememberScrollPosition();
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (shouldAutoScrollRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [localItems.length]);

  const markLocalRead = (n: NotificationItem) => {
    if (!n || !n.id) return; // Defensive check
    
    const el = containerRef.current;
    const prevScroll = el ? el.scrollTop : 0;
    
    // Persist to localStorage immediately for cross-refresh persistence
    addReadIdToStorage(n.notificationId, n.messageId);
    
    // Update local state immediately for instant UI feedback
    setLocalItems((prev) => {
      const updated = prev.map((it) => (it.id === n.id ? { ...it, read: true } : it));
      return updated;
    });
    
    // Update ref map
    const map = new Map(localMapRef.current);
    const cur = map.get(n.id);
    if (cur) {
      map.set(n.id, { ...cur, read: true });
      localMapRef.current = map;
    }
    
    // Restore scroll on next frame to avoid jump
    requestAnimationFrame(() => {
      if (el) el.scrollTop = prevScroll;
    });
  };

  // no-op: preserve API, but we don't store previous count

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const arr = [...localItems];
    // Sort by timestamp desc for stability
    try {
      arr.sort((a: any, b: any) => (new Date(b.timestamp || 0).getTime()) - (new Date(a.timestamp || 0).getTime()));
    } catch {}
    if (!q) return arr;
    return arr.filter((n) => {
      const subject = (n.subject || n.title || '').toLowerCase();
      const body = (n.message || n.text || '').toLowerCase();
      return subject.includes(q) || body.includes(q);
    });
  }, [localItems, searchTerm]);

  const highlight = (text: string = '') => {
    if (!searchTerm) return text;
    const q = searchTerm.trim();
    try {
      const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'));
      return parts.map((p, i) =>
        p.toLowerCase() === q.toLowerCase() ? (
          // eslint-disable-next-line react/no-array-index-key
          <mark key={i} className="bg-yellow-500/30 text-yellow-200 rounded px-0.5">{p}</mark>
        ) : (
          // eslint-disable-next-line react/no-array-index-key
          <span key={i}>{p}</span>
        )
      );
    } catch {
      return text;
    }
  };

  // Ensure we always have safe defaults for rendering
  const safeFiltered = useMemo(() => {
    if (!isInitialized) return [];
    return Array.isArray(filtered) ? filtered : [];
  }, [filtered, isInitialized]);

  const safeItems = Array.isArray(items) ? items : [];
  const hasItems = safeItems.length > 0;
  const hasFilteredResults = safeFiltered.length > 0;

  return (
    <aside className={`h-full w-full bg-black/20 border-l border-white/10 transition-opacity duration-200 ${dimmed ? 'opacity-60' : 'opacity-100'} flex flex-col`}>
      {/* Top bar with bell icon + "Notifications" label */}
      <div className="p-3 border-b border-white/10 flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1">
          <Bell className="w-4 h-4 text-slate-300" />
          <h3 className="text-sm font-semibold text-white tracking-wide">Notifications</h3>
        </div>
        {onSearchChange && (
          <div className="flex items-center gap-2 pl-2 pr-2 py-1 bg-white/5 rounded-md border border-white/10">
            <input
              type="text"
              value={searchTerm || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search notifications..."
              className="bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none w-40"
              aria-label="Search notifications"
            />
          </div>
        )}
      </div>

      {/* Scrollable content area with proper height constraints */}
      <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto">
        {!isInitialized ? (
          <div className="py-10 px-4 text-center text-slate-400">
            <p>Loading notifications...</p>
          </div>
        ) : !hasFilteredResults ? (
          <div className="py-10 px-4 text-center text-slate-400">
            {!hasItems ? (
              <p>No notifications yet</p>
            ) : (
              <p>No results for &quot;{searchTerm || ''}&quot;</p>
            )}
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {safeFiltered.map((n) => {
              if (!n || !n.id) return null; // Defensive check
              
              const isExpanded = expandedId === n.id;
              const isNew = !(n.read ?? false);
              const isAdminSent = n.isAdminSent || n.senderRole === 'admin';
              const subject = n.subject || n.title || 'Notification';
              const body = n.message || n.text || '';
              let ts: Date | null = null;
              
              try {
                if (n.timestamp) {
                  ts = new Date(n.timestamp);
                  if (isNaN(ts.getTime())) ts = null;
                }
              } catch {
                ts = null;
              }

              return (
                <div
                  key={n.id}
                  className={`rounded-lg border p-3 transition-all duration-150 cursor-pointer animate-notify-in
                    ${isAdminSent 
                      ? 'border-green-500/30 bg-green-500/5' 
                      : isNew 
                      ? 'border-blue-500/30 bg-blue-500/5' 
                      : 'border-white/10 bg-white/5'}`}
                  onClick={() => {
                    setExpandedId(isExpanded ? null : n.id);
                    // Admin-sent messages don't need marking as read (they're always read)
                    // Only mark unread incoming messages as read
                    if (isNew && !isAdminSent) {
                      markLocalRead(n);
                      onMarkAsRead?.(n);
                    }
                  }}
                >
                  <div className="flex items-start gap-2">
                    {isAdminSent ? (
                      <Send className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    ) : isNew ? (
                      <Mail className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <MailOpen className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {isAdminSent && (
                            <span className="text-[10px] uppercase tracking-wider text-green-300 bg-green-500/10 border border-green-500/30 px-1.5 py-0.5 rounded flex-shrink-0">Sent</span>
                          )}
                          {isNew && !isAdminSent && (
                            <span className="text-[10px] uppercase tracking-wider text-blue-300 bg-blue-500/10 border border-blue-500/30 px-1.5 py-0.5 rounded flex-shrink-0">New</span>
                          )}
                          <h4 className="text-sm font-medium text-white truncate">{highlight(subject)}</h4>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {ts && (
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                              {ts.toLocaleString()}
                            </span>
                          )}
                          {isNew && !isAdminSent && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                markLocalRead(n);
                                onMarkAsRead?.(n);
                              }}
                              className={`text-[10px] px-2 py-0.5 rounded whitespace-nowrap font-medium transition-all duration-200 ${
                                n.read 
                                  ? 'bg-slate-600/30 text-slate-400 cursor-default opacity-50' 
                                  : 'bg-blue-600/40 text-blue-200 hover:bg-blue-600/60 active:bg-blue-700/60 cursor-pointer'
                              }`}
                            >
                              {n.read ? 'Read' : 'Mark as read'}
                            </button>
                          )}
                        </div>
                      </div>

                      {body && (
                        <p className={`text-slate-300 text-xs mt-1 ${isExpanded ? '' : 'line-clamp-2'}`}>
                          {highlight(body)}
                        </p>
                      )}

                      {isExpanded && (
                        <div className="mt-2 text-[11px] text-slate-400">
                          Click to collapse
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

// Inject small CSS for notification entrance animation (fade + slight upward slide)
if (typeof document !== 'undefined' && !document.getElementById('notify-anim-style')) {
  const style = document.createElement('style');
  style.id = 'notify-anim-style';
  style.innerHTML = `
    @keyframes notifyIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .animate-notify-in { animation: notifyIn 0.22s ease-out both; }
  `;
  document.head.appendChild(style);
}
