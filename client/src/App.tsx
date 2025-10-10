import { useEffect, useState } from "react";
import type { HelloResponse } from "@shared/messages";

function App() {
  const [message, setMessage] = useState("Loading server message...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadServerMessage = async () => {
      try {
        const response = await fetch("/hello", { signal: controller.signal });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as HelloResponse;
        setMessage(data.message);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    };

    void loadServerMessage();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-white via-slate-100 to-indigo-100 flex items-center justify-center px-6 py-16 text-slate-900">
      <section className="max-w-2xl text-center">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
          Welcome to PocketIDE
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-lg text-slate-600">
          Code confidently from anywhere while the server keeps the agents in
          sync.
        </p>
        <div className="mx-auto mt-10 max-w-md rounded-3xl bg-white/90 p-6 shadow-xl shadow-indigo-300/40 ring-1 ring-indigo-100 backdrop-blur">
          <h2 className="text-left text-xl font-semibold text-slate-900">
            Server Check
          </h2>
          {error ? (
            <p className="mt-4 text-left text-base font-semibold text-rose-600">
              Unable to load message: {error}
            </p>
          ) : (
            <p className="mt-4 text-left text-base text-slate-700">{message}</p>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
