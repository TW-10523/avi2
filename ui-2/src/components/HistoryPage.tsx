import { useState } from 'react';
import { Search, Clock, FileText, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { HistoryItem } from '../types';
import { useLang } from '../context/LanguageContext';

interface HistoryPageProps {
  history: HistoryItem[];
  onContactAdmin?: () => void;
}

export default function HistoryPage({ history, onContactAdmin }: HistoryPageProps) {
  const { t } = useLang();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredHistory = history.filter(
    (item) =>
      item.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return t('history.today');
    if (days === 1) return t('history.yesterday');
    if (days < 7) return `${days} ${t('history.daysAgo')}`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-white/10 bg-black/20">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('history.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Clock className="w-16 h-16 text-slate-600 mb-4" />
            <p className="text-xl text-slate-400 mb-2">
              {searchQuery ? t('history.noResults') : t('history.empty')}
            </p>
            <p className="text-sm text-slate-500">
              {searchQuery
                ? t('history.tryDifferent')
                : t('history.yourConversations')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredHistory.map((item) => {
              const isExpanded = expandedId === item.id;
              return (
                <div
                  key={item.id}
                  className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-all"
                >
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium mb-1 line-clamp-1">
                          {item.query}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{formatDate(item.timestamp)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            <span>{item.source.document}</span>
                          </div>
                          <span>Page {item.source.page}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 animate-slideDown">
                      <div className="pt-3 border-t border-white/10">
                        <div className="mb-2 flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          <span className="text-sm font-medium text-slate-300">
                            {t('chat.askQuestion')}
                          </span>
                        </div>
                        <p className="text-sm text-white pl-4">{item.query}</p>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span className="text-sm font-medium text-slate-300">
                            HR Bot {t('chat.send')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-200 pl-4 leading-relaxed">
                          {item.answer}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg text-xs text-slate-300 border border-white/10">
                        <FileText className="w-4 h-4" />
                        <span>
                          {t('history.source')}: {item.source.document} • {t('history.page')} {item.source.page}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 500px;
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
