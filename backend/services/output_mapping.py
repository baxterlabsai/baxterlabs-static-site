"""Canonical deliverable output name → number mapping.

PRIMARY ENFORCEMENT: The database trigger ``trg_derive_output_number``
(migration 060_derive_output_number_from_name) derives output_number on
every INSERT/UPDATE to phase_output_content.  This covers all write paths
including direct PostgREST inserts from Cowork.

This Python module exists for code paths that need to reason about the
name → number mapping *outside* of DB writes — e.g., the document renderer
reading rows back out, or the FastAPI upsert endpoint logging the derived
number before the insert round-trips.  It is NOT the primary enforcement
mechanism; the trigger is.

Numbers match the Phase 5 seed in phase_output_seed.py:
  1 = Executive Summary
  2 = Full Diagnostic Report
  3 = Presentation Deck
  4 = Implementation Roadmap
  5 = Retainer Proposal
"""
from __future__ import annotations

import logging
from typing import List, Optional, Tuple

logger = logging.getLogger("baxterlabs.output_mapping")

# Canonical mapping — slugs are matched as case-insensitive substrings
# against the output_name provided by Cowork or the renderer.
# Order: longest slug first so "Phase_2_Retainer_Proposal" matches before
# "Retainer_Proposal".
_SLUG_TO_NUMBER: List[Tuple[str, int]] = [
    ("Phase_2_Retainer_Proposal", 5),
    ("Full_Diagnostic_Report", 2),
    ("Implementation_Roadmap", 4),
    ("Executive_Summary", 1),
    ("Presentation_Deck", 3),
    ("Retainer_Proposal", 5),
    # Display-name variants (Cowork prefixes with "Phase 5: ")
    ("Full Diagnostic Report", 2),
    ("Implementation Roadmap", 4),
    ("Executive Summary", 1),
    ("Presentation Deck", 3),
    ("Retainer Proposal", 5),
]


def output_number_for_name(output_name: str) -> Optional[int]:
    """Derive the canonical output_number from an output_name string.

    Matches on case-insensitive substring. Returns ``None`` if no
    canonical mapping is found.
    """
    lower = output_name.lower()
    for slug, number in _SLUG_TO_NUMBER:
        if slug.lower() in lower:
            return number
    logger.warning("No canonical output_number mapping for: %s", output_name)
    return None
