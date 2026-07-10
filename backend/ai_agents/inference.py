"""Local on-prem inference wrapper for AMD ROCm (llama-cpp-python + GGUF).

Falls back to mock mode when `ai_mock_mode=true`, the model file is missing,
or llama-cpp-python is not installed. No cloud API calls are made.
"""

import logging
import os
from pathlib import Path

from config import settings

logger = logging.getLogger(__name__)


class LocalInference:
    def __init__(self) -> None:
        self._llm = None
        self._mock_mode = settings.ai_mock_mode
        self._resolved_path = self._resolve_model_path(settings.local_model_path)

    @staticmethod
    def _resolve_model_path(path: str) -> str:
        candidate = Path(path)
        if candidate.is_file():
            return str(candidate.resolve())

        backend_relative = Path(__file__).resolve().parent / "models" / Path(path).name
        if backend_relative.is_file():
            return str(backend_relative.resolve())

        backend_parent = Path(__file__).resolve().parent.parent / path
        if backend_parent.is_file():
            return str(backend_parent.resolve())

        repo_relative = Path(__file__).resolve().parent.parent.parent / path
        if repo_relative.is_file():
            return str(repo_relative.resolve())

        return path

    @property
    def mock_mode(self) -> bool:
        return self._mock_mode

    @property
    def model_loaded(self) -> bool:
        return self._llm is not None

    @property
    def model_path(self) -> str:
        return self._resolved_path

    def load(self) -> None:
        if self._mock_mode:
            logger.info("inference: running in AI mock mode (no GPU model loaded)")
            return

        if not Path(self._resolved_path).is_file():
            logger.warning(
                "inference: model not found at %s, falling back to mock mode",
                self._resolved_path,
            )
            self._mock_mode = True
            return

        os.environ.setdefault("ROCM_VISIBLE_DEVICES", settings.rocm_visible_devices)

        try:
            from llama_cpp import Llama

            self._llm = Llama(
                model_path=self._resolved_path,
                n_ctx=settings.model_context_size,
                n_gpu_layers=settings.n_gpu_layers,
                verbose=False,
            )
            logger.info(
                "inference: loaded model from %s (n_gpu_layers=%d)",
                self._resolved_path,
                settings.n_gpu_layers,
            )
        except ImportError:
            logger.warning("inference: llama-cpp-python not installed, falling back to mock mode")
            self._mock_mode = True
        except Exception:
            logger.warning("inference: failed to load model, falling back to mock mode", exc_info=True)
            self._mock_mode = True

    def generate(self, prompt: str, system: str = "") -> str:
        if self._mock_mode or self._llm is None:
            return ""

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        try:
            result = self._llm.create_chat_completion(
                messages=messages,
                max_tokens=settings.max_tokens,
                temperature=0.2,
            )
            return result["choices"][0]["message"]["content"]
        except Exception:
            logger.warning("inference: generation failed", exc_info=True)
            return ""


_inference: LocalInference | None = None


def get_inference() -> LocalInference:
    global _inference
    if _inference is None:
        _inference = LocalInference()
        _inference.load()
    return _inference
