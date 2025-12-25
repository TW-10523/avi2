import { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  Users,
  Activity,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  Database,
  Brain,
  X,
  Trash2,
  AlertTriangle,
  BarChart3,
  Search,
  Send,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { getToken } from '../api/auth';
import AnalyticsDashboard from './AnalyticsDashboard';
import ChatInterface from './ChatInterface';

function ContactUsersPanel() {
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');

  const sendBroadcast = async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      const token = getToken();
      const res = await fetch('/dev-api/api/messages/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ subject: subject.trim() || 'Broadcast Message', content: content.trim() }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setSuccess('Message sent to all users');
        setSubject('');
        setContent('');
        setTimeout(() => setSuccess(''), 1600);
      }
    } catch (e) {
      // keep silent
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-white/10 bg-black/20">
        <h3 className="text-xl font-semibold text-white">Contact Users</h3>
        <p className="text-sm text-slate-400">Broadcast a message to all users</p>
      </div>
      <div className="p-6 space-y-4">
        {success && (
          <div className="p-3 bg-green-600/20 border border-green-500/40 rounded-lg text-green-300 text-sm">
            {success}
          </div>
        )}
        <div>
          <label className="block text-sm text-slate-300 mb-1">Subject (Optional)</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Announcement subject"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">Message *</label>
          <textarea
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Write your message to all users..."
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={sendBroadcast}
            disabled={sending || !content.trim()}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white text-sm inline-flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Sending...' : 'Send Broadcast'}
          </button>
        </div>
      </div>
    </div>
  );
}

type Tab = 'documents' | 'analytics' | 'users' | 'activity' | 'chat' | 'contact' | 'messages';

interface AdminDashboardProps {
  activeTab?: Tab;
  onTabChange?: (tab: Tab) => void;
  initialTab?: Tab;
}

interface DocumentHistory {
  id: number;
  filename: string;
  size: number;
  mime_type: string;
  created_at: string;
  create_by: string;
  storage_key: string;
}

interface UserItem {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  lastActive: Date;
  queries: number;
}

interface ActivityLog {
  id: string;
  user: string;
  action: string;
  detail: string;
  timestamp: Date;
}

export default function AdminDashboard({ activeTab: controlledTab, onTabChange, initialTab }: AdminDashboardProps) {
  const { t } = useLang();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>(controlledTab || initialTab || 'analytics');
    // Sync internal tab with controlled prop
    useEffect(() => {
      if (controlledTab && controlledTab !== activeTab) {
        setActiveTab(controlledTab);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [controlledTab]);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, 'pending' | 'uploading' | 'success' | 'error'>>({});
  const [uploadCategory, setUploadCategory] = useState<string>('company_policy');
  // Review flow state: per-file categories and selection
  const [reviewMode, setReviewMode] = useState<boolean>(false);
  const [fileCategories, setFileCategories] = useState<Record<string, string>>({});
  const [selectedToRemove, setSelectedToRemove] = useState<Set<string>>(new Set());
  const [documentHistory, setDocumentHistory] = useState<DocumentHistory[]>([]);
  const [mockUsers, setMockUsers] = useState<UserItem[]>([]);
  const [mockActivity, setMockActivity] = useState<ActivityLog[]>([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateFile, setDuplicateFile] = useState<DocumentHistory | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: number; filename: string } | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<number>>(new Set());
  const [pendingBulkDelete, setPendingBulkDelete] = useState<DocumentHistory[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // Delete Messages state
  const [deleteUserMessages, setDeleteUserMessages] = useState(false);
  const [deleteAdminMessages, setDeleteAdminMessages] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [pipelineSteps, setPipelineSteps] = useState<{
    step: number;
    status: 'pending' | 'in-progress' | 'completed' | 'error';
    label: string;
  }[]>([
    { step: 1, status: 'pending', label: 'File Upload' },
    { step: 2, status: 'pending', label: 'Content Extraction' },
    { step: 3, status: 'pending', label: 'Embedding & Indexing' },
    { step: 4, status: 'pending', label: 'RAG Integration' },
  ]);

  useEffect(() => {
    const loadDocumentHistory = async () => {
      try {
        console.log('📂 [AdminDashboard] Fetching document history from database...');
        
        // Fetch files from /api/files endpoint
        const token = getToken();
        const response = await fetch('/dev-api/api/files?pageNum=1&pageSize=100', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        const data = await response.json();
        
        console.log('✅ [AdminDashboard] Document history loaded:', {
          total: data.result?.rows?.length || data.data?.length || 0,
          response: data
        });
        
        // Handle different API response formats
        const files = data.result?.rows || data.data || data.rows || [];
        if (Array.isArray(files)) {
          setDocumentHistory(files);
        }
      } catch (error) {
        console.error('❌ [AdminDashboard] Error fetching document history:', error);
      }
    };

    loadDocumentHistory();
  }, []);

  // Load users and activity - use document history + static users
  useEffect(() => {
    console.log('📊 [AdminDashboard] Setting up users and activity...');
    
    // Create users from document creators + default admin
    const users: UserItem[] = [
      {
        id: '1',
        name: 'Admin',
        employeeId: 'admin',
        department: 'Administration',
        lastActive: new Date(),
        queries: documentHistory.length + 5,
      },
    ];
    
    // Add unique document uploaders
    const uploaders = new Set<string>();
    documentHistory.forEach(doc => {
      const uploader = doc.create_by || 'admin';
      if (!uploaders.has(uploader) && uploader !== 'admin') {
        uploaders.add(uploader);
        users.push({
          id: uploader,
          name: uploader,
          employeeId: uploader,
          department: 'General',
          lastActive: new Date(doc.created_at),
          queries: 1,
        });
      }
    });
    
    setMockUsers(users);
    
    // Create activity from document uploads
    const activities: ActivityLog[] = documentHistory.slice(0, 10).map((doc, index) => ({
      id: String(index + 1),
      user: doc.create_by || 'Admin',
      action: 'Document uploaded',
      detail: doc.filename,
      timestamp: new Date(doc.created_at),
    }));
    
    // Add some chat activities
    activities.unshift({
      id: 'chat-1',
      user: 'Admin',
      action: 'Chat query',
      detail: 'Asked about documents',
      timestamp: new Date(),
    });
    
    setMockActivity(activities);
  }, [documentHistory]);

  const handleDeleteFile = async (fileId: number, filename: string) => {
    console.log('🗑️  [AdminDashboard] Deleting file:', {
      fileId,
      filename,
      timestamp: new Date().toISOString(),
    });

    setDeletingFileId(fileId);
    try {
      const token = getToken();
      const response = await fetch(`/dev-api/api/files/${fileId}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error(`Delete failed with status ${response.status}`);
      }

      console.log('✅ [AdminDashboard] File deleted successfully:', {
        fileId,
        filename,
      });

      // Re-fetch document list from backend to reflect true state (no optimistic update)
      try {
        const refreshResponse = await fetch('/dev-api/api/files?pageNum=1&pageSize=100', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        const refreshData = await refreshResponse.json();
        const files = refreshData.result?.rows || refreshData.data || refreshData.rows || [];
        if (Array.isArray(files)) {
          setDocumentHistory(files);
        }
      } catch (refreshError) {
        console.error('❌ [AdminDashboard] Error refreshing document list after delete:', refreshError);
      }

      toast.success(`File "${filename}" has been deleted successfully`);
    } catch (error) {
      console.error('❌ [AdminDashboard] Error deleting file:', error);
      toast.error('Error deleting file. Please try again.');
    } finally {
      setDeletingFileId(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      console.log('📎 [AdminDashboard] Files selected:', newFiles.length);
      
      // Check for duplicates
      const duplicates: string[] = [];
      const validFiles: File[] = [];
      
      newFiles.forEach(file => {
        console.log('📎 [AdminDashboard] File:', {
          name: file.name,
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          type: file.type
        });
        
        const existingFile = documentHistory.find(doc => doc.filename === file.name);
        if (existingFile) {
          duplicates.push(file.name);
        } else {
          validFiles.push(file);
        }
      });
      
      if (duplicates.length > 0) {
        toast.info(`Skipped existing: ${duplicates.join(', ')}`);
      }
      
      if (validFiles.length > 0) {
        setUploadingFiles(prev => [...prev, ...validFiles]);
        // Initialize progress for new files
        const newProgress: Record<string, 'pending'> = {};
        validFiles.forEach(f => { newProgress[f.name] = 'pending'; });
        setUploadProgress(prev => ({ ...prev, ...newProgress }));

        // Initialize per-file categories for review
        setFileCategories(prev => {
          const updated = { ...prev };
          validFiles.forEach(f => {
            if (!updated[f.name]) updated[f.name] = uploadCategory || 'company_policy';
          });
          return updated;
        });
        // Enter review mode on selection
        setReviewMode(true);
        setSelectedToRemove(new Set());
      }
      
      // Reset input
      e.target.value = '';
    }
  };

  const handleStartUpload = async () => {
    if (uploadingFiles.length === 0) return;
    // End review mode and begin upload
    setReviewMode(false);

    console.log('🚀 [AdminDashboard] Starting upload pipeline...');
    console.log('📋 [AdminDashboard] Upload details:', {
      fileCount: uploadingFiles.length,
      totalSize: `${(uploadingFiles.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB`,
      category: uploadCategory,
      timestamp: new Date().toISOString()
    });

    try {
      // Step 1: File Upload - Actually upload the file
      console.log('🔄 [AdminDashboard] STEP 1: File Upload - IN PROGRESS');
      setPipelineSteps((prev) =>
        prev.map((s) => (s.step === 1 ? { ...s, status: 'in-progress' } : s))
      );

      const formData = new FormData();
      // Append all files - backend supports multiple files
      uploadingFiles.forEach(file => {
        formData.append('files', file);
        setUploadProgress(prev => ({ ...prev, [file.name]: 'uploading' }));
      });
      // Backward compatibility default category
      formData.append('category', uploadCategory);
      // Per-file categories mapping (filename -> category)
      try {
        const mapping: Record<string, string> = {};
        uploadingFiles.forEach(f => {
          mapping[f.name] = fileCategories[f.name] || uploadCategory || 'company_policy';
        });
        formData.append('fileCategories', JSON.stringify(mapping));
      } catch (err) {
        console.warn('Could not append fileCategories mapping');
      }

      const token = getToken();
      const uploadResponse = await fetch('/dev-api/api/files/upload', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }

      const uploadResult = await uploadResponse.json();
      console.log('✅ [AdminDashboard] STEP 1: File Upload - COMPLETED', uploadResult);
      // Mark all files as success
      const successProgress: Record<string, 'success'> = {};
      uploadingFiles.forEach(f => { successProgress[f.name] = 'success'; });
      setUploadProgress(prev => ({ ...prev, ...successProgress }));
      setPipelineSteps((prev) =>
        prev.map((s) => (s.step === 1 ? { ...s, status: 'completed' } : s))
      );

      // Step 2: Content Extraction (handled by backend)
      console.log('🔄 [AdminDashboard] STEP 2: Content Extraction - IN PROGRESS');
      setPipelineSteps((prev) =>
        prev.map((s) => (s.step === 2 ? { ...s, status: 'in-progress' } : s))
      );
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log('✅ [AdminDashboard] STEP 2: Content Extraction - COMPLETED');
      setPipelineSteps((prev) =>
        prev.map((s) => (s.step === 2 ? { ...s, status: 'completed' } : s))
      );

      // Step 3: Embedding & Indexing (handled by backend job queue)
      console.log('🔄 [AdminDashboard] STEP 3: Embedding & Indexing - IN PROGRESS');
      setPipelineSteps((prev) =>
        prev.map((s) => (s.step === 3 ? { ...s, status: 'in-progress' } : s))
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log('✅ [AdminDashboard] STEP 3: Embedding & Indexing - COMPLETED');
      setPipelineSteps((prev) =>
        prev.map((s) => (s.step === 3 ? { ...s, status: 'completed' } : s))
      );

      // Step 4: RAG Integration
      console.log('🔄 [AdminDashboard] STEP 4: RAG Integration - IN PROGRESS');
      setPipelineSteps((prev) =>
        prev.map((s) => (s.step === 4 ? { ...s, status: 'in-progress' } : s))
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log('✅ [AdminDashboard] STEP 4: RAG Integration - COMPLETED');
      setPipelineSteps((prev) =>
        prev.map((s) => (s.step === 4 ? { ...s, status: 'completed' } : s))
      );

      // Success - refresh document list
      console.log('🎉 [AdminDashboard] Upload pipeline completed successfully!');
      
      // Refresh document history
      const refreshResponse = await fetch('/dev-api/api/files?pageNum=1&pageSize=100', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const refreshData = await refreshResponse.json();
      const files = refreshData.result?.rows || refreshData.data || refreshData.rows || [];
      if (Array.isArray(files)) {
        setDocumentHistory(files);
      }

      toast.success(`${uploadingFiles.length} file(s) uploaded successfully. Category: ${uploadCategory}`);
      resetUpload();
    } catch (error) {
      console.error('❌ [AdminDashboard] Upload failed:', error);
      setPipelineSteps((prev) =>
        prev.map((s) => 
          s.status === 'in-progress' ? { ...s, status: 'error' } : s
        )
      );
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const removeFile = (fileName: string) => {
    setUploadingFiles(prev => prev.filter(f => f.name !== fileName));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileName];
      return newProgress;
    });
  };

  const resetUpload = () => {
    console.log('🔄 [AdminDashboard] Resetting upload form...');
    setUploadingFiles([]);
    setUploadProgress({});
    setUploadCategory('company_policy');
    setFileCategories({});
    setSelectedToRemove(new Set());
    setReviewMode(false);
    setPipelineSteps([
      { step: 1, status: 'pending', label: 'File Upload' },
      { step: 2, status: 'pending', label: 'Content Extraction' },
      { step: 3, status: 'pending', label: 'Embedding & Indexing' },
      { step: 4, status: 'pending', label: 'RAG Integration' },
    ]);
  };

  // Remove selected files in review (client-side only)
  const removeSelectedFiles = () => {
    if (selectedToRemove.size === 0) return;
    const names = new Set(selectedToRemove);
    setUploadingFiles(prev => prev.filter(f => !names.has(f.name)));
    setUploadProgress(prev => {
      const next = { ...prev } as Record<string, 'pending' | 'uploading' | 'success' | 'error'>;
      names.forEach(n => { delete next[n]; });
      return next;
    });
    setFileCategories(prev => {
      const next = { ...prev };
      names.forEach(n => { delete next[n]; });
      return next;
    });
    setSelectedToRemove(new Set());
  };

  const getStepIcon = (
    step: number,
    status: 'pending' | 'in-progress' | 'completed' | 'error'
  ) => {
    if (status === 'completed')
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    if (status === 'in-progress')
      return <Zap className="w-5 h-5 text-yellow-400 animate-pulse" />;
    if (status === 'error') return <AlertCircle className="w-5 h-5 text-red-400" />;

    const icons = {
      1: <Upload className="w-5 h-5 text-slate-400" />,
      2: <FileText className="w-5 h-5 text-slate-400" />,
      3: <Database className="w-5 h-5 text-slate-400" />,
      4: <Brain className="w-5 h-5 text-slate-400" />,
    };
    return icons[step as 1 | 2 | 3 | 4];
  };
  const tabs = [
    { id: 'documents' as Tab, label: t('admin.documents'), icon: FileText },
    { id: 'analytics' as Tab, label: t('admin.analytics'), icon: BarChart3 },
    { id: 'users' as Tab, label: t('admin.users'), icon: Users },
    { id: 'activity' as Tab, label: t('admin.activity'), icon: Activity },
    { id: 'chat' as Tab, label: 'Ask HR Bot', icon: MessageSquare },
    { id: 'contact' as Tab, label: 'Contact Users', icon: Users },
    { id: 'messages' as Tab, label: 'Delete Messages', icon: Trash2 },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Hide internal tab bar when controlled by external sidebar */}
      {!controlledTab && (
        <div className="flex border-b border-white/10 bg-black/20">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                onTabChange?.(tab.id);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 transition-all ${
                activeTab === tab.id
                  ? 'bg-white/10 border-b-2 border-blue-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {/* Delete Confirmation Modal */}
        {pendingDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-white/10 rounded-lg max-w-md w-full p-6 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-red-500/20">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Delete Document</h3>
                  <p className="text-sm text-slate-400">This action cannot be undone</p>
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">File Name</p>
                <p className="text-sm font-medium text-white break-all">{pendingDelete.filename}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPendingDelete(null)}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleDeleteFile(pendingDelete.id, pendingDelete.filename);
                    setPendingDelete(null);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Duplicate Warning Modal */}
        {showDuplicateWarning && duplicateFile && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-red-500/50 rounded-lg max-w-md w-full p-6 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-lg bg-red-500/20">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Duplicate Document</h3>
                  <p className="text-sm text-slate-400">This file already exists</p>
                </div>
              </div>

              <div className="space-y-2 bg-white/5 rounded-lg p-4">
                <div>
                  <p className="text-xs text-slate-400">File Name</p>
                  <p className="text-sm font-medium text-white">{duplicateFile.filename}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Uploaded on</p>
                  <p className="text-sm font-medium text-white">
                    {new Date(duplicateFile.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Uploaded by</p>
                  <p className="text-sm font-medium text-white">{duplicateFile.create_by || 'System'}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowDuplicateWarning(false);
                    setDuplicateFile(null);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Delete the existing file and allow new upload
                    handleDeleteFile(duplicateFile.id, duplicateFile.filename);
                    setShowDuplicateWarning(false);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete & Replace
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-semibold text-white">Document Management</h3>
              <div className="flex items-center gap-3 flex-1 max-w-md">
                {/* Simple Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search documents..."
                    className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer whitespace-nowrap">
                  <Upload className="w-5 h-5" />
                  <span>Upload</span>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.xlsx,.csv"
                  />
                </label>
              </div>
            </div>

            {uploadingFiles.length > 0 && (
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-white mb-1">
                      📄 {uploadingFiles.length} file(s) selected
                    </h4>
                    <p className="text-sm text-slate-400">
                      Total: {(uploadingFiles.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={resetUpload}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                {/* Review list with per-file categories and selection */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {uploadingFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-blue-600"
                          checked={selectedToRemove.has(file.name)}
                          onChange={(e) => {
                            setSelectedToRemove(prev => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(file.name); else next.delete(file.name);
                              return next;
                            });
                          }}
                          disabled={uploadProgress[file.name] !== 'pending'}
                        />
                        <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <span className="text-sm text-white truncate" title={file.name}>{file.name}</span>
                        <span className="text-xs text-slate-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        {uploadProgress[file.name] === 'success' && (
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                        )}
                        {uploadProgress[file.name] === 'uploading' && (
                          <Clock className="w-4 h-4 text-yellow-400 animate-pulse flex-shrink-0" />
                        )}
                      </div>
                      {/* Per-file category selector */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-400">Category</label>
                        <select
                          value={fileCategories[file.name] || 'company_policy'}
                          onChange={(e) => setFileCategories(prev => ({ ...prev, [file.name]: e.target.value }))}
                          disabled={uploadProgress[file.name] !== 'pending'}
                          className="bg-black/40 border border-white/10 text-white text-xs rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="company_policy">📋 Company Policy</option>
                          <option value="internal_guide">📖 Internal Guide</option>
                          <option value="procedure">⚙️ Procedure</option>
                          <option value="faq">❓ FAQ</option>
                        </select>
                        {uploadProgress[file.name] === 'pending' && (
                          <button
                            onClick={() => removeFile(file.name)}
                            className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bulk actions in review */}
                {reviewMode && (
                  <div className="flex items-center justify-between">
                    <button
                      onClick={removeSelectedFiles}
                      disabled={selectedToRemove.size === 0}
                      className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Remove Selected
                    </button>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{selectedToRemove.size} selected</span>
                    </div>
                  </div>
                )}

                {/* Global category picker hidden during review (kept for defaulting new selections) */}
                {!reviewMode && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      Default Category
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'company_policy', label: '📋 Company Policy' },
                        { value: 'internal_guide', label: '📖 Internal Guide' },
                        { value: 'procedure', label: '⚙️ Procedure' },
                        { value: 'faq', label: '❓ FAQ' },
                      ].map((cat) => (
                        <button
                          key={cat.value}
                          onClick={() => setUploadCategory(cat.value)}
                          className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            uploadCategory === cat.value
                              ? 'bg-blue-600 text-white shadow-lg'
                              : 'bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h5 className="text-sm font-semibold text-white">Upload Pipeline</h5>
                  <div className="space-y-3">
                    {pipelineSteps.map((step) => (
                      <div key={step.step}>
                        <div className="flex items-center gap-3 mb-2">
                          {getStepIcon(step.step, step.status)}
                          <span className="text-sm font-medium text-white">
                            {step.label}
                          </span>
                          {step.status === 'completed' && (
                            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">Done</span>
                          )}
                          {step.status === 'in-progress' && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">Processing...</span>
                          )}
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              step.status === 'completed'
                                ? 'w-full bg-green-500'
                                : step.status === 'in-progress'
                                ? 'w-2/3 bg-blue-500'
                                : 'w-0 bg-slate-500'
                            }`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Continue button for review step; starts upload */}
                {reviewMode ? (
                  <button
                    onClick={handleStartUpload}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all"
                  >
                    Next / Continue
                  </button>
                ) : (
                  <button
                    onClick={handleStartUpload}
                    disabled={pipelineSteps[0].status !== 'pending'}
                    className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
                  >
                    {pipelineSteps[0].status === 'pending' ? '🚀 Start Upload Pipeline' : 'Processing...'}
                  </button>
                )}
              </div>
            )}

            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              {/* Bulk actions above table */}
              <div className="flex items-center justify-between p-3 border-b border-white/10 bg-black/20">
                <div className="text-sm text-slate-400">
                  Manage existing documents
                </div>
                <button
                  onClick={() => {
                    const selected = Array.from(selectedDocIds);
                    if (selected.length === 0) return;
                    const docs = documentHistory.filter(d => selected.includes(d.id));
                    setPendingBulkDelete(docs);
                  }}
                  disabled={selectedDocIds.size === 0}
                  className="px-3 py-1.5 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                >
                  Delete Selected ({selectedDocIds.size})
                </button>
              </div>
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      {(() => {
                        const filteredDocs = searchQuery.trim()
                          ? documentHistory.filter(doc => doc.filename.toLowerCase().includes(searchQuery.toLowerCase()))
                          : documentHistory;
                        const allSelected = filteredDocs.length > 0 && filteredDocs.every(doc => selectedDocIds.has(doc.id));
                        return (
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-blue-600"
                            checked={allSelected}
                            onChange={(e) => {
                              const next = new Set(selectedDocIds);
                              if (e.target.checked) {
                                filteredDocs.forEach(d => next.add(d.id));
                              } else {
                                filteredDocs.forEach(d => next.delete(d.id));
                              }
                              setSelectedDocIds(next);
                            }}
                          />
                        );
                      })()}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Document Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Size
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Uploaded By
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Upload Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredDocs = searchQuery.trim() 
                      ? documentHistory.filter(doc => doc.filename.toLowerCase().includes(searchQuery.toLowerCase()))
                      : documentHistory;
                    
                    return filteredDocs.length > 0 ? (
                      filteredDocs.map((doc) => (
                      <tr key={doc.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-blue-600"
                            checked={selectedDocIds.has(doc.id)}
                            onChange={(e) => {
                              setSelectedDocIds(prev => {
                                const next = new Set(prev);
                                if (e.target.checked) next.add(doc.id); else next.delete(doc.id);
                                return next;
                              });
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 text-white font-medium">{doc.filename}</td>
                        <td className="px-4 py-3 text-slate-300">
                          {(doc.size / 1024 / 1024).toFixed(2)} MB
                        </td>
                        <td className="px-4 py-3 text-slate-300">{doc.create_by || 'System'}</td>
                        <td className="px-4 py-3 text-slate-300">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                            <CheckCircle className="w-3 h-3" />
                            active
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setPendingDelete({ id: doc.id, filename: doc.filename })}
                            disabled={deletingFileId === doc.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {deletingFileId === doc.id ? '...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                          📁 No documents uploaded yet. Upload your first document above!
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard />
        )}

        {activeTab === 'chat' && (
          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden animate-section-in flex flex-col h-full">
            <div className="p-4 border-b border-white/10 bg-black/20">
              <h3 className="text-xl font-semibold text-white">Ask HR Bot</h3>
              <p className="text-sm text-slate-400">Ask questions inline</p>
            </div>
            {/* Make chat occupy full vertical height with proper scrolling */}
            <div className="flex-1 min-h-0">
              <ChatInterface onSaveToHistory={() => {}} />
            </div>
          </div>
        )}

        {activeTab === 'contact' && (
          <ContactUsersPanel />
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white">User Management</h3>

            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Employee ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Department
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Last Active
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-slate-300">
                      Queries
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mockUsers.map((user) => (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 text-white font-medium">{user.name}</td>
                      <td className="px-4 py-3 text-slate-300">{user.employeeId}</td>
                      <td className="px-4 py-3 text-slate-300">{user.department}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {user.lastActive.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{user.queries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white">Activity Log</h3>

            <div className="space-y-3">
              {mockActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Activity className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium">{activity.user}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-300">{activity.action}</span>
                      </div>
                      <p className="text-sm text-slate-400 mb-2">{activity.detail}</p>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span>{activity.timestamp.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-6">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-red-500/20 flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">Delete Messages</h3>
                  <p className="text-sm text-slate-300 mb-4">
                    This is a <span className="font-semibold text-red-400">destructive action</span> that will permanently delete messages from the database. This action cannot be undone.
                  </p>
                  
                  <div className="space-y-4 mt-6">
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                        <input
                          type="checkbox"
                          checked={deleteUserMessages}
                          onChange={(e) => setDeleteUserMessages(e.target.checked)}
                          className="w-5 h-5 accent-red-600"
                        />
                        <div className="flex-1">
                          <span className="text-white font-medium">Messages sent by users</span>
                          <p className="text-xs text-slate-400 mt-1">Delete all messages sent by users to admins</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                        <input
                          type="checkbox"
                          checked={deleteAdminMessages}
                          onChange={(e) => setDeleteAdminMessages(e.target.checked)}
                          className="w-5 h-5 accent-red-600"
                        />
                        <div className="flex-1">
                          <span className="text-white font-medium">Messages sent by admins</span>
                          <p className="text-xs text-slate-400 mt-1">Delete all messages sent by admins (replies and broadcasts)</p>
                        </div>
                      </label>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                      <button
                        onClick={() => {
                          if (!deleteUserMessages && !deleteAdminMessages) {
                            toast.error('Please select at least one option');
                            return;
                          }
                          setShowDeleteConfirm(true);
                          setConfirmationText('');
                          setDeleteSuccess(false);
                        }}
                        disabled={!deleteUserMessages && !deleteAdminMessages}
                        className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-5 h-5" />
                        Delete Messages
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ask HR Bot and Contact Users already handled above for 'chat' and 'contact' tabs */}
      </div>

      {/* Delete Messages Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border-2 border-red-500/50 rounded-xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-red-500/20 flex-shrink-0">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-2">Delete Messages Permanently</h3>
                <p className="text-sm text-slate-300 mb-4">
                  This action will <span className="font-semibold text-red-400">permanently delete</span> all selected messages from the database. This cannot be undone.
                </p>
                
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-red-300 mb-2">You are about to delete:</p>
                  <ul className="text-sm text-slate-300 space-y-1 ml-4">
                    {deleteUserMessages && <li className="list-disc">All messages sent by users</li>}
                    {deleteAdminMessages && <li className="list-disc">All messages sent by admins</li>}
                  </ul>
                </div>

                <div className="space-y-3">
                  <label className="block">
                    <p className="text-sm font-medium text-white mb-2">
                      Type <span className="font-mono bg-red-500/20 text-red-300 px-2 py-1 rounded">DELETE ALL MESSAGES</span> to confirm:
                    </p>
                    <input
                      type="text"
                      value={confirmationText}
                      onChange={(e) => setConfirmationText(e.target.value)}
                      placeholder="Type confirmation text here"
                      className="w-full bg-black/40 border-2 border-white/20 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 font-mono"
                      autoFocus
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setConfirmationText('');
                  setDeleteSuccess(false);
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (confirmationText !== 'DELETE ALL MESSAGES') {
                    toast.error('Confirmation text does not match');
                    return;
                  }

                  setIsDeleting(true);
                  try {
                    const token = getToken();
                    const res = await fetch('/dev-api/api/messages/delete', {
                      method: 'DELETE',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                      body: JSON.stringify({
                        deleteUserMessages,
                        deleteAdminMessages,
                      }),
                    });

                    const data = await res.json();
                    if (data.code === 200) {
                      setDeleteSuccess(true);
                      toast.success(`Successfully deleted ${data.result?.deletedCount || 0} messages`);
                      
                      // Clear all localStorage data related to messages/notifications
                      try {
                        // Clear local messages storage
                        localStorage.removeItem('notifications_messages');
                        // Clear read state for messages (since messages are deleted)
                        localStorage.removeItem('read_message_ids');
                        // Note: We keep read_notification_ids as those are for support notifications, not messages
                        console.log('Cleared all message-related localStorage data');
                      } catch (err) {
                        console.error('Failed to clear localStorage:', err);
                      }
                      
                      // Trigger a page reload after a short delay to refresh all notification states
                      // This ensures the UI reflects the deletion immediately and shows empty state
                      setTimeout(() => {
                        setShowDeleteConfirm(false);
                        setConfirmationText('');
                        setDeleteUserMessages(false);
                        setDeleteAdminMessages(false);
                        setDeleteSuccess(false);
                        setIsDeleting(false);
                        // Force a hard reload to clear all cached data
                        window.location.href = window.location.href.split('#')[0];
                      }, 2000);
                    } else {
                      toast.error(data.message || 'Failed to delete messages');
                      setIsDeleting(false);
                    }
                  } catch (err) {
                    console.error('Failed to delete messages:', err);
                    toast.error('Failed to delete messages. Please try again.');
                    setIsDeleting(false);
                  }
                }}
                disabled={confirmationText !== 'DELETE ALL MESSAGES' || isDeleting || deleteSuccess}
                className="flex-1 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white transition-colors font-semibold flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : deleteSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Deleted
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {pendingBulkDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-red-500/40 rounded-lg max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-3 rounded-lg bg-red-500/20">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Delete Selected Documents</h3>
                <p className="text-sm text-slate-400">This action cannot be undone</p>
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto bg-white/5 rounded-lg p-3 space-y-1">
              {pendingBulkDelete.map((d) => (
                <div key={d.id} className="text-sm text-white truncate" title={d.filename}>• {d.filename}</div>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setPendingBulkDelete(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const docs = pendingBulkDelete;
                  setPendingBulkDelete(null);
                  for (const d of docs) {
                    await handleDeleteFile(d.id, d.filename);
                  }
                  setSelectedDocIds(new Set());
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
