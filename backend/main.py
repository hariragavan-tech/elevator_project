from flask import Flask, request, jsonify
from pydantic import BaseModel
import chromadb
from chromadb.utils import embedding_functions
from flask_cors import CORS
import uuid
import os

# --- Configuration & Initialization ---

app = Flask(__name__)
CORS(app)  # Allow frontend access

# Database Config
EXPERT_KB_COLLECTION = "expert_knowledge_base"
DB_PATH = "persistent_chroma_db_v2"
EMBEDDING_MODEL_NAME = 'all-mpnet-base-v2'

# Initialize ChromaDB client
try:
    if not os.path.exists(DB_PATH):
        os.makedirs(DB_PATH)

    chroma_ef = embedding_functions.SentenceTransformerEmbeddingFunction(model_name=EMBEDDING_MODEL_NAME)
    client = chromadb.PersistentClient(path=DB_PATH)

    expert_kb_collection = client.get_or_create_collection(
        name=EXPERT_KB_COLLECTION,
        embedding_function=chroma_ef
    )
    print(f"✅ ChromaDB initialized successfully. Total logs: {expert_kb_collection.count()}")

except Exception as e:
    print(f"⚠️ Error initializing ChromaDB or model: {e}")
    client = chromadb.Client()
    expert_kb_collection = client.get_or_create_collection(name=EXPERT_KB_COLLECTION)
    print("⚠️ Falling back to in-memory ChromaDB.")


# --- Data Model ---
class ExpertLog(BaseModel):
    elevator_id: str
    problem: str
    cause: str
    steps: str
    expert_id: str
    timestamp: str


# --- API ROUTES ---

@app.route('/store_log', methods=['POST'])
def store_expert_log():
    """
    Stores a new expert log in ChromaDB with elevator_id included.
    """
    try:
        data = ExpertLog(**request.get_json())
    except Exception as e:
        return jsonify({"message": f"Invalid input data: {e}"}), 400

    log_id = str(uuid.uuid4())

    # Combine text for embedding
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
    }

    try:
        expert_kb_collection.add(
            documents=[document_content],
            metadatas=[metadata],
            ids=[log_id]
        )
        print(f"🟢 Stored log successfully (ID: {log_id}) for Elevator {data.elevator_id}")
        return jsonify({"message": "Log stored successfully", "id": log_id}), 201

    except Exception as e:
        print(f"❌ Error adding document: {e}")
        return jsonify({"message": f"Database error: {e}"}), 500


@app.route('/get_logs/<expert_id>', methods=['GET'])
def get_logs_by_expert(expert_id):
    """
    Fetch all logs for a specific expert (optionally filter by elevator_id).
    """
    try:
        elevator_id = request.args.get("elevator_id", None)

        # Base query: filter by expert_id
        query_filter = {"expert_id": expert_id}
        if elevator_id:
            query_filter["elevator_id"] = elevator_id  # Optional filtering

        results = expert_kb_collection.get(
            where=query_filter,
            include=["metadatas", "documents"]
        )

        results["ids"] = results.get("ids", [])
        print(f"📄 Retrieved {len(results['ids'])} logs for Expert {expert_id}. Elevator filter: {elevator_id or 'None'}")

        return jsonify({"logs": results}), 200

    except Exception as e:
        print(f"❌ Error fetching logs: {e}")
        return jsonify({"message": f"Database query error: {e}"}), 500


@app.route('/knowledge_search', methods=['GET'])
def knowledge_search():
    """
    Performs a semantic search across all expert logs.
    """
    query = request.args.get("query")
    elevator_id = request.args.get("elevator_id")  # Optional filter

    if not query:
        return jsonify({"message": "Missing 'query' parameter."}), 400

    try:
        where_filter = {}
        if elevator_id:
            where_filter["elevator_id"] = elevator_id

        results = expert_kb_collection.query(
            query_texts=[query],
            n_results=3,
            where=where_filter if elevator_id else None,
            include=["documents", "metadatas", "distances"]
        )
    except Exception as e:
        print(f"❌ Search Error: {e}")
        return jsonify({"message": f"Search failed: {e}"}), 500

    extracted_results = []

    if results["documents"] and results["documents"][0]:
        for doc, metadata, distance in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            extracted_results.append({
                "elevator_id": metadata.get("elevator_id", "N/A"),
                "problem": metadata.get("problem", "N/A"),
                "cause": metadata.get("cause", "N/A"),
                "steps": metadata.get("steps", "N/A"),
                "expert_id": metadata.get("expert_id", "N/A"),
                "distance": f"{distance:.4f}",
                "full_document": doc,
            })

    return jsonify({"results": extracted_results}), 200


# --- MAIN ---
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8001, debug=True)
