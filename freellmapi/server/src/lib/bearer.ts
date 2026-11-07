export function extractBearerToken(header: string | undefined): string | undefined {
  if (!header) return undefined;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}
