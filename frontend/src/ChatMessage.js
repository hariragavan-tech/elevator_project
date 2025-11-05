import React from "react";

/**
 * Renders a single chat message bubble, specifically formatted for structured search results.
 * @param {{ message: { role: string, text?: string, results?: Array<object> } }} props
 */
export default function ChatMessage({ message }){
    
    if(message.role === "user"){
        return (
            <div className="msg user">
                <div className="bubble">
                    {message.text}
                </div>
            </div>
        );
    }

    const isAssistant = message.role === "ai" || message.role === "assistant";
    
    if(isAssistant){
        const results = message.results;

        // --- LOGIC FOR DISPLAYING STRUCTURED SEARCH RESULTS ---
        if (results && results.length > 0 && results[0].problem !== "Error") {
            return (
                <div className="msg ai">
                    <div className="bubble knowledge-results">
                        <p style={{ fontWeight: 'bold', margin: '0 0 10px 0', color: 'var(--accent-color)' }}>
                            Found {results.length} Relevant Expert Log(s):
                        </p>
                        <div className="results-list" style={{ marginTop: '10px', padding: '0 5px' }}>
                            {results.map((result, idx) => {
                                // FIX: Safely convert distance to a number before calling toFixed
                                const distance = parseFloat(result.distance);
                                const distanceText = !isNaN(distance) ? distance.toFixed(4) : 'N/A';
                                
                                return (
                                    <div key={idx} className="result-card" style={{ 
                                        border: '1px solid #ddd', 
                                        padding: '10px', 
                                        marginBottom: '10px', 
                                        borderRadius: '8px', 
                                        backgroundColor: '#f9f9f9' 
                                    }}>
                                        <p style={{ margin: '0 0 5px 0', fontSize: '0.8em', color: '#666' }}>
                                            Match {idx + 1} (Distance: {distanceText})
                                        </p>
                                        <p style={{ margin: '0 0 5px 0' }}>
                                            <strong style={{ color: 'var(--text-color)' }}>Problem:</strong> {result.problem}
                                        </p>
                                        <p style={{ margin: '0 0 5px 0' }}>
                                            <strong style={{ color: 'var(--text-color)' }}>Cause:</strong> {result.cause}
                                        </p>
                                        <p style={{ margin: '0' }}>
                                            <strong style={{ color: 'var(--accent-color)' }}>Steps:</strong> {result.steps}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            );
        }

        // Handle simple system messages (e.g., "Welcome", "Searching...", or "Error")
        const text = message.text || "No relevant knowledge found.";
        return (
            <div className="msg ai">
                <div className="bubble" style={{ fontStyle: 'italic', color: 'var(--muted)' }}>
                    {text}
                </div>
            </div>
        );
    }

    return null;
}