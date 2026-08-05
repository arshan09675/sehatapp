"use client";

/**
 * Replaces the root layout when the layout itself fails, so globals.css and
 * next/font never load here — the styling has to be inline and the token
 * values literal. Keep this file free of imports from the rest of the app:
 * anything that pulls in the stylesheet defeats the point.
 */
export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#F6F7FB",
          color: "#0F172A",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <title>SehatBook could not load</title>
        <div
          style={{
            maxWidth: 420,
            background: "#FFFFFF",
            borderRadius: 16,
            padding: 32,
            textAlign: "center",
            boxShadow: "0 1px 3px rgb(15 23 42 / 0.07)",
          }}
        >
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>
            SehatBook could not load
          </h1>
          <p
            style={{
              fontSize: 15,
              lineHeight: 1.6,
              color: "#64748B",
              margin: "0 0 20px",
            }}
          >
            Something failed on our side. Nothing was booked or changed — try
            again, or email salaam@sehatbook.pk if it keeps happening.
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{
              minHeight: 44,
              padding: "0 24px",
              border: 0,
              borderRadius: 12,
              background: "#2B59E0",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
