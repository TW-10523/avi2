export interface User {
  employeeId: string;
  name: string;
  department: string;
  role: 'user' | 'admin';
  lastLogin: string;
}

export interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  source?: {
    document: string;
    page: number;
    language?: string;
  };
  // API integration fields
  taskOutputId?: number;
  status?: string;
  feedback?: {
    emoji?: string;
  };
}

export interface HistoryItem {
  id: string;
  query: string;
  answer: string;
  timestamp: Date;
  source: {
    document: string;
    page: number;
  };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: 'announcement' | 'update' | 'processing';
}

export interface Document {
  id: string;
  name: string;
  version: string;
  uploadedBy: string;
  uploadedAt: Date;
  status: 'active' | 'archived';
}

export type FeatureType = 'chat' | 'documents' | 'history' | 'notifications' | 'admin' | 'contact-admin' | 'message';
