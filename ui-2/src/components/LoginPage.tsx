import { useState } from 'react';
import { Lock, User, AlertCircle, Globe, Eye, EyeOff } from 'lucide-react';
import { User as UserType } from '../types';
import { useLang } from '../context/LanguageContext';
import { login } from '../api/auth';
import ContactHRPopup from './ContactHRPopup';

interface LoginPageProps {
  onLogin: (user: UserType) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { t, toggleLang, lang } = useLang();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // ✅ NEW
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError(t('login.pleaseLogin'));
      return;
    }

    setLoading(true);

    try {
      const response = await login({ userName: username, password });

      if (response.code === 200 && response.result?.token) {
        const isAdmin =
          username.toLowerCase() === 'admin' ||
          username.toLowerCase().includes('admin');

        onLogin({
          employeeId: username,
          name: username,
          department: 'General',
          role: isAdmin ? 'admin' : 'user',
          lastLogin: new Date().toISOString(),
        });
      } else {
        setError(response.message || t('login.invalidCredentials'));
      }
    } catch {
      setError(t('login.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="w-full py-4 px-8 bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/logo.png"
              alt="Thirdwave Logo"
              className="h-10 w-auto object-contain"
            />
            <h1 className="text-4xl font-bold tracking-tight uppercase text-white drop-shadow-lg">Thirdwave</h1>
          </div>
          <button
            onClick={toggleLang}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors relative"
            title={`Switch to ${lang === 'ja' ? 'English' : '日本語'}`}
          >
            <Globe className="w-6 h-6 text-slate-300 hover:text-white" />
            <span className="absolute -bottom-2 -right-2 w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {lang === 'ja' ? 'JP' : 'EN'}
            </span>
          </button>
        </div>
      </header>

      {/* Login Card */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <img
                  src="/assets/logo.png"
                  alt="Thirdwave Logo"
                  className="h-16 w-auto object-contain"
                />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">
                {t('login.welcome')}
              </h2>
              <p className="text-slate-300">{t('login.signIn')}</p>
            </div>

            {showForgotPassword ? (
              <div className="space-y-4">
                <ContactHRPopup
                  isOpen
                  onClose={() => setShowForgotPassword(false)}
                  title={t('login.forgotPasswordTitle')}
                  message={t('login.forgotPasswordMessage')}
                />

                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  {t('login.backToLogin')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-6">
                {error && (
                  <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <p className="text-sm text-red-200">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t('login.username')}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={t('login.username')}
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t('login.password')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'} // ✅ TOGGLE
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('login.password')}
                      className="w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    {/* 👁️ EYE ICON – ALWAYS VISIBLE */}
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    {t('login.forgotPassword')}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium rounded-lg"
                >
                  {loading ? t('common.loading') : t('login.signInButton')}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
