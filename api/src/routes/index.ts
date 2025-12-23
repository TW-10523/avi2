import fs from 'fs';
import Router from 'koa-router';

const router = new Router();

async function registerRouter(basePath: string) {
  const files = await fs.promises.readdir(basePath);

  for (const file of files) {
    const filePath = `${basePath}/${file}`;
    // eslint-disable-next-line no-await-in-loop
    const stats = await fs.promises.stat(filePath);

    if (stats.isDirectory()) {
      // eslint-disable-next-line no-await-in-loop
      await registerRouter(filePath);
    } else if (stats.isFile() && !file.includes('index')) {
      // eslint-disable-next-line no-await-in-loop
      const { default: r } = await import(filePath);
      router.use(r.routes());
    } else {
      // console.log('これは特別な種類です（ファイルでもなく、フォルダーでもなく）');
    }
  }
}

registerRouter(__dirname);

export default router;
