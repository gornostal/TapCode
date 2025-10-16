export type AgentName = "codex" | "claude";

const agentValues: AgentName[] = ["codex", "claude"];

export function isAgentName(value: unknown): value is AgentName {
  return typeof value === "string" && agentValues.includes(value as AgentName);
}
