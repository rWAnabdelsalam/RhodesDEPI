// Simple fetch wrapper. All requests go to /api/* which Vite proxies
// to the Express backend in development, and which Vercel routes to
// the serverless function in production.
async function request(path, options = {}) {
    const token = localStorage.getItem("rb_token");
    const baseUrl = import.meta.env.VITE_API_URL || "";

    const res = await fetch(`${baseUrl}/api${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    });

    // 1. Check if the response failed *before* parsing JSON
    if (!res.ok) {
        let errorMessage = `Server error: ${res.status} ${res.statusText}`;

        try {
            // Try to see if the server sent a helpful JSON error body
            const errorData = await res.json();
            if (errorData?.error) errorMessage = errorData.error;
        } catch {
            // It wasn't JSON (e.g. it was the HTML "The page c..." error)
            // Optional: read it as text if you want to inspect it
            const textError = await res.text().catch(() => "");
            if (textError) console.error("Raw server error page:", textError);
        }

        throw new Error(errorMessage);
    }

    // 2. If response is OK, safely parse the JSON
    try {
        return await res.json();
    } catch (err) {
        // Handles cases where a 200 OK returns an empty body or bad JSON
        throw new Error("Received invalid JSON data from the server.");
    }
}


export const api = {
  get: (path, opts) => request(path, opts),
  post: (path, body, opts) => request(path, { method: "POST", body: JSON.stringify(body), ...opts }),
  patch: (path, body, opts) => request(path, { method: "PATCH", body: JSON.stringify(body), ...opts }),
  delete: (path, opts) => request(path, { method: "DELETE", ...opts }),
};
