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

    def cancel_event(self, event_uuid: str, reason: str = "Automated cancellation") -> dict:
        """Cancel a Calendly event via API."""
        if not self.api_key:
            logger.warning("Calendly API key not configured — cannot cancel event")
            return {"success": False, "error": "Calendly not configured"}

        try:
            url = f"https://api.calendly.com/scheduled_events/{event_uuid}/cancellation"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            resp = requests.post(url, json={"reason": reason}, headers=headers, timeout=15)
            if resp.status_code in (200, 201):
                logger.info(f"Calendly event {event_uuid} cancelled: {reason}")
                return {"success": True}
            else:
                logger.warning(f"Calendly cancel failed: {resp.status_code} {resp.text}")
                return {"success": False, "error": resp.text}
        except Exception as e:
            logger.error(f"Calendly cancel error: {e}")
            return {"success": False, "error": str(e)}


# Singleton
_calendly_service: Optional[CalendlyService] = None


def get_calendly_service() -> CalendlyService:
    global _calendly_service
    if _calendly_service is None:
        _calendly_service = CalendlyService()
    return _calendly_service
