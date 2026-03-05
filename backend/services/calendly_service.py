"""Calendly integration — scheduling link + event cancellation."""

from __future__ import annotations

import os
import logging
from typing import Optional

import requests

logger = logging.getLogger("baxterlabs.calendly")


class CalendlyService:
    def __init__(self):
        self.api_key = os.getenv("CALENDLY_API_KEY", "")
        self.scheduling_url = os.getenv("CALENDLY_SCHEDULING_URL", "")

    def _is_configured(self) -> bool:
        return bool(self.api_key and self.scheduling_url)

    def get_scheduling_link(self) -> str:
        """Return the configured Calendly scheduling URL."""
        return self.scheduling_url



# Singleton
_calendly_service: Optional[CalendlyService] = None


def get_calendly_service() -> CalendlyService:
    global _calendly_service
    if _calendly_service is None:
        _calendly_service = CalendlyService()
    return _calendly_service
