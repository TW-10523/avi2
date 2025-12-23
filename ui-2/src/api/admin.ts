// ui-2/src/api/admin.ts
// Admin and Classification API for UI2 (React)

import { request } from './request';

export interface UploadedFile {
  id: number;
  filename: string;
  originalName: string;
  category: 'company_policy' | 'internal_guide' | 'procedure' | 'other';
  description?: string;
  uploadedAt: string;
  fileSize: number;
  isProcessed: boolean;
}

export interface ClassificationResult {
  isInternal: boolean;
  confidence: number;
  keywords: string[];
  reason: string;
}

/**
 * Classify a question as internal or general
 */
export async function classifyQuestion(question: string): Promise<ClassificationResult> {
  return request('/chat/classify', {
    method: 'POST',
    data: { question },
  });
}

/**
 * Chat with file context - triggers RAG for internal queries
 */
export async function chatWithContext(
  message: string,
  includeFiles: boolean = true
): Promise<{
  classification: ClassificationResult;
  message: string;
  fileContext?: { files: UploadedFile[]; totalContent: string };
}> {
  return request('/chat/with-context', {
    method: 'POST',
    data: { message, includeFiles },
  });
}

/**
 * Upload files (admin)
 */
export async function uploadAdminFiles(
  formData: FormData
): Promise<{
  success: boolean;
  message: string;
  data: UploadedFile[];
}> {
  return request('/admin/files/upload', {
    method: 'POST',
    data: formData,
  });
}

/**
 * Get list of uploaded files (admin)
 */
export async function getUploadedFiles(): Promise<{
  success: boolean;
  data: UploadedFile[];
}> {
  return request('/admin/files/list', {
    method: 'GET',
  });
}

/**
 * Delete an uploaded file (admin)
 */
export async function deleteUploadedFile(fileId: number): Promise<{
  success: boolean;
  message: string;
}> {
  return request(`/admin/files/${fileId}`, {
    method: 'DELETE',
  });
}
