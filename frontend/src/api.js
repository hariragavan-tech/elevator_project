import axios from "axios";

// --- CONFIGURATION ---
// Change this to your backend’s URL if different (e.g., Flask running on port 8001)
const BACKEND_URL = "http://localhost:8001";
// ---

/**
 * Performs a vector search by calling the backend's /knowledge_search endpoint.
 * Supports optional filtering by elevator ID.
 * @param {string} query - The technician's query or problem description.
 * @param {string} elevatorId - (Optional) Elevator ID to filter results.
 * @returns {Promise<Array<object>>} - A promise that resolves to an array of result objects.
 */
export const searchKnowledge = async (query, elevatorId = "") => {
    try {
        // Construct the base URL
        let url = `${BACKEND_URL}/knowledge_search?query=${encodeURIComponent(query)}&n_results=3`;

        // Add optional elevator filter only if provided
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

        // Return a safe structured fallback if backend is unreachable
        return [{
            problem: "Error",
            cause: "Could not reach knowledge base or backend service.",
            steps: error.message || "Server unreachable or misconfigured.",
            distance: 1.0
        }];
    }
};


/**
 * Stores a chat or search log entry in the backend database.
 * This calls the Flask /store_log endpoint.
 * Includes optional elevator_id.
 * @param {string} expertId - Technician or expert’s unique ID.
 * @param {string} userQuery - The technician’s input query.
 * @param {Array<object>} searchResults - The structured array of AI search results.
 * @param {string} elevatorId - (Optional) Elevator ID related to the query.
 * @returns {Promise<boolean>} - True if saved successfully, false otherwise.
 */
export async function persistLog(expertId, userQuery, searchResults, elevatorId = "") {
    if (!expertId) {
        console.warn("⚠️ No expert ID provided — skipping log persistence.");
        return false;
    }

    // Convert search results into a readable string format
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
        // Unique log identifier
        const logId = crypto.randomUUID();

        // Structured payload for the backend
        const logData = {
            expert_id: expertId,
            elevator_id: elevatorId || "All", // default if not provided
            user_query: userQuery,
            ai_response: aiResponseText,
            status: "completed",
            timestamp: new Date().toISOString(),
            log_id: logId,
        };

        // Send to Flask backend
        await axios.post(`${BACKEND_URL}/store_log`, logData);

        console.log(`🟢 Log stored successfully${elevatorId ? ` for Elevator ${elevatorId}` : ""}.`);
        return true;

    } catch (err) {
        console.error("❌ Error saving log:", err.response ? err.response.data : err.message);
        return false;
    }
}
