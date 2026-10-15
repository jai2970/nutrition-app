// Turns a failed AI call (Claude or Gemini) into a message that says what
// actually went wrong, so a problem with the key, credits, quota or model is
// visible in the app instead of hiding behind one generic line. (The full
// error is also logged on the server by the router.)
export function aiErrorMessage(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err ?? "");
  if (text === "NO_AI_KEY" || /API_KEY is not set/.test(text)) {
    return "AI meal reading isn't set up: add ANTHROPIC_API_KEY (or GEMINI_API_KEY) on the server.";
  }
  const status = typeof (err as { status?: unknown })?.status === "number" ? (err as { status: number }).status : null;

  if (/credit balance|billing|payment required/i.test(text) || status === 402) {
    return "The AI account is out of credits. Add credits and try again.";
  }
  if (status === 429 || /RESOURCE_EXHAUSTED|quota|rate.?limit|overloaded/i.test(text)) {
    return status === 429 ? "The AI usage limit has been reached. Please try again in a moment." : "The AI service is busy right now. Please try again in a moment.";
  }
  if (status === 401 || status === 403 || /API key (not valid|expired)|API_KEY_INVALID|PERMISSION_DENIED|authentication/i.test(text)) {
    return "The AI service rejected the API key. Check ANTHROPIC_API_KEY (or GEMINI_API_KEY) on the server.";
  }
  if (status === 404 || /model.*(not found|not available)|no longer available|is not supported/i.test(text)) {
    return "The AI model isn't available any more. The app's model setting needs updating.";
  }
  if (status !== null && status >= 500) {
    return "The AI service is busy right now. Please try again in a moment.";
  }
  if (/fetch failed|ENOTFOUND|ECONN|ETIMEDOUT|timed out|network|connection error/i.test(text)) {
    return "Couldn't reach the AI service (network error). Please try again.";
  }
  if (err instanceof SyntaxError || /not a JSON array|empty response|cut off|declined/i.test(text)) {
    return "The AI returned an answer we couldn't read. Please try again, or rephrase the meal.";
  }
  return "The AI helper hit an unexpected error. Please try again in a moment.";
}
