export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function isPrismaConfigError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message;
  return (
    message.includes("Environment variable not found: DATABASE_URL") ||
    message.includes("Can't reach database server") ||
    message.includes("P1001") ||
    message.includes("P1012")
  );
}
