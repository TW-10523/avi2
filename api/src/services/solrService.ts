/**
 * Solr Service - Clean abstraction for document indexing and search
 */
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { config } from '@/config/index';

export interface SolrDocument {
  id: string;
  title: string;
  content?: string;
  _text_?: string[];
}

export interface SolrSearchResult {
  docs: SolrDocument[];
  numFound: number;
}

class SolrService {
  private baseUrl: string;
  private coreName: string;

  constructor() {
    this.baseUrl = config.ApacheSolr.url;
    this.coreName = config.ApacheSolr.coreName || 'mycore';
  }

  /**
   * Index a document file to Solr
   */
  async indexDocument(
    filePath: string,
    documentId: string,
    title: string,
    metadata: Record<string, string> = {}
  ): Promise<boolean> {
    try {
      const form = new FormData();
      form.append('myfile', fs.createReadStream(filePath), title);
      form.append('literal.id', documentId);
      form.append('literal.title', title);
      form.append('literal.file_name_s', documentId);
      form.append('literal.file_path_s', filePath);
      form.append('literal.rag_tag_s', 'indexed');
      form.append('commit', 'true');

      // Add custom metadata
      Object.entries(metadata).forEach(([key, value]) => {
        form.append(`literal.${key}`, value);
      });

      await axios.post(
        `${this.baseUrl}/solr/${this.coreName}/update/extract`,
        form,
        { headers: form.getHeaders(), timeout: 30000 }
      );

      console.log(`[SolrService] Indexed: ${title}`);
      return true;
    } catch (error: any) {
      console.error(`[SolrService] Index failed for ${title}:`, error.message);
      return false;
    }
  }

  /**
   * Search documents by query
   */
  async search(
    query: string,
    documentIds?: string[],
    maxResults: number = 5
  ): Promise<SolrSearchResult> {
    try {
      // Build search query
      const searchTerms = query
        .split(/\s+/)
        .filter(t => t.length > 2)
        .map(t => `"${t}"`)
        .join(' OR ') || '*:*';

      let url = `${this.baseUrl}/solr/${this.coreName}/select?q=${encodeURIComponent(searchTerms)}&rows=${maxResults}&fl=id,title,content,_text_`;

      // Filter by document IDs if provided
      if (documentIds && documentIds.length > 0) {
        const filter = documentIds.map(id => `id:"${id}"`).join(' OR ');
        url += `&fq=${encodeURIComponent(filter)}`;
      }

      const response = await axios.get(url, { timeout: 10000 });
      const result = response.data.response;

      return {
        docs: result.docs || [],
        numFound: result.numFound || 0,
      };
    } catch (error: any) {
      console.error(`[SolrService] Search failed:`, error.message);
      return { docs: [], numFound: 0 };
    }
  }

  /**
   * Delete a document from Solr
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      await axios.post(
        `${this.baseUrl}/solr/${this.coreName}/update?commit=true`,
        { delete: { id: documentId } },
        { headers: { 'Content-Type': 'application/json' } }
      );
      console.log(`[SolrService] Deleted: ${documentId}`);
      return true;
    } catch (error: any) {
      console.error(`[SolrService] Delete failed:`, error.message);
      return false;
    }
  }

  /**
   * Check if Solr is available
   */
  async ping(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/solr/${this.coreName}/admin/ping`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const solrService = new SolrService();
export default SolrService;
