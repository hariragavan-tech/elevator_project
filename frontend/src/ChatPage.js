import React, { useEffect, useState } from "react";
import ChatBox from "./ChatBox";
import axios from "axios";

const BACKEND_URL = "http://localhost:8001"; // ✅ same as in api.js

// --- MOCK AUTH/ROUTER for standalone simplicity ---
const useAuth = () => ({
  user: { id: "tech123", role: "technician" },
  logout: () => console.log("Mock Logout"),
});
const useNavigate = () => (path) => console.log(`[Mock Router] Navigating to: ${path}`);
// ---

export default function ChatPage() {
  const { user, logout } = useAuth();
  const [logs, setLogs] = useState([]);
  const [active, setActive] = useState(null);
  const [elevatorId, setElevatorId] = useState("");
  const nav = useNavigate();

  // 🧠 Fetch expert logs when Elevator ID changes
  useEffect(() => {
    async function fetchLogs() {
      if (!elevatorId.trim()) {
        setLogs([]);
        return;
      }

      try {
        const res = await axios.get(
          `${BACKEND_URL}/get_logs/${user.id}?elevator_id=${encodeURIComponent(elevatorId.trim())}`
        );
        const data = res.data;

        // ✅ Backend returns a flat list now (not nested in .metadatas)
        if (data.logs && Array.isArray(data.logs) && data.logs.length > 0) {
          const formattedLogs = data.logs.map((meta, i) => ({
            log_id: i + 1,
            user_query: meta.problem || "Unknown Problem",
            ai_response: meta.steps || "No response recorded",
            cause: meta.cause || "No cause mentioned",
            timestamp: meta.timestamp || new Date().toISOString(),
          }));
          setLogs(formattedLogs.reverse());
        } else {
          setLogs([]);
        }
      } catch (err) {
        console.error("❌ Error fetching logs:", err);
        setLogs([]);
      }
    }

    fetchLogs();
  }, [elevatorId, user.id]);

  // ✅ This function will be called by ChatBox whenever elevatorId changes
  function handleElevatorIdChange(id) {
    setElevatorId(id);
  }

  // ✅ When user clicks a log to view it in ChatBox
  function onSelect(log) {
    setActive(log);
  }

  // ✅ When ChatBox saves a new log, reload logs
  async function handleNewLog() {
    if (elevatorId.trim()) {
      try {
        const res = await axios.get(
          `${BACKEND_URL}/get_logs/${user.id}?elevator_id=${encodeURIComponent(elevatorId.trim())}`
        );
        const data = res.data;

        if (data.logs && Array.isArray(data.logs) && data.logs.length > 0) {
          const formattedLogs = data.logs.map((meta, i) => ({
            log_id: i + 1,
            user_query: meta.problem || "Unknown Problem",
            ai_response: meta.steps || "No response recorded",
            cause: meta.cause || "No cause mentioned",
            timestamp: meta.timestamp || new Date().toISOString(),
          }));
          setLogs(formattedLogs.reverse());
        }
      } catch (err) {
        console.error("❌ Error refreshing logs:", err);
      }
    }
    setActive(null);
  }

  // ✅ Start new search — clear selection
  const handleNewSearch = () => {
    setActive(null);
  };

  // ✅ Sign out
  const handleSignOut = () => {
    logout();
    nav("/");
  };

  if (!user) return null;

  return (
    <div className="page-container">
      {/* --- HEADER --- */}
      <div className="header">
        <div className="title">
          <span style={{ color: "var(--accent-color)" }}>🛠️</span> Tech Console (Expert DB Retrieval)
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ marginRight: "10px", color: "var(--text-color)" }}>
            Tech ID: {user.id}
          </div>
          <button onClick={handleSignOut} className="btn outline">
            Sign out
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="page">
        {/* LEFT COLUMN - PREVIOUS LOGS */}
        <div className="left-col">
          <h3 style={{ marginTop: 0 }}>Previous Logs</h3>
          <button
            onClick={handleNewSearch}
            className="btn"
            style={{ marginBottom: "10px" }}
          >
            + Start New Search
          </button>

          <div
            className="log-list"
            style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}
          >
            {logs.length === 0 ? (
              <p style={{ color: "gray", textAlign: "center" }}>
                {elevatorId
                  ? "No logs found for this Elevator ID."
                  : "Enter an Elevator ID to view logs."}
              </p>
            ) : (
              logs.map((l) => (
                <div
                  key={l.log_id}
                  className={`log-card ${
                    active && active.log_id === l.log_id ? "active" : ""
                  }`}
                  onClick={() => onSelect(l)}
                  style={{
                    backgroundColor:
                      active && active.log_id === l.log_id ? "#e0f2fe" : "white",
                    border: "1px solid #ddd",
                    padding: "10px",
                    borderRadius: "8px",
                    marginBottom: "10px",
                    cursor: "pointer",
                  }}
                >
                  <h4>
                    {l.user_query.substring(0, 40)}
                    {l.user_query.length > 40 ? "..." : ""}
                  </h4>
                  <p style={{ color: "#475569", fontSize: "0.9em" }}>
                    Cause: {l.cause.substring(0, 50)}...
                  </p>
                  <p style={{ fontSize: "0.8em", color: "#64748b" }}>
                    {new Date(l.timestamp).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - CHAT BOX */}
        <div className="right-col">
          <ChatBox
            expertId={user.id}
            initialLog={active}
            onNewLog={handleNewLog}
            onElevatorIdChange={handleElevatorIdChange}
          />
        </div>
      </div>
    </div>
  );
}
