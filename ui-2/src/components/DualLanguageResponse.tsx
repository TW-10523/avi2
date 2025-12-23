/**
 * DualLanguageResponse Component
 * Displays responses in a 2-column layout:
 * Column 1: User's detected language
 * Column 2: Translation to other language
 * Includes page citations for RAG-based responses
 */

import React, { useState } from 'react';
import { Globe, Languages, Copy, FileText, Check } from 'lucide-react';

interface PageCitation {
  filename: string;
  page?: number;
  content?: string;
}

interface DualLanguageResponseProps {
  detectedLanguage: 'en' | 'ja';
  primaryText: string;
  secondaryText: string;
  isRAGBased?: boolean;
  citations?: PageCitation[];
  metadata?: {
    processingPath?: string;
    ragTriggered?: boolean;
    filesUsed?: number;
  };
}

export const DualLanguageResponse: React.FC<DualLanguageResponseProps> = ({
  detectedLanguage,
  primaryText,
  secondaryText,
  isRAGBased = false,
  citations = [],
  metadata,
}) => {
  const [activeTab, setActiveTab] = useState<'both' | 'primary' | 'secondary'>('both');
  const [copied, setCopied] = useState<'primary' | 'secondary' | null>(null);

  const primaryLang = detectedLanguage === 'ja' ? '日本語' : 'English';
  const secondaryLang = detectedLanguage === 'ja' ? 'English' : '日本語';

  const handleCopy = (text: string, type: 'primary' | 'secondary') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="w-full">
      {/* Metadata and control header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {metadata?.processingPath && (
            <span className="text-xs px-2 py-1 rounded-full bg-slate-700/50 text-slate-300">
              {metadata.processingPath === 'COMPANY' ? (
                <>
                  <span className="inline-block mr-1">🏢</span>
                  Company Query
                </>
              ) : (
                <>
                  <span className="inline-block mr-1">❓</span>
                  General Query
                </>
              )}
            </span>
          )}
          {metadata?.ragTriggered && (
            <span className="text-xs px-2 py-1 rounded-full bg-amber-900/30 border border-amber-500/30 text-amber-300">
              <FileText className="w-3 h-3 inline mr-1" />
              RAG Enabled
              {metadata.filesUsed && ` (${metadata.filesUsed} file${metadata.filesUsed > 1 ? 's' : ''})`}
            </span>
          )}
        </div>

        {/* Language tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
          <button
            onClick={() => setActiveTab('both')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              activeTab === 'both'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title="Show both languages"
          >
            <Languages className="w-3 h-3 inline mr-1" />
            Both
          </button>
          <button
            onClick={() => setActiveTab('primary')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              activeTab === 'primary'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title={`Show ${primaryLang} only`}
          >
            {primaryLang}
          </button>
          <button
            onClick={() => setActiveTab('secondary')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              activeTab === 'secondary'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
            title={`Show ${secondaryLang} only`}
          >
            {secondaryLang}
          </button>
        </div>
      </div>

      {/* Side-by-side content display */}
      {activeTab === 'both' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Primary column (user's detected language) */}
          <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-500/30">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-blue-500/20">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-blue-300">
                  {primaryLang}
                  <span className="text-xs text-blue-400 ml-2">(Detected)</span>
                </span>
              </div>
              <button
                onClick={() => handleCopy(primaryText, 'primary')}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Copy this language"
              >
                {copied === 'primary' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-100">
              {primaryText}
            </p>
          </div>

          {/* Secondary column (translation) */}
          <div className="p-4 rounded-lg bg-purple-900/20 border border-purple-500/30">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-purple-500/20">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-purple-300">
                  {secondaryLang}
                  <span className="text-xs text-purple-400 ml-2">(Translation)</span>
                </span>
              </div>
              <button
                onClick={() => handleCopy(secondaryText, 'secondary')}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Copy this language"
              >
                {copied === 'secondary' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-100">
              {secondaryText}
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/30">
          {activeTab === 'primary' ? (
            <>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700/30">
                <span className="text-sm font-semibold text-slate-300">{primaryLang}</span>
                <button
                  onClick={() => handleCopy(primaryText, 'primary')}
                  className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {copied === 'primary' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-100">
                {primaryText}
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700/30">
                <span className="text-sm font-semibold text-slate-300">{secondaryLang}</span>
                <button
                  onClick={() => handleCopy(secondaryText, 'secondary')}
                  className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {copied === 'secondary' ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-100">
                {secondaryText}
              </p>
            </>
          )}
        </div>
      )}

      {/* Page citations section for RAG responses */}
      {isRAGBased && citations && citations.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-amber-900/10 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-amber-300">Sources</span>
          </div>
          <div className="space-y-1">
            {citations.map((citation, idx) => (
              <div key={idx} className="text-xs text-amber-200/70">
                • <span className="text-amber-300">{citation.filename}</span>
                {citation.page && <span className="ml-1">(page {citation.page})</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DualLanguageResponse;
