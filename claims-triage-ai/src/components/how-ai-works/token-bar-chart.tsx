"use client";

import { useState, useEffect, useRef } from "react";

interface TokenBar {
  token: string;
  probability: number;
  logprob: number;
}

interface TokenBarChartProps {
  bars: TokenBar[];
  previousBars: TokenBar[] | null;
  topPCutoff: number;
  logitBiasActive: boolean;
  isApproximate: boolean;
}

export function TokenBarChart({ bars, previousBars, topPCutoff, logitBiasActive, isApproximate }: TokenBarChartProps) {
  const [ghostBars, setGhostBars] = useState<TokenBar[] | null>(null);
  const [showGhost, setShowGhost] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (previousBars && previousBars.length > 0) {
      setGhostBars(previousBars);
      setShowGhost(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setShowGhost(false), 2000);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [previousBars]);

  if (!bars || bars.length === 0) {
    return (
      <div className="how-llm-card">
        <div className="how-llm-card-body" style={{ textAlign: "center", padding: "3rem", color: "#999" }}>
          Adjust parameters to see token predictions
        </div>
      </div>
    );
  }

  const maxProb = Math.max(...bars.map((b) => b.probability), 0.01);

  let cumProb = 0;
  let cutoffIdx = bars.length;
  for (let i = 0; i < bars.length; i++) {
    cumProb += bars[i].probability / 100;
    if (cumProb >= topPCutoff) { cutoffIdx = i + 1; break; }
  }

  const ghostMap = new Map<string, number>();
  if (ghostBars) {
    for (const gb of ghostBars) ghostMap.set(gb.token, gb.probability);
  }

  // Color gradient from teal to light gray
  function barColor(idx: number, excluded: boolean): string {
    if (excluded) return "#ddd";
    if (idx === 0) return "#1a6b5c";
    if (idx < 3) return "#2a8b7c";
    if (idx < 8) return "#5cb8a9";
    return "#a0d5cc";
  }

  return (
    <div className="how-llm-card">
      <div className="how-llm-card-header">
        <h3>Token Probability Distribution</h3>
        {isApproximate && <span className="how-llm-approx-badge">Nearest cached result</span>}
      </div>
      <div className="how-llm-card-body">
        {bars.map((bar, idx) => {
          const excluded = topPCutoff < 1.0 && idx >= cutoffIdx;
          const barWidth = (bar.probability / maxProb) * 100;
          const ghostProb = ghostMap.get(bar.token);
          const ghostW = ghostProb ? (ghostProb / maxProb) * 100 : 0;

          return (
            <div key={bar.token + idx}>
              {topPCutoff < 1.0 && idx === cutoffIdx && (
                <div className="how-llm-cutoff-line">
                  <span className="how-llm-cutoff-label">Top-p cutoff ({(topPCutoff * 100).toFixed(0)}%)</span>
                </div>
              )}
              <div className={`how-llm-bar-row ${excluded ? "how-llm-bar-excluded" : ""}`}>
                <div className={`how-llm-bar-token ${idx === 0 ? "top" : ""}`}>
                  {bar.token.replace(/^ /, "\u00B7")}
                </div>
                <div className="how-llm-bar-container">
                  {showGhost && ghostW > 0 && (
                    <div className="how-llm-bar-ghost" style={{ width: `${Math.min(ghostW, 100)}%`, background: "#1a6b5c" }} />
                  )}
                  <div
                    className="how-llm-bar-fill"
                    style={{ width: `${Math.min(barWidth, 100)}%`, background: barColor(idx, excluded) }}
                  />
                </div>
                <div className={`how-llm-bar-prob ${idx === 0 ? "top" : ""}`}>
                  {bar.probability.toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
