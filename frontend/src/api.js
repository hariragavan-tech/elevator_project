import axios from "axios";

// --- CONFIGURATION ---
const BACKEND_URL = "http://localhost:8001";
// ---

/**
 * Performs vector search from Flask backend.
 */
export const searchKnowledge = async (query, elevatorId = "") => {
  try {
    let url = `${BACKEND_URL}/knowledge_search?query=${encodeURIComponent(query)}&n_results=3`;
    if (elevatorId && elevatorId.trim() !== "") {
      url += `&elevator_id=${encodeURIComponent(elevatorId.trim())}`;
    }

    const res = await axios.get(url);
    const results = res.data?.results || [];
    if (results.length > 0) {
      console.log(`🔍 Found ${results.length} results${elevatorId ? ` for Elevator ${elevatorId}` : ""}.`);
    } else {
      console.log("ℹ️ No relevant results found.");
    }
    return results;

  } catch (error) {
    console.error("❌ Error fetching knowledge from backend:", error);
    return [{
      problem: "Error",
      cause: "Could not reach knowledge base or backend service.",
      steps: error.message || "Server unreachable or misconfigured.",
      distance: 1.0
    }];
  }
};

/**
 * Persists technician log to backend.
 */
export async function persistLog(expertId, userQuery, searchResults, elevatorId = "") {
  if (!expertId) {
    console.warn("⚠️ No expert ID provided — skipping log persistence.");
    return false;
  }

  let aiResponseText = "No relevant steps found.";
  if (searchResults && searchResults.length > 0) {
    aiResponseText = searchResults.map((r, i) => {
      const distance = parseFloat(r.distance);
      const distanceText = !isNaN(distance) ? distance.toFixed(4) : "N/A";
      return (
        `--- Match ${i + 1} (Distance: ${distanceText}) ---\n` +
        `Problem: ${r.problem}\n` +
        `Cause: ${r.cause}\n` +
        `Steps: ${r.steps}`
      );
    }).join("\n\n");
  }

  try {
    const logId = crypto.randomUUID();
    const logData = {
      expert_id: expertId,
      elevator_id: elevatorId || "All",
      user_query: userQuery,
      ai_response: aiResponseText,
      status: "completed",
      timestamp: new Date().toISOString(),
      log_id: logId,
    };

    await axios.post(`${BACKEND_URL}/store_log`, logData);
    console.log(`🟢 Log stored successfully${elevatorId ? ` for Elevator ${elevatorId}` : ""}.`);
    return true;

  } catch (err) {
    console.error("❌ Error saving log:", err.response ? err.response.data : err.message);
    return false;
  }
}

/**
 * ✅ NEW: Conversational AI Chat via Ollama (/chat endpoint)
 * Sends conversation history to backend for natural, human-like responses.
 */
export const chatWithAI = async (messages) => {
  try {
    const res = await axios.post(`${BACKEND_URL}/chat`, { messages });
    return res.data?.response || "No response received from AI.";
  } catch (error) {
    console.error("❌ Chat API error:", error);
    return "AI is currently unavailable.";
  }
};
