import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from './authcontext';
import { useNavigate } from 'react-router-dom';

// --- CONFIGURATION ---
// Unified Backend URL
const BACKEND_URL = "http://localhost:8001"; 
// Gemini API Key (leave empty, Canvas provides it at runtime)
const GEMINI_API_KEY = ""; 
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;
// ---

// Helper function to handle exponential backoff for API calls
const fetchWithBackoff = async (url, options, maxRetries = 5) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                // If it's a 4xx or 5xx error, throw it immediately
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response;
        } catch (error) {
            console.error(`Attempt ${attempt + 1} failed: ${error.message}`);
            if (attempt === maxRetries - 1) throw error; 

            // Calculate delay: 2^attempt seconds (1, 2, 4, 8, 16)
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

// Component to handle chat and log retrieval
export default function ChatPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [logStatus, setLogStatus] = useState("Not saved");
    const messagesEndRef = useRef(null);

    const expertId = user?.id;

    // Scroll to bottom whenever messages update
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Redirect if not logged in
    useEffect(() => {
        if (!user || !user.id || user.role !== 'technician') {
            navigate('/login');
        }
    }, [user, navigate]);


    // --- RAG IMPLEMENTATION: Fetch relevant expert knowledge ---
    const fetchKnowledge = async (query) => {
        try {
            const res = await axios.get(`${BACKEND_URL}/knowledge_search?query=${encodeURIComponent(query)}&n_results=3`);
            
            // The backend returns an array of relevant document strings
            const relevantDocs = res.data?.results || [];
            
            if (relevantDocs.length > 0) {
                console.log(`🔍 Found ${relevantDocs.length} knowledge items for RAG.`);
                // Format the documents into a single string for the prompt
                return relevantDocs.map((doc, index) => `Context ${index + 1}: ${doc}`).join("\n---\n");
            }
            return null; // Return null if no relevant context is found
        } catch (error) {
            console.error("❌ Error fetching knowledge for RAG:", error);
            return null;
        }
    };
    // -------------------------------------------------------------

    // --- Gemini API Call ---
    const getGeminiResponse = async (userQuery, conversationHistory) => {
        const historyText = conversationHistory.map(msg => 
            msg.role === 'user' ? `User: ${msg.text}` : `AI: ${msg.text}`
        ).join("\n");

        // STEP 1: RAG - Fetch relevant knowledge
        const knowledgeContext = await fetchKnowledge(userQuery);
        
        let systemPrompt = "You are a helpful and detailed technical support expert. Provide concise, step-by-step solutions.";
        
        // Enhance the system prompt with retrieved knowledge
        if (knowledgeContext) {
            systemPrompt += `\n\n--- CRITICAL KNOWLEDGE BASE CONTEXT ---\n${knowledgeContext}\n--- END OF CONTEXT ---\n
            \nBased on the user's current query and the provided knowledge base context above (if relevant), provide the solution. Only use the context if it directly answers the user's question.`;
        }

        const payload = {
            contents: [
                { role: "user", parts: [{ text: userQuery }] }
            ],
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
        };

        try {
            const response = await fetchWithBackoff(GEMINI_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate a response.";
            return text;

        } catch (error) {
            console.error("Gemini API call failed:", error);
            return "The AI service is currently unavailable. Please try again later.";
        }
    };

    // --- Log Storage ---
    const storeLog = async (logData) => {
        setLogStatus("Saving...");
        try {
            // Note: The /api/store_log endpoint is for technician/chat history
            await axios.post(`${BACKEND_URL}/api/store_log`, logData);
            setLogStatus("Saved");
        } catch (error) {
            console.error("Error storing chat log:", error);
            setLogStatus("Error saving log.");
        }
    };

    // --- Main Send Message Handler ---
    const handleSend = async (e) => {
        e.preventDefault();
        const userQuery = input.trim();
        if (!userQuery || isThinking || !expertId) return;

        setInput('');
        setIsThinking(true);
        setLogStatus("Not saved");

        const newMessages = [...messages, { role: 'user', text: userQuery }];
        setMessages(newMessages);

        // Get AI Response (which now includes RAG)
        const aiResponseText = await getGeminiResponse(userQuery, messages);
        
        const finalMessages = [...newMessages, { role: 'ai', text: aiResponseText }];
        setMessages(finalMessages);
        setIsThinking(false);

        // Store the new conversation turn as a log
        const logEntry = {
            expert_id: expertId, // This should be the TECHNICIAN's ID (which we called expertId in AuthContext for simplicity)
            user_query: userQuery,
            ai_response: aiResponseText,
            status: "Completed",
            log_id: `tech_log_${Date.now()}` // Unique ID for ChromaDB
        };
        storeLog(logEntry);
    };

    const handleSignOut = () => {
        logout();
        navigate('/');
    }
    
    // Fallback if not authenticated
    if (!user || !user.id) {
        return null;
    }

    return (
        <>
            <div className="header">
                <div className="title">💬 Technician Chat Support (ID: {expertId})</div>
                <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ fontSize: '0.8em', color: '#666' }}>Log Status: {logStatus}</span>
                    <button className="btn outline" onClick={handleSignOut}>Sign out</button>
                </div>
            </div>
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", height: 'calc(100vh - 80px)' }}>
                {/* Chat Display Area */}
                <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '15px' }}>
                    {messages.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>
                            Hello! How can I assist you with your technical issues today?
                        </p>
                    ) : (
                        messages.map((msg, index) => (
                            <div key={index} style={{
                                marginBottom: '15px',
                                display: 'flex',
                                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                            }}>
                                <div style={{
                                    maxWidth: '70%',
                                    padding: '10px 15px',
                                    borderRadius: '15px',
                                    backgroundColor: msg.role === 'user' ? '#007bff' : '#f1f1f1',
                                    color: msg.role === 'user' ? 'white' : 'black',
                                    wordBreak: 'break-word',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                }}>
                                    {msg.text}
                                </div>
                            </div>
                        ))
                    )}
                    {isThinking && (
                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '15px' }}>
                            <div style={{
                                maxWidth: '70%',
                                padding: '10px 15px',
                                borderRadius: '15px',
                                backgroundColor: '#e9ecef',
                                color: '#6c757d'
                            }}>
                                Thinking...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                
                {/* Input Area */}
                <form onSubmit={handleSend} style={{ display: 'flex', marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '10px' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type your technical query..."
                        disabled={isThinking}
                        style={{ flexGrow: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '4px 0 0 4px', fontSize: '1em' }}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || isThinking}
                        className="btn"
                        style={{ borderRadius: '0 4px 4px 0', minWidth: '80px' }}
                    >
                        {isThinking ? 'Sending...' : 'Send'}
                    </button>
                </form>
            </div>
        </>
    );
}
