export type ThreadMessageDTO = {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  provider?: string | null;
  modelName?: string | null;
  citations?: unknown[];
  createdAt: string;
};

export type ThreadPayload = {
  id: string;
  title: string;
  threadType: string;
  projectId: string | null;
  agentId: string | null;
  modelPolicyId: string | null;
  messages: ThreadMessageDTO[];
};
