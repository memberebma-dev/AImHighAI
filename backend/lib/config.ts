// Public origin of the backend (Vercel function under /api on the app domain).
// Used to build hosted-content URLs that routes/preview.ts serves.
// PUBLIC_APP_URL can override; Vercel sets VERCEL_PROJECT_PRODUCTION_URL itself.
function resolveBackendUrl(): string {
  const explicit = process.env.PUBLIC_APP_URL;
  if (explicit) return `${explicit.replace(/\/$/, "")}/api`;
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}/api`;
  throw new Error("Set PUBLIC_APP_URL so preview links point at the live site");
}
export const BACKEND_URL = resolveBackendUrl();
