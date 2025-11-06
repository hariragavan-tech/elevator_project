from flask import Flask, request, jsonify
from pydantic import BaseModel
import chromadb
from chromadb.utils import embedding_functions
from flask_cors import CORS
import uuid
import os
import requests
from ai_retriever import semantic_rephrase_query, embed_query  # ✅ AI layer import

# --- CONFIGURATION ---
app = Flask(__name__)
CORS(app)

# --- DATABASE SETUP ---
EXPERT_KB_COLLECTION = "expert_knowledge_base"
DB_PATH = "persistent_chroma_db_v2"
EMBEDDING_MODEL_NAME = "all-mpnet-base-v2"

# --- OLLAMA CONFIG ---
OLLAMA_API_URL = "http://127.0.0.1:11434/api/chat"
OLLAMA_MODEL = "phi3"  # You can use phi3, gemma:2b, or mistral:7b-instruct

# --- INITIALIZE CHROMADB ---
try:
    if not os.path.exists(DB_PATH):
        os.makedirs(DB_PATH)

    chroma_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name=EMBEDDING_MODEL_NAME
    )
    client = chromadb.PersistentClient(path=DB_PATH)
    expert_kb_collection = client.get_or_create_collection(
        name=EXPERT_KB_COLLECTION, embedding_function=chroma_ef
    )
    print(f"✅ ChromaDB initialized successfully. Total logs: {expert_kb_collection.count()}")

except Exception as e:
    print(f"⚠️ Error initializing ChromaDB: {e}")
    client = chromadb.Client()
    expert_kb_collection = client.get_or_create_collection(name=EXPERT_KB_COLLECTION)
    print("⚠️ Fallback to in-memory ChromaDB.")


# --- DATA MODEL ---
class ExpertLog(BaseModel):
    elevator_id: str
    problem: str
    cause: str
    steps: str
    expert_id: str
    timestamp: str


# --- ROUTE: STORE NEW LOG (Expert logs only) ---
@app.route("/store_log", methods=["POST"])
def store_expert_log():
    """
    Stores expert-entered logs in the ChromaDB knowledge base.
    Technician/AI conversation logs are ignored.
    """
    try:
        data = request.get_json()

        # 🧠 Ignore technician AI chat logs (they contain user_query or ai_response)
        if "user_query" in data or "ai_response" in data:
            print("⚙️ Ignoring AI/technician chat message — only expert logs are stored.")
            return jsonify({"message": "Chat not stored. Only expert logs are saved."}), 200

        data = ExpertLog(**data)

    except Exception as e:
        return jsonify({"message": f"Invalid input data: {e}"}), 400

    log_id = str(uuid.uuid4())
    document_content = (
        f"Elevator ID: {data.elevator_id}. "
        f"Problem: {data.problem}. "
        f"Root Cause: {data.cause}. "
        f"Fixing Steps: {data.steps}."
    )

    metadata = {
        "elevator_id": data.elevator_id,
        "problem": data.problem,
        "cause": data.cause,
        "steps": data.steps,
        "expert_id": data.expert_id,
        "timestamp": data.timestamp,
        "source": "expert",  # ✅ identify as expert log
    }

    try:
        expert_kb_collection.add(
            documents=[document_content],
            metadatas=[metadata],
            ids=[log_id],
        )
        print(f"🟢 Stored expert log (ID: {log_id}) for Elevator {data.elevator_id}")
        return jsonify({"message": "Log stored successfully", "id": log_id}), 201

    except Exception as e:
        print(f"❌ Error adding document: {e}")
        return jsonify({"message": f"Database error: {e}"}), 500


# --- ROUTE: FETCH LOGS (Any technician can view expert logs) ---
@app.route("/get_logs/<expert_id>", methods=["GET"])
def get_logs_by_expert(expert_id):
    """
    Fetch all expert logs for a specific elevator_id.
    expert_id is accepted but not used to limit visibility.
    """
    try:
        elevator_id = request.args.get("elevator_id", None)

        results = expert_kb_collection.get(include=["metadatas", "documents"])
        filtered_logs = []

        # ✅ Filter only expert logs (ignore AI/technician) by elevator ID
        for meta in results.get("metadatas", []):
            if meta.get("source", "expert") == "expert":
                if not elevator_id or meta.get("elevator_id", "").lower() == elevator_id.lower():
                    filtered_logs.append({
                        "problem": meta.get("problem", "N/A"),
                        "cause": meta.get("cause", "N/A"),
                        "steps": meta.get("steps", "N/A"),
                        "elevator_id": meta.get("elevator_id", "N/A"),
                        "timestamp": meta.get("timestamp", "N/A"),
                        "expert_id": meta.get("expert_id", "N/A"),
                    })

        print(f"📄 Retrieved {len(filtered_logs)} expert logs for Elevator: {elevator_id or 'All'}")
        return jsonify({"logs": filtered_logs}), 200

    except Exception as e:
        print(f"❌ Error fetching logs: {e}")
        return jsonify({"message": f"Database query error: {e}"}), 500


# --- ROUTE: KNOWLEDGE SEARCH (AI + VECTOR SEARCH) ---
@app.route("/knowledge_search", methods=["GET"])
def knowledge_search():
    query = request.args.get("query")
    elevator_id = request.args.get("elevator_id")

    if not query:
        return jsonify({"message": "Missing 'query' parameter."}), 400

    try:
        refined_query = semantic_rephrase_query(query)
        print(f"🔍 Refined Query: {refined_query}")

        query_embedding = embed_query(refined_query)
        where_filter = {"elevator_id": elevator_id} if elevator_id else None

        results = expert_kb_collection.query(
            query_embeddings=[query_embedding.tolist()],
            n_results=3,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )

    except Exception as e:
        print(f"❌ Search Error: {e}")
        return jsonify({"message": f"Search failed: {e}"}), 500

    extracted_results = []
    if results.get("documents") and results["documents"][0]:
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            extracted_results.append(
                {
                    "elevator_id": meta.get("elevator_id", "N/A"),
                    "problem": meta.get("problem", "N/A"),
                    "cause": meta.get("cause", "N/A"),
                    "steps": meta.get("steps", "N/A"),
                    "expert_id": meta.get("expert_id", "N/A"),
                    "distance": f"{dist:.4f}",
                    "refined_query": refined_query,
                    "full_document": doc,
                }
            )

    return jsonify({"results": extracted_results}), 200


# --- ROUTE: CHAT WITH OLLAMA (Structured Expert Reply) ---
@app.route("/chat", methods=["POST"])
def chat_with_ai():
    """
    Provides expert-like AI responses with structured output.
    Uses Phi-3 or any compatible model from Ollama.
    """
    try:
        data = request.get_json()
        messages = data.get("messages", [])

        if not messages:
            return jsonify({"error": "No messages provided."}), 400

        # ✅ Keep your exact system prompt (unchanged)
        system_prompt = {
            "role": "system",
            "content": (
                "You are an expert elevator maintenance assistant. "
                "You will receive technician issues and past maintenance logs as context. "
                "Always base your answer primarily on those past logs. "
                "If the logs contain fixing steps, reuse and expand them into clear bullet points. "
                "If the logs do not match, respond with best diagnostic reasoning but never invent unrelated solutions. "
                "Format the output as:\n"
                "Diagnosis:\nFixing Steps (in bullet points):\nSafety Note:"
            ),
        }

        payload = {
            "model": OLLAMA_MODEL,
            "messages": [system_prompt] + messages,
            "stream": False,
        }

        print(f"🧠 Sending chat request to Ollama ({OLLAMA_MODEL})...")
        response = requests.post(OLLAMA_API_URL, json=payload, timeout=90)
        response.raise_for_status()

        data = response.json()
        ai_reply = data.get("message", {}).get("content", "No structured response.")
        return jsonify({"response": ai_reply})

    except Exception as e:
        print(f"❌ Chat API Error: {e}")
        return jsonify({"error": f"Chat failed: {e}"}), 500


# --- MAIN ---
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8001, debug=True)
