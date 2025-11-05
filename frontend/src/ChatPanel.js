import React, { useState } from 'react';
import ChatBox from './ChatBox';

/**
 * A wrapper component that would manage chat history selection (mocked here)
 * and render the main ChatBox component.
 */
export default function ChatPanel() {
    const [selectedLog, setSelectedLog] = useState(null); 
    const [history, setHistory] = useState([
        { log_id: 1, user_query: "Initial setup query on server error 503", ai_response: "Step 1: Verify power. Step 2: Check connections.", timestamp: new Date().toISOString() }
    ]);

    const expertId = "TECH-007"; 

    const handleNewLog = () => {
        const newLogEntry = { 
            log_id: Date.now(), 
            user_query: `Query ${history.length + 1}: Check new issue`, 
            ai_response: "New AI steps created.",
            timestamp: new Date().toISOString()
        };
        setHistory(prev => [newLogEntry, ...prev]); 
    };

    const handleNewChat = () => {
        setSelectedLog(null); // Clear selection to start a fresh chat
        console.log("Starting new chat session.");
    };

    return (
        <div className="flex h-full bg-gray-50 p-6 space-x-6">
            
            {/* History Panel (Sidebar) */}
            <div className="w-64 bg-white p-4 rounded-xl shadow-lg flex-shrink-0 flex flex-col">
                <h2 className="text-lg font-bold mb-3 text-gray-800">Chat History</h2>
                <button 
                    onClick={handleNewChat}
                    className="w-full mb-4 px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition shadow-md"
                >
                    + Start New Chat
                </button>
                <ul className="space-y-2 text-sm max-h-[85%] overflow-y-auto custom-scrollbar">
                    {history.map((log) => (
                        <li 
                            key={log.log_id} 
                            onClick={() => setSelectedLog(log)}
                            className={`p-2 rounded-lg cursor-pointer truncate ${selectedLog && selectedLog.log_id === log.log_id ? 'bg-blue-100 text-blue-800 font-medium border-l-4 border-blue-500' : 'hover:bg-gray-100 text-gray-700'}`}
                            title={log.user_query}
                        >
                            {log.user_query.substring(0, 30)}...
                        </li>
                    ))}
                </ul>
            </div>
            
            {/* Main Chat Area */}
            <div className="flex-grow">
                <ChatBox 
                    expertId={expertId} 
                    initialLog={selectedLog}
                    onNewLog={handleNewLog}
                />
            </div>
        </div>
    );
}