import type { AgentName } from "./agents";

export interface TasksResponse {
  items: string[];
}

export interface UpdateTaskRequest {
  text: string;
}

export interface RunTaskRequest {
  description?: string;
  sessionId?: string;
  agent: AgentName;
}
