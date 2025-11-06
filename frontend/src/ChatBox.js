import React, { useEffect, useRef, useState } from "react";
import ChatMessage from "./ChatMessage";
import { searchKnowledge, persistLog, chatWithAI } from "./api";

const MOCK_EXPERT_ID = "technician-mock-123";

export default function ChatBox({
  initialLog,
  onNewLog,
  expertId = MOCK_EXPERT_ID,
  onElevatorIdChange, // ✅ Added prop to send Elevator ID to parent
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [elevatorId, setElevatorId] = useState(""); // ✅ Optional elevator ID
  const [isLoading, setIsLoading] = useState(false);
  const [logStatus, setLogStatus] = useState("Ready");
  const messagesEndRef = useRef(null);

  // ✅ Auto-scroll chat view to bottom when new messages come in
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ Notify parent component when elevator ID changes
  useEffect(() => {
    if (onElevatorIdChange) {
      onElevatorIdChange(elevatorId);
    }
  }, [elevatorId, onElevatorIdChange]);

  // ✅ Load previous log into chat if selected from side panel
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

  // ✅ Save search result logs to backend
  async function handlePersistLog(userQuery, searchResults) {
    setLogStatus("Saving...");
    const saved = await persistLog(expertId, userQuery, searchResults, elevatorId);
    setLogStatus(saved ? "Log Saved" : "Error Saving Log");
    if (saved && onNewLog) onNewLog(); // refresh log list in ChatPage
  }

  // ✅ Send user query and get AI answer
  async function sendQuery(e) {
    e.preventDefault();
    const userQuery = input.trim();
    if (!userQuery || isLoading || !expertId) return;

    const userMessage = { role: "user", text: userQuery };
    setMessages((prev) => [
      ...prev,
      userMessage,
      { role: "assistant", text: "🔍 Searching knowledge base..." },
    ]);
    setInput("");
    setIsLoading(true);
    setLogStatus("Processing...");

    try {
      // 🧠 Step 1: Retrieve related logs from backend
      const searchResults = await searchKnowledge(userQuery, elevatorId);

      // 🧩 Step 2: Prepare context for AI for natural response
      let context = "";
      if (searchResults && searchResults.length > 0 && searchResults[0].problem !== "Error") {
        const readableLogs = searchResults
          .map(
            (r, i) =>
              `Log ${i + 1}: Problem - "${r.problem}". Cause - "${r.cause}". Fixing Steps - "${r.steps}".`
          )
          .join("\n");

        context = `You are a senior elevator maintenance assistant helping new technicians. 
Here are previous repair logs:\n${readableLogs}\n
Now, based on these past experiences, provide a professional, step-by-step fix guide for the technician’s issue in clear points.
Do NOT suggest contacting experts. Assume you are the expert guiding them directly.`;
      } else {
        context = `No similar logs were found. Use your elevator repair knowledge to answer this problem with step-by-step guidance.`;
      }

      // 🗣️ Step 3: Create message structure for the model
      const chatMessages = [
        {
          role: "system",
          content:
            "You are a knowledgeable elevator maintenance assistant helping technicians troubleshoot issues. Always provide your answer in a structured, calm, and encouraging way. Give fixes in bullet points under 'Fixing Steps'.",
        },
        {
          role: "user",
          content: `Technician's Query: "${userQuery}"\n\n${context}`,
        },
      ];

      // 💬 Step 4: Request AI response from Ollama (Phi-3)
      const aiReply = await chatWithAI(chatMessages);

      // 🧾 Step 5: Update UI with AI message
      const finalAIMessage = {
        role: "ai",
        text: aiReply,
        results: searchResults,
      };

      setMessages((prev) => {
        const temp = prev.slice(0, -1); // remove "loading" message
        return [...temp, finalAIMessage];
      });

      // 💾 Step 6: Save log to backend for record
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
      {/* --- Top Status Bar --- */}
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

      {/* --- Chat Message Area --- */}
      <div className="messages" ref={messagesEndRef}>
        {messages.map((m, i) => (
          <ChatMessage key={i} message={m} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* --- Elevator ID Field --- */}
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

      {/* --- Query Input Field --- */}
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
