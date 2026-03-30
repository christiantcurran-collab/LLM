// ============================================
// How AI Works — Cache Lookup & Utilities
// ============================================

export interface TokenLogprob {
  token: string;
  logprob: number;
  probability: number;
  top_logprobs: Array<{
    token: string;
    logprob: number;
    probability: number;
  }>;
}

export interface CachedCompletion {
  text: string;
  tokens: TokenLogprob[];
}

export interface CachedResponse {
  id: string;
  params: HowAIWorksParams;
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

export interface HowAIWorksParams {
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
}

export const SYSTEM_PROMPT_LABELS: Record<string, string> = {
  "You are a helpful assistant.": "Helpful Assistant",
  "You are a horror story writer. Everything you write is dark, suspenseful, and unsettling.": "Horror Writer",
  "You are a children's story author. Everything you write is cheerful, colourful, and suitable for ages 3-5.": "Children's Author",
  "You are a veterinary scientist. You describe animal behaviour in precise, clinical terms.": "Veterinary Scientist",
  "You are a stand-up comedian. Everything you write is unexpected and designed to get a laugh.": "Comedian",
};

export const SYSTEM_PROMPTS: Record<string, string> = {
  "Helpful Assistant": "You are a helpful assistant.",
  "Horror Writer": "You are a horror story writer. Everything you write is dark, suspenseful, and unsettling.",
  "Children's Author": "You are a children's story author. Everything you write is cheerful, colourful, and suitable for ages 3-5.",
  "Veterinary Scientist": "You are a veterinary scientist. You describe animal behaviour in precise, clinical terms.",
  "Comedian": "You are a stand-up comedian. Everything you write is unexpected and designed to get a laugh.",
};

export const CONTEXT_OPTIONS: Record<string, string | null> = {
  "None": null,
  "Cat Flap & Fish Pond": "Here is some information about the house: The house has a cat flap installed on the back door. The garden contains a fish pond stocked with koi carp. There is a tall oak tree in the front yard.",
  "Mouse in Kitchen": "Here is some information about the scene: There is a small mouse hiding under the kitchen table. The mouse has been there for several minutes. The kitchen door is wide open.",
  "Dog in Hallway": "Here is some information about the situation: A dog is barking loudly in the hallway. The dog is a large German Shepherd and is very excited. The front door is open.",
  "Bird Feeder Patio": "Here is some information about the environment: A wooden bird feeder hangs over the patio. The patio doors are open and sunflower seeds are scattered near the steps.",
  "Stormy Night": "Here is some information about the weather: A storm is moving in. Thunder is audible, rain is starting, and wind is rattling the garden gate.",
};

export const LOGIT_BIAS_OPTIONS: Record<string, string> = {
  "None": "none",
  "Suppress 'door'": "suppress_door",
  "Boost 'volcano'": "boost_volcano",
  "Boost 'fish' + 'pond'": "boost_fish_pond",
  "Suppress top 3 defaults": "suppress_top3",
};

export const STOP_OPTIONS: Record<string, string[] | null> = {
  "None": null,
  "Stop at full stop (.)": ["."],
  "Stop at comma (,)": [","],
  "Stop at newline": ["\n"],
};

export const DEFAULT_PARAMS: HowAIWorksParams = {
  model: "model-medium",
  temperature: 0.7,
  top_p: 1.0,
  max_tokens: 1,
  frequency_penalty: 0.0,
  presence_penalty: 0.0,
  system_prompt: "You are a helpful assistant.",
  context: null,
  stop: null,
  logit_bias: null,
  n: 1,
  seed: null,
};

function paramDistance(a: HowAIWorksParams, b: HowAIWorksParams): number {
  let dist = 0;

  // Numeric parameters — normalized differences
  dist += Math.abs(a.temperature - b.temperature) / 2.0;
  dist += Math.abs(a.top_p - b.top_p);
  dist += Math.abs(a.max_tokens - b.max_tokens) / 50;
  dist += Math.abs(a.frequency_penalty - b.frequency_penalty) / 2.0;
  dist += Math.abs(a.presence_penalty - b.presence_penalty) / 2.0;
  dist += Math.abs(a.n - b.n) / 10;

  // Categorical parameters — 0 if match, 1 if different
  if (a.model !== b.model) dist += 2;
  if (a.system_prompt !== b.system_prompt) dist += 2;
  if (a.context !== b.context) dist += 2;
  if (JSON.stringify(a.stop) !== JSON.stringify(b.stop)) dist += 1;
  if (JSON.stringify(a.logit_bias) !== JSON.stringify(b.logit_bias)) dist += 2;
  if (a.seed !== b.seed) dist += 1;

  return dist;
}

export function findClosestCached(
  params: HowAIWorksParams,
  cache: CachedResponse[]
): { entry: CachedResponse; isExact: boolean } | null {
  if (cache.length === 0) return null;

  let bestIdx = 0;
  let bestDist = Infinity;

  for (let i = 0; i < cache.length; i++) {
    const dist = paramDistance(params, cache[i].params);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }

  return {
    entry: cache[bestIdx],
    isExact: bestDist < 0.01,
  };
}

export function getTopLogprobs(entry: CachedResponse): Array<{ token: string; probability: number; logprob: number }> {
  const firstCompletion = entry.results.completions[0];
  if (!firstCompletion || !firstCompletion.tokens[0]) return [];

  return firstCompletion.tokens[0].top_logprobs.map((tlp) => ({
    token: tlp.token,
    probability: tlp.probability,
    logprob: tlp.logprob,
  }));
}

export type LastChangedParam =
  | "temperature"
  | "topP"
  | "model"
  | "context"
  | "systemPrompt"
  | "frequencyPenalty"
  | "presencePenalty"
  | "maxTokens"
  | "stop"
  | "logitBias"
  | "n"
  | "seed"
  | null;
