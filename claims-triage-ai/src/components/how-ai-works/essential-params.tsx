"use client";

import type { HowAIWorksParams, LastChangedParam } from "@/lib/how-ai-works-utils";
import { SYSTEM_PROMPTS, CONTEXT_OPTIONS } from "@/lib/how-ai-works-utils";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Thermometer, Filter, Cpu, FileText, MessageSquare } from "lucide-react";

interface EssentialParamsProps {
  params: HowAIWorksParams;
  onChange: (params: HowAIWorksParams, changed: LastChangedParam) => void;
}

export function EssentialParams({ params, onChange }: EssentialParamsProps) {
  const currentContextKey = Object.entries(CONTEXT_OPTIONS).find(([, v]) => v === params.context)?.[0] || "None";
  const currentPromptKey = Object.entries(SYSTEM_PROMPTS).find(([, v]) => v === params.system_prompt)?.[0] || "Helpful Assistant";

  return (
    <div className="space-y-6">
      {/* Temperature */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
            <Thermometer className="h-3.5 w-3.5 text-emerald-400" />
            Temperature
          </Label>
          <span className="text-sm font-mono font-bold text-emerald-400">{params.temperature.toFixed(1)}</span>
        </div>
        <Slider
          value={[params.temperature]}
          min={0}
          max={2}
          step={0.1}
          onValueChange={([v]) => onChange({ ...params, temperature: v }, "temperature")}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Predictable</span>
          <span>Creative</span>
        </div>
        <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
          Controls randomness. Low = predictable. High = creative.
        </p>
      </div>

      {/* Top-p */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
            <Filter className="h-3.5 w-3.5 text-emerald-400" />
            Top-p
          </Label>
          <span className="text-sm font-mono font-bold text-emerald-400">{params.top_p.toFixed(1)}</span>
        </div>
        <Slider
          value={[params.top_p]}
          min={0.1}
          max={1}
          step={0.1}
          onValueChange={([v]) => onChange({ ...params, top_p: v }, "topP")}
        />
        <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
          Only considers tokens within this cumulative probability.
        </p>
      </div>

      {/* Model */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
          <Cpu className="h-3.5 w-3.5 text-emerald-400" />
          Model
        </Label>
        <Select value={params.model} onValueChange={(v) => onChange({ ...params, model: v }, "model")}>
          <SelectTrigger className="h-9 text-xs font-mono bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="model-large">model-large</SelectItem>
            <SelectItem value="model-medium">model-medium</SelectItem>
            <SelectItem value="model-small">model-small</SelectItem>
            <SelectItem value="model-mini">model-mini</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
          Different models have different prediction patterns.
        </p>
      </div>

      {/* RAG Context */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
          <FileText className="h-3.5 w-3.5 text-emerald-400" />
          RAG Context
        </Label>
        <Select value={currentContextKey} onValueChange={(v) => onChange({ ...params, context: CONTEXT_OPTIONS[v] }, "context")}>
          <SelectTrigger className="h-9 text-xs bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(CONTEXT_OPTIONS).map((key) => (
              <SelectItem key={key} value={key}>{key}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {params.context && (
          <div className="bg-secondary/50 border border-border rounded-md p-2.5 text-[11px] text-muted-foreground leading-relaxed italic">
            &ldquo;{params.context}&rdquo;
          </div>
        )}
        <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
          Inject documents into the prompt. Watch predictions shift.
        </p>
      </div>

      {/* System Prompt */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider">
          <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
          System Prompt
        </Label>
        <Select value={currentPromptKey} onValueChange={(v) => onChange({ ...params, system_prompt: SYSTEM_PROMPTS[v] }, "systemPrompt")}>
          <SelectTrigger className="h-9 text-xs bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(SYSTEM_PROMPTS).map((key) => (
              <SelectItem key={key} value={key}>{key}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="bg-secondary/50 border border-border rounded-md p-2.5 text-[11px] text-muted-foreground leading-relaxed italic">
          &ldquo;{params.system_prompt}&rdquo;
        </div>
      </div>
    </div>
  );
}
