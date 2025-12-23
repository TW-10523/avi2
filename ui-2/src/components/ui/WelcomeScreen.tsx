/**
 * Welcome Screen - Onboarding and quick actions
 */
import { MessageSquare, FileText, Sparkles, ArrowRight, Upload } from 'lucide-react';

interface WelcomeScreenProps {
  userName?: string;
  documentCount?: number;
  onStartChat?: () => void;
  onUploadDocument?: () => void;
  onSelectSuggestion?: (suggestion: string) => void;
}

const SUGGESTED_QUESTIONS = [
  "What is my payment due date?",
  "What is the credit limit on my account?",
  "Summarize the key points from my documents",
  "What documents have I uploaded?",
];

export function WelcomeScreen({
  userName,
  documentCount = 0,
  onStartChat,
  onUploadDocument,
  onSelectSuggestion,
}: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      {/* Logo/Icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
          <MessageSquare className="w-10 h-10 text-white" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 border-4 border-slate-900 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
      </div>

      {/* Greeting */}
      <h1 className="text-2xl font-bold text-white mb-2">
        {userName ? `Welcome, ${userName}!` : 'Welcome to AI Assistant'}
      </h1>
      <p className="text-slate-400 max-w-md mb-8">
        I can help you find information in your documents, answer questions, and assist with various tasks.
      </p>

      {/* Stats */}
      <div className="flex items-center gap-6 mb-8">
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg">
          <FileText className="w-4 h-4 text-blue-400" />
          <span className="text-sm text-slate-300">
            <strong className="text-white">{documentCount}</strong> documents indexed
          </span>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 justify-center mb-10">
        <button
          onClick={onStartChat}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/25"
        >
          <MessageSquare className="w-4 h-4" />
          Start a conversation
          <ArrowRight className="w-4 h-4" />
        </button>
        
        <button
          onClick={onUploadDocument}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload document
        </button>
      </div>

      {/* Suggested questions */}
      <div className="w-full max-w-2xl">
        <h3 className="text-sm font-medium text-slate-500 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Try asking
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SUGGESTED_QUESTIONS.map((question, i) => (
            <button
              key={i}
              onClick={() => onSelectSuggestion?.(question)}
              className="text-left px-4 py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg text-sm text-slate-300 hover:text-white transition-all group"
            >
              <span className="flex items-center gap-2">
                {question}
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default WelcomeScreen;
