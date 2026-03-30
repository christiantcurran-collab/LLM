"""Pydantic schemas for structured triage output."""

from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class TriagePriority(str, Enum):
    FAST_TRACK = "fast_track"
    STANDARD = "standard"
    COMPLEX = "complex"
    REFER = "refer"
    SIU_REFERRAL = "siu_referral"


class TriageDecision(BaseModel):
    priority: TriagePriority
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str
    recommended_reserve: float = Field(ge=0.0)
    fraud_risk: str
    fraud_indicators: List[str] = []
    regulatory_flags: List[str] = []
    required_actions: List[str] = []
    estimated_settlement_days: Optional[int] = None
    exclusion_risk: bool = False
    exclusion_detail: Optional[str] = None
