"""Health endpoint used by the backend's ``aiServiceHealthy()``."""
from __future__ import annotations

from fastapi import APIRouter

from .. import __version__
from ..config import settings
from ..services.llm import effective_model, is_configured

router = APIRouter(tags=['health'])


@router.get('/health')
def health() -> dict:
    configured = is_configured()
    body = {
        'status': 'ok',
        'service': settings.service_name,
        'version': __version__,
        'llm': 'configured' if configured else 'offline',
    }
    if configured:
        body['model'] = effective_model()
    return body