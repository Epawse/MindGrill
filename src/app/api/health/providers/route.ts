/**
 * GET /api/health/providers
 * Returns the configured-state of every supported LLM provider.
 */
import { getDefaultProvider, getProviderHealth } from "@/lib/ai";

export const runtime = "nodejs";

export async function GET() {
  const providers = getProviderHealth();
  const defaultProvider = getDefaultProvider();
  return Response.json({
    providers,
    defaultProvider,
    anyConfigured: providers.some((p) => p.configured),
  });
}
