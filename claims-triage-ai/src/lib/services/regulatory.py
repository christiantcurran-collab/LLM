"""Mock regulatory check service.

Lookup table by jurisdiction x claim type for applicable regulations.
"""


def regulatory_check(
    claim_type: str,
    jurisdiction: str,
    claim_amount: float = 0,
) -> dict:
    """Check regulatory requirements for a claim. Returns requirements, escalation triggers, and deadlines."""
    requirements = []
    escalation_triggers = []
    response_deadline_days = 5  # default FCA acknowledgement

    # --- UK-FCA base rules ---
    if jurisdiction == "UK-FCA":
        requirements.append("FCA ICOBS 8: Handle claims promptly and fairly")
        requirements.append("Acknowledge claim within 5 business days")

        if claim_amount > 100000:
            requirements.append("FCA: 8-week resolution target for claims over 100K")
            requirements.append("FOS referral rights must be communicated to claimant")
            escalation_triggers.append("Senior handler review required for claims over 100K")

    # --- Lloyd's rules ---
    if jurisdiction == "Lloyds":
        requirements.append("Lloyd's Claims Scheme (Combined) applies")
        requirements.append("Lloyd's minimum standards for claims management")

        if claim_amount > 500000:
            requirements.append("Lloyd's peer review required for claims over 500K")
            escalation_triggers.append("Lloyd's Claims Scheme: peer review triggered")
            response_deadline_days = 3

    # --- Solvency II large loss reporting ---
    if claim_amount > 1000000:
        requirements.append("Solvency II: Large loss reporting required within 24 hours")
        escalation_triggers.append("Solvency II large loss threshold exceeded (>1M)")
        response_deadline_days = min(response_deadline_days, 1)

    # --- Claim type specific ---
    if claim_type == "cyber":
        requirements.append("ICO notification assessment required under UK GDPR")
        requirements.append("Assess whether personal data breach occurred")
        requirements.append("If personal data involved: 72-hour ICO notification deadline")
        escalation_triggers.append("Data protection officer must be consulted")

    if claim_type == "D&O":
        requirements.append("Check for securities law implications")
        requirements.append("Assess whether regulatory investigation is ongoing")
        if claim_amount > 1000000:
            escalation_triggers.append("Senior management notification required")

    if claim_type == "marine":
        requirements.append("Marine Insurance Act 1906 provisions apply")
        if jurisdiction == "Lloyds":
            requirements.append("Lloyd's Marine Claims reporting standards")

    if claim_type == "motor":
        requirements.append("Road Traffic Act 1988: third-party liability obligations")
        if claim_amount > 100000:
            escalation_triggers.append("Large motor loss: specialist adjuster required")

    if claim_type == "property":
        if claim_amount > 500000:
            escalation_triggers.append("Large property loss: forensic surveyor recommended")

    if claim_type == "liability":
        requirements.append("Assess third-party involvement and notification obligations")

    return {
        "requirements": requirements,
        "escalation_triggers": escalation_triggers,
        "response_deadline_days": response_deadline_days,
    }
