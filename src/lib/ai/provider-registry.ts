/**
 * Multi-provider LLM registry.
 *
 * Each entry describes one LLM provider that the app can talk to. Most
 * providers are OpenAI-compatible HTTP endpoints (Doubao, DeepSeek, Qwen, ...);
 * Anthropic and Google use their own native SDKs.
 *
 * Pure data — no SDK imports, safe to use both client and server side.
 */

export const PROVIDER_IDS = [
  "openai",
  "anthropic",
  "google",
  "deepseek",
  "qwen",
  "glm",
  "hunyuan",
  "doubao",
  "openai-compatible",
] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export interface ProviderMeta {
  id: ProviderId;
  displayName: string;
  /** Whether the provider requires an explicit baseURL (true for OpenAI-compatible third parties). */
  requiresBaseUrl: boolean;
  /** Default baseURL filled in if the provider's env var is empty. */
  defaultBaseUrl?: string;
  /** Recommended model ids. The first one is treated as the default. */
  recommendedModels: string[];
  supportsVision: boolean;
  supportsJsonSchema: boolean;
  /** The env var that holds the API key. */
  envKey: string;
  /** Optional env var that overrides the default baseURL. */
  baseUrlEnvKey?: string;
  /** Short marketing line surfaced in the UI. */
  blurb: string;
}

export const PROVIDERS: ProviderMeta[] = [
  {
    id: "openai",
    displayName: "OpenAI",
    requiresBaseUrl: false,
    recommendedModels: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
    supportsVision: true,
    supportsJsonSchema: true,
    envKey: "OPENAI_API_KEY",
    blurb: "",
  },
  {
    id: "anthropic",
    displayName: "Anthropic Claude",
    requiresBaseUrl: false,
    recommendedModels: [
      "claude-3-5-sonnet-latest",
      "claude-3-5-haiku-latest",
      "claude-3-opus-latest",
    ],
    supportsVision: true,
    supportsJsonSchema: true,
    envKey: "ANTHROPIC_API_KEY",
    blurb: "",
  },
  {
    id: "google",
    displayName: "Google AI Studio",
    requiresBaseUrl: false,
    recommendedModels: [
      "gemini-3-flash-preview",
      "gemini-2.5-flash",
      "gemini-2.5-pro",
    ],
    supportsVision: true,
    supportsJsonSchema: true,
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    blurb: "",
  },
  {
    id: "deepseek",
    displayName: "DeepSeek",
    requiresBaseUrl: true,
    defaultBaseUrl: "https://api.deepseek.com",
    recommendedModels: ["deepseek-chat", "deepseek-reasoner"],
    supportsVision: false,
    supportsJsonSchema: true,
    envKey: "DEEPSEEK_API_KEY",
    blurb: "",
  },
  {
    id: "qwen",
    displayName: "通义千问",
    requiresBaseUrl: true,
    defaultBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    recommendedModels: ["qwen-plus", "qwen-max", "qwen-turbo"],
    supportsVision: true,
    supportsJsonSchema: true,
    envKey: "QWEN_API_KEY",
    blurb: "",
  },
  {
    id: "glm",
    displayName: "智谱 GLM",
    requiresBaseUrl: true,
    defaultBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
    recommendedModels: ["glm-4-plus", "glm-4-air", "glm-4-flash"],
    supportsVision: true,
    supportsJsonSchema: true,
    envKey: "GLM_API_KEY",
    blurb: "",
  },
  {
    id: "hunyuan",
    displayName: "腾讯混元",
    requiresBaseUrl: true,
    defaultBaseUrl: "https://api.hunyuan.cloud.tencent.com/v1",
    recommendedModels: ["hunyuan-turbo", "hunyuan-large"],
    supportsVision: false,
    supportsJsonSchema: false,
    envKey: "HUNYUAN_API_KEY",
    blurb: "",
  },
  {
    id: "doubao",
    displayName: "豆包 / Volcengine",
    requiresBaseUrl: true,
    defaultBaseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    recommendedModels: [
      "doubao-seed-1-6-flash",
      "doubao-seed-1-6",
      "doubao-1-5-pro-32k",
    ],
    supportsVision: true,
    supportsJsonSchema: false,
    envKey: "DOUBAO_API_KEY",
    blurb: "",
  },
  {
    id: "openai-compatible",
    displayName: "自定义 OpenAI 兼容",
    requiresBaseUrl: true,
    baseUrlEnvKey: "OPENAI_COMPATIBLE_BASE_URL",
    recommendedModels: ["gpt-4o-mini"],
    supportsVision: false,
    supportsJsonSchema: true,
    envKey: "OPENAI_COMPATIBLE_API_KEY",
    blurb: "",
  },
];

const PROVIDER_BY_ID: Record<string, ProviderMeta> = Object.fromEntries(
  PROVIDERS.map((p) => [p.id, p]),
);

export function getProviderMeta(id: ProviderId): ProviderMeta {
  const meta = PROVIDER_BY_ID[id];
  if (!meta) throw new Error(`unknown provider: ${id}`);
  return meta;
}

export function isProviderId(id: string): id is ProviderId {
  return id in PROVIDER_BY_ID;
}

/** Default model for a provider — first entry of its recommended list. */
export function defaultModelFor(id: ProviderId): string {
  const meta = getProviderMeta(id);
  return meta.recommendedModels[0]!;
}
