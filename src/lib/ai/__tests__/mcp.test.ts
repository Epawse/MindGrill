import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  getConfiguredMcpServers,
  getDefaultMcpServers,
  getMcpTools,
  listAvailableMcpServerNames,
  McpServersSchema,
} from "../mcp";

describe("MCP server config", () => {
  const original = { ...process.env };
  beforeEach(() => {
    delete process.env.TAVILY_API_KEY;
    delete process.env.MCP_SERVERS;
  });
  afterEach(() => {
    process.env = { ...original };
  });

  it("returns no default servers without TAVILY_API_KEY", () => {
    expect(getDefaultMcpServers()).toEqual([]);
  });

  it("returns a tavily entry when TAVILY_API_KEY is set", () => {
    process.env.TAVILY_API_KEY = "tk_test";
    const servers = getDefaultMcpServers();
    expect(servers).toHaveLength(1);
    expect(servers[0].name).toBe("tavily");
    expect(servers[0].url).toBe("https://mcp.tavily.com/sse");
  });

  it("parses MCP_SERVERS env var as JSON", () => {
    process.env.MCP_SERVERS = JSON.stringify([
      { name: "filesystem", command: "npx", args: ["-y", "@mcp/fs"] },
    ]);
    const servers = getConfiguredMcpServers();
    expect(servers).toHaveLength(1);
    expect(servers[0].name).toBe("filesystem");
  });

  it("returns [] for malformed MCP_SERVERS", () => {
    process.env.MCP_SERVERS = "not-json";
    expect(getConfiguredMcpServers()).toEqual([]);
  });

  it("schema rejects entries without a name", () => {
    const result = McpServersSchema.safeParse([{ url: "x" }]);
    expect(result.success).toBe(false);
  });

  it("getMcpTools returns {} until v6 wires real transports", async () => {
    process.env.TAVILY_API_KEY = "tk_test";
    const tools = await getMcpTools();
    expect(tools).toEqual({});
  });

  it("listAvailableMcpServerNames merges default + configured", () => {
    process.env.TAVILY_API_KEY = "tk_test";
    process.env.MCP_SERVERS = JSON.stringify([
      { name: "filesystem", command: "npx" },
    ]);
    const names = listAvailableMcpServerNames();
    expect(names).toEqual(["tavily", "filesystem"]);
  });
});
