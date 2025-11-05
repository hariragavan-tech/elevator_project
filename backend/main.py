from flask import Flask, request, jsonify
from pydantic import BaseModel
import chromadb
from chromadb.utils import embedding_functions
from flask_cors import CORS
import uuid
import os
import json

# --- Configuration & Initialization ---

# Initialize Flask App
app = Flask(__name__)
CORS(app) # Enable CORS for frontend communication

# ChromaDB Configuration
EXPERT_KB_COLLECTION = "expert_knowledge_base"
DB_PATH = "persistent_chroma_db_v2" 
EMBEDDING_MODEL_NAME = 'all-mpnet-base-v2' # The high-quality embedding model

# Initialize ChromaDB Client
try:
    if not os.path.exists(DB_PATH):
        os.makedirs(DB_PATH)
    
    # Use Chroma's native embedding function setup, which handles the SentenceTransformer model
    chroma_ef = embedding_functions.SentenceTransformerEmbeddingFunction(model_name=EMBEDDING_MODEL_NAME)
    
    client = chromadb.PersistentClient(path=DB_PATH)
    expert_kb_collection = client.get_or_create_collection(
        name=EXPERT_KB_COLLECTION,
        embedding_function=chroma_ef # Use the same model for ingestion and query
    )
    print(f"ChromaDB initialized. Total documents: {expert_kb_collection.count()}")

except Exception as e:
    print(f"Error initializing ChromaDB or loading model: {e}")
    # Fallback to an in-memory client if persistence/model loading fails
    client = chromadb.Client() 
    expert_kb_collection = client.get_or_create_collection(name=EXPERT_KB_COLLECTION)
    print("Falling back to in-memory ChromaDB.")


# --- Data Model (Pydantic - for request validation) ---
class ExpertLog(BaseModel):
    problem: str
    cause: str
    steps: str
    expert_id: str
    timestamp: str


# --- Endpoints ---

@app.route('/store_log', methods=['POST'])
def store_expert_log():
    """
    Receives log data, embeds it (via Chroma's EF), and stores it in ChromaDB.
    """
    try:
        data = ExpertLog(**request.get_json())
    except Exception as e:
        return jsonify({"message": f"Invalid input data: {e}"}), 400

    # The combined text that will be converted into a vector
    document_content = (
        f"Problem: {data.problem}. "
        f"Root Cause: {data.cause}. "
        f"Fixing Steps: {data.steps}"
    )

    log_id = str(uuid.uuid4())
    metadata = {
        "problem": data.problem,
        "cause": data.cause,
        "steps": data.steps,
        "expert_id": data.expert_id,
        "timestamp": data.timestamp,
    }

    try:
        # ChromaDB automatically creates the embedding using the configured function
        expert_kb_collection.add(
            documents=[document_content],
            metadatas=[metadata],
            ids=[log_id]
        )
        print(f"Stored new log with ID: {log_id}")
        return jsonify({"message": "Expert log stored successfully.", "id": log_id}), 201

    except Exception as e:
        print(f"Error adding document to ChromaDB: {e}")
        return jsonify({"message": f"Database error: {e}"}), 500


@app.route('/get_logs/<expert_id>', methods=['GET'])
def get_logs_by_expert(expert_id):
    """
    Retrieves all logs submitted by a specific expert for display in the UI.
    """
    try:
        # Use a metadata filter to retrieve only logs from this expert
        results = expert_kb_collection.get(
            where={"expert_id": expert_id},
            include=['metadatas', 'documents']
        )
        
        results['ids'] = results.get('ids', [])
        
        return jsonify({"logs": results}), 200

    except Exception as e:
        print(f"Error fetching logs from ChromaDB: {e}")
        return jsonify({"message": f"Database query error: {e}"}), 500


@app.route('/knowledge_search', methods=['GET'])
def knowledge_search():
    """
    Performs a vector search based on a query, returning only the raw search results.
    This replaces the RAG consultation endpoint.
    """
    query = request.args.get('query')
    if not query:
        return jsonify({"message": "Query parameter is missing."}), 400

    try:
        # Query ChromaDB (it will embed the text query internally)
        results = expert_kb_collection.query(
            query_texts=[query],
            n_results=3,
            include=['documents', 'metadatas', 'distances']
        )
    except Exception as e:
        print(f"Retrieval Error: {e}")
        return jsonify({"message": f"Vector search failed: {e}"}), 500

    extracted_knowledge = []
    
    if results['documents'] and results['documents'][0]:
        for doc, metadata, distance in zip(results['documents'][0], results['metadatas'][0], results['distances'][0]):
            extracted_knowledge.append({
                "problem": metadata['problem'],
                "cause": metadata['cause'],
                "steps": metadata['steps'],
                "expert_id": metadata['expert_id'],
                "distance": f"{distance:.4f}",
                "full_document": doc
            })

    return jsonify({"results": extracted_knowledge}), 200


if __name__ == '__main__':
    # The correct way to run your Flask application for local development.
    app.run(host='127.0.0.1', port=8001)
