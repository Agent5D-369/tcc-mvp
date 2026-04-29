export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export type OpenRouterChatArgs = {
  apiKey?: string;
  model?: string;
  messages: ChatMessage[];
  maxOutputTokens?: number;
};

export type OpenRouterChatResult = {
  provider?: string;
  model?: string;
  text: string;
  raw: unknown;
};

export async function createOpenRouterChat(args: OpenRouterChatArgs): Promise<OpenRouterChatResult> {
  const apiKey = args.apiKey || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const model = args.model || process.env.OPENROUTER_DEFAULT_MODEL || "openai/gpt-4.1-mini";

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(process.env.OPENROUTER_HTTP_REFERER ? { "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER } : {}),
      ...(process.env.OPENROUTER_X_TITLE ? { "X-Title": process.env.OPENROUTER_X_TITLE } : {}),
    },
    body: JSON.stringify({
      model,
      messages: args.messages,
      ...(args.maxOutputTokens ? { max_tokens: args.maxOutputTokens } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${body}`);
  }

  const json = await res.json() as any;
  const text = json?.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") {
    throw new Error("OpenRouter returned no assistant content");
  }

  return {
    provider: json?.provider,
    model: json?.model || model,
    text,
    raw: json,
  };
}
