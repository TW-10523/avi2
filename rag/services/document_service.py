from config.index import config
from core.logging import logger
from models.schemas import DeleteRequest, DeleteResponseModel
from repositories.chroma_repository import chroma_db


def delete_collection(req: DeleteRequest) -> DeleteResponseModel:

    if config.RAG.mode[0] == "splitByArticleWithHybridSearch":
        if not req.ids:
            raise ValueError("No document IDs provided for deletion.")
        try:
            collection = chroma_db.get_collection(
                name=config.RAG.PreProcess.PDF.splitByArticle.collectionName
            )

            if config.APP_MODE == "development":
                res_1 = collection.get(where={"file_id": {"$in": req.ids}})  # type: ignore
                logger.debug(f"Found {len(res_1['ids'])} records before deletion")

            collection.delete(
                where={"file_id": {"$in": req.ids}},  # type: ignore
            )

            if config.APP_MODE == "development":
                res_2 = collection.get(where={"file_id": {"$in": req.ids}})  # type: ignore
                logger.debug(f"Found {len(res_2['ids'])} records after deletion")

            logger.info(
                f"Deleted documents with IDs {req.ids} from collection: "
                f"{config.RAG.PreProcess.PDF.splitByArticle.collectionName}"
            )
            return DeleteResponseModel(
                status="deleted",
                collection=config.RAG.PreProcess.PDF.splitByArticle.collectionName,
                deleted_records=req.ids,
            )
        except Exception as e:
            logger.error(
                f"Error deleting documents with IDs {req.ids} from collection: "
                f"{config.RAG.PreProcess.PDF.splitByArticle.collectionName} - {str(e)}"
            )
            return DeleteResponseModel(
                status="failed",
                collection=config.RAG.PreProcess.PDF.splitByArticle.collectionName,
            )

    target = []
    for col in chroma_db.list_collections():
        meta = getattr(col, "metadata", None) or {}
        if meta.get("name") == req.collection_name:
            target.append(col.name)
    if not target:
        return DeleteResponseModel(status="no match", collection=req.collection_name)

    for name in target:
        chroma_db.delete_collection(name=name)
    return DeleteResponseModel(status="deleted", collection=req.collection_name)
