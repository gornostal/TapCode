import type { AgentName } from "./agents";
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
   * Session identifier used to resume an in-flight task run. Required when
   * `description` is omitted; clients should reuse the value returned by the
   * original `/tasks/run` response.
   */
  sessionId?: string;
  agent: AgentName;
}

export interface TaskIndexParams {
  index: string;
}
