"use client";

import { useState } from "react";
import type { HowAIWorksParams, LastChangedParam } from "@/lib/how-ai-works-utils";
import { LOGIT_BIAS_OPTIONS, STOP_OPTIONS } from "@/lib/how-ai-works-utils";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Repeat, UserCheck, Hash, StopCircle, Scale, Layers, Lock } from "lucide-react";

interface AdvancedParamsProps {
  params: HowAIWorksParams;
  onChange: (params: HowAIWorksParams, changed: LastChangedParam) => void;
}

function getLogitBiasForOption(optionKey: string): Record<string, number> | null {
  switch (optionKey) {
    case "suppress_door": return { "suppress": -100 };
    case "boost_volcano": return { "boost": 5 };
    case "boost_fish_pond": return { "boost2": 3 };
    case "suppress_top3": return { "suppress3": -100 };
    default: return null;
  }
}

export function AdvancedParams({ params, onChange }: AdvancedParamsProps) {
  const [expanded, setExpanded] = useState(false);

  const currentBiasLabel = params.logit_bias === null ? "None" :
    Object.entries(LOGIT_BIAS_OPTIONS).find(([, v]) => v !== "none" && params.logit_bias !== null)?.[0] || "None";

  const currentStopLabel = Object.entries(STOP_OPTIONS).find(
    ([, v]) => JSON.stringify(v) === JSON.stringify(params.stop)
  )?.[0] || "None";

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full py-2 px-3 bg-secondary/50 rounded-md border border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>{expanded ? "Hide" : "Show"} Advanced</span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="space-y-6 pt-2">
          {/* Frequency Penalty */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                <Repeat className="h-3.5 w-3.5 text-emerald-400" />
                Freq Penalty
              </Label>
              <span className="text-sm font-mono font-bold text-emerald-400">{params.frequency_penalty.toFixed(1)}</span>
            </div>
            <Slider
              value={[params.frequency_penalty]}
              min={0}
              max={2}
              step={0.1}
              onValueChange={([v]) => onChange({ ...params, frequency_penalty: v }, "frequencyPenalty")}
            />
            <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
              Penalises repeated tokens. Reduces repetition.
            </p>
          </div>

          {/* Presence Penalty */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                Pres Penalty
              </Label>
              <span className="text-sm font-mono font-bold text-emerald-400">{params.presence_penalty.toFixed(1)}</span>
            </div>
            <Slider
              value={[params.presence_penalty]}
              min={0}
              max={2}
              step={0.1}
              onValueChange={([v]) => onChange({ ...params, presence_penalty: v }, "presencePenalty")}
            />
            <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
              Penalises any used token. Encourages diversity.
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                <Hash className="h-3.5 w-3.5 text-emerald-400" />
                Max Tokens
              </Label>
              <span className="text-sm font-mono font-bold text-emerald-400">{params.max_tokens}</span>
            </div>
            <Slider
              value={[params.max_tokens]}
              min={1}
              max={50}
              step={1}
              onValueChange={([v]) => onChange({ ...params, max_tokens: v }, "maxTokens")}
            />
            <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
              How many tokens to generate.
            </p>
          </div>

          {/* Stop Sequences */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
              <StopCircle className="h-3.5 w-3.5 text-emerald-400" />
              Stop Sequence
            </Label>
            <Select value={currentStopLabel} onValueChange={(v) => onChange({ ...params, stop: STOP_OPTIONS[v] }, "stop")}>
              <SelectTrigger className="h-9 text-xs bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(STOP_OPTIONS).map((key) => (
                  <SelectItem key={key} value={key}>{key}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Logit Bias */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
              <Scale className="h-3.5 w-3.5 text-emerald-400" />
              Logit Bias
            </Label>
            <Select
              value={currentBiasLabel}
              onValueChange={(v) => {
                const optionValue = LOGIT_BIAS_OPTIONS[v];
                const bias = optionValue === "none" ? null : getLogitBiasForOption(optionValue);
                onChange({ ...params, logit_bias: bias }, "logitBias");
              }}
            >
              <SelectTrigger className="h-9 text-xs bg-secondary border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(LOGIT_BIAS_OPTIONS).map((key) => (
                  <SelectItem key={key} value={key}>{key}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
              Manually adjust token probabilities.
            </p>
          </div>

          {/* N Completions */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                <Layers className="h-3.5 w-3.5 text-emerald-400" />
                N (Completions)
              </Label>
              <span className="text-sm font-mono font-bold text-emerald-400">{params.n}</span>
            </div>
            <Slider
              value={[params.n]}
              min={1}
              max={10}
              step={1}
              onValueChange={([v]) => onChange({ ...params, n: v }, "n")}
            />
          </div>

          {/* Seed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
                <Lock className="h-3.5 w-3.5 text-emerald-400" />
                Seed
              </Label>
              <button
                onClick={() => onChange({ ...params, seed: params.seed === null ? 42 : null }, "seed")}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  params.seed !== null
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-secondary text-muted-foreground border border-border"
                }`}
              >
                {params.seed !== null ? `On (${params.seed})` : "Off"}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
              Fixed seed = reproducible output.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
