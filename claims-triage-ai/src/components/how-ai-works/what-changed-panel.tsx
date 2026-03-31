"use client";

import type { LastChangedParam, CachedResponse } from "@/lib/how-ai-works-utils";

interface WhatChangedPanelProps {
  lastChanged: LastChangedParam;
  currentEntry: CachedResponse | null;
  previousEntry: CachedResponse | null;
}

function getExplanation(lastChanged: LastChangedParam, current: CachedResponse | null, previous: CachedResponse | null): { title: string; text: string } | null {
  if (!lastChanged || !current) return null;
  const temp = current.params.temperature;

  switch (lastChanged) {
    case "temperature":
      if (temp <= 0.3) return { title: "Low Temperature — Deterministic Mode", text: "At low temperature, the model is highly deterministic. It almost always picks the most probable token. Notice how one word dominates — the model plays it safe. This is ideal for factual tasks where consistency matters." };
      if (temp <= 0.8) return { title: "Medium Temperature — The Sweet Spot", text: "This is the sweet spot for most applications. The model considers several likely options but still stays coherent. You get some variety without sacrificing quality. Most production systems use temperatures between 0.3 and 0.8." };
      return { title: "High Temperature — Creative Mode", text: "At high temperature, the probability distribution flattens. Unlikely tokens start competing with likely ones. This is where you get creative — or chaotic — outputs. Great for brainstorming, terrible for compliance documents." };
    case "topP":
      if (current.params.top_p <= 0.3) return { title: "Aggressive Nucleus Sampling", text: "Only the very top tokens are considered. Everything else is eliminated before sampling. This is aggressive filtering — the model can only choose from a tiny set of words." };
      return { title: "Wide Nucleus Sampling", text: "Most of the probability mass is included. The model has a wide range of options to sample from. At top_p = 1.0, all tokens are eligible and temperature alone controls randomness." };
    case "topK": {
      const k = current.params.top_k;
      if (k <= 5) return { title: "Low Top-k — Tight Focus", text: "With top_k this low, the model can only choose from the 5 most probable tokens at each step. This produces very predictable, focused output. Combined with low temperature, outputs become near-deterministic." };
      if (k <= 40) return { title: "Moderate Top-k — Balanced Sampling", text: "The model considers a reasonable pool of candidate tokens. This is the default range for most applications — enough variety for natural-sounding text without the risk of incoherent outputs." };
      return { title: "High Top-k — Wide Token Pool", text: "With a large top_k, many tokens remain eligible before sampling. The model has more freedom to surprise you. At very high values, top_k has minimal filtering effect and temperature + top_p dominate the sampling behaviour." };
    }
    case "model": {
      const ct = current.results.completions[0]?.tokens[0]?.top_logprobs[0];
      const pt = previous?.results.completions[0]?.tokens[0]?.top_logprobs[0];
      let cmp = "";
      if (ct && pt && previous) cmp = ` ${current.params.model} predicted "${ct.token.trim()}" with ${ct.probability.toFixed(1)}% confidence. ${previous.params.model} predicted "${pt.token.trim()}" with ${pt.probability.toFixed(1)}% confidence.`;
      return { title: "Model Comparison", text: `Different models have different internal representations and training data.${cmp} Larger models often have sharper distributions on factual completions.` };
    }
    case "context":
      return current.params.context
        ? { title: "RAG in Action — Context Changes Everything", text: "This is Retrieval Augmented Generation in action. Without context, the model relied on its general training data. With the injected context, tokens related to the provided information surge in probability. This is exactly how enterprise RAG systems work." }
        : { title: "No Context — General Knowledge Only", text: "Without any RAG context, the model falls back on its training data to predict the next word. Adding context dramatically shifts these probabilities." };
    case "systemPrompt":
      return { title: "System Prompt — Same Words, Different World", text: "The system prompt completely reframes how the model interprets the sentence. A horror writer sees menace; a children's author sees adventure. Same tokens in, wildly different probabilities out." };
    case "maxTokens":
      return { title: "Token Generation — Autoregressive Magic", text: "At 1 token, you see a single prediction — the bar chart. As you increase, you see the model building a narrative, each token conditioned on everything before it. This is autoregressive generation." };
    case "stop":
      return { title: "Stop Sequences — The Brake Pedal", text: "Stop sequences tell the model when to stop generating. Without one, it keeps going until max_tokens. With a full stop, it writes one sentence and halts. This is how you control output boundaries." };
    default: return null;
  }
}

export function WhatChangedPanel({ lastChanged, currentEntry, previousEntry }: WhatChangedPanelProps) {
  const explanation = getExplanation(lastChanged, currentEntry, previousEntry);

  const title = explanation?.title || "How It Works";
  const text = explanation?.text || "Adjust any parameter on the left to see how it changes the model's prediction. Each change shows real cached API responses — the bar chart updates to show the new probability distribution, and this panel explains what happened and why.";

  return (
    <div className="how-llm-card">
      <div className="how-llm-card-body">
        <div className="how-llm-explain-content">
          <div className="how-llm-explain-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6" /><path d="M10 22h4" />
              <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
            </svg>
          </div>
          <div>
            <div className="how-llm-explain-title">{title}</div>
            <div className="how-llm-explain-text">{text}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
