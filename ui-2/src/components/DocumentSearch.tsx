/**
 * Document Search - Search within uploaded documents
 */
import { useState, useEffect, useCallback } from 'react';
import { Search, FileText, X, Loader2, Filter, Calendar, SortAsc } from 'lucide-react';
import { getToken } from '../api/auth';

interface SearchResult {
  id: number;
  filename: string;
  content_preview?: string;
  size: number;
  created_at: string;
  relevance?: number;
}

interface DocumentSearchProps {
  onSelect?: (doc: SearchResult) => void;
  onClose?: () => void;
}

export default function DocumentSearch({ onSelect, onClose }: DocumentSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [allDocs, setAllDocs] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'name'>('relevance');
  const [filterType, setFilterType] = useState<string>('all');

  // Load all documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch('/dev-api/api/files?pageNum=1&pageSize=100', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const data = await response.json();
      const files = data.result?.rows || data.data || [];
      setAllDocs(files);
      setResults(files);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search with debounce
  const handleSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
    
    if (!searchQuery.trim()) {
      setResults(allDocs);
      return;
    }

    const lowerQuery = searchQuery.toLowerCase();
    const filtered = allDocs.filter(doc => 
      doc.filename.toLowerCase().includes(lowerQuery)
    ).map(doc => ({
      ...doc,
      relevance: calculateRelevance(doc.filename, lowerQuery),
    }));

    // Sort by relevance
    filtered.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));
    setResults(filtered);
  }, [allDocs]);

  const calculateRelevance = (filename: string, query: string): number => {
    const lower = filename.toLowerCase();
    if (lower === query) return 100;
    if (lower.startsWith(query)) return 80;
    if (lower.includes(query)) return 60;
    return 40;
  };

  // Sort results
  const sortedResults = [...results].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'name':
        return a.filename.localeCompare(b.filename);
      default:
        return (b.relevance || 0) - (a.relevance || 0);
    }
  });

  // Filter by type
  const filteredResults = filterType === 'all' 
    ? sortedResults 
    : sortedResults.filter(doc => {
        const ext = doc.filename.split('.').pop()?.toLowerCase();
        return ext === filterType;
      });

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const colors: Record<string, string> = {
      pdf: 'text-red-400',
      doc: 'text-blue-400',
      docx: 'text-blue-400',
      txt: 'text-slate-400',
      xlsx: 'text-green-400',
      csv: 'text-green-400',
    };
    return colors[ext || ''] || 'text-purple-400';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-w-2xl w-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
            {query && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-300"
            >
              <option value="all">All Types</option>
              <option value="pdf">PDF</option>
              <option value="doc">DOC</option>
              <option value="docx">DOCX</option>
              <option value="txt">TXT</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <SortAsc className="w-4 h-4 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-300"
            >
              <option value="relevance">Relevance</option>
              <option value="date">Date</option>
              <option value="name">Name</option>
            </select>
          </div>
          <span className="text-xs text-slate-500 ml-auto">
            {filteredResults.length} document{filteredResults.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Results */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No documents found</p>
            {query && (
              <p className="text-slate-500 text-sm mt-1">Try a different search term</p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {filteredResults.map((doc) => (
              <button
                key={doc.id}
                onClick={() => onSelect?.(doc)}
                className="w-full flex items-center gap-3 p-4 hover:bg-slate-800/50 transition-colors text-left"
              >
                <FileText className={`w-8 h-8 ${getFileIcon(doc.filename)} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{doc.filename}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    <span>{formatSize(doc.size)}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(doc.created_at)}
                    </span>
                    {doc.relevance && query && (
                      <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                        {doc.relevance}% match
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-700 bg-slate-800/50">
        <p className="text-xs text-slate-500 text-center">
          Press <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">↵</kbd> to select • 
          <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400 ml-1">ESC</kbd> to close
        </p>
      </div>
    </div>
  );
}
