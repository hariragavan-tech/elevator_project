import React from "react";

/**
 * Renders a single chat message bubble, formatted for both conversational AI replies
 * and structured knowledge base search results.
 * @param {{ message: { role: string, text?: string, results?: Array<object> } }} props
 */
export default function ChatMessage({ message }) {
  // --- USER MESSAGE ---
  if (message.role === "user") {
    return (
      <div className="msg user">
        <div className="bubble">{message.text}</div>
      </div>
    );
  }

  const isAssistant = message.role === "ai" || message.role === "assistant";

  if (isAssistant) {
    const results = message.results;

    // ✅ If AI generated a conversational response (from Ollama)
    if (message.text && message.text.trim() !== "") {
      return (
        <div className="msg ai">
          <div
            className="bubble"
            style={{
              whiteSpace: "pre-line",
              lineHeight: "1.6",
              color: "var(--text-color)",
            }}
          >
            {message.text}
          </div>
        </div>
      );
    }

    // --- STRUCTURED SEARCH RESULT DISPLAY (Fallback) ---
    if (results && results.length > 0 && results[0].problem !== "Error") {
      return (
        <div className="msg ai">
          <div className="bubble knowledge-results">
            <p
              style={{
                fontWeight: "bold",
                margin: "0 0 10px 0",
                color: "var(--accent-color)",
              }}
            >
              Found {results.length} Relevant Expert Log(s):
            </p>
            <div
              className="results-list"
              style={{ marginTop: "10px", padding: "0 5px" }}
            >
              {results.map((result, idx) => {
                const distance = parseFloat(result.distance);
                const distanceText = !isNaN(distance)
                  ? distance.toFixed(4)
                  : "N/A";

                return (
                  <div
                    key={idx}
                    className="result-card"
                    style={{
                      border: "1px solid #ddd",
                      padding: "10px",
                      marginBottom: "10px",
                      borderRadius: "8px",
                      backgroundColor: "#f9f9f9",
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 5px 0",
                        fontSize: "0.8em",
                        color: "#666",
                      }}
                    >
                      Match {idx + 1} (Distance: {distanceText})
                    </p>
                    <p style={{ margin: "0 0 5px 0" }}>
                      <strong style={{ color: "var(--text-color)" }}>
                        Problem:
                      </strong>{" "}
                      {result.problem}
                    </p>
                    <p style={{ margin: "0 0 5px 0" }}>
                      <strong style={{ color: "var(--text-color)" }}>
                        Cause:
                      </strong>{" "}
                      {result.cause}
                    </p>
                    <p style={{ margin: "0" }}>
                      <strong style={{ color: "var(--accent-color)" }}>
                        Steps:
                      </strong>{" "}
                      {result.steps}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // --- SIMPLE STATUS / SYSTEM MESSAGES ---
    const text = message.text || "No relevant knowledge found.";
    return (
      <div className="msg ai">
        <div
          className="bubble"
          style={{ fontStyle: "italic", color: "var(--muted)" }}
        >
          {text}
        </div>
      </div>
    );
  }

  return null;
}
