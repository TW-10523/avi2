import time

from api.modeAPI import upload_router
from core.logging import logger
from fastapi import FastAPI, HTTPException, Request
from models.schemas import (
    DeleteRequest,
    DeleteResponseModel,
    HybridSearchRequest,
    SearchRequest,
    UpdateRequest,
)
from services.document_service import delete_collection
from services.embedder import embed_text
from services.HybridRAGEngineFactory import hybrid_RAG_engine_factory
from services.rag_service import search_rag
from services.record_service import delete_document, update_document

app = FastAPI(docs_url="/docs")


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}"
    logger.info(
        f"{request.method} {request.url.path} - time taken: {process_time:.4f}s"
    )
    return response


app.include_router(upload_router)


@app.post("/search")
def search(req: SearchRequest):
    try:
        return search_rag(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search/hybrid")
def hybrid_search(req: HybridSearchRequest):
    try:
        return hybrid_RAG_engine_factory.get(req.collection_name).hybrid_search_rag(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/update")
def update(req: UpdateRequest):
    try:
        return update_document(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/collection", response_model=DeleteResponseModel)
def delete_col(req: DeleteRequest):
    try:
        return delete_collection(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/record")
def delete_doc(req: DeleteRequest):
    try:
        return delete_document(req)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/check_embedding_model")
def check_embedding_model():
    try:
        embed_text("基本給はどのように決まりますか？")
        return {"message": "Embedding model is working correctly."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
