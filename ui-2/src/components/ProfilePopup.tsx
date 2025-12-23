import { useState } from 'react';
import { User, Building, Calendar, Key, LogOut, Shield } from 'lucide-react';
import { User as UserType } from '../types';
import { useLang } from '../context/LanguageContext';
import ContactHRPopup from './ContactHRPopup';
 
interface ProfilePopupProps {
  user: UserType;
  onLogout: () => void;
}
 
export default function ProfilePopup({ user, onLogout }: ProfilePopupProps) {
  const { t } = useLang();
  const [showContactHR, setShowContactHR] = useState(false);
 
  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <User className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">{user.name}</h2>
          <p className="text-slate-400">{user.department}</p>
          {user.role === 'admin' && (
            <div className="mt-2 px-3 py-1 bg-yellow-500/20 border border-yellow-400/30 rounded-full flex items-center gap-2">
              <Shield className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-yellow-300 font-medium">{t('profile.administrator', 'Administrator')}</span>
            </div>
          )}
        </div>
 
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">{t('profile.info', 'Profile Information')}</h3>
 
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-400">{t('profile.employeeId', 'Employee ID')}</p>
                <p className="text-white font-medium">{user.employeeId}</p>
              </div>
            </div>
 
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-400">{t('profile.department')}</p>
                <p className="text-white font-medium">{user.department}</p>
              </div>
            </div>
 
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-400">{t('profile.lastLogin', 'Last Login')}</p>
                <p className="text-white font-medium">
                  {new Date(user.lastLogin).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
 
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3">
          <h3 className="text-lg font-semibold text-white mb-4">{t('profile.actions', 'Account Actions')}</h3>
 
          <button
            onClick={() => setShowContactHR(true)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors group"
          >
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-orange-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-medium">{t('profile.changePassword', 'Change Password')}</p>
              <p className="text-xs text-slate-400">{t('profile.updatePassword', 'Update your account password')}</p>
            </div>
          </button>
 
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-400/30 rounded-lg transition-colors group"
          >
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <LogOut className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-white font-medium">{t('common.logout')}</p>
              <p className="text-xs text-slate-400">{t('profile.signOut', 'Sign out of your account')}</p>
            </div>
          </button>
        </div>
 
        <div className="text-center pt-4">
          <p className="text-xs text-slate-500">
            Thirdwave Digital Twin v1.0.0
          </p>
        </div>
      </div>
 
      {/* Centered popup with blurred background */}
      {showContactHR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Background overlay */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowContactHR(false)}
          ></div>
 
          {/* Popup box */}
          <div className="relative z-10">
            <ContactHRPopup
              isOpen={showContactHR}
              onClose={() => setShowContactHR(false)}
              title="Change Password"
              message="Please contact your HR department to change your password."
            />
          </div>
        </div>
      )}
    </div>
  );
}
 
 