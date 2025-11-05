import React, { useState, useEffect } from 'react';

// --- MOCKED AUTH HOOK ---
// Mocking the auth context for a single-file React environment.
const useAuth = () => {
    // Return a default expert user for functionality testing
    const [user, setUser] = useState({ uid: 'EXPERT_12345' });

    const signOut = () => {
        // In a real app, this would handle Firebase sign-out
        console.log("Mock Sign Out triggered.");
        setUser(null);
    };

    return { user, signOut };
};
// --- END MOCKED AUTH HOOK ---

// Utility function to generate a readable ISO timestamp
const getTimestamp = () => new Date().toISOString();

// Utility for exponential backoff (crucial for API calls)
const fetchDataWithRetry = async (url, options, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                // Throw an error for non-200 responses
                const errorText = await response.text();
                throw new Error(`Server Error (${response.status}): ${errorText.substring(0, 100)}...`);
            }
            return response;
        } catch (error) {
            if (i < retries - 1) {
                // Exponential backoff wait: 1s, 2s, 4s
                const delay = Math.pow(2, i) * 1000;
                console.warn(`Fetch attempt ${i + 1} failed. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw error; // Throw final error
            }
        }
    }
};


const ExpertPanel = () => {
    const { user, signOut } = useAuth();
    const [problem, setProblem] = useState('');
    const [cause, setCause] = useState('');
    const [steps, setSteps] = useState('');
    const [message, setMessage] = useState('');
    const [storedLogs, setStoredLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    const expertId = user?.uid || 'expert_demo';
    const API_URL = 'http://127.0.0.1:8001';

    const fetchLogs = async () => {
        if (!user) return;

        setLoading(true);
        setMessage('');

        try {
            // Fetch using the expert's ID
            const response = await fetchDataWithRetry(`${API_URL}/get_logs/${expertId}`);
            const data = await response.json();
            
            // Assume the backend returns an array of documents or metadatas
            let logsToDisplay = [];
            
            if (data.logs && data.logs.metadatas) {
                // Structure the log data from metadatas
                 logsToDisplay = data.logs.metadatas.map((meta, index) => ({
                    id: data.logs.ids[index], // Use the unique ID from Chroma
                    problem: meta.problem || 'N/A',
                    cause: meta.cause || 'N/A',
                    steps: meta.steps || 'N/A',
                    timestamp: meta.timestamp ? new Date(meta.timestamp).toLocaleString() : 'N/A',
                 })).reverse(); // Show newest first
            } else {
                setMessage('Warning: Data structure unexpected. Cannot display logs.');
            }

            setStoredLogs(logsToDisplay);

        } catch (error) {
            console.error("Error fetching logs:", error);
            setMessage(`🔴 Error fetching logs. Is the /get_logs endpoint implemented? ${error.message.substring(0, 60)}...`); 
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Fetch logs only when the user object is confirmed
        if (user) {
            fetchLogs();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);


    const handleLogSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        if (!user) {
            setMessage('🔴 Error: You must be signed in to submit logs.');
            return;
        }

        if (!problem.trim() || !cause.trim() || !steps.trim()) {
            setMessage('Please fill in all three fields (Problem, Cause, Steps).');
            return;
        }

        setLoading(true);

        const logData = {
            expert_id: expertId, 
            problem: problem.trim(),
            cause: cause.trim(),
            steps: steps.trim(),
            timestamp: getTimestamp(),
        };

        try {
            const response = await fetchDataWithRetry(`${API_URL}/store_log`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(logData),
            });

            const result = await response.json();
            setMessage(`✅ Success! Log stored with ID: ${result.id}`);
            
            setProblem('');
            setCause('');
            setSteps('');

            fetchLogs(); // Refresh the list of stored logs

        } catch (error) {
            console.error('Submission Error:', error);
            setMessage(`🔴 Error submitting log: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="expert-panel p-4 md:p-8 bg-gray-900 min-h-screen text-gray-100 font-inter">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-blue-600 mb-8">
                <h1 className="text-3xl font-extrabold text-blue-400 flex items-center mb-4 md:mb-0">
                    <span className="mr-3">⚙️</span> Expert Knowledge Panel <span className="text-base ml-4 font-normal text-gray-400">(ID: {expertId})</span>
                </h1>
                <button 
                    onClick={signOut} 
                    className={`px-4 py-2 text-white font-medium rounded-full shadow-lg transition duration-300 transform ${user ? 'bg-red-600 hover:bg-red-500 active:scale-95' : 'bg-green-600 hover:bg-green-500 active:scale-95'}`}
                >
                    {user ? 'Sign Out' : 'Sign In (Mock)'}
                </button>
            </header>

            {/* --- KNOWLEDGE ENTRY SECTION --- */}
            <section className="mb-12 p-6 bg-gray-800 rounded-2xl shadow-2xl">
                <h2 className="text-2xl font-semibold mb-6 text-blue-300 border-b border-gray-700 pb-3">Submit New Expert Log</h2>
                
                <form onSubmit={handleLogSubmit} className="space-y-6">
                    
                    {/* 1. PROBLEM / QUERY */}
                    <div className="form-group">
                        <label htmlFor="problem" className="block text-gray-300 mb-2 font-medium">1. Problem / Symptom (What was the reported issue?)</label>
                        <textarea
                            id="problem"
                            value={problem}
                            onChange={(e) => setProblem(e.target.value)}
                            rows="3"
                            placeholder="e.g., Elevator stops abruptly between floors and smells burnt. Customer reported a loud clicking sound just before the stop."
                            className="w-full p-4 bg-gray-700 border border-gray-600 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-white resize-none shadow-inner transition duration-150"
                            disabled={loading || !user}
                        ></textarea>
                    </div>

                    {/* 2. CAUSE */}
                    <div className="form-group">
                        <label htmlFor="cause" className="block text-gray-300 mb-2 font-medium">2. Identified Cause (What was the root failure?)</label>
                        <textarea
                            id="cause"
                            value={cause}
                            onChange={(e) => setCause(e.target.value)}
                            rows="3"
                            placeholder="e.g., The main contactor coil for the traction motor overheated and failed, leading to a temporary short. Clicking sound was the contactor failing to engage."
                            className="w-full p-4 bg-gray-700 border border-gray-600 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-white resize-none shadow-inner transition duration-150"
                            disabled={loading || !user}
                        ></textarea>
                    </div>

                    {/* 3. FIXING STEPS */}
                    <div className="form-group">
                        <label htmlFor="steps" className="block text-gray-300 mb-2 font-medium">3. Detailed Fixing Steps (Action Plan)</label>
                        <textarea
                            id="steps"
                            value={steps}
                            onChange={(e) => setSteps(e.target.value)}
                            rows="7"
                            placeholder="1. Lock out/Tag out the main power (LOTO). 2. Confirm failed contactor (CR1) by checking resistance. 3. Replace contactor CR1 (Part # XYZ-456) and associated wiring harness. 4. Run empty car through a full cycle. 5. Clear fault codes and finalize paperwork."
                            className="w-full p-4 bg-gray-700 border border-gray-600 rounded-xl focus:ring-blue-500 focus:border-blue-500 text-white resize-none shadow-inner transition duration-150"
                            disabled={loading || !user}
                        ></textarea>
                    </div>

                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between pt-4">
                        <button
                            type="submit"
                            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full shadow-lg transition duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 mb-4 md:mb-0"
                            disabled={loading || !user}
                        >
                            {loading ? 'Saving Knowledge...' : 'Save to Knowledge Base'}
                        </button>
                        {message && (
                            <p className={`text-base font-semibold p-2 rounded-lg ${message.startsWith('✅') ? 'text-green-400 bg-green-900/50' : 'text-red-400 bg-red-900/50'}`}>
                                {message}
                            </p>
                        )}
                    </div>
                </form>
            </section>

            {/* --- STORED LOGS SECTION --- */}
            <section className="mt-12 p-6 bg-gray-800 rounded-2xl shadow-2xl">
                <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-6">
                    <h2 className="text-2xl font-semibold text-blue-300">
                        Past Knowledge Logs ({storedLogs.length} items)
                    </h2>
                    <button 
                        onClick={fetchLogs} 
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-sm text-gray-300 font-medium rounded-full transition duration-200 disabled:opacity-50"
                        disabled={loading || !user}
                    >
                        {loading ? 'Refreshing...' : 'Refresh Logs'}
                    </button>
                </div>
                
                <div className="log-list space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {storedLogs.length > 0 ? (
                        storedLogs.map((log, index) => (
                            <div key={log.id} className="p-4 bg-gray-700 border border-gray-600 rounded-xl shadow-md hover:bg-gray-600 transition duration-150">
                                <p className="font-bold text-blue-400 flex justify-between items-center">
                                    Log ID: {log.id.substring(0, 8)}...
                                    <span className="text-xs font-normal text-gray-400">{log.timestamp}</span>
                                </p>
                                <hr className="my-2 border-gray-600"/>
                                <div className="space-y-2 text-sm text-gray-300">
                                    <p><strong className="text-blue-200">Problem:</strong> {log.problem}</p>
                                    <p><strong className="text-blue-200">Cause:</strong> {log.cause}</p>
                                    <p><strong className="text-blue-200">Steps:</strong> {log.steps}</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-400 text-center py-4">
                            {loading ? 'Loading logs...' : 'No knowledge logs found for this expert yet.'}
                        </p>
                    )}
                </div>
            </section>
        </div>
    );
};

export default ExpertPanel;
