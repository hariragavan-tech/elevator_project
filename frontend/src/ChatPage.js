import React, { useEffect, useState } from 'react';
import ChatBox from './ChatBox'; 

// --- MOCK AUTH/ROUTER for standalone simplicity ---
// In a real application, replace this with your actual authentication and router context
const useAuth = () => ({ user: { id: 'tech123', role: 'technician' }, logout: () => console.log("Mock Logout") });
const useNavigate = () => (path) => console.log(`[Mock Router] Navigating to: ${path}`);
// ---

/**
 * The main page component for the Technician Chat Interface, handling both layout and history.
 */
export default function ChatPage(){
    const { user, logout } = useAuth();
    const [logs, setLogs] = useState([]); 
    const [active, setActive] = useState(null); // Selected log for viewing
    const nav = useNavigate();

    // Mock: Load initial logs
    useEffect(()=>{
        const demoLogs = [
            { log_id: 1, user_query: "Server error 503 during deployment phase", ai_response: "--- Match 1 (Distance: 0.12) ---\nProblem: 503 Service Unavailable\nCause: High load or bad gateway\nSteps: Step 1: Check power. Step 2: Check connections.", timestamp: new Date().toISOString() },
            { log_id: 2, user_query: "Motor overheating at 80% throttle", ai_response: "--- Match 1 (Distance: 0.08) ---\nProblem: Motor overheating\nCause: Fan failure\nSteps: Step 1: Check cooling fan. Step 2: Verify fluid levels.", timestamp: new Date().toISOString() }
        ];
        setLogs(demoLogs);
    },[]);

    function onSelect(log){
        setActive(log);
    }
    
    // This is called by ChatBox after a new search/log is saved
    function handleNewLog() {
        console.log("ChatPage: New log saved, refreshing history (mock).");
        // Create a new mock entry for demonstration purposes
        const newLogEntry = { 
            log_id: Date.now(), 
            user_query: `New Query (${logs.length + 1})`, 
            ai_response: "New database retrieval executed.",
            timestamp: new Date().toISOString()
        };
        // Add new log to the top of the list
        setLogs(prev => [newLogEntry, ...prev]);
        setActive(null); // Keep the chat box ready for a new search
    }

    const handleNewSearch = () => {
        setActive(null); // Clear selection to start a fresh chat
    };
    
    const handleSignOut = () => {
        logout();
        nav('/');
    };
    
    if (!user) { return null; } 

    return (
        <div className="page-container">
            {/* Header */}
            <div className="header">
                <div className="title">
                    <span style={{color:'var(--accent-color)'}}>🛠️</span> Tech Console (DB Retrieval Only)
                </div>
                <div style={{display:"flex", gap:'12px'}}>
                    <div style={{marginRight:'10px', color: 'var(--text-color)'}}>Tech ID: {user.id}</div>
                    <button 
                        onClick={handleSignOut} 
                        className="btn outline"
                    >
                        Sign out
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="page">
                {/* Left Column - History */}
                <div className="left-col">
                    <h3 style={{marginTop:0}}>Previous Logs</h3>
                    <button 
                        onClick={handleNewSearch}
                        className="btn" 
                        style={{marginBottom: '10px'}}
                    >
                        + Start New Search
                    </button>
                    <div className="log-list" style={{maxHeight: 'calc(100vh - 200px)', overflowY: 'auto'}}>
                        {logs.map(l => (
                            <div 
                                key={l.log_id} 
                                // 'active' class assumed for styling selected log
                                className={`log-card ${active && active.log_id === l.log_id ? 'active' : ''}`} 
                                onClick={()=>onSelect(l)}
                            >
                                <h4>{l.user_query.substring(0, 40)}{l.user_query.length > 40 ? '...' : ''}</h4>
                                <p>{l.ai_response.substring(0, 70)}...</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column - Chat Box */}
                <div className="right-col">
                    <ChatBox 
                        expertId={user.id} 
                        initialLog={active}
                        onNewLog={handleNewLog}
                    />
                </div>
            </div>
        </div>
    );
}