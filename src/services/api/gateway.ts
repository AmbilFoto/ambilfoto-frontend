// Every first-party client targets the API Gateway. Internal service ports
// must never be embedded in browser bundles.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api").replace(/\/$/, "");
