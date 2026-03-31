"""Claude agentic loop for claims triage.

Orchestrates tool calls (policy_lookup, fraud_score, regulatory_check)
until Claude returns a final triage decision.
"""

import json
import importlib.util
import os
import sys
import time

# Resolve source root from PROJECT_ROOT env var (set by API route),
# falling back to __file__-relative resolution.
_PROJECT_ROOT = os.environ.get("PROJECT_ROOT", "")
if _PROJECT_ROOT and os.path.isdir(os.path.join(_PROJECT_ROOT, "src", "lib", "claude")):
    _CLAUDE_DIR = os.path.join(_PROJECT_ROOT, "src", "lib", "claude")
    _LIB_DIR = os.path.join(_PROJECT_ROOT, "src", "lib")
else:
    _CLAUDE_DIR = os.path.dirname(os.path.realpath(__file__))
    _LIB_DIR = os.path.dirname(_CLAUDE_DIR)


def _import_from_file(module_name: str, file_path: str):
    """Import a module from an absolute file path."""
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_tools_mod = _import_from_file("tools", os.path.join(_CLAUDE_DIR, "tools.py"))
_prompt_mod = _import_from_file("system_prompt", os.path.join(_CLAUDE_DIR, "system_prompt.py"))
_schemas_mod = _import_from_file("schemas", os.path.join(_CLAUDE_DIR, "schemas.py"))
_policy_mod = _import_from_file("policy", os.path.join(_LIB_DIR, "services", "policy.py"))
_fraud_mod = _import_from_file("fraud", os.path.join(_LIB_DIR, "services", "fraud.py"))
_regulatory_mod = _import_from_file("regulatory", os.path.join(_LIB_DIR, "services", "regulatory.py"))

import anthropic

TOOLS = _tools_mod.TOOLS
SYSTEM_PROMPT = _prompt_mod.SYSTEM_PROMPT
TriageDecision = _schemas_mod.TriageDecision
policy_lookup = _policy_mod.policy_lookup
fraud_score = _fraud_mod.fraud_score
regulatory_check = _regulatory_mod.regulatory_check


def execute_tool(tool_name: str, tool_input: dict) -> dict:
    """Dispatch a tool call to the appropriate mock service."""
    if tool_name == "policy_lookup":
        return policy_lookup(tool_input["policy_number"])
    elif tool_name == "fraud_score":
        return fraud_score(
            policy_number=tool_input["policy_number"],
            claim_amount=tool_input["claim_amount"],
            claim_description=tool_input["claim_description"],
            days_since_inception=tool_input.get("days_since_inception"),
        )
    elif tool_name == "regulatory_check":
        return regulatory_check(
            claim_type=tool_input["claim_type"],
            jurisdiction=tool_input["jurisdiction"],
            claim_amount=tool_input.get("claim_amount", 0),
        )
    else:
        return {"error": f"Unknown tool: {tool_name}"}


def run_triage(claim_payload: dict) -> dict:
    """Run the agentic triage loop for a single claim.

    Args:
        claim_payload: Dict with keys: policy_number, claim_amount, claim_date,
                       claim_type, description

    Returns:
        Dict with keys: decision (TriageDecision dict), tool_trace (list of tool calls),
        total_turns, latency_ms
    """
    client = anthropic.Anthropic()

    # Build the user message
    claim_prompt = (
        f"Please triage the following insurance claim:\n\n"
        f"Policy Number: {claim_payload['policy_number']}\n"
        f"Claim Amount: £{claim_payload['claim_amount']:,.2f}\n"
        f"Claim Date: {claim_payload['claim_date']}\n"
        f"Claim Type: {claim_payload['claim_type']}\n"
        f"Description: {claim_payload['description']}\n"
    )

    messages = [{"role": "user", "content": claim_prompt}]
    tool_trace = []
    turns = 0
    max_turns = 10
    start_time = time.time()

    while turns < max_turns:
        turns += 1

        response = client.messages.create(
            model="claude-sonnet-4-5-latest",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )

        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    tool_start = time.time()
                    result = execute_tool(block.name, block.input)
                    tool_ms = round((time.time() - tool_start) * 1000)

                    tool_trace.append({
                        "tool_name": block.name,
                        "tool_input": block.input,
                        "tool_output": result,
                        "latency_ms": tool_ms,
                        "turn": turns,
                    })

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result),
                    })

            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})
        else:
            # end_turn — extract final triage decision
            total_ms = round((time.time() - start_time) * 1000)

            # Extract text from response
            text = ""
            for block in response.content:
                if hasattr(block, "text"):
                    text += block.text

            # Parse the JSON decision
            decision = None
            try:
                # Find JSON in the response
                json_start = text.find("{")
                json_end = text.rfind("}") + 1
                if json_start >= 0 and json_end > json_start:
                    decision_json = json.loads(text[json_start:json_end])
                    decision = TriageDecision(**decision_json).model_dump()
            except Exception as e:
                decision = {
                    "error": f"Failed to parse triage decision: {str(e)}",
                    "raw_text": text,
                }

            return {
                "decision": decision,
                "tool_trace": tool_trace,
                "total_turns": turns,
                "latency_ms": total_ms,
                "raw_response": text,
            }

    # Exceeded max turns
    return {
        "decision": {"error": "Exceeded maximum turns without producing a decision"},
        "tool_trace": tool_trace,
        "total_turns": turns,
        "latency_ms": round((time.time() - start_time) * 1000),
        "raw_response": "",
    }


def main():
    """CLI entry point — reads claim from stdin, writes result to stdout."""
    raw = sys.stdin.read()
    payload = json.loads(raw)
    result = run_triage(payload)
    sys.stdout.write(json.dumps(result))


if __name__ == "__main__":
    main()
