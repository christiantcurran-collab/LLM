"""Mock policy lookup service."""

import json
import os

_POLICIES = None


def _load_policies():
    global _POLICIES
    if _POLICIES is None:
        _root = os.environ.get("PROJECT_ROOT", os.path.join(os.path.dirname(os.path.realpath(__file__)), "..", "..", ".."))
        data_path = os.path.join(_root, "src", "data", "policies.json")
        with open(data_path, "r") as f:
            policies = json.load(f)
        _POLICIES = {p["policy_number"]: p for p in policies}
    return _POLICIES


def policy_lookup(policy_number: str) -> dict:
    """Look up a policy by number. Returns policy details or error."""
    policies = _load_policies()
    policy = policies.get(policy_number)
    if not policy:
        return {
            "error": f"Policy {policy_number} not found",
            "found": False,
        }
    return {
        "found": True,
        "policy_number": policy["policy_number"],
        "insured_name": policy["insured_name"],
        "cover_type": policy["cover_type"],
        "sum_insured": policy["sum_insured"],
        "excess": policy["excess"],
        "inception_date": policy["inception_date"],
        "expiry_date": policy["expiry_date"],
        "status": policy["status"],
        "exclusions": policy["exclusions"],
        "jurisdiction": policy["jurisdiction"],
        "broker": policy["broker"],
        "prior_claims_12m": policy["prior_claims_12m"],
        "recently_increased_limits": policy["recently_increased_limits"],
    }
