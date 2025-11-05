import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import ChatMessage from "./ChatMessage";

// --- CONFIGURATION ---
const BACKEND_URL = "http://localhost:8001"; // Technician/Chat Service
// ---

// Component now expects 'expertId' to be passed from the parent component (Technician ID)
export default function ChatBox({ initialLog, onNewLog, expertId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesRef = useRef(null);

  // Load initial log content when selected from the side panel
  useEffect(() => {
    if (initialLog) {
      const queryText = initialLog.user_query;
      const responseText = initialLog.ai_response;
      // Convert single response string back into steps array for display
      const steps = responseText.split('\n').filter(Boolean); 

      const queryMessage = { role: "user", text: queryText };
      const aiResponseMessage = { 
        role: "ai", 
        text: responseText, 
        steps: steps 
      };
      setMessages([queryMessage, aiResponseMessage]);
    } else {
      setMessages([]);
    }
  }, [initialLog]);

  // Scroll to the bottom on new messages
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);


  // FUNCTION TO SAVE MESSAGE TO DATABASE
  async function persistLog(userQuery, aiResponseText) {
    if (!expertId) return; 

    try {
      const logId = crypto.randomUUID(); 

      // Data structure matching the assumed backend schema
      const logData = {
        expert_id: expertId, // Dynamic ID of the logged-in technician
        user_query: userQuery,      
        ai_response: aiResponseText, // Must be a single string for backend
        status: "completed",        
        timestamp: new Date().toISOString(), 
        log_id: logId,              
      };
      
      // POST to the FastAPI endpoint to store the chat log
      const res = await axios.post(`${BACKEND_URL}/api/store_log`, logData);
      
      // Notify ChatPage to refresh its list
      if (onNewLog && res.status === 200) {
          onNewLog();
      }

    } catch (err) {
      console.error("Error saving log:", err.response ? err.response.data : err.message);
    }
  }

  async function sendQuery(e) {
    e.preventDefault();
    if (!input.trim() || isLoading || !expertId) return;

    const userQuery = input.trim();
    setMessages((prev) => [...prev, { role: "user", text: userQuery }]);
    setInput("");
    setIsLoading(true);

    const steps = generateDemoSteps(userQuery);
    const aiResponseText = steps.join("\n"); 
    
    setTimeout(async () => {
      setIsLoading(false);
        
      setMessages((prev) => {
        const aiMessage = { role: "ai", text: aiResponseText, steps };
        // CRITICAL: CALL PERSISTENCE FUNCTION HERE
        persistLog(userQuery, aiResponseText); 
        return [...prev, aiMessage];
      });
    }, 700);
  }
  
  function generateDemoSteps(q) {
    if (/door/i.test(q))
      return [
        "Step 1: Check door tracks and clear any obstruction.",
        "Step 2: Lubricate the guides and test door motor.",
        "Step 3: Inspect limit switches and sensors.",
      ];
    if (/sensor/i.test(q))
      return [
        "Step 1: Power off and inspect sensor connectors.",
        "Step 2: Clean the sensor lens.",
        "Step 3: Replace the sensor if readings are inconsistent.",
      ];
    return [
      "Step 1: Check wiring and power supply.",
      "Step 2: Verify control board connections.",
      "Step 3: Test the motor relay.",
    ];
  }

  const isInputDisabled = isLoading || !expertId;

  return (
    <>
      <div className="messages" ref={messagesRef}>
        {messages.map((m, i) => (
          <ChatMessage key={i} message={m} />
        ))}
        {isLoading && (
          <div className="message ai-message">
            Thinking...
          </div>
        )}
      </div>

      <form className="chat-input" onSubmit={sendQuery}>
        <input
          type="text"
          placeholder={expertId ? "Type your query..." : "Please log in to start chatting."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isInputDisabled}
        />
        <button className="btn" type="submit" disabled={isInputDisabled}>
          Send
        </button>
      </form>
    </>
 );
}