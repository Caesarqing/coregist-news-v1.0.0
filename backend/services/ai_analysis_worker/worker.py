from __future__ import annotations

from services.ai_analysis.service import AIAnalysisService


class AIAnalysisWorker(AIAnalysisService):
    """Compatibility wrapper around the canonical AI analysis service."""


__all__ = ["AIAnalysisWorker"]
