"use client";

import { useState } from "react";
import type { HowAIWorksParams, LastChangedParam } from "@/lib/how-ai-works-utils";
import { DEFAULT_PARAMS, SYSTEM_PROMPTS, CONTEXT_OPTIONS, STOP_OPTIONS } from "@/lib/how-ai-works-utils";

interface ParameterPanelProps {
  params: HowAIWorksParams;
  onChange: (params: HowAIWorksParams, changed: LastChangedParam) => void;
  onReset: () => void;
}

export function ParameterPanel({ params, onChange, onReset }: ParameterPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const contextKey = Object.entries(CONTEXT_OPTIONS).find(([, v]) => v === params.context)?.[0] || "None";
  const promptKey = Object.entries(SYSTEM_PROMPTS).find(([, v]) => v === params.system_prompt)?.[0] || "Helpful Assistant";
  const stopKey = Object.entries(STOP_OPTIONS).find(([, v]) => JSON.stringify(v) === JSON.stringify(params.stop))?.[0] || "None";

  const handleCopy = () => {
    const cfg = { model: params.model, temperature: params.temperature, top_p: params.top_p, top_k: params.top_k, max_tokens: params.max_tokens };
    navigator.clipboard.writeText(JSON.stringify(cfg, null, 2));
  };

  return (
    <div className="how-llm-params">
      <div className="how-llm-params-header">
        <h2>Parameters</h2>
        <p>Adjust any parameter to see how predictions change</p>
      </div>

      <div className="how-llm-params-body">
        <div className="how-llm-param-group">
          <div className="how-llm-param-label">
            <span>Temperature</span>
            <span className="how-llm-param-value">{params.temperature.toFixed(1)}</span>
          </div>
          <input type="range" className="how-llm-slider" min={0} max={2} step={0.1} value={params.temperature}
            onChange={(e) => onChange({ ...params, temperature: parseFloat(e.target.value) }, "temperature")} />
          <div className="how-llm-param-range-labels"><span>Predictable</span><span>Creative</span></div>
        </div>

        <div className="how-llm-param-group">
          <div className="how-llm-param-label">
            <span>Top-p</span>
            <span className="how-llm-param-value">{params.top_p.toFixed(1)}</span>
          </div>
          <input type="range" className="how-llm-slider" min={0.1} max={1} step={0.1} value={params.top_p}
            onChange={(e) => onChange({ ...params, top_p: parseFloat(e.target.value) }, "topP")} />
          <div className="how-llm-param-hint">Nucleus sampling — only considers tokens within this cumulative probability.</div>
        </div>

        <div className="how-llm-param-group">
          <div className="how-llm-param-label">
            <span>Top-k</span>
            <span className="how-llm-param-value">{params.top_k}</span>
          </div>
          <input type="range" className="how-llm-slider" min={1} max={100} step={1} value={params.top_k}
            onChange={(e) => onChange({ ...params, top_k: parseInt(e.target.value) }, "topK")} />
          <div className="how-llm-param-range-labels"><span>Focused (1)</span><span>Diverse (100)</span></div>
          <div className="how-llm-param-hint">Only consider the top K most probable tokens at each step.</div>
        </div>

        <div className="how-llm-param-group">
          <div className="how-llm-param-label"><span>Model</span></div>
          <select className="how-llm-select" value={params.model}
            onChange={(e) => onChange({ ...params, model: e.target.value }, "model")}>
            <option value="model-large">model-large</option>
            <option value="model-medium">model-medium</option>
            <option value="model-small">model-small</option>
            <option value="model-mini">model-mini</option>
          </select>
        </div>

        <div className="how-llm-param-group">
          <div className="how-llm-param-label"><span>RAG Context</span></div>
          <select className="how-llm-select" value={contextKey}
            onChange={(e) => onChange({ ...params, context: CONTEXT_OPTIONS[e.target.value] }, "context")}>
            {Object.keys(CONTEXT_OPTIONS).map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          {params.context && <div className="how-llm-context-preview">&ldquo;{params.context}&rdquo;</div>}
        </div>

        <div className="how-llm-param-group">
          <div className="how-llm-param-label"><span>System Prompt</span></div>
          <select className="how-llm-select" value={promptKey}
            onChange={(e) => onChange({ ...params, system_prompt: SYSTEM_PROMPTS[e.target.value] }, "systemPrompt")}>
            {Object.keys(SYSTEM_PROMPTS).map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <div className="how-llm-context-preview">&ldquo;{params.system_prompt}&rdquo;</div>
        </div>

        <button className="how-llm-advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
          <span>{showAdvanced ? "Hide" : "Show"} Advanced</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {showAdvanced ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
          </svg>
        </button>

        {showAdvanced && (
          <>
            <hr className="how-llm-divider" />
            <div className="how-llm-param-group">
              <div className="how-llm-param-label">
                <span>Max Tokens</span>
                <span className="how-llm-param-value">{params.max_tokens}</span>
              </div>
              <input type="range" className="how-llm-slider" min={1} max={50} step={1} value={params.max_tokens}
                onChange={(e) => onChange({ ...params, max_tokens: parseInt(e.target.value) }, "maxTokens")} />
              <div className="how-llm-param-hint">How many tokens to generate. At 1, you see a single next-word prediction.</div>
            </div>
            <div className="how-llm-param-group">
              <div className="how-llm-param-label"><span>Stop Sequence</span></div>
              <select className="how-llm-select" value={stopKey}
                onChange={(e) => onChange({ ...params, stop: STOP_OPTIONS[e.target.value] }, "stop")}>
                {Object.keys(STOP_OPTIONS).map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <div className="how-llm-param-hint">Generation halts when this sequence is produced.</div>
            </div>
          </>
        )}
      </div>

      <div className="how-llm-params-footer">
        <button className="how-llm-btn" onClick={onReset}>Reset</button>
        <button className="how-llm-btn" onClick={handleCopy}>Copy JSON</button>
      </div>
    </div>
  );
}
