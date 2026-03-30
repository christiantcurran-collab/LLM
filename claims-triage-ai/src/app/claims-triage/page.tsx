"use client";

import { useState } from "react";
import { ClaimForm, type ClaimPayload } from "@/components/claims-triage/ClaimForm";
import { TriageResult } from "@/components/claims-triage/TriageResult";
import { ToolCallTrace } from "@/components/claims-triage/ToolCallTrace";
import "./claims-triage.css";

interface TriageResponse {
  decision: Record<string, unknown>;
  tool_trace: Array<{
    tool_name: string;
    tool_input: Record<string, unknown>;
    tool_output: Record<string, unknown>;
    latency_ms: number;
    turn: number;
  }>;
  total_turns: number;
  latency_ms: number;
  raw_response: string;
}

export default function ClaimsTriagePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TriageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (claim: ClaimPayload) => {
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(claim),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ct-page">
      {/* Hero */}
      <section className="ct-hero">
        <div className="ct-hero-inner">
          <div className="ct-hero-badge">Agentic AI Demo</div>
          <h1>ClaimsTriage AI</h1>
          <p className="ct-hero-sub">
            An agentic insurance claims triage system powered by Claude tool use.
            Submit a claim and watch Claude autonomously orchestrate policy lookup,
            fraud assessment, and regulatory checks to produce a structured triage decision.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="ct-main">
        <div className="ct-main-inner">
          {/* Claim Form */}
          <section>
            <div className="ct-card">
              <div className="ct-card-header">
                <h3 className="ct-card-title">Claim Intake</h3>
              </div>
              <div className="ct-card-body">
                <ClaimForm onSubmit={handleSubmit} isLoading={isLoading} />
              </div>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="ct-card">
              <div className="ct-card-body">
                <div className="ct-error">{error}</div>
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <>
              <ToolCallTrace
                trace={result.tool_trace}
                totalTurns={result.total_turns}
                totalLatencyMs={result.latency_ms}
              />
              <TriageResult decision={result.decision as never} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
