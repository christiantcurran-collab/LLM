"""Mock fraud scoring service.

Deterministic scoring based on pattern-matching rules.
"""

import json
import os
from datetime import datetime


FRAUD_KEYWORDS = [
    "total loss",
    "no witnesses",
    "cash settlement preferred",
    "records destroyed",
    "cash settlement",
    "no documentation",
    "burnt out",
    "arson",
]


def _load_policy(policy_number: str) -> dict | None:
    _root = os.environ.get("PROJECT_ROOT", os.path.join(os.path.dirname(os.path.realpath(__file__)), "..", "..", ".."))
    data_path = os.path.join(_root, "src", "data", "policies.json")
    with open(data_path, "r") as f:
        policies = json.load(f)
    for p in policies:
        if p["policy_number"] == policy_number:
            return p
    return None


def fraud_score(
    policy_number: str,
    claim_amount: float,
    claim_description: str,
    days_since_inception: int | None = None,
) -> dict:
    """Assess fraud risk for a claim. Returns score (0-100), indicators, and risk level."""
    score = 0
    indicators = []

    policy = _load_policy(policy_number)

    # Calculate days since inception if not provided
    if days_since_inception is None and policy:
        try:
            inception = datetime.strptime(policy["inception_date"], "%Y-%m-%d")
            days_since_inception = (datetime.now() - inception).days
        except (ValueError, KeyError):
            days_since_inception = 365

    # Rule 1: Claim within 90 days of inception
    if days_since_inception is not None and days_since_inception <= 90:
        score += 20
        indicators.append("Claim filed within 90 days of policy inception")

    # Rule 2: Claim amount > 80% of sum insured
    if policy:
        ratio = claim_amount / policy["sum_insured"] if policy["sum_insured"] > 0 else 0
        if ratio > 0.80:
            score += 25
            indicators.append(
                f"Claim amount ({claim_amount:,.0f}) is {ratio:.0%} of sum insured ({policy['sum_insured']:,.0f})"
            )

    # Rule 3: Prior claims in last 12 months
    if policy and policy.get("prior_claims_12m", 0) > 0:
        prior = policy["prior_claims_12m"]
        score += min(prior * 15, 45)
        indicators.append(f"Claimant has {prior} prior claim(s) in last 12 months")

    # Rule 4: Fraud keywords in description
    desc_lower = claim_description.lower()
    matched_keywords = [kw for kw in FRAUD_KEYWORDS if kw in desc_lower]
    for kw in matched_keywords:
        score += 10
        indicators.append(f"Description contains fraud keyword: '{kw}'")

    # Rule 5: Recently increased limits
    if policy and policy.get("recently_increased_limits", False):
        score += 15
        indicators.append("Policy limits were recently increased before claim")

    # Cap at 100
    score = min(score, 100)

    # Determine risk level
    if score >= 70:
        risk_level = "high"
    elif score >= 40:
        risk_level = "medium"
    else:
        risk_level = "low"

    return {
        "score": score,
        "indicators": indicators,
        "risk_level": risk_level,
    }
