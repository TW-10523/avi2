import re
from concurrent.futures import ThreadPoolExecutor, as_completed

from config.index import config
from core.logging import logger
from models.schemas import SearchRequest
from repositories.chroma_repository import chroma_db
from services.reranker_service import get_ranked_results
from utils.search import search_query


def search_process(collection_name, query):
    try:
        # Step 1: Query ChromaDB
        collection = chroma_db.get_collection(collection_name)
        raw_result = search_query(
            collection, query, top_k=config.RAG.Retrieval.topKForEachCollection
        )

        if not raw_result:
            return []

        if config.APP_MODE == "rag-evaluation":
            logger.info(f"[RAG] Raw search results: {raw_result}")

        return raw_result
    except Exception as _:
        if config.APP_MODE == "rag-evaluation":
            logger.error(
                f"[RAG] Error in search_process('{collection_name}'), skipping..."
            )
            return []


def search_rag(req: SearchRequest):
    try:
        logger.info(
            f"[RAG] Starting search_rag: {req.collection_name}, query='{req.query}', mode={req.mode}"
        )

        all_results = []

        expanded_collection_name_set = set()
        if config.RAG.Retrieval.usingNeighborChunkAware:
            for c in req.collection_name:
                if c.startswith(f"{req.mode}-"):
                    p = re.match(rf"{req.mode}-(\d+)__(.+)", c)
                    if p:
                        chunk_number = int(p.group(1))
                        (
                            expanded_collection_name_set.add(
                                f"{req.mode}-{chunk_number - 1}__{p.group(2)}"
                            )
                            if chunk_number > 1
                            else None
                        )
                        expanded_collection_name_set.add(
                            f"{req.mode}-{chunk_number + 1}__{p.group(2)}"
                        )

                expanded_collection_name_set.add(c)
        else:
            expanded_collection_name_set = set(req.collection_name)

        with ThreadPoolExecutor(max_workers=1) as executor:
            future_to_name = {
                executor.submit(search_process, name, req.query): name
                for name in expanded_collection_name_set
            }
            for future in as_completed(future_to_name):
                collection_name = future_to_name[future]
                try:
                    result = future.result()
                    if result:
                        all_results.extend(result)
                except Exception as e:
                    logger.error(
                        f"[RAG] Error in thread for collection '{collection_name}': {e}",
                        exc_info=True,
                    )

        # Step 3: Rerank top N
        if not all_results:
            if config.APP_MODE == "rag-evaluation":
                logger.debug("[RAG] No passages found. Returning empty results.")
            return {"results": []}
        ranked = get_ranked_results(req.query, all_results, top_n=req.top_k)
        if config.APP_MODE == "rag-evaluation":
            logger.debug(f"[RAG] Ranked results: {ranked}")
        logger.info(f"[RAG] search_rag completed.")
        return {"results": ranked}

    except Exception as e:
        logger.error(f"[RAG] Failed search_rag: {e}", exc_info=True)
        return {"results": [], "error": str(e)}
