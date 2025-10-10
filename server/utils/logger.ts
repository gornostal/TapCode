export function log(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

export function logError(error: unknown) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}]`, error);
}
