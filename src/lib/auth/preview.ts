/**
 * Legacy Grok preview configuration. Synaps-X runs with authentication off.
 * No shared OAuth credential is shipped with the standalone application.
 * Any future auth integration must supply its own server-side
 * GROK_AUTH_CLIENT_ID and GROK_AUTH_CLIENT_SECRET (see server.ts).
 */
export const PREVIEW_CLIENT_ID = "grok_preview";
export const PREVIEW_CLIENT_SECRET = "";
export const GROK_ISSUER_DEFAULT = "https://auth.grok.me";
export const PREVIEW_ALLOWED_HOSTS = ["*.grok-sandbox.com"] as const;
