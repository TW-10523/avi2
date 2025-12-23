import os
from pathlib import Path
from config.index import config

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "api.main:app",
        host=config.RAG.Backend.host,
        port=config.RAG.Backend.port,
        reload=True,
        reload_dirs=[str(Path(__file__).resolve().parent)],
    )
