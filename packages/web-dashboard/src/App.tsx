const API_URL = import.meta.env.VITE_API_URL ?? "/api/ping";

export function App() {
  async function sendRequest() {
    await fetch(API_URL, { method: "GET" });
  }

  return (
    <button type="button" onClick={sendRequest}>
      Send request
    </button>
  );
}
