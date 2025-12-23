import type { RAGProcessor } from '@/types/ragProcessor.ts';

export async function loadRagProcessor(mode: string): Promise<RAGProcessor> {
  try {
    const mod = await import(`@/ragclass/${mode}.ts`);
    const Cls = mod.default;

    if (typeof Cls !== "function") {
      throw new Error(`${mode} の default export がクラスではありません`);
    }
    const instance: unknown = new Cls();

    if (typeof (instance as any).upload !== "function" || typeof (instance as any).search !== "function") {
      throw new Error(`${mode} は upload() と search() の両方を実装してください`);
    }
    return instance as RAGProcessor;
  } catch (e: any) {
    throw new Error(`RAG 実装 "${mode}" を読み込めません: ${e.message}`);
  }
}
