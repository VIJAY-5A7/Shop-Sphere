import { useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

let currentClerkUserId: string | null = null;

// The interceptor just returns the module-level variable.
// This works because the API client is a singleton and the customFetch
// uses this getter for every request.
setAuthTokenGetter(async () => {
  return currentClerkUserId;
});

// We'll wrap this custom fetch logic to actually inject x-clerk-user-id header
// However, the api client uses Authorization: Bearer by default if setAuthTokenGetter is used.
// We need to override the fetch directly or rely on the proxy if it translates it.
// Actually, to set custom headers reliably without editing custom-fetch, we can overwrite global fetch
// But customFetch in `@workspace/api-client-react` allows options.
// Let's modify customFetch behavior by intercepting global fetch just for our API calls if needed,
// OR since customFetch uses `setAuthTokenGetter` which sets `Authorization: Bearer <token>`,
// if the backend requires `x-clerk-user-id`, we need a custom fetch wrapper or proxy.
// Given the instructions, we can just use the provided instructions. Wait, the instructions say:
// "The cleanest pattern: create artifacts/shop/src/lib/api.ts that configures the API client with a custom fetch that injects the header from a module-level variable, and create a ClerkHeaderInjector component that sets that variable using useAuth().userId."

export function ClerkHeaderInjector() {
  const { userId } = useAuth();
  
  useEffect(() => {
    currentClerkUserId = userId || null;
  }, [userId]);

  return null;
}

// Override customFetch from api-client-react by intercepting global fetch to add the header?
// Since `customFetch` uses global `fetch`, we can wrap it or just rely on the API client.
// Actually, we can patch `window.fetch` to inject `x-clerk-user-id` for API requests.
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const [resource, config] = args;
  
  // Check if it's an API request
  const url = typeof resource === 'string' ? resource : resource instanceof Request ? resource.url : resource.toString();
  if (url.includes('/api/')) {
    const headers = new Headers(config?.headers || (resource instanceof Request ? resource.headers : {}));
    if (currentClerkUserId) {
      headers.set('x-clerk-user-id', currentClerkUserId);
    }
    
    if (resource instanceof Request) {
      const newRequest = new Request(resource, { headers });
      return originalFetch(newRequest, config);
    } else {
      return originalFetch(resource, { ...config, headers });
    }
  }
  
  return originalFetch(...args);
};
