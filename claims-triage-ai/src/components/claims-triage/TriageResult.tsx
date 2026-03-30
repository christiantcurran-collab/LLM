"use client";

interface TriageDecision {
  priority: string;
  confidence: number;
  reasoning: string;
  recommended_reserve: number;
  fraud_risk: string;
  fraud_indicators: string[];
  regulatory_flags: string[];
  required_actions: string[];
  estimated_settlement_days: number | null;
  exclusion_risk: boolean;
  exclusion_detail: string | null;
  error?: string;
  raw_text?: string;
}

interface TriageResultProps {
  decision: TriageDecision;
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  fast_track: { label: "Fast Track", color: "#16a34a", bg: "rgba(22,163,74,0.1)" },
  standard: { label: "Standard", color: "#2563eb", bg: "rgba(37,99,235,0.1)" },
  complex: { label: "Complex", color: "#d97706", bg: "rgba(217,119,6,0.1)" },
  refer: { label: "Refer to Underwriter", color: "#7c3aed", bg: "rgba(124,58,237,0.1)" },
  siu_referral: { label: "SIU Referral", color: "#dc2626", bg: "rgba(220,38,38,0.1)" },
};

const FRAUD_CONFIG: Record<string, { color: string; bg: string }> = {
  low: { color: "#16a34a", bg: "rgba(22,163,74,0.1)" },
  medium: { color: "#d97706", bg: "rgba(217,119,6,0.1)" },
  high: { color: "#dc2626", bg: "rgba(220,38,38,0.1)" },
};

function formatGBP(value: number): string {
  if (value >= 1_000_000) return `\u00A3${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `\u00A3${(value / 1_000).toFixed(0)}K`;
  return `\u00A3${value.toFixed(0)}`;
}

export function TriageResult({ decision }: TriageResultProps) {
  if (decision.error) {
    return (
      <div className="ct-card">
        <div className="ct-card-header">
          <h3 className="ct-card-title">Triage Result</h3>
        </div>
        <div className="ct-card-body">
          <div className="ct-error">{decision.error}</div>
          {decision.raw_text && (
            <pre className="ct-trace-json" style={{ marginTop: 12 }}>
              {decision.raw_text}
            </pre>
          )}
        </div>
      </div>
    );
  }

  const priority = PRIORITY_CONFIG[decision.priority] || PRIORITY_CONFIG.standard;
  const fraud = FRAUD_CONFIG[decision.fraud_risk] || FRAUD_CONFIG.low;

  return (
    <div className="ct-card">
      <div className="ct-card-header">
        <h3 className="ct-card-title">Triage Decision</h3>
      </div>
      <div className="ct-card-body">
        {/* Priority + Confidence */}
        <div className="ct-result-top">
          <span
            className="ct-priority-badge"
            style={{ color: priority.color, background: priority.bg }}
          >
            {priority.label}
          </span>
          <div className="ct-confidence">
            <div className="ct-confidence-bar">
              <div
                className="ct-confidence-fill"
                style={{ width: `${decision.confidence * 100}%` }}
              />
            </div>
            <span className="ct-confidence-label">
              {(decision.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
        </div>

        {/* Reasoning */}
        <div className="ct-reasoning">{decision.reasoning}</div>

        {/* Key Metrics */}
        <div className="ct-metrics-grid">
          <div className="ct-metric">
            <span className="ct-metric-label">Recommended Reserve</span>
            <span className="ct-metric-value">{formatGBP(decision.recommended_reserve)}</span>
          </div>
          <div className="ct-metric">
            <span className="ct-metric-label">Fraud Risk</span>
            <span
              className="ct-metric-badge"
              style={{ color: fraud.color, background: fraud.bg }}
            >
              {decision.fraud_risk.toUpperCase()}
            </span>
          </div>
          <div className="ct-metric">
            <span className="ct-metric-label">Est. Settlement</span>
            <span className="ct-metric-value">
              {decision.estimated_settlement_days
                ? `${decision.estimated_settlement_days} days`
                : "TBD"}
            </span>
          </div>
          <div className="ct-metric">
            <span className="ct-metric-label">Exclusion Risk</span>
            <span
              className="ct-metric-badge"
              style={{
                color: decision.exclusion_risk ? "#dc2626" : "#16a34a",
                background: decision.exclusion_risk
                  ? "rgba(220,38,38,0.1)"
                  : "rgba(22,163,74,0.1)",
              }}
            >
              {decision.exclusion_risk ? "YES" : "NO"}
            </span>
          </div>
        </div>

        {/* Exclusion Detail */}
        {decision.exclusion_detail && (
          <div className="ct-flag-section">
            <div className="ct-flag-label">Exclusion Detail</div>
            <div className="ct-flag-text">{decision.exclusion_detail}</div>
          </div>
        )}

        {/* Fraud Indicators */}
        {decision.fraud_indicators.length > 0 && (
          <div className="ct-flag-section">
            <div className="ct-flag-label">Fraud Indicators</div>
            <ul className="ct-flag-list">
              {decision.fraud_indicators.map((ind, i) => (
                <li key={i} className="ct-flag-item ct-flag-fraud">{ind}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Regulatory Flags */}
        {decision.regulatory_flags.length > 0 && (
          <div className="ct-flag-section">
            <div className="ct-flag-label">Regulatory Flags</div>
            <ul className="ct-flag-list">
              {decision.regulatory_flags.map((flag, i) => (
                <li key={i} className="ct-flag-item ct-flag-reg">{flag}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Required Actions */}
        {decision.required_actions.length > 0 && (
          <div className="ct-flag-section">
            <div className="ct-flag-label">Required Actions</div>
            <ol className="ct-action-list">
              {decision.required_actions.map((action, i) => (
                <li key={i} className="ct-action-item">{action}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
