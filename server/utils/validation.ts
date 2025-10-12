/**
 * Extracts and validates the text field from a request body.
 * @throws Returns null if validation fails
 */
export const extractTextFromBody = (
  body: unknown,
): { text: string } | { error: string } => {
  let textValue: unknown;

  if (body && typeof body === "object" && "text" in body) {
    textValue = (body as Record<string, unknown>).text;
  }

  if (typeof textValue !== "string" || !textValue.trim()) {
    return { error: "text is required" };
  }

  return { text: textValue.trim() };
};
