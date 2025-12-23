import File from '@/mysql/model/file.model';
import Tag from '@/mysql/model/file_tag.model';
import { userType } from '@/types';
import { IFileQuerySerType, IFileQueryType } from '@/types/file';
import { queryPage } from '@/utils/mapper';
import axios from 'axios';
import { Context } from 'koa';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';
import { putFileInfo, postNewTag, putTag, delTag } from '@/service/file';
import { parseOfficeAsync } from 'officeparser';
import { FILE_UPLOAD_DIR } from '@/config/uploadPath';
import { config } from '@/config/index';
import UserRole from '@/mysql/model/user_role.model';
import { Op } from 'sequelize';
import FileRole from '@/mysql/model/file_role.model';
import { getAddMid } from '@/controller/genTask';

type UploadedFile = {
  newFilename: string;
  originalFilename: string;
  mimetype: string;
  size: number;
  filepath: string;
};

export type UploadResult = {
  id: number;
  filename: string;
  storage_key: string;
  mime_type: string;
  size: number;
  created_at: Date;
};

// ルートハンドラ - Clean upload using FileUploadService
export const uploadFile = async (ctx: Context, next: () => Promise<void>) => {
  const { fileUploadService } = await import('@/services/fileUploadService');
  
  const raw = ctx.request.files?.files;
  if (!raw) ctx.throw(400, 'ファイルが見つかりません');
  const files: UploadedFile[] = Array.isArray(raw) ? raw : [raw];

  // Parse tags
  const { tags } = ctx.request.body;
  const tagId = tags ? JSON.parse(tags)[0] : undefined;
  const { userName } = ctx.state.user as userType;

  // Upload files using clean service
  const { success, failed } = await fileUploadService.uploadFiles(
    files.map(f => ({
      originalFilename: f.originalFilename,
      filepath: f.filepath,
      mimetype: f.mimetype,
      size: f.size,
    })),
    userName,
    tagId
  );

  ctx.state.formatData = {
    message: failed.length === 0 
      ? 'ファイルのアップロードに成功しました' 
      : `${success.length}件成功、${failed.length}件失敗`,
    data: success.map(r => ({
      id: r.id,
      filename: r.filename,
      storage_key: r.storageKey,
      mime_type: r.mimeType,
      size: r.size,
      indexed: r.indexed,
    })),
    errors: failed.length > 0 ? failed : undefined,
  };

  await next();
};

export const listFiles = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const { userId } = ctx.state.user as userType;

    let filteredFileIds = [];
    if (userId !== 1) {
      const roleIds = (await UserRole.findAll({
        attributes: ['role_id'],
        where: { user_id: userId },
      })) as any;
      filteredFileIds = (await FileRole.findAll({
        attributes: ['file_id'],
        where: { role_id: { [Op.in]: roleIds } },
      })) as any;
    }

    const { pageNum, pageSize, fileContent, ...params } = ctx.query as unknown as IFileQueryType;
    const tags: number[] = [];

    for (const key of Object.keys(params)) {
      const match = key.match(/^tags\[(\d+)\]$/);
      if (match) {
        const index = parseInt(match[1], 10);
        tags[index] = Number(params[key]);
        delete params[key];
      }
    }

    if (tags.length > 0) {
      params.tags = tags.filter((v) => v !== undefined);
    }
    let response;
    response = await queryPage<IFileQuerySerType>(File, { pageNum, pageSize, params });

    if (fileContent) {
      const count = response.count;
      let fileList;
      fileList = await queryPage<IFileQuerySerType>(File, { pageNum: 1, pageSize: count, params });

      const fileIds = fileList.rows.map((file) => file.getDataValue('storage_key'));
      const q = "(" + fileIds.map(id => `id:"${id}"`).join(' OR ') + ") AND " + '"' + fileContent + '"';

      await axios.get(
        `${config.ApacheSolr.url}/solr/mycore/select`,
        {
          params: {
            q: q,
            indent: 'true',
          },
        })
        .then((res) => {
          const ids = res.data.response.docs.map((doc: any) => doc.id);

          fileList = fileList.rows.filter(
            (file) =>
              ids.includes(file.getDataValue('storage_key')) &&
              (userId === 1 || filteredFileIds.includes(file.getDataValue('file_id'))),
          );

          response.rows = fileList.slice((pageNum - 1) * pageSize, pageNum * pageSize);
          response.count = fileList.length;
        });
    }

    ctx.state.formatData = response;
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit(
      'error',
      {
        code: '500',
        message: 'リストの取得に失敗しました',
      },
      ctx,
    );
  }
};

// Delete single file by ID parameter (for UI delete button)
export const deleteFileById = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const { id } = ctx.params;
    const fileId = parseInt(id, 10);

    if (!fileId || isNaN(fileId)) {
      ctx.throw(400, 'Invalid file ID');
    }

    console.log('🗑️  [FileController] Deleting file by ID:', {
      fileId,
      timestamp: new Date().toISOString(),
    });

    // Find the file first
    const file = await File.findByPk(fileId, {
      attributes: ['id', 'storage_key', 'filename'],
    });

    if (!file) {
      ctx.throw(404, 'ファイルが見つかりません');
    }

    console.log('📄 [FileController] File found:', {
      id: file.getDataValue('id'),
      filename: file.getDataValue('filename'),
      storage_key: file.getDataValue('storage_key'),
    });

    // Delete from MySQL
    try {
      await File.destroy({ where: { id: fileId } });
      console.log('✅ [FileController] File deleted from MySQL:', { fileId });
    } catch (e) {
      console.error('❌ [FileController] MySQL deletion failed:', e);
      throw e;
    }

    // Delete from RAG system
    try {
      if (config.RAG.mode[0] === "splitByArticleWithHybridSearch") {
        await axios.delete(`${config.RAG.Backend.url}/collection`, {
          data: {
            collection_name: config.RAG.PreProcess.PDF.splitByArticle.collectionName,
            ids: [fileId.toString()],
          },
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        await axios.delete(`${config.RAG.Backend.url}/collection`, {
          data: {
            collection_name: file.getDataValue('storage_key'),
            ids: [fileId.toString()],
          },
          headers: { 'Content-Type': 'application/json' },
        });
      }
      console.log('✅ [FileController] File deleted from RAG:', { fileId });
    } catch (e) {
      console.warn('⚠️  [FileController] RAG deletion warning:', e.message);
      // Don't throw - continue even if RAG deletion fails
    }

    // Delete from Solr
    try {
      const url = `${config.ApacheSolr.url}/solr/${config.ApacheSolr.coreName}/update?commit=true`;
      const body = { delete: { query: `file_name_s:"${file.getDataValue('storage_key')}"` } };
      await axios.post(url, body, { headers: { 'Content-Type': 'application/json' } });
      console.log('✅ [FileController] File deleted from Solr:', { fileId });
    } catch (e) {
      console.warn('⚠️  [FileController] Solr deletion warning:', e.message);
      // Don't throw - continue even if Solr deletion fails
    }

    console.log('🎉 [FileController] File deleted successfully:', {
      fileId,
      filename: file.getDataValue('filename'),
      deletedAt: new Date().toISOString(),
    });

    ctx.state.formatData = {
      message: 'ファイルが正常に削除されました',
      id: fileId,
    };

    await next();
  } catch (error) {
    console.error('❌ [FileController] Delete error:', error);
    ctx.status = error.status || 500;
    ctx.body = {
      code: error.status || 500,
      message: error.message || 'ファイルの削除に失敗しました',
    };
  }
};

export const deleteFile = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const { ids } = ctx.request.body as { ids: string[] };
    const filteredIds = ids.filter((id) => id != null);

    if (!Array.isArray(filteredIds) || filteredIds.length === 0) {
      ctx.throw(404, 'ファイルが見つかりません');
    }

    const files = await File.findAll({
      where: { id: filteredIds },
      attributes: ['id', 'storage_key'], // name カラムが collection_name に相当
    });

    // MySQL 削除（失敗しても継続）
    try {
      await File.destroy({ where: { id: filteredIds } });
    } catch (e) {
      console.error('MySQL削除に失敗:', e.name, e.message);
    }

    // RAG 削除
    if (config.RAG.mode[0] === "splitByArticleWithHybridSearch") {
      try {
          await axios.delete(`${config.RAG.Backend.url}/collection`, {
            data: {
              collection_name: config.RAG.PreProcess.PDF.splitByArticle.collectionName,
              ids: files.map((file) => file.getDataValue('id').toString()),
            },
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (e) {
          console.error('RAG削除失敗:', e.name, e.message);
        }
    } else {
      for (const file of files) {
        try {
          await axios.delete(`${config.RAG.Backend.url}/collection`, {
            data: {
              collection_name: file.getDataValue('storage_key'),
              ids: [file.getDataValue('id').toString()],
            },
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (e) {
          console.error('RAG削除失敗:', e.name, e.message);
        }
      }
    }

    // Solr 削除（allSettledで継続）
    await Promise.allSettled(
      files.map((file) => {
        // let a
        // a = axios.post(`${config.ApacheSolr.url}/solr/mycore/update?commit=true`, {
        //   delete: { id: "6Lnh9UjKCSPuchJzMlX_g.png" }
        // })
        const url = `${config.ApacheSolr.url}/solr/${config.ApacheSolr.coreName}/update?commit=true`
        const body = { delete: { query: `file_name_s:"${file.getDataValue('storage_key')}"` } }
        axios.post(
          url,
          body,
          { headers: { 'Content-Type': 'application/json' } }
        ).catch(e => {
          console.error('Solr削除失敗:', e.name, e.message);
        })
      })
    );
    // await Promise.allSettled(
    //   files.map((file) =>
    //     axios.post(`${config.ApacheSolr.url}/solr/mycore/update?commit=true`, {
    //       delete: { id: "gQ0jgf9mVQI3hf9rANctw.pdf" }
    //     }).catch(e => {
    //       console.error('Solr削除失敗:', e.name, e.message);
    //     })
    //   )
    // );

    // ファイル削除
    await Promise.all(
      files.map(async (file) => {
        const baseName = path.basename(file.getDataValue("storage_key"), path.extname(file.getDataValue("storage_key")));
        const filePath = path.join(FILE_UPLOAD_DIR, file.getDataValue("storage_key"));
        const folderPath = path.join(FILE_UPLOAD_DIR, baseName);

        // ファイル削除
        await fs.promises.unlink(filePath).catch((err) => {
          if (err.code !== "ENOENT") {
            console.error(`Failed to delete file ${filePath}:`, err.name, err.message);
          }
        });

        // フォルダ削除
        await fs.promises.rm(folderPath, { recursive: true, force: true }).catch((err) => {
          if (err.code !== "ENOENT") {
            console.error(`Failed to delete folder ${folderPath}:`, err.name, err.message);
          }
        });
      }),
    );

    // ctx.state.formatData = { message: 'ファイルが削除されました' };
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit(
      'error',
      {
        code: '500',
        message: '削除に失敗しました',
      },
      ctx,
    );
  }
};

export const updateFileInfo = async (ctx: Context, next: () => Promise<void>) => {
  try {
    if (ctx.request.body?.tag == undefined) {
      ctx.request.body.tag = null;
      await putFileInfo(ctx.request.body);
    } else {
      await putFileInfo(ctx.request.body);
    }
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit('error');
  }
};

export const addNewTag = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const newTag = ctx.request.body;
    await postNewTag(newTag);
    ctx.state.formatData = { message: 'タグが追加されました' };
    await next();
  } catch (error) {
    console.error(error);
    if (error.name === 'SequelizeUniqueConstraintError' || error?.message === 'このタグ名はすでに存在しています') {
      return ctx.app.emit(
        'error',
        {
          code: '500',
          message: '同じタグ名がすでに存在します',
        },
        ctx,
      );
    } else {
      return ctx.app.emit(
        'error',
        {
          code: '500',
          message: 'タグの追加に失敗しました',
        },
        ctx,
      );
    }
  }
};

export const editTag = async (ctx: Context, next: () => Promise<void>) => {
  try {
    ctx.request.body.tag = null;
    await putTag(ctx.request.body);
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit('error');
  }
};

export const deleteTag = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const res = await delTag(ctx.params.id);
    ctx.state.formatData = res;
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit(
      'error',
      {
        code: '500',
        message: '削除に失敗しました',
      },
      ctx,
    );
  }
};

export const listTags = async (ctx: Context, next: () => Promise<void>) => {
  try {
    type QueryWithOrder = IFileQuerySerType & {
      order?: [string, 'ASC' | 'DESC'][];
    };
    const res = await queryPage<QueryWithOrder>(Tag, {
      pageNum: 1,
      pageSize: Number.MAX_SAFE_INTEGER,
      order: [['created_at', 'ASC']],
    });
    ctx.state.formatData = res;
    await next();
  } catch (error) {
    console.error(error);
    return ctx.app.emit(
      'error',
      {
        code: '500',
        message: 'リストの取得に失敗しました',
      },
      ctx,
    );
  }
};

export const previewFile = async (ctx) => {
  const storage_key = ctx.params.storage_key;
  if (!storage_key) {
    ctx.status = 400;
    ctx.body = '不正な入力です';
    return;
  }
  const filePath = path.join(FILE_UPLOAD_DIR, storage_key);
  if (!fs.existsSync(filePath)) {
    ctx.set('Content-Type', 'application/json');
    ctx.body = {
      code: 404,
      message: 'ファイルが見つかりません',
    };
    return;
  }
  const mimeType = mime.lookup(storage_key) || 'application/octet-stream';
  ctx.set('Content-Type', mimeType);
  ctx.set('Content-Disposition', `inline; filename="${encodeURIComponent(storage_key)}"`);
  ctx.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  ctx.body = fs.createReadStream(filePath);
};

export const downloadFile = async (ctx) => {
  const storage_key = ctx.params.storage_key;
  if (!storage_key) {
    ctx.status = 400;
    ctx.body = '不正な入力です';
    return;
  }
  const filePath = path.join(FILE_UPLOAD_DIR, storage_key);
  if (!fs.existsSync(filePath)) {
    ctx.set('Content-Type', 'application/json');
    ctx.body = {
      code: 404,
      message: 'ファイルが見つかりません',
    };
    return;
  }
  const mimeType = mime.lookup(storage_key) || 'application/octet-stream';
  ctx.set('Content-Type', mimeType);
  ctx.set('Content-Disposition', `attachment; filename="${encodeURIComponent(storage_key)}"`);
  ctx.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  ctx.body = fs.createReadStream(filePath);
};

export const extractTextFromFile = async (ctx: Context, next: () => Promise<void>) => {
  try {
    const raw = ctx.request.files?.file;
    if (!raw) {
      ctx.throw(400, 'ファイルが見つかりません / File not found');
    }

    const file: UploadedFile = Array.isArray(raw) ? raw[0] : raw;

    const ext = path.extname(file.originalFilename).toLowerCase();
    const supportedFormats = ['.pdf', '.docx', '.xlsx', '.pptx', '.odt', '.odp', '.ods', '.txt'];

    if (!supportedFormats.includes(ext)) {
      ctx.throw(
        400,
        `対応していないファイル形式です。対応形式: ${supportedFormats.join(', ')} / Unsupported file format. Supported formats: ${supportedFormats.join(', ')}`,
      );
    }

    let extractedText: string;

    if (ext === '.txt') {
      extractedText = fs.readFileSync(file.filepath, 'utf-8');
    } else {
      try {
        extractedText = await parseOfficeAsync(file.filepath);
      } catch (error) {
        ctx.throw(400, 'ファイルの解析に失敗しました / Failed to parse file');
      }
    }

    if (!extractedText || extractedText.trim().length === 0) {
      ctx.throw(400, 'テキストが抽出できませんでした / Could not extract text from file');
    }

    ctx.state.formatData = {
      filename: file.originalFilename,
      text: extractedText.trim(),
      size: file.size,
      mimeType: file.mimetype,
      message: 'テキスト抽出に成功しました / Text extraction successful',
    };

    await next();
  } catch (error) {
    console.error('Text Extraction Error:', error);

    let errorMessage = 'テキスト抽出に失敗しました / Text extraction failed';
    if (error.message) {
      errorMessage += `: ${error.message}`;
    }

    ctx.status = error.status || 500;
    ctx.app.emit(
      'error',
      {
        code: (error.status || 500).toString(),
        message: errorMessage,
      },
      ctx,
    );
  }
};
