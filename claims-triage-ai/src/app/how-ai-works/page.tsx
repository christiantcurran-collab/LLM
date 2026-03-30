"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import "./how-ai-works.css";
import {
  DEFAULT_PARAMS,
  findClosestCached,
  getTopLogprobs,
  type HowAIWorksParams,
  type LastChangedParam,
  type CachedResponse,
} from "@/lib/how-ai-works-utils";
import { ParameterPanel } from "@/components/how-ai-works/parameter-panel";
import { TokenBarChart } from "@/components/how-ai-works/token-bar-chart";
import { GeneratedText } from "@/components/how-ai-works/generated-text";
import { WhatChangedPanel } from "@/components/how-ai-works/what-changed-panel";

export default function HowAIWorksPage() {
  const [params, setParams] = useState<HowAIWorksParams>({ ...DEFAULT_PARAMS });
  const [cache, setCache] = useState<CachedResponse[]>([]);
  const [currentEntry, setCurrentEntry] = useState<CachedResponse | null>(null);
  const [previousEntry, setPreviousEntry] = useState<CachedResponse | null>(null);
  const [isExact, setIsExact] = useState(true);
  const [lastChanged, setLastChanged] = useState<LastChangedParam>(null);
  const [previousBars, setPreviousBars] = useState<Array<{ token: string; probability: number; logprob: number }> | null>(null);
  const [heroWord, setHeroWord] = useState("___");
  const [heroFade, setHeroFade] = useState(true);

  // Load cache
  useEffect(() => {
    import("@/data/how-ai-works-cache.json")
      .then((mod) => {
        const data = (mod.default || mod) as CachedResponse[];
        setCache(data);
        const match = findClosestCached(DEFAULT_PARAMS, data);
        if (match) {
          setCurrentEntry(match.entry);
          setIsExact(match.isExact);
        }
      })
      .catch(() => {});
  }, []);

  // Hero word cycling
  const currentBars = currentEntry ? getTopLogprobs(currentEntry) : [];
  const heroPredictions = currentBars.slice(0, 5).map((b) => b.token.trim()).filter(Boolean);

  useEffect(() => {
    if (heroPredictions.length === 0) return;
    let idx = 0;
    setHeroWord(heroPredictions[0]);
    const interval = setInterval(() => {
      setHeroFade(false);
      setTimeout(() => {
        idx = (idx + 1) % heroPredictions.length;
        setHeroWord(heroPredictions[idx]);
        setHeroFade(true);
      }, 250);
    }, 2000);
    return () => clearInterval(interval);
  }, [currentEntry]);

  const handleParamChange = useCallback((newParams: HowAIWorksParams, changed: LastChangedParam) => {
    if (currentEntry) {
      setPreviousBars(getTopLogprobs(currentEntry));
    }
    setPreviousEntry(currentEntry);
    setParams(newParams);
    setLastChanged(changed);
    if (cache.length > 0) {
      const match = findClosestCached(newParams, cache);
      if (match) {
        setCurrentEntry(match.entry);
        setIsExact(match.isExact);
      }
    }
  }, [cache, currentEntry]);

  const handleReset = useCallback(() => {
    if (currentEntry) setPreviousBars(getTopLogprobs(currentEntry));
    setPreviousEntry(currentEntry);
    setParams({ ...DEFAULT_PARAMS });
    setLastChanged(null);
    if (cache.length > 0) {
      const match = findClosestCached(DEFAULT_PARAMS, cache);
      if (match) {
        setCurrentEntry(match.entry);
        setIsExact(match.isExact);
      }
    }
  }, [cache, currentEntry]);

  return (
    <div className="how-llm-page">
      {/* Hero */}
      <section className="how-llm-hero">
        <div className="how-llm-hero-inner">
          <div className="how-llm-hero-badge">Interactive Demo</div>
          <h1>How an LLM Works</h1>
          <p className="how-llm-hero-sub">
                        Watch a large language model predict the next word and see how every parameter changes its mind
          </p>
          <div className="how-llm-sentence-card">
            <span className="how-llm-sentence-text">
              &ldquo;The cat is running towards the{" "}
              <span className={`how-llm-prediction ${heroFade ? "visible" : "hidden"}`}>
                {heroWord}
              </span>
              <span className="how-llm-cursor" />
              &rdquo;
            </span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="how-llm-main">
        <div className="how-llm-main-inner">
          {/* Left: Parameters */}
          <aside className="how-llm-sidebar">
            <ParameterPanel params={params} onChange={handleParamChange} onReset={handleReset} />
          </aside>

          {/* Right: Visualisation */}
          <main className="how-llm-content">
            {cache.length === 0 ? (
              <div className="how-llm-loading">
                <div className="how-llm-spinner" />
                <p>Loading cached API responses...</p>
              </div>
            ) : (
              <>
                <TokenBarChart
                  bars={currentBars}
                  previousBars={previousBars}
                  topPCutoff={params.top_p}
                  logitBiasActive={params.logit_bias !== null}
                  isApproximate={!isExact}
                />
                {currentEntry && (
                  <GeneratedText
                    completions={currentEntry.results.completions}
                    maxTokens={currentEntry.params.max_tokens}
                  />
                )}
                <WhatChangedPanel
                  lastChanged={lastChanged}
                  currentEntry={currentEntry}
                  previousEntry={previousEntry}
                />
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
