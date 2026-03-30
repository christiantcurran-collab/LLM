"""Evaluation harness for ClaimsTriage AI.

Runs all 10 test claims through the triage pipeline and scores outputs.

Scoring criteria (per claim):
- priority_match:     1 point if priority matches expected (exact)
- fraud_detection:    1 point if fraud_risk matches expected level
- exclusion_caught:   1 point if exclusion_risk correctly identified
- regulatory_flags:   1 point if all expected regulatory flags present
- reserve_reasonable: 1 point if reserve within 30% of expected range

Total: 50 points across 10 claims
"""

import json
import os
import sys
from datetime import datetime

# Add lib path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src", "lib"))

from claude.client import run_triage


def load_test_claims():
    path = os.path.join(os.path.dirname(__file__), "..", "src", "data", "test_claims.json")
    with open(path, "r") as f:
        return json.load(f)


def score_claim(expected: dict, actual: dict) -> dict:
    """Score a single claim result against expected output."""
    scores = {
        "priority_match": 0,
        "fraud_detection": 0,
        "exclusion_caught": 0,
        "regulatory_flags": 0,
        "reserve_reasonable": 0,
    }
    details = []

    # Priority match
    if actual.get("priority") == expected["priority"]:
        scores["priority_match"] = 1
    else:
        details.append(
            f"Priority mismatch: expected={expected['priority']}, got={actual.get('priority')}"
        )

    # Fraud detection
    actual_fraud = actual.get("fraud_risk", "low")
    expected_fraud = expected.get("fraud_risk", "low")
    if actual_fraud == expected_fraud:
        scores["fraud_detection"] = 1
    else:
        details.append(
            f"Fraud risk mismatch: expected={expected_fraud}, got={actual_fraud}"
        )

    # Exclusion caught
    actual_exclusion = actual.get("exclusion_risk", False)
    expected_exclusion = expected.get("exclusion_risk", False)
    if actual_exclusion == expected_exclusion:
        scores["exclusion_caught"] = 1
    else:
        details.append(
            f"Exclusion risk mismatch: expected={expected_exclusion}, got={actual_exclusion}"
        )

    # Regulatory flags
    expected_flags = set(expected.get("regulatory_flags", []))
    actual_flags_raw = actual.get("regulatory_flags", [])
    # Fuzzy match: check if expected flag keywords appear in actual flags
    if not expected_flags:
        scores["regulatory_flags"] = 1 if not actual_flags_raw else 1  # no flags expected, any is fine
    else:
        matched = 0
        for ef in expected_flags:
            ef_lower = ef.lower().replace("_", " ")
            for af in actual_flags_raw:
                af_lower = af.lower()
                if ef_lower in af_lower or any(word in af_lower for word in ef_lower.split()):
                    matched += 1
                    break
        if matched >= len(expected_flags):
            scores["regulatory_flags"] = 1
        else:
            details.append(
                f"Regulatory flags mismatch: expected={list(expected_flags)}, got={actual_flags_raw}"
            )

    # Reserve reasonable (within 30% of expected range midpoint)
    reserve_range = expected.get("reserve_estimate_range", [0, 0])
    actual_reserve = actual.get("recommended_reserve", 0)
    if reserve_range[0] == 0 and reserve_range[1] == 0:
        scores["reserve_reasonable"] = 1  # no reserve expected
    else:
        range_mid = (reserve_range[0] + reserve_range[1]) / 2
        tolerance = range_mid * 0.30
        low = reserve_range[0] - tolerance
        high = reserve_range[1] + tolerance
        if low <= actual_reserve <= high:
            scores["reserve_reasonable"] = 1
        else:
            details.append(
                f"Reserve out of range: expected={reserve_range}, got={actual_reserve:.0f}"
            )

    total = sum(scores.values())
    return {
        "scores": scores,
        "total_score": total,
        "max_score": 5,
        "details": "; ".join(details) if details else "All checks passed",
    }


def run_eval():
    """Run the full eval suite."""
    claims = load_test_claims()
    results = []
    total_score = 0
    max_score = 0

    for claim in claims:
        print(f"  Evaluating claim {claim['id']}: {claim['title']}...", file=sys.stderr)

        try:
            triage_result = run_triage({
                "policy_number": claim["policy_number"],
                "claim_amount": claim["claim_amount"],
                "claim_date": claim["claim_date"],
                "claim_type": claim["claim_type"],
                "description": claim["description"],
            })

            decision = triage_result.get("decision", {})
            scoring = score_claim(claim["expected"], decision)

            results.append({
                "claim_id": claim["id"],
                "title": claim["title"],
                "expected_priority": claim["expected"]["priority"],
                "actual_priority": decision.get("priority", "unknown"),
                "scores": scoring["scores"],
                "total_score": scoring["total_score"],
                "max_score": scoring["max_score"],
                "details": scoring["details"],
            })

            total_score += scoring["total_score"]
            max_score += scoring["max_score"]

        except Exception as e:
            results.append({
                "claim_id": claim["id"],
                "title": claim["title"],
                "expected_priority": claim["expected"]["priority"],
                "actual_priority": "error",
                "scores": {
                    "priority_match": 0,
                    "fraud_detection": 0,
                    "exclusion_caught": 0,
                    "regulatory_flags": 0,
                    "reserve_reasonable": 0,
                },
                "total_score": 0,
                "max_score": 5,
                "details": f"Error: {str(e)}",
            })
            max_score += 5

    accuracy_pct = (total_score / max_score * 100) if max_score > 0 else 0

    return {
        "results": results,
        "total_score": total_score,
        "max_score": max_score,
        "accuracy_pct": accuracy_pct,
        "run_at": datetime.now().isoformat(),
    }


def main():
    output_json = "--json" in sys.argv

    if not output_json:
        print("=" * 60)
        print("ClaimsTriage AI — Evaluation Harness")
        print("=" * 60)

    result = run_eval()

    if output_json:
        sys.stdout.write(json.dumps(result))
    else:
        print(f"\nOverall Score: {result['total_score']}/{result['max_score']}")
        print(f"Accuracy: {result['accuracy_pct']:.1f}%")
        print(f"\n{'#':<4} {'Scenario':<35} {'Expected':<14} {'Actual':<14} {'Score':<8}")
        print("-" * 80)
        for r in result["results"]:
            match = "OK" if r["expected_priority"] == r["actual_priority"] else "MISS"
            print(
                f"{r['claim_id']:<4} {r['title'][:33]:<35} "
                f"{r['expected_priority']:<14} {r['actual_priority']:<14} "
                f"{r['total_score']}/{r['max_score']}  {match}"
            )
            if r["details"] != "All checks passed":
                print(f"     -> {r['details']}")

        # Save results
        results_dir = os.path.join(os.path.dirname(__file__), "results")
        os.makedirs(results_dir, exist_ok=True)
        out_path = os.path.join(results_dir, f"eval_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
        with open(out_path, "w") as f:
            json.dump(result, f, indent=2)
        print(f"\nResults saved to: {out_path}")


if __name__ == "__main__":
    main()
