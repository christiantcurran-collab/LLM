"use client";

import { useState } from "react";

interface ToolCall {
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_output: Record<string, unknown>;
  latency_ms: number;
  turn: number;
}

interface ToolCallTraceProps {
  trace: ToolCall[];
  totalTurns: number;
  totalLatencyMs: number;
}

const TOOL_ICONS: Record<string, string> = {
  policy_lookup: "P",
  fraud_score: "F",
  regulatory_check: "R",
};

const TOOL_COLORS: Record<string, string> = {
  policy_lookup: "#3b82f6",
  fraud_score: "#ef4444",
  regulatory_check: "#8b5cf6",
};

export function ToolCallTrace({ trace, totalTurns, totalLatencyMs }: ToolCallTraceProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className="ct-card">
      <div className="ct-card-header">
        <h3 className="ct-card-title">Agent Tool Call Trace</h3>
        <div className="ct-trace-meta">
          <span className="ct-trace-badge">{trace.length} tool calls</span>
          <span className="ct-trace-badge">{totalTurns} turns</span>
          <span className="ct-trace-badge">{(totalLatencyMs / 1000).toFixed(1)}s</span>
        </div>
      </div>
      <div className="ct-card-body ct-trace-list">
        {trace.map((call, idx) => (
          <div key={idx} className="ct-trace-item">
            <button
              className="ct-trace-row"
              onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            >
              <div className="ct-trace-left">
                <span
                  className="ct-trace-icon"
                  style={{ background: TOOL_COLORS[call.tool_name] || "#6b7280" }}
                >
                  {TOOL_ICONS[call.tool_name] || "?"}
                </span>
                <span className="ct-trace-name">{call.tool_name}</span>
                <span className="ct-trace-turn">Turn {call.turn}</span>
              </div>
              <div className="ct-trace-right">
                <span className="ct-trace-latency">{call.latency_ms}ms</span>
                <span className="ct-trace-chevron">
                  {expandedIdx === idx ? "\u25B2" : "\u25BC"}
                </span>
              </div>
            </button>
            {expandedIdx === idx && (
              <div className="ct-trace-detail">
                <div className="ct-trace-section">
                  <div className="ct-trace-section-label">Input</div>
                  <pre className="ct-trace-json">
                    {JSON.stringify(call.tool_input, null, 2)}
                  </pre>
                </div>
                <div className="ct-trace-section">
                  <div className="ct-trace-section-label">Output</div>
                  <pre className="ct-trace-json">
                    {JSON.stringify(call.tool_output, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
