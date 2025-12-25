import { User, Globe } from 'lucide-react';
import { User as UserType } from '../types';
import { useLang } from '../context/LanguageContext';

interface HeaderProps {
  user: UserType;
  onProfileClick: () => void;
  notifications?: any[];
  onMarkAsRead?: (item: any) => void;
  unreadCount?: number;
  onSendToAll?: (message: string) => void;
  notificationSearch?: string;
  onNotificationSearchChange?: (value: string) => void;
}

export default function Header({
  user,
  onProfileClick,
  notifications = [],
  onMarkAsRead,
  unreadCount = 0,
  onSendToAll,
  notificationSearch = '',
  onNotificationSearchChange,
}: HeaderProps) {
  const { lang, toggleLang } = useLang();

  return (
    <header className="w-full py-4 px-8 bg-black/20 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Left: Logo and Company Name */}
        <div className="flex items-center gap-3">
          <img
            src="/assets/logo.png"
            alt="Thirdwave Logo"
            className="h-10 w-auto object-contain"
          />
          <h1 className="text-4xl font-bold tracking-tight uppercase text-white drop-shadow-lg">
            Thirdwave
          </h1>
        </div>

        {/* Right: Language, Search (notifications scope), Profile */}
        <div className="flex items-center gap-4">
          
          {/* Language Toggle */}
          <button
            onClick={toggleLang}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors group relative"
            title={`Switch to ${lang === 'ja' ? 'English' : '日本語'}`}
          >
            <Globe className="w-6 h-6 text-slate-300 group-hover:text-white transition-colors" />
            <span className="absolute -bottom-2 -right-2 w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {lang === 'ja' ? 'JP' : 'EN'}
            </span>
          </button>

          {/* Notification search moved into Notifications panel header for alignment */}

          {/* Profile */}
          <button
            onClick={onProfileClick}
            className="flex items-center gap-3 px-4 py-2 hover:bg-white/10 rounded-lg transition-colors group"
          >
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-slate-400">{user.department}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
          </button>

        </div>
      </div>
    </header>
  );
}
