export async function readApiResult(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await response.json();
    return {
      data,
      error: typeof data?.error === "string" ? data.error : null,
    };
  }

  const text = await response.text();
  const fallback = response.ok
    ? null
    : text.includes("<!DOCTYPE html>")
      ? `Request failed with ${response.status}. The active deployment is likely missing this route.`
      : text.trim() || `Request failed with ${response.status}.`;

  return {
    data: null,
    error: fallback,
  };
}
