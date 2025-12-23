import { MessageSquare, History, Shield, PhoneCall, Send } from 'lucide-react';
import { User, FeatureType } from '../types';
import { useLang } from '../context/LanguageContext';
import Header from './Header';

interface HomePageProps {
  user: User;
  onFeatureClick: (feature: FeatureType) => void;
  onProfileClick: () => void;
  notifications?: any[];
  onMarkAsRead?: (item: any) => void;
  unreadCount?: number;
  onContactAdminClick?: () => void;
  onSendToAll?: (message: string) => void;
}

interface Feature {
  id: FeatureType;
  title: string;
  icon: React.ReactNode;
  gradient: string;
  adminOnly?: boolean;
}

export default function HomePage({
  user,
  onFeatureClick,
  onProfileClick,
  notifications = [],
  onMarkAsRead,
  unreadCount = 0,
  onSendToAll,
}: HomePageProps) {
  const { t } = useLang();

  const features: Feature[] = [
    {
      id: 'chat',
      title: t('home.askHRBot'),
      icon: <MessageSquare className="w-12 h-12" />,
      gradient: 'from-blue-500 to-cyan-500',
    },
  ];

  // Only show history to users, not admins
  if (user.role === 'user') {
    features.push({
      id: 'history',
      title: t('home.history'),
      icon: <History className="w-12 h-12" />,
      gradient: 'from-orange-500 to-red-500',
    });
   
features.push({
  id: 'contact-admin',
  title: t('home.contactAdmin', 'Contact Admin'),
  icon: <PhoneCall className="w-12 h-12" />,
  gradient: 'from-green-600 to-emerald-500',
});

  }

  if (user.role === 'admin') {
    features.push({
      id: 'admin',
      title: t('home.admin'),
      icon: <Shield className="w-12 h-12" />,
      gradient: 'from-green-600 to-emerald-500',
      adminOnly: true,
    });
features.push({
  id: 'message',
  title: t('home.message'),
  icon: <Send className="w-12 h-12" />,
  gradient: 'from-purple-500 to-pink-500',
  adminOnly: true,
});

  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="h-20">
        <Header
          user={user}
          onProfileClick={onProfileClick}
          notifications={notifications}
          onMarkAsRead={onMarkAsRead}
          unreadCount={unreadCount}
          onSendToAll={onSendToAll}
        />
      </div>

      <div
        className="flex flex-col justify-center items-center px-6 text-center"
        style={{ height: 'calc(100vh - 80px)' }}
      >
        <h2 className="text-4xl font-bold text-white mb-4">
          {t('home.welcomeBack', 'Welcome')}, {user.name.split(' ')[0]}
        </h2>

        <p className="text-xl text-slate-300 mb-12">
          {t('home.whatToDo', 'What would you like to do today?')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 place-items-center max-w-4xl mx-auto">
          {features.map((feature) => (
            <button
              key={feature.id}
              onClick={() => onFeatureClick(feature.id)}
              className="feature-card group flex flex-col items-center"
            >
              <div
                className={`w-32 h-32 rounded-full bg-gradient-to-br ${feature.gradient}
                  flex items-center justify-center text-white shadow-2xl
                  transform transition-all duration-300
                  group-hover:scale-110 group-hover:shadow-3xl relative overflow-hidden`}
              >
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
                <div className="relative z-10 transform group-hover:scale-125 transition-transform duration-300">
                  {feature.icon}
                </div>
              </div>
              <p className="mt-4 text-lg font-medium text-white group-hover:text-blue-300 transition-colors">
                {feature.title}
              </p>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .feature-card {
          animation: fadeInUp 0.6s ease-out backwards;
        }
        .feature-card:nth-child(1) { animation-delay: 0.1s; }
        .feature-card:nth-child(2) { animation-delay: 0.2s; }
        .feature-card:nth-child(3) { animation-delay: 0.3s; }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .shadow-3xl {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </div>
  );
}
