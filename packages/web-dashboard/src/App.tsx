const API_URL = import.meta.env.VITE_API_URL ?? "/api/ping";

const REPO_URL =
  import.meta.env.VITE_REPO_URL ?? "https://example.com/example.com.git";

export function App() {
  async function sendRequest() {
    await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repoUrl: REPO_URL,
      }),
    });
  }

  return (
    <button type="button" onClick={sendRequest}>
      Send request
    </button>
  );
}
