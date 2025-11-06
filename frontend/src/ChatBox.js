import React, { useEffect, useRef, useState } from "react";
import ChatMessage from "./ChatMessage";
import { searchKnowledge, persistLog } from "./api";

const MOCK_EXPERT_ID = "technician-mock-123";

export default function ChatBox({ initialLog, onNewLog, expertId = MOCK_EXPERT_ID }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [elevatorId, setElevatorId] = useState(""); // ✅ Optional now
  const [isLoading, setIsLoading] = useState(false);
  const [logStatus, setLogStatus] = useState("Ready");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (initialLog && initialLog.user_query && initialLog.ai_response) {
      const queryMessage = { role: "user", text: initialLog.user_query };
      const aiResponseMessage = {
        role: "ai",
        results: [
          {
            problem: initialLog.user_query.substring(0, 30) + "...",
            cause: "Loaded from history log",
            steps: initialLog.ai_response,
            distance: 0.0000,
          },
        ],
      };
      setMessages([queryMessage, aiResponseMessage]);
      setLogStatus("Loaded from History");
    } else {
      setMessages([
        {
          role: "assistant",
          text: "Welcome! Enter a problem to search the expert knowledge base. Optionally, provide an Elevator ID to filter results.",
        },
      ]);
      setLogStatus("New Session");
    }
  }, [initialLog]);

  async function handlePersistLog(userQuery, searchResults) {
    setLogStatus("Saving...");
    const saved = await persistLog(expertId, userQuery, searchResults, elevatorId);
    setLogStatus(saved ? "Log Saved" : "Error Saving Log");
    if (saved && onNewLog) onNewLog();
  }

  async function sendQuery(e) {
    e.preventDefault();
    const userQuery = input.trim();
    if (!userQuery || isLoading || !expertId) return;

    const userMessage = { role: "user", text: userQuery };
    const loadingMessage = { role: "assistant", text: "Searching knowledge base..." };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setInput("");
    setIsLoading(true);
    setLogStatus("Processing...");

    // ✅ Elevator ID optional now
    const searchResults = await searchKnowledge(userQuery, elevatorId);

    setIsLoading(false);
    setMessages((prev) => {
      const temp = prev.slice(0, -1);
      const aiMessage = {
        role: "ai",
        results: searchResults,
        text:
          searchResults?.[0]?.problem === "Error"
            ? searchResults[0].steps
            : searchResults?.length
            ? null
            : "No relevant knowledge found.",
      };
      handlePersistLog(userQuery, searchResults);
      return [...temp, aiMessage];
    });
  }

  const isInputDisabled = isLoading || !expertId;

  return (
    <>
      <div className="chat-top">
        <span
          className={`log-status ${
            logStatus.includes("Error")
              ? "error"
              : logStatus.includes("Saved")
              ? "success"
              : "ready"
          }`}
        >
          Log Status: {logStatus}
        </span>
      </div>

      <div className="messages" ref={messagesEndRef}>
        {messages.map((m, i) => (
          <ChatMessage key={i} message={m} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* ✅ Elevator ID (Optional) */}
      <div className="elevator-id-input">
        <input
          type="text"
          placeholder="Enter Elevator ID (optional)"
          value={elevatorId}
          onChange={(e) => setElevatorId(e.target.value)}
          disabled={false}
          className="input-text"
          style={{ marginBottom: "8px", width: "100%" }}
        />
      </div>

      <form className="chat-input" onSubmit={sendQuery}>
        <input
          type="text"
          placeholder={
            expertId
              ? "Describe the issue or ask a question..."
              : "Please log in to start chatting."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isInputDisabled}
        />
        <button
          className="btn"
          type="submit"
          disabled={!input.trim() || isInputDisabled}
        >
          {isLoading ? "Searching..." : "Send"}
        </button>
      </form>
    </>
  );
}
