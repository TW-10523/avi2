/**
 * File Upload Service - Clean file upload and indexing
 */
import path from 'path';
import fs from 'fs';
import { nanoid } from 'nanoid';
import File from '@/mysql/model/file.model';
import { FILE_UPLOAD_DIR } from '@/config/uploadPath';
import { solrService } from './solrService';

export interface UploadedFile {
  originalFilename: string;
  filepath: string;
  mimetype: string;
  size: number;
}

export interface UploadResult {
  id: number;
  filename: string;
  storageKey: string;
  mimeType: string;
  size: number;
  indexed: boolean;
}

class FileUploadService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = FILE_UPLOAD_DIR;
  }

  /**
   * Process and upload a single file
   */
  async uploadFile(
    file: UploadedFile,
    userName: string,
    tagId?: number
  ): Promise<UploadResult> {
    console.log(`[FileUpload] Processing: ${file.originalFilename}`);

    // 1. Generate unique filename
    const ext = path.extname(file.originalFilename || '.pdf');
    const storageKey = nanoid() + ext;
    const permanentPath = path.join(this.uploadDir, storageKey);

    // 2. Copy file to permanent location
    await fs.promises.copyFile(file.filepath, permanentPath);
    console.log(`[FileUpload] Saved: ${permanentPath}`);

    // 3. Save to database
    const record = await File.create({
      filename: file.originalFilename,
      tag: tagId || null,
      storage_key: storageKey,
      mime_type: file.mimetype,
      size: file.size,
      create_by: userName,
    });
    const fileId = record.getDataValue('id');
    console.log(`[FileUpload] DB record: ${fileId}`);

    // 4. Index to Solr
    const indexed = await solrService.indexDocument(
      permanentPath,
      storageKey,
      file.originalFilename
    );

    if (indexed) {
      console.log(`[FileUpload] SUCCESS: ${file.originalFilename}`);
    } else {
      console.warn(`[FileUpload] Indexed but Solr failed: ${file.originalFilename}`);
    }

    return {
      id: fileId,
      filename: file.originalFilename,
      storageKey,
      mimeType: file.mimetype,
      size: file.size,
      indexed,
    };
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: UploadedFile[],
    userName: string,
    tagId?: number
  ): Promise<{ success: UploadResult[]; failed: string[] }> {
    const success: UploadResult[] = [];
    const failed: string[] = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(file, userName, tagId);
        success.push(result);
      } catch (error: any) {
        console.error(`[FileUpload] FAILED: ${file.originalFilename}`, error.message);
        failed.push(file.originalFilename);
      }
    }

    return { success, failed };
  }

  /**
   * Delete a file by storage key
   */
  async deleteFile(storageKey: string): Promise<boolean> {
    try {
      // Delete from Solr
      await solrService.deleteDocument(storageKey);

      // Delete physical file
      const filePath = path.join(this.uploadDir, storageKey);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }

      // Delete from database
      await File.destroy({ where: { storage_key: storageKey } });

      console.log(`[FileUpload] Deleted: ${storageKey}`);
      return true;
    } catch (error: any) {
      console.error(`[FileUpload] Delete failed: ${storageKey}`, error.message);
      return false;
    }
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService();
export default FileUploadService;
