import React, { useEffect, useRef, useState } from "react";
import ChatMessage from "./ChatMessage";
import { searchKnowledge, persistLog } from "./api";

// MOCK: In a real app, this ID would come from AuthContext
const MOCK_EXPERT_ID = "technician-mock-123";

/**
 * Main component for sending queries and receiving vector search results.
 */
export default function ChatBox({ initialLog, onNewLog, expertId = MOCK_EXPERT_ID }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [logStatus, setLogStatus] = useState("Ready"); 
    const messagesEndRef = useRef(null);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (initialLog && initialLog.user_query && initialLog.ai_response) {
            const queryMessage = { role: "user", text: initialLog.user_query };
            
            // Simulating structured data loading from the serialized string 
            const aiResponseMessage = { 
                role: "ai", 
                results: [{
                    problem: initialLog.user_query.substring(0, 30) + '...',
                    cause: 'Loaded from history log',
                    steps: initialLog.ai_response,
                    distance: 0.0000 
                }] 
            };
            setMessages([queryMessage, aiResponseMessage]);
            setLogStatus("Loaded from History");
        } else {
            setMessages([
                { role: "assistant", text: "Welcome! Describe the technical issue to search the expert knowledge base." }
            ]);
            setLogStatus("New Session");
        }
    }, [initialLog]);

    // Handles saving the log (called after search is complete)
    async function handlePersistLog(userQuery, searchResults) {
        setLogStatus("Saving...");
        // Call the imported, fixed persistLog
        const saved = await persistLog(expertId, userQuery, searchResults); 
        setLogStatus(saved ? "Log Saved" : "Error Saving Log");
        if (saved && onNewLog) {
            onNewLog(); 
        }
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
        
        // 1. Call Vector Search (Database Retrieval Only)
        const searchResults = await searchKnowledge(userQuery);
        
        // 2. Final update and persistence
        setIsLoading(false);
        setMessages((prev) => {
            const tempMessages = prev.slice(0, -1); // Remove "Searching..."
            
            // AI message contains the raw results array
            const aiMessage = { 
                role: 'ai', 
                results: searchResults,
                // Display error message if the first result is an Error object
                text: (searchResults && searchResults.length > 0 && searchResults[0].problem === "Error") ? searchResults[0].steps : (searchResults && searchResults.length > 0) ? null : "No relevant knowledge found."
            };
            
            handlePersistLog(userQuery, searchResults); 
            
            return [...tempMessages, aiMessage];
        });
    }

    const isInputDisabled = isLoading || !expertId;

    return (
        <>
            <div className="chat-top">
                <span className={`log-status ${logStatus.includes("Error") ? 'error' : logStatus.includes("Saved") ? 'success' : 'ready'}`}>
                    Log Status: {logStatus}
                </span>
            </div>

            <div className="messages" ref={messagesEndRef}>
                {messages.map((m, i) => (
                    <ChatMessage key={i} message={m} />
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input" onSubmit={sendQuery}>
                <input
                    type="text"
                    placeholder={expertId ? "Type your query..." : "Please log in to start chatting."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isInputDisabled}
                />
                <button
                    className="btn"
                    type="submit"
                    disabled={!input.trim() || isInputDisabled}
                >
                    {isLoading ? 'Searching...' : 'Send'}
                </button>
            </form>
        </>
    );
}