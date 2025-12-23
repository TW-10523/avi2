import IndexCon from '@/controller';
import { deleteFile, deleteFileById, listFiles, uploadFile, updateFileInfo, addNewTag, editTag, deleteTag, listTags, previewFile, downloadFile, extractTextFromFile} from '@/controller/file';
import Router from 'koa-router';

const router = new Router({ prefix: '/api/files' });

// Specific routes first
router.post('/upload', uploadFile, IndexCon());
router.post('/addNewTag', addNewTag, IndexCon());
router.post('/extract-text', extractTextFromFile, IndexCon());

// GET routes
router.get('/', listFiles, IndexCon());
router.get('/tags', listTags, IndexCon());
router.get('/preview/:storage_key', previewFile);
router.get('/download/:storage_key', downloadFile);

// DELETE routes - specific first, then general param
router.delete('/delete', deleteFile, IndexCon()); // DELETE /api/files/delete with body
router.delete('/:id', deleteFileById, IndexCon()); // DELETE /api/files/:id (file deletion)

// PUT routes
router.put('/', updateFileInfo, IndexCon());
router.put('/editTag', editTag, IndexCon());

export default router;
