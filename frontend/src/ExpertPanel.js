import React, { useState, useEffect } from "react";
import "./ExpertPanel.css"; // ✅ Make sure this file is in the same folder

// --- MOCKED AUTH HOOK ---
const useAuth = () => {
  const [user, setUser] = useState({ uid: "EXPERT_12345" });

  const signOut = () => {
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
        const errorText = await response.text();
        throw new Error(
          `Server Error (${response.status}): ${errorText.substring(0, 100)}...`
        );
      }
      return response;
    } catch (error) {
      if (i < retries - 1) {
        const delay = Math.pow(2, i) * 1000;
        console.warn(
          `Fetch attempt ${i + 1} failed. Retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
};

const ExpertPanel = () => {
  const { user, signOut } = useAuth();
  const [problem, setProblem] = useState("");
  const [cause, setCause] = useState("");
  const [steps, setSteps] = useState("");
  const [message, setMessage] = useState("");
  const [storedLogs, setStoredLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const expertId = user?.uid || "expert_demo";
  const API_URL = "http://127.0.0.1:8001";

  const fetchLogs = async () => {
    if (!user) return;

    setLoading(true);
    setMessage("");

    try {
      const response = await fetchDataWithRetry(`${API_URL}/get_logs/${expertId}`);
      const data = await response.json();

      let logsToDisplay = [];

      if (data.logs && data.logs.metadatas) {
        logsToDisplay = data.logs.metadatas
          .map((meta, index) => ({
            id: data.logs.ids[index],
            problem: meta.problem || "N/A",
            cause: meta.cause || "N/A",
            steps: meta.steps || "N/A",
            timestamp: meta.timestamp
              ? new Date(meta.timestamp).toLocaleString()
              : "N/A",
          }))
          .reverse();
      } else {
        setMessage("Warning: Data structure unexpected. Cannot display logs.");
      }

      setStoredLogs(logsToDisplay);
    } catch (error) {
      console.error("Error fetching logs:", error);
      setMessage(
        `🔴 Error fetching logs. Is the /get_logs endpoint implemented? ${error.message.substring(
          0,
          60
        )}...`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
  }, [user]);

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!user) {
      setMessage("🔴 Error: You must be signed in to submit logs.");
      return;
    }

    if (!problem.trim() || !cause.trim() || !steps.trim()) {
      setMessage("Please fill in all three fields (Problem, Cause, Steps).");
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logData),
      });

      const result = await response.json();
      setMessage(`✅ Success! Log stored with ID: ${result.id}`);

      setProblem("");
      setCause("");
      setSteps("");

      fetchLogs();
    } catch (error) {
      console.error("Submission Error:", error);
      setMessage(`🔴 Error submitting log: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="expert-panel">
      {/* HEADER */}
      <header className="header">
        <h1>
          ⚙️ Expert Knowledge Panel{" "}
          <span className="expert-id">(ID: {expertId})</span>
        </h1>
        <button className="sign-out-button" onClick={signOut}>
          {user ? "Sign Out" : "Sign In (Mock)"}
        </button>
      </header>

      {/* KNOWLEDGE ENTRY SECTION */}
      <section className="section-card">
        <h2>Submit New Expert Log</h2>
        <form onSubmit={handleLogSubmit}>
          <div className="form-group">
            <label htmlFor="problem">
              1. Problem / Symptom (What was the reported issue?)
            </label>
            <textarea
              id="problem"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              rows="3"
              placeholder="e.g., Elevator stops abruptly between floors and smells burnt."
              disabled={loading || !user}
            ></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="cause">
              2. Identified Cause (What was the root failure?)
            </label>
            <textarea
              id="cause"
              value={cause}
              onChange={(e) => setCause(e.target.value)}
              rows="3"
              placeholder="e.g., The main contactor coil for the traction motor overheated and failed."
              disabled={loading || !user}
            ></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="steps">
              3. Detailed Fixing Steps (Action Plan)
            </label>
            <textarea
              id="steps"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              rows="7"
              placeholder="1. Lock out main power (LOTO). 2. Check resistance of contactor coil..."
              disabled={loading || !user}
            ></textarea>
          </div>

          <div className="submit-area">
            <button
              type="submit"
              className="submit-button"
              disabled={loading || !user}
            >
              {loading ? "Saving Knowledge..." : "Save to Knowledge Base"}
            </button>
            {message && (
              <p
                className={`status-message ${
                  message.startsWith("✅")
                    ? "status-success"
                    : "status-error"
                }`}
              >
                {message}
              </p>
            )}
          </div>
        </form>
      </section>

      {/* STORED LOGS SECTION */}
      <section className="section-card">
        <div className="log-controls">
          <h2>Past Knowledge Logs ({storedLogs.length} items)</h2>
          <button
            onClick={fetchLogs}
            className="refresh-button"
            disabled={loading || !user}
          >
            {loading ? "Refreshing..." : "Refresh Logs"}
          </button>
        </div>

        <div className="log-list">
          {storedLogs.length > 0 ? (
            storedLogs.map((log) => (
              <div key={log.id} className="log-item">
                <div className="log-item-header">
                  <span>Log ID: {log.id.substring(0, 8)}...</span>
                  <span className="log-timestamp">{log.timestamp}</span>
                </div>
                <div className="log-item-details">
                  <p>
                    <strong>Problem:</strong> {log.problem}
                  </p>
                  <p>
                    <strong>Cause:</strong> {log.cause}
                  </p>
                  <p>
                    <strong>Steps:</strong> {log.steps}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="no-logs">
              {loading ? "Loading logs..." : "No knowledge logs found yet."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
};

export default ExpertPanel;
