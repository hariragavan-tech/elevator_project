import React, { useEffect, useRef, useState } from "react";
import ChatMessage from "./ChatMessage";
import { searchKnowledge, persistLog, chatWithAI } from "./api";

const MOCK_EXPERT_ID = "technician-mock-123";

export default function ChatBox({ initialLog, onNewLog, expertId = MOCK_EXPERT_ID }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [elevatorId, setElevatorId] = useState(""); // optional
  const [isLoading, setIsLoading] = useState(false);
  const [logStatus, setLogStatus] = useState("Ready");
  const messagesEndRef = useRef(null);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load from previous logs if available
  useEffect(() => {
    if (initialLog && initialLog.user_query && initialLog.ai_response) {
      const queryMessage = { role: "user", text: initialLog.user_query };
      const aiResponseMessage = {
        role: "ai",
        text: initialLog.ai_response,
      };
      setMessages([queryMessage, aiResponseMessage]);
      setLogStatus("Loaded from History");
    } else {
      setMessages([
        {
          role: "assistant",
          text: "👋 Welcome! Describe your elevator problem, and I’ll suggest solutions from past expert logs. (Elevator ID optional)",
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
    setMessages((prev) => [...prev, userMessage, { role: "assistant", text: "🔍 Searching knowledge base..." }]);
    setInput("");
    setIsLoading(true);
    setLogStatus("Processing...");

    try {
      // 🧠 Step 1: Retrieve related logs from backend
      const searchResults = await searchKnowledge(userQuery, elevatorId);

      // 🧩 Step 2: Build context for AI to make response human-friendly
      let context = "";
      if (searchResults && searchResults.length > 0 && searchResults[0].problem !== "Error") {
        const readableLogs = searchResults.map((r, i) =>
          `Log ${i + 1}: The issue reported was "${r.problem}". The cause identified was "${r.cause}". The technician fixed it by "${r.steps}".`
        ).join("\n");

        context = `You are an expert elevator maintenance assistant. Here are previous logs from technicians:\n${readableLogs}\n\nNow answer this technician's question naturally and clearly. If useful, reference the logs (e.g., "Based on Log 1...").`;
      } else {
        context = "No relevant logs found. Respond based on your general elevator repair knowledge.";
      }

      // 🗣️ Step 3: Build chat messages for LLM
      const chatMessages = [
        {
          role: "system",
          content: "You are a helpful and knowledgeable elevator maintenance assistant. Give clear, concise, and friendly answers.",
        },
        {
          role: "user",
          content: `${context}\n\nTechnician's question: "${userQuery}"`,
        },
      ];

      // 💬 Step 4: Get AI response from Ollama model
      const aiReply = await chatWithAI(chatMessages);

      // 🪄 Step 5: Update UI
      const finalAIMessage = {
        role: "ai",
        text: aiReply,
        results: searchResults, // still keeps retrieved results for history
      };

      setMessages((prev) => {
        const temp = prev.slice(0, -1); // remove loading message
        return [...temp, finalAIMessage];
      });

      // 💾 Step 6: Save log for reference
      handlePersistLog(userQuery, searchResults);
    } catch (err) {
      console.error("❌ Chat error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "⚠️ An error occurred while processing your query." },
      ]);
    }

    setIsLoading(false);
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

      {/* 🆔 Optional Elevator ID input */}
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
              ? "Ask a question or describe an issue..."
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
          {isLoading ? "Thinking..." : "Send"}
        </button>
      </form>
    </>
  );
}
