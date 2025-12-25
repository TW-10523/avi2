import { MessageSquare, History, Shield, BarChart3, FileText, Users, Activity, Send, Trash2 } from 'lucide-react';
import { User, FeatureType } from '../types';
import { useLang } from '../context/LanguageContext';
import Header from './Header';
import ChatInterface from './ChatInterface';
import HistoryPage from './HistoryPage';
import NotificationsPanel from './NotificationsPanel';
import AdminDashboard from './AdminDashboard';
import InlineContactAdmin from './InlineContactAdmin';
import { useRef, useState } from 'react';

interface HomePageProps {
  user: User;
  onFeatureClick: (feature: FeatureType) => void;
  onProfileClick: () => void;
  notifications?: any[];
  onMarkAsRead?: (item: any) => void;
  unreadCount?: number;
  onContactAdminClick?: () => void;
  onSendToAll?: (message: string) => void;
  onSaveToHistory?: (query: string, answer: string, source: any) => void;
  history?: any[];
}

interface Feature {}

export default function HomePage({
  user,
  onFeatureClick,
  onProfileClick,
  notifications = [],
  onMarkAsRead,
  unreadCount = 0,
  onSendToAll,
  onSaveToHistory,
  history = [],
}: HomePageProps) {
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
  const [activeSection, setActiveSection] = useState<'chat' | 'history' | 'contact' | 'analytics' | 'documents' | 'users' | 'activity' | 'messages'>(user.role === 'admin' ? 'analytics' : 'chat');
  const [chatFocusTick, setChatFocusTick] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [notifSearch, setNotifSearch] = useState('');
  const rightPanelRef = useRef<HTMLDivElement>(null);

  // Feature cards removed in favor of persistent chat layout

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="h-20">
        <Header
          user={user}
          onProfileClick={onProfileClick}
          notifications={notifications}
          onMarkAsRead={onMarkAsRead}
          unreadCount={unreadCount}
          onSendToAll={onSendToAll}
          notificationSearch={notifSearch}
          onNotificationSearchChange={setNotifSearch}
        />
      </div>

      {/* Global layout with fixed left sidebar, main content, right notifications */}
      <div className="pl-20 pr-4 md:pr-6" style={{ height: 'calc(100vh - 80px)' }}>
        <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
          {/* Center/main area */}
          <section key={String(activeSection)} className="relative h-full rounded-xl border border-white/10 bg-black/20 overflow-hidden animate-section-in">
            {user.role !== 'admin' && activeSection === 'chat' && (
              <ChatInterface
                onSaveToHistory={(q,a,s)=> onSaveToHistory?.(q,a,s)}
                focusSignal={chatFocusTick}
                onUserTyping={setIsTyping}
              />
            )}
            {user.role !== 'admin' && activeSection === 'history' && (
              <div className="h-full overflow-y-auto">
                <HistoryPage history={history as any} />
              </div>
            )}
            {user.role !== 'admin' && activeSection === 'contact' && (
              <InlineContactAdmin />
            )}
            {user.role === 'admin' && (
              <div className="h-full overflow-y-auto">
                <AdminDashboard activeTab={activeSection as any} onTabChange={(t)=>setActiveSection(t as any)} initialTab="analytics" />
              </div>
            )}
          </section>

          {/* Right notifications panel */}
          <section ref={rightPanelRef} className="h-full rounded-xl border border-white/10 overflow-hidden">
            <NotificationsPanel
              items={(notifications as any) || []}
              searchTerm={notifSearch}
              onMarkAsRead={onMarkAsRead}
              onSearchChange={setNotifSearch}
              dimmed={isTyping}
            />
          </section>
        </div>
      </div>

      {/* Floating circular icon buttons (no sidebar container) */}
      <div className="fixed left-4 top-24 z-40">
        <nav className="flex flex-col items-center gap-3">
          {user.role !== 'admin' ? (
            <>
              <button
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${activeSection==='chat' ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                onClick={() => { setActiveSection('chat'); setChatFocusTick(v=>v+1); }}
                aria-label="Chat"
                title="Chat"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
              <button
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${activeSection==='history' ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                onClick={() => setActiveSection('history')}
                aria-label="History"
                title="History"
              >
                <History className="w-5 h-5" />
              </button>
              <button
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${activeSection==='contact' ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                onClick={() => setActiveSection('contact')}
                aria-label="Send Message to Admin"
                title="Send Message to Admin"
              >
                <Shield className="w-5 h-5" />
              </button>
            </>
          ) : (
            <>
              <button
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${activeSection==='analytics' ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                onClick={() => setActiveSection('analytics')}
                aria-label="Analytics"
                title="Analytics"
              >
                <BarChart3 className="w-5 h-5" />
              </button>
              <button
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${activeSection==='chat' ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                onClick={() => setActiveSection('chat')}
                aria-label="Ask HR Bot"
                title="Ask HR Bot"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
              {/* Clearly visible Contact Users entry */}
              <button
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${activeSection==='contact' ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                onClick={() => setActiveSection('contact')}
                aria-label="Contact Users"
                title="Contact Users"
              >
                <Send className="w-5 h-5" />
              </button>
              <button
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${activeSection==='documents' ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                onClick={() => setActiveSection('documents')}
                aria-label="Documents"
                title="Documents"
              >
                <FileText className="w-5 h-5" />
              </button>
              <button
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${activeSection==='users' ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                onClick={() => setActiveSection('users')}
                aria-label="Users"
                title="Users"
              >
                <Users className="w-5 h-5" />
              </button>
              <button
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${activeSection==='activity' ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
                onClick={() => setActiveSection('activity')}
                aria-label="History"
                title="History"
              >
                <Activity className="w-5 h-5" />
              </button>
              <button
                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${activeSection==='messages' ? 'bg-red-500/20 text-red-400 border-2 border-red-500/50' : 'text-slate-300 hover:text-red-400 hover:bg-red-500/10'}`}
                onClick={() => setActiveSection('messages')}
                aria-label="Delete Messages"
                title="Delete Messages"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}
        </nav>
      </div>

      

      <style>{`
        .shadow-3xl { box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
        @keyframes sectionIn { from { opacity: 0; transform: translateY(6px) scale(0.995); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .animate-section-in { animation: sectionIn 0.2s ease-out both; }
      `}</style>
    </div>
  );
}
