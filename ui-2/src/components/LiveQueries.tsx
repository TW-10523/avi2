import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Clock, X, ChevronRight, RefreshCw } from 'lucide-react';
import { getLiveQueries } from '../api/task';

interface LiveQuery {
  id: number;
  query: string;
  category?: string;
  timestamp: string;
}

interface LiveQueriesProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuery: (query: string) => void;
}

export default function LiveQueries({ isOpen, onClose, onSelectQuery }: LiveQueriesProps) {
  const [queries, setQueries] = useState<LiveQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadLiveQueries();
    }
  }, [isOpen]);

  const loadLiveQueries = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getLiveQueries(10);
      if (response.code === 200 && response.result && Array.isArray(response.result)) {
        setQueries(response.result as LiveQuery[]);
      } else if (response.code === 200 && response.result?.rows) {
        setQueries(response.result.rows as LiveQuery[]);
      } else {
        setQueries([]);
        if (response.code !== 200) {
          setError('Failed to load live queries');
        }
      }
    } catch (err) {
      console.error('Failed to load live queries:', err);
      setQueries([]);
      setError('Failed to load live queries');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now.getTime() - time.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getCategoryColor = (category?: string) => {
    switch (category?.toLowerCase()) {
      case 'leave': return 'bg-green-500/20 text-green-300';
      case 'remote work': return 'bg-blue-500/20 text-blue-300';
      case 'benefits': return 'bg-purple-500/20 text-purple-300';
      case 'finance': return 'bg-yellow-500/20 text-yellow-300';
      default: return 'bg-slate-500/20 text-slate-300';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl w-full max-w-lg border border-white/20 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Live Queries</h3>
              <p className="text-sm text-slate-400">Popular questions from other users</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadLiveQueries}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Trending Badge */}
        <div className="px-5 py-3 bg-white/5 flex items-center gap-2 text-sm text-slate-300">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <span>Trending questions from the community</span>
        </div>

        {/* Query List */}
        <div className="max-h-96 overflow-y-auto p-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mb-3" />
              <p className="text-slate-400">Loading live queries...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-400">
              <p>{error}</p>
              <button onClick={loadLiveQueries} className="mt-2 text-blue-400 hover:underline">
                Try again
              </button>
            </div>
          ) : queries.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No live queries available</p>
            </div>
          ) : (
            <div className="space-y-2">
              {queries.map((query) => (
                <button
                  key={query.id}
                  onClick={() => {
                    onSelectQuery(query.query);
                    onClose();
                  }}
                  className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all text-left group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium mb-2 group-hover:text-blue-300 transition-colors">
                        {query.query}
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                        {query.category && (
                          <span className={`px-2 py-0.5 rounded-full ${getCategoryColor(query.category)}`}>
                            {query.category}
                          </span>
                        )}
                        <span className="text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(query.timestamp)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5">
          <p className="text-xs text-slate-500 text-center">
            Click any question to use it as your query
          </p>
        </div>
      </div>
    </div>
  );
}
