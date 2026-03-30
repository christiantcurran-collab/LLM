import * as fs from "fs";
import * as path from "path";

interface TokenLogprob {
  token: string;
  logprob: number;
  probability: number;
  top_logprobs: Array<{
    token: string;
    logprob: number;
    probability: number;
  }>;
}

interface CachedCompletion {
  text: string;
  tokens: TokenLogprob[];
}

interface CachedResponse {
  id: string;
  params: {
    model: string;
    temperature: number;
    top_p: number;
    max_tokens: number;
    frequency_penalty: number;
    presence_penalty: number;
    system_prompt: string;
    context: string | null;
    stop: string[] | null;
    logit_bias: Record<string, number> | null;
    n: number;
    seed: number | null;
  };
  results: {
    completions: CachedCompletion[];
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    latency_ms: number;
  };
  generated_at: string;
}

const MODELS = ["model-large", "model-medium", "model-small", "model-mini"];
const TEMPERATURES = [0.0, 0.5, 1.0, 1.5, 2.0];
const TOP_PS = [0.2, 0.4, 0.6, 0.8, 1.0];
const PENALTIES = [0.0, 1.0, 2.0];
const MAX_TOKENS_SWEEP = [1, 5, 10, 20, 50];

const SYSTEM_PROMPTS: Record<string, string> = {
  default: "You are a helpful assistant.",
  horror: "You are a horror story writer. Everything you write is dark, suspenseful, and unsettling.",
  children: "You are a children's story author. Everything you write is cheerful, colourful, and suitable for ages 3-5.",
  technical: "You are a veterinary scientist. You describe animal behaviour in precise, clinical terms.",
  comedy: "You are a stand-up comedian. Everything you write is unexpected and designed to get a laugh.",
};

const CONTEXTS: Record<string, string | null> = {
  none: null,
  catflap: "Here is some information about the house: The house has a cat flap installed on the back door. The garden contains a fish pond stocked with koi carp. There is a tall oak tree in the front yard.",
  mouse: "Here is some information about the scene: There is a small mouse hiding under the kitchen table. The mouse has been there for several minutes. The kitchen door is wide open.",
  dog: "Here is some information about the situation: A dog is barking loudly in the hallway. The dog is a large German Shepherd and is very excited. The front door is open.",
  birds: "Here is some information about the environment: A wooden bird feeder hangs over the patio. The patio doors are open and sunflower seeds are scattered near the steps.",
  storm: "Here is some information about the weather: A storm is moving in. Thunder is audible, rain is starting, and wind is rattling the garden gate.",
};

const VOCAB = [
  " door", " garden", " yard", " house", " window", " tree", " path", " porch", " street",
  " kitchen", " hallway", " pond", " fish", " mouse", " dog", " gate", " fence", " garage",
  " steps", " rain", " thunder", " bird", " feeder", " patio", " road", " lawn",
];

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function softmax(logits: number[]): number[] {
  const maxLogit = Math.max(...logits);
  const exps = logits.map((x) => Math.exp(x - maxLogit));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((x) => x / sum);
}

function applyTopP(tokens: Array<{ token: string; p: number }>, topP: number): Array<{ token: string; p: number }> {
  const sorted = [...tokens].sort((a, b) => b.p - a.p);
  let cumulative = 0;
  const kept: Array<{ token: string; p: number }> = [];
  for (const t of sorted) {
    cumulative += t.p;
    kept.push(t);
    if (cumulative >= topP) break;
  }
  const total = kept.reduce((s, t) => s + t.p, 0);
  return kept.map((t) => ({ token: t.token, p: t.p / total }));
}

function sample(tokens: Array<{ token: string; p: number }>, rng: () => number): string {
  const r = rng();
  let acc = 0;
  for (const t of tokens) {
    acc += t.p;
    if (r <= acc) return t.token;
  }
  return tokens[tokens.length - 1]?.token || " door";
}

function contextBoosts(context: string | null): Record<string, number> {
  if (!context) return {};
  if (context.includes("fish pond")) return { " fish": 1.2, " pond": 1.0, " garden": 0.6 };
  if (context.includes("mouse")) return { " mouse": 1.3, " kitchen": 1.0, " table": 0.7 };
  if (context.includes("German Shepherd")) return { " dog": 1.4, " hallway": 0.9, " door": 0.5 };
  if (context.includes("bird feeder")) return { " bird": 1.2, " feeder": 1.0, " patio": 0.9, " seeds": 0.7 };
  if (context.includes("storm")) return { " rain": 1.2, " thunder": 1.1, " gate": 0.7, " wind": 0.7 };
  return {};
}

function modelBoosts(model: string): Record<string, number> {
  switch (model) {
    case "model-large":
      return { " garden": 0.4, " path": 0.2 };
    case "model-medium":
      return { " door": 0.3, " yard": 0.2 };
    case "model-small":
      return { " house": 0.3, " porch": 0.2 };
    case "model-mini":
      return { " street": 0.25, " road": 0.2 };
    default:
      return {};
  }
}

function buildCompletion(params: CachedResponse["params"], completionIndex: number): CachedCompletion {
  const seedKey = JSON.stringify({ ...params, completionIndex });
  const rng = mulberry32(hashString(seedKey));
  const seen = new Map<string, number>();
  const tokenCount = Math.max(1, params.max_tokens);
  const tokens: TokenLogprob[] = [];
  const boostByContext = contextBoosts(params.context);
  const boostByModel = modelBoosts(params.model);

  for (let step = 0; step < tokenCount; step++) {
    const logits = VOCAB.map((word) => {
      const base = 0.3 + rng() * 1.2;
      const contextB = boostByContext[word] ?? 0;
      const modelB = boostByModel[word] ?? 0;
      const seenCount = seen.get(word) ?? 0;
      const freqPenalty = params.frequency_penalty * seenCount * 0.45;
      const presencePenalty = params.presence_penalty * (seenCount > 0 ? 0.5 : 0);
      return base + contextB + modelB - freqPenalty - presencePenalty;
    });

    const temp = Math.max(0.05, params.temperature + 0.05);
    const adjusted = logits.map((l) => l / temp);
    const probs = softmax(adjusted);
    const trimmed = applyTopP(VOCAB.map((token, i) => ({ token, p: probs[i] })), params.top_p);
    const chosen = sample(trimmed, rng);
    seen.set(chosen, (seen.get(chosen) ?? 0) + 1);

    const topLogprobs = trimmed.slice(0, 10).map((t) => ({
      token: t.token,
      logprob: Math.log(Math.max(t.p, 1e-9)),
      probability: t.p * 100,
    }));

    const chosenP = trimmed.find((t) => t.token === chosen)?.p ?? trimmed[0]?.p ?? 1;
    tokens.push({
      token: chosen,
      logprob: Math.log(Math.max(chosenP, 1e-9)),
      probability: chosenP * 100,
      top_logprobs: topLogprobs,
    });
  }

  const text = tokens.map((t) => t.token).join("").trim();
  return { text, tokens };
}

function buildId(params: CachedResponse["params"]): string {
  const contextKey = Object.entries(CONTEXTS).find(([, v]) => v === params.context)?.[0] || "ctx";
  return [
    params.model,
    `t${params.temperature}`,
    `p${params.top_p}`,
    `mt${params.max_tokens}`,
    `fp${params.frequency_penalty}`,
    `pp${params.presence_penalty}`,
    contextKey,
    params.system_prompt === SYSTEM_PROMPTS.default ? "sys_default" : `sys_${hashString(params.system_prompt).toString(16).slice(0, 6)}`,
    params.stop ? `stop_${hashString(JSON.stringify(params.stop)).toString(16).slice(0, 6)}` : "stop_none",
    params.logit_bias ? `lb_${hashString(JSON.stringify(params.logit_bias)).toString(16).slice(0, 6)}` : "lb_none",
    `n${params.n}`,
    params.seed !== null ? `seed${params.seed}` : "noseed",
  ].join("_");
}

function buildEntry(params: CachedResponse["params"]): CachedResponse {
  const completions = Array.from({ length: params.n }, (_, i) => buildCompletion(params, i));
  const promptTokens = 36 + (params.context ? Math.ceil(params.context.length / 22) : 0);
  const completionTokens = completions.reduce((s, c) => s + c.tokens.length, 0);
  const latencySeed = hashString(buildId(params));
  const latency = 120 + (latencySeed % 1400);

  return {
    id: buildId(params),
    params,
    results: {
      completions,
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
      latency_ms: latency,
    },
    generated_at: new Date().toISOString(),
  };
}

function makeBaseParams(): CachedResponse["params"] {
  return {
    model: "model-medium",
    temperature: 0.7,
    top_p: 1.0,
    max_tokens: 1,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
    system_prompt: SYSTEM_PROMPTS.default,
    context: null,
    stop: null,
    logit_bias: null,
    n: 1,
    seed: null,
  };
}

function uniqueKey(params: CachedResponse["params"]): string {
  return JSON.stringify(params);
}

function generate(): CachedResponse[] {
  const seen = new Set<string>();
  const entries: CachedResponse[] = [];

  const push = (params: CachedResponse["params"]) => {
    const key = uniqueKey(params);
    if (seen.has(key)) return;
    seen.add(key);
    entries.push(buildEntry(params));
  };

  for (const model of MODELS) {
    for (const context of Object.values(CONTEXTS)) {
      for (const temperature of TEMPERATURES) {
        for (const top_p of TOP_PS) {
          for (const frequency_penalty of PENALTIES) {
            for (const presence_penalty of PENALTIES) {
              push({
                ...makeBaseParams(),
                model,
                context,
                temperature,
                top_p,
                frequency_penalty,
                presence_penalty,
              });
            }
          }
        }
      }
    }
  }

  for (const model of MODELS) {
    for (const max_tokens of MAX_TOKENS_SWEEP) {
      push({ ...makeBaseParams(), model, max_tokens, temperature: 0.7, top_p: 1.0 });
    }
    for (const n of [1, 3, 5]) {
      push({ ...makeBaseParams(), model, n, max_tokens: 5, temperature: 0.8 });
    }
  }

  for (const stop of [null, ["."], [","], ["\n"]]) {
    push({ ...makeBaseParams(), stop, max_tokens: 20, temperature: 0.9 });
  }

  const logitBiasVariants: Array<Record<string, number> | null> = [
    null,
    { door: -100 },
    { volcano: 5 },
    { fish: 3, pond: 3 },
    { door: -100, dog: -100, garden: -100 },
  ];
  for (const logit_bias of logitBiasVariants) {
    push({ ...makeBaseParams(), logit_bias, temperature: 0.9 });
  }

  for (const system_prompt of Object.values(SYSTEM_PROMPTS)) {
    push({ ...makeBaseParams(), system_prompt, max_tokens: 5, temperature: 1.0, top_p: 0.9 });
  }

  for (const seed of [42, 99, null]) {
    push({ ...makeBaseParams(), seed, max_tokens: 10, temperature: 0.8 });
  }

  return entries;
}

function main() {
  const results = generate();
  const outPath = path.join(process.cwd(), "src", "data", "how-ai-works-cache.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), "utf8");
  console.log(`Generated ${results.length} cached combinations at ${outPath}`);
}

main();
