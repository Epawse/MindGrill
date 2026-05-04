/**
 * Typed errors raised by the AI provider layer.
 */

export class ProviderConfigError extends Error {
  readonly code = "PROVIDER_CONFIG_ERROR";
  readonly providerId: string;
  readonly missingEnv: string[];
  constructor(providerId: string, missingEnv: string[]) {
    super(
      `Provider "${providerId}" is not configured. Missing env: ${missingEnv.join(
        ", ",
      )}`,
    );
    this.providerId = providerId;
    this.missingEnv = missingEnv;
  }
}

export class AllProvidersFailedError extends Error {
  readonly code = "ALL_PROVIDERS_FAILED";
  readonly attempts: Array<{ providerId: string; error: string }>;
  constructor(attempts: Array<{ providerId: string; error: string }>) {
    super(
      `All LLM providers failed (${attempts.length} attempts): ${attempts
        .map((a) => `${a.providerId}: ${a.error}`)
        .join("; ")}`,
    );
    this.attempts = attempts;
  }
}
