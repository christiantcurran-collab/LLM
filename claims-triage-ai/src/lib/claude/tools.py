"""Claude tool definitions for claims triage."""

TOOLS = [
    {
        "name": "policy_lookup",
        "description": (
            "Look up an insurance policy by policy number. Returns cover type, sum insured, "
            "excess, exclusions, policy status, and expiry date. Always call this first to "
            "validate the claim is against an active policy."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "policy_number": {
                    "type": "string",
                    "description": "The policy number, e.g. POL-2024-001234",
                }
            },
            "required": ["policy_number"],
        },
    },
    {
        "name": "fraud_score",
        "description": (
            "Assess fraud risk for a claim. Returns a score from 0-100 and a list of "
            "triggered fraud indicators. Use after policy_lookup to cross-reference "
            "claim details against known fraud patterns."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "policy_number": {"type": "string"},
                "claim_amount": {
                    "type": "number",
                    "description": "Claimed amount in GBP",
                },
                "claim_description": {
                    "type": "string",
                    "description": "Free-text claim description",
                },
                "days_since_inception": {
                    "type": "integer",
                    "description": "Days between policy start and claim date",
                },
            },
            "required": ["policy_number", "claim_amount", "claim_description"],
        },
    },
    {
        "name": "regulatory_check",
        "description": (
            "Check regulatory requirements applicable to this claim type and jurisdiction. "
            "Returns required timelines, mandatory disclosures, and escalation triggers "
            "under FCA/PRA rules."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "claim_type": {
                    "type": "string",
                    "enum": ["property", "liability", "motor", "marine", "cyber", "D&O"],
                },
                "jurisdiction": {
                    "type": "string",
                    "description": "Regulatory jurisdiction, e.g. UK-FCA, EU-EIOPA, Lloyds",
                },
                "claim_amount": {"type": "number"},
            },
            "required": ["claim_type", "jurisdiction"],
        },
    },
]
