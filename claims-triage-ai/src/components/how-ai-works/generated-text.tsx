"use client";

import type { CachedCompletion } from "@/lib/how-ai-works-utils";
import { useState } from "react";

interface GeneratedTextProps {
  completions: CachedCompletion[];
  maxTokens: number;
}

export function GeneratedText({ completions, maxTokens }: GeneratedTextProps) {
  const [hovered, setHovered] = useState<{ c: number; t: number } | null>(null);

  if (maxTokens <= 1 || completions.length === 0) return null;

  return (
    <div className="how-llm-card">
      <div className="how-llm-card-header">
        <h3>Generated Text{completions.length > 1 ? ` (${completions.length} completions)` : ""}</h3>
      </div>
      <div className="how-llm-card-body">
        {completions.map((comp, ci) => (
          <div key={ci} className="how-llm-gen-completion">
            {completions.length > 1 && <span className="how-llm-gen-num">{ci + 1}</span>}
            <span className="how-llm-gen-prefix">&ldquo;The cat is running towards the </span>
            {comp.tokens.map((tok, ti) => {
              const prob = tok.probability;
              const cls = prob > 50 ? "high" : prob > 10 ? "medium" : "low";
              const isHovered = hovered?.c === ci && hovered?.t === ti;
              return (
                <span
                  key={ti}
                  className={`how-llm-gen-token ${cls}`}
                  onMouseEnter={() => setHovered({ c: ci, t: ti })}
                  onMouseLeave={() => setHovered(null)}
                >
                  {tok.token}
                  {isHovered && (
                    <span className="how-llm-tooltip">
                      <div className="how-llm-tooltip-title">{tok.token.trim()} — {prob.toFixed(1)}%</div>
                      {tok.top_logprobs.slice(0, 5).map((alt, i) => (
                        <div key={i} className="how-llm-tooltip-row">
                          <span>{alt.token.replace(/^ /, "\u00B7")}</span>
                          <span>{alt.probability.toFixed(1)}%</span>
                        </div>
                      ))}
                    </span>
                  )}
                </span>
              );
            })}
            <span className="how-llm-gen-prefix">&rdquo;</span>
          </div>
        ))}
        <div className="how-llm-gen-legend">
          <span className="how-llm-gen-legend-item">
            <span className="how-llm-gen-legend-dot" style={{ background: "#1a6b5c" }} />
            High (&gt;50%)
          </span>
          <span className="how-llm-gen-legend-item">
            <span className="how-llm-gen-legend-dot" style={{ background: "#b8860b" }} />
            Medium (10-50%)
          </span>
          <span className="how-llm-gen-legend-item">
            <span className="how-llm-gen-legend-dot" style={{ background: "#dc3545" }} />
            Low (&lt;10%)
          </span>
        </div>
      </div>
    </div>
  );
}
