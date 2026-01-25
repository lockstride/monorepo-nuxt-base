// Test setup utilities for API e2e tests
export const getApiBaseUrl = (): string => {
  const domain = process.env.INTEROP_API_DOMAIN || "http://127.0.0.1";
  const port = process.env.API_PORT || "3001";
  return `${domain}:${port}`;
};

// Make it available globally for all tests
export const apiBaseUrl = getApiBaseUrl();
