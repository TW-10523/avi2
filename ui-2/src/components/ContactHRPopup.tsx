import { X, AlertCircle } from 'lucide-react';
 
interface ContactHRPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}
 
export default function ContactHRPopup({
  isOpen,
  onClose,
  title = 'Contact HR',
  message = 'Please contact your HR department for assistance.'
}: ContactHRPopupProps) {
  if (!isOpen) return null;
 
  return (
      <div className="bg-slate-800 rounded-xl w-full max-w-md border border-white/20 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="font-semibold text-white text-lg">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
 
        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
            <p className="text-white text-center">
              {message}
            </p>
          </div>
 
          <div className="space-y-2 text-sm text-slate-300">
            <p className="font-medium">HR Contact Information:</p>
            <p>📧 Email: <span className="text-blue-400">hr@company.com</span></p>
            <p>📞 Phone: <span className="text-blue-400">+1 (XXX) XXX-XXXX</span></p>
            <p>🏢 Office: <span className="text-blue-400">HR Department - Building A</span></p>
          </div>
        </div>
      </div>
  );
}
 
 