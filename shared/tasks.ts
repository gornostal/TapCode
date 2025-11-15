import type { AgentName } from "./agents";
import type { SandboxMode } from "./sandbox";
import type { TextRequest } from "./http";

export interface TasksResponse {
  items: string[];
}

export type CreateTaskRequest = TextRequest;

export type UpdateTaskRequest = TextRequest;

export interface AddTaskResponse {
  text: string;
}

export interface ReorderTasksRequest {
  fromIndex: number;
  toIndex: number;
}

export interface RunTaskRequest {
  /**
   * Task description to execute. Required when `sessionId` is omitted (new run),
   * otherwise ignored during reconnect requests.
   */
  description?: string;
  /**
   * Unique client-provided identifier used to deduplicate task run requests.
   * When provided, the server will reuse the original session if the same
   * request is submitted multiple times.
   */
  requestId?: string;
  /**
   * Session identifier used to resume an in-flight task run. Required when
   * `description` is omitted; clients should reuse the value returned by the
   * original `/tasks/run` response.
   */
  sessionId?: string;
  agent: AgentName;
  /**
   * Sandbox policy that determines how the agent is allowed to interact with the filesystem.
   */
  sandbox: SandboxMode;
}

export interface TaskIndexParams {
  index: string;
}
