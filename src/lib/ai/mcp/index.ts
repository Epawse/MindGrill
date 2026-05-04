/**
 * MCP (Model Context Protocol) tool layer — stub.
 *
 * Per PRD § grill 2.0, 辩思/MindGrill is architected to expose dynamically
 * discovered tools (default: Tavily web-search) to the LLM during the grill
 * loop. Vercel AI SDK 5.x does not yet ship a stable `createMCPClient` —
 * `ai-v6` is published under a dist-tag but breaks several of our typings.
 * Rather than couple the demo to an unstable beta, we keep this layer behind
 * a feature flag: when the env vars are absent, `getMcpTools()` returns an
 * empty object and the API routes pass `tools: undefined` to `generateObject`
 * (transparent no-op).
 *
 * To wire a real MCP server later:
 *   1. `pnpm add ai@ai-v6 @modelcontextprotocol/sdk` (or `@ai-sdk/mcp` once GA)
 *   2. Implement `connectClient(config)` to spawn the stdio/SSE transport
 *   3. Pass `tools: await getMcpTools()` to `generateObject` in /api/grill/*
 *   4. Optionally surface `toolsUsed` on the GrillQuestion (schema is forward
 *      compatible — `toolsUsed?: string[]` would simply be ignored by today's
 *      Zod parser since it only validates the listed fields).
 */
import { z } from "zod";

export const McpServerConfigSchema = z.object({
  name: z.string().min(1),
  // For stdio transport
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  // For SSE / Streamable HTTP transport
  url: z.string().url().optional(),
  env: z.record(z.string(), z.string()).optional(),
});
export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;

export const McpServersSchema = z.array(McpServerConfigSchema);

/**
 * Read declarative MCP server definitions from `MCP_SERVERS` env var. Format:
 *   MCP_SERVERS=[{"name":"tavily","url":"https://mcp.tavily.com/sse"}]
 *
 * Returns [] when unset or malformed.
 */
export function getConfiguredMcpServers(): McpServerConfig[] {
  const raw = process.env.MCP_SERVERS;
  if (!raw || raw.trim() === "" || raw.trim() === "[]") return [];
  try {
    const parsed = McpServersSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return [];
    return parsed.data;
  } catch {
    return [];
  }
}

/**
 * Build a default Tavily MCP entry when `TAVILY_API_KEY` is present.
 * Real connection logic (SSE transport, header auth) is deferred to v6.
 */
export function getDefaultMcpServers(): McpServerConfig[] {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) return [];
  return [
    {
      name: "tavily",
      url: "https://mcp.tavily.com/sse",
      env: { TAVILY_API_KEY: tavilyKey },
    },
  ];
}

/**
 * Returns an `AI-SDK tools` object suitable for `generateObject({ tools })`.
 *
 * Stub: returns `{}` (no extra tools) until ai-v6 ships GA. The grill engine
 * calls this before every LLM round, so swapping the implementation is a
 * one-file change with no callsite churn.
 */
export async function getMcpTools(): Promise<Record<string, unknown>> {
  const servers = [...getDefaultMcpServers(), ...getConfiguredMcpServers()];
  if (servers.length === 0) return {};
  // TODO(ai-v6): connect to each server, merge tool maps, return.
  // For now, return empty so downstream consumers stay tools-free.
  return {};
}

/**
 * For UI badges: list available MCP server names, even when their tools
 * aren't actually being invoked yet. Lets the landing page advertise that
 * the architecture supports MCP without lying about it being live.
 */
export function listAvailableMcpServerNames(): string[] {
  return [
    ...getDefaultMcpServers(),
    ...getConfiguredMcpServers(),
  ].map((s) => s.name);
}
