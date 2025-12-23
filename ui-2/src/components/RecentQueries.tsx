/**
 * Recent Queries - Shows user's recent questions with quick access
 */
import { useState, useEffect } from 'react';
import { Clock, Search, ArrowRight, Trash2 } from 'lucide-react';

interface RecentQuery {
  id: string;
  query: string;
  timestamp: Date;
  hasAnswer: boolean;
}

interface RecentQueriesProps {
  onSelectQuery: (query: string) => void;
  maxItems?: number;
}

const STORAGE_KEY = 'recent_queries';

export default function RecentQueries({ onSelectQuery, maxItems = 5 }: RecentQueriesProps) {
  const [queries, setQueries] = useState<RecentQuery[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setQueries(parsed.map((q: any) => ({
          ...q,
          timestamp: new Date(q.timestamp),
        })));
      } catch (e) {
        console.error('Failed to parse recent queries:', e);
      }
    }
  }, []);

  const clearAll = () => {
    setQueries([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const removeQuery = (id: string) => {
    const updated = queries.filter(q => q.id !== id);
    setQueries(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (queries.length === 0) return null;

  const displayQueries = isExpanded ? queries : queries.slice(0, maxItems);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-white">Recent Queries</span>
          <span className="text-xs text-slate-500">({queries.length})</span>
        </div>
        <button
          onClick={clearAll}
          className="text-xs text-slate-500 hover:text-red-400 transition-colors"
        >
          Clear all
        </button>
      </div>

      <div className="space-y-2">
        {displayQueries.map((query) => (
          <div
            key={query.id}
            className="group flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            onClick={() => onSelectQuery(query.query)}
          >
            <Search className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span className="flex-1 text-sm text-slate-300 truncate">
              {query.query}
            </span>
            <span className="text-xs text-slate-500 flex-shrink-0">
              {formatTime(query.timestamp)}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeQuery(query.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>

      {queries.length > maxItems && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-2 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          {isExpanded ? 'Show less' : `Show ${queries.length - maxItems} more`}
        </button>
      )}
    </div>
  );
}

// Helper function to save a query
export function saveRecentQuery(query: string) {
  const stored = localStorage.getItem(STORAGE_KEY);
  let queries: RecentQuery[] = [];
  
  if (stored) {
    try {
      queries = JSON.parse(stored);
    } catch (e) {
      queries = [];
    }
  }

  // Remove duplicate if exists
  queries = queries.filter(q => q.query.toLowerCase() !== query.toLowerCase());

  // Add new query at the beginning
  queries.unshift({
    id: Date.now().toString(),
    query,
    timestamp: new Date(),
    hasAnswer: true,
  });

  // Keep only last 20 queries
  queries = queries.slice(0, 20);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(queries));
}
