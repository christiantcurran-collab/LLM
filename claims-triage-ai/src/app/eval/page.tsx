"use client";

import { useState } from "react";
import "../claims-triage/claims-triage.css";

interface EvalClaimResult {
  claim_id: number;
  title: string;
  expected_priority: string;
  actual_priority: string;
  scores: {
    priority_match: number;
    fraud_detection: number;
    exclusion_caught: number;
    regulatory_flags: number;
    reserve_reasonable: number;
  };
  total_score: number;
  max_score: number;
  details: string;
}

interface EvalResult {
  results: EvalClaimResult[];
  total_score: number;
  max_score: number;
  accuracy_pct: number;
  run_at: string;
}

export default function EvalPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunEval = async () => {
    setIsRunning(true);
    setEvalResult(null);
    setError(null);

    try {
      const res = await fetch("/api/eval", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Eval failed with status ${res.status}`);
      }
      const data = await res.json();
      setEvalResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="ct-page">
      {/* Hero */}
      <section className="ct-hero">
        <div className="ct-hero-inner">
          <div className="ct-hero-badge">Evaluation Harness</div>
          <h1>Triage Eval Suite</h1>
          <p className="ct-hero-sub">
            Run 10 pre-written test claims through the triage pipeline and measure
            accuracy across priority classification, fraud detection, exclusion
            matching, regulatory flags, and reserve estimation.
          </p>
        </div>
      </section>

      <div className="ct-main">
        <div className="ct-main-inner">
          {/* Run Button */}
          <div className="ct-card">
            <div className="ct-card-header">
              <h3 className="ct-card-title">Evaluation Controls</h3>
            </div>
            <div className="ct-card-body" style={{ textAlign: "center" }}>
              <button
                className="ct-submit"
                onClick={handleRunEval}
                disabled={isRunning}
                style={{ maxWidth: 320, margin: "0 auto" }}
              >
                {isRunning ? (
                  <>
                    <span className="ct-spinner" />
                    Running 10 test claims...
                  </>
                ) : (
                  "Run Full Evaluation"
                )}
              </button>
              <p className="ct-eval-note">
                This will run all 10 test claims through the agentic triage loop.
                Takes 30-60 seconds depending on API latency.
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="ct-card">
              <div className="ct-card-body">
                <div className="ct-error">{error}</div>
              </div>
            </div>
          )}

          {/* Results */}
          {evalResult && (
            <>
              {/* Summary */}
              <div className="ct-card">
                <div className="ct-card-header">
                  <h3 className="ct-card-title">Overall Score</h3>
                </div>
                <div className="ct-card-body">
                  <div className="ct-eval-summary">
                    <div className="ct-eval-score-big">
                      {evalResult.total_score}/{evalResult.max_score}
                    </div>
                    <div className="ct-eval-pct">
                      {evalResult.accuracy_pct.toFixed(1)}% accuracy
                    </div>
                    <div className="ct-eval-time">
                      Run at: {evalResult.run_at}
                    </div>
                  </div>
                </div>
              </div>

              {/* Per-claim results */}
              <div className="ct-card">
                <div className="ct-card-header">
                  <h3 className="ct-card-title">Per-Claim Results</h3>
                </div>
                <div className="ct-card-body">
                  <div className="ct-eval-table-wrap">
                    <table className="ct-eval-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Scenario</th>
                          <th>Expected</th>
                          <th>Actual</th>
                          <th>Priority</th>
                          <th>Fraud</th>
                          <th>Exclusion</th>
                          <th>Regulatory</th>
                          <th>Reserve</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evalResult.results.map((r) => (
                          <tr key={r.claim_id}>
                            <td>{r.claim_id}</td>
                            <td className="ct-eval-title">{r.title}</td>
                            <td>
                              <span className="ct-eval-priority">{r.expected_priority}</span>
                            </td>
                            <td>
                              <span
                                className={`ct-eval-priority ${
                                  r.actual_priority === r.expected_priority ? "ct-eval-match" : "ct-eval-miss"
                                }`}
                              >
                                {r.actual_priority}
                              </span>
                            </td>
                            <td className={r.scores.priority_match ? "ct-eval-pass" : "ct-eval-fail"}>
                              {r.scores.priority_match}/1
                            </td>
                            <td className={r.scores.fraud_detection ? "ct-eval-pass" : "ct-eval-fail"}>
                              {r.scores.fraud_detection}/1
                            </td>
                            <td className={r.scores.exclusion_caught ? "ct-eval-pass" : "ct-eval-fail"}>
                              {r.scores.exclusion_caught}/1
                            </td>
                            <td className={r.scores.regulatory_flags ? "ct-eval-pass" : "ct-eval-fail"}>
                              {r.scores.regulatory_flags}/1
                            </td>
                            <td className={r.scores.reserve_reasonable ? "ct-eval-pass" : "ct-eval-fail"}>
                              {r.scores.reserve_reasonable}/1
                            </td>
                            <td className="ct-eval-total">
                              {r.total_score}/{r.max_score}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
