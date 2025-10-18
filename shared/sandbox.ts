export type SandboxMode = "project" | "yolo";

export const sandboxModes: readonly SandboxMode[] = [
  "project",
  "yolo",
] as const;

export function isSandboxMode(value: unknown): value is SandboxMode {
  return (
    typeof value === "string" && sandboxModes.includes(value as SandboxMode)
  );
}
