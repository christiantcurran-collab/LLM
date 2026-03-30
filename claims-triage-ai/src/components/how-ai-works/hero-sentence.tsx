"use client";

import { useState, useEffect } from "react";

interface HeroSentenceProps {
  predictions: string[];
}

export function HeroSentence({ predictions }: HeroSentenceProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (predictions.length <= 1) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIdx((i) => (i + 1) % predictions.length);
        setFade(true);
      }, 250);
    }, 2000);
    return () => clearInterval(interval);
  }, [predictions]);

  const currentWord = predictions[currentIdx] || "___";

  return (
    <div className="text-center py-8 md:py-10 px-4">
      <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-emerald-400 text-[11px] font-semibold tracking-wider uppercase">Interactive Demo</span>
      </div>
      <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2 text-foreground">
        How AI Actually Works
      </h1>
      <p className="text-sm md:text-base text-muted-foreground mb-6 max-w-xl mx-auto leading-relaxed">
        Watch a language model predict the next word — and see how every parameter changes its mind
      </p>

      <div className="inline-block bg-card border border-border rounded-xl px-6 py-4 shadow-lg">
        <div className="text-base md:text-lg lg:text-xl font-medium text-foreground/80">
          &ldquo;The cat is running towards the{" "}
          <span className="relative inline-block min-w-[80px] text-left">
            <span
              className={`inline-block font-bold text-emerald-400 transition-all duration-300 ${
                fade ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
              }`}
            >
              {currentWord}
            </span>
            <span className="inline-block w-[2px] h-[0.9em] bg-emerald-400/70 animate-pulse ml-0.5 align-middle" />
          </span>
          &rdquo;
        </div>
      </div>
    </div>
  );
}
