import axios from "axios";

// --- CONFIGURATION ---
// Set this to your backend's URL (e.g., http://localhost:8001)
const BACKEND_URL = "http://localhost:8001"; 
// ---

/**
 * Performs a vector search by calling the backend's /knowledge_search endpoint.
 * This function handles pure database retrieval.
 * @param {string} query The user's question.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of result objects
 * (e.g., [{ problem, cause, steps, distance }, ...]).
 */
export const searchKnowledge = async (query) => {
    try {
        // This is the vector search endpoint, expected to return structured JSON
        const res = await axios.get(`${BACKEND_URL}/knowledge_search?query=${encodeURIComponent(query)}&n_results=3`);
        const results = res.data?.results || [];
        
        if (results.length > 0) {
            console.log(`🔍 Found ${results.length} raw vector items.`);
        }
        return results; 
    } catch (error) {
        console.error("❌ Error fetching knowledge:", error);
        // Return a structured error message if the backend is unreachable
        return [{ problem: "Error", cause: "Could not reach knowledge base or backend service.", steps: error.message, distance: 1.0 }]; 
    }
};

/**
 * Stores the chat log entry in the backend database.
 * This calls the Flask endpoint /store_log
 * @param {string} expertId - The ID of the technician.
 * @param {string} userQuery - The user's original query.
 * @param {Array<object>} searchResults - The structured array of results that were shown.
 */
export async function persistLog(expertId, userQuery, searchResults) {
    if (!expertId) return false; 

    // Serialize the structured results into a readable string for the database log
    let aiResponseText = "No relevant steps found.";
    if (searchResults && searchResults.length > 0) {
        aiResponseText = searchResults.map((r, i) => {
            // FIX: Safely convert distance to a number before calling toFixed
            const distance = parseFloat(r.distance); 
            const distanceText = !isNaN(distance) ? distance.toFixed(4) : 'N/A';

            return `--- Match ${i+1} (Distance: ${distanceText}) ---\nProblem: ${r.problem}\nCause: ${r.cause}\nSteps: ${r.steps}`;
        }).join('\n\n');
    }
    
    try {
        const logId = crypto.randomUUID(); 
        const logData = {
            expert_id: expertId,
            user_query: userQuery,
            ai_response: aiResponseText, // The serialized search result
            status: "completed",
            timestamp: new Date().toISOString(),
            log_id: logId,
        };
        
        // This is the correct logging endpoint for the Flask service
        await axios.post(`${BACKEND_URL}/store_log`, logData);
        return true;

    } catch (err) {
        console.error("Error saving log:", err.response ? err.response.data : err.message);
        return false;
    }
}