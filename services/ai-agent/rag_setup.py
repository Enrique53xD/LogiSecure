"""Local RAG setup (LlamaIndex) over company policy documents."""

from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path

from llama_index.core import Settings, SimpleDirectoryReader, VectorStoreIndex
from llama_index.core.embeddings import MockEmbedding

logger = logging.getLogger(__name__)

_COMPANY_DOCS_DIR = Path(__file__).resolve().parent / "mock_data" / "company_docs"


class LocalRagEngine:
    """Retriever-only RAG — no cloud LLM required for synthesis."""

    def __init__(self, retriever) -> None:
        self._retriever = retriever

    def query(self, query: str) -> str:
        nodes = self._retriever.retrieve(query)
        if not nodes:
            return ""
        return "\n\n".join(node.node.get_content().strip() for node in nodes[:3])


def _configure_embeddings() -> None:
    """Prefer local HuggingFace embeddings; fall back to MockEmbedding for offline demo."""
    try:
        from llama_index.embeddings.huggingface import HuggingFaceEmbedding

        Settings.embed_model = HuggingFaceEmbedding(
            model_name="BAAI/bge-small-en-v1.5",
        )
        logger.info("rag_setup: using HuggingFace embeddings (bge-small-en-v1.5)")
    except Exception:
        Settings.embed_model = MockEmbedding(embed_dim=384)
        logger.info("rag_setup: HuggingFace unavailable, using MockEmbedding for demo")


@lru_cache(maxsize=1)
def build_rag_engine() -> LocalRagEngine:
    """Build (and cache) a retriever over mock_data/company_docs/."""
    _configure_embeddings()

    if not _COMPANY_DOCS_DIR.is_dir():
        raise FileNotFoundError(f"company docs directory not found: {_COMPANY_DOCS_DIR}")

    docs = SimpleDirectoryReader(str(_COMPANY_DOCS_DIR)).load_data()
    index = VectorStoreIndex.from_documents(docs)
    return LocalRagEngine(index.as_retriever(similarity_top_k=3))
