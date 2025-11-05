import os
import json
from chromadb import PersistentClient
from chromadb.utils import embedding_functions

# --- CONFIGURATION (UPDATED PATH FIX) ---
# Set the base directory to the directory where this script is located (backend folder)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Construct the Chroma Path to look INSIDE the current directory (backend folder)
# This assumes the full path is: C:\Users\Hari\OneDrive\Desktop\elevator_project\backend\chroma_data
CHROMA_PATH = os.path.join(BASE_DIR, 'chroma_data') 
# --------------------------------------------------

TECH_LOGS_COLLECTION = "technician_logs_collection"
EXPERT_KB_COLLECTION = "expert_knowledge_base"


def dump_collection(client, collection_name):
    """Retrieves and prints all data from a single ChromaDB collection."""
    print(f"\n=======================================================")
    print(f"| DUMPING COLLECTION: {collection_name}")
    print(f"=======================================================")

    try:
        # Get the collection (must exist to proceed)
        collection = client.get_collection(name=collection_name)
        
        # Retrieve all contents (documents and metadata)
        results = collection.get(
            include=["documents", "metadatas"]
        )
        
        # Check if collection is empty
        if not results.get('ids'):
            print(f"[INFO] Collection '{collection_name}' is empty.")
            return

        print(f"[INFO] Found {len(results['ids'])} documents.")
        
        # Iterate and print documents
        for i, doc_id in enumerate(results['ids']):
            doc = results['documents'][i]
            metadata = results['metadatas'][i]

            print(f"\n--- ENTRY {i+1} (ID: {doc_id}) ---")
            
            print("METADATA:")
            for key, value in metadata.items():
                if key == 'timestamp' and isinstance(value, str):
                    # Format timestamp for cleaner output
                    print(f"  - {key.upper()}: {value[:19].replace('T', ' ')}")
                else:
                    print(f"  - {key.upper()}: {value}")
            
            print("\nDOCUMENT CONTENT:")
            print(f"  {doc}")
            
    except Exception as e:
        print(f"[ERROR] Could not read collection '{collection_name}'.")
        print(f"[DETAIL] {e}")

def dump_all_chroma_data():
    """Main function to initialize the client and dump both collections."""
    
    # NEW CHECK: Print the path being used for clarity
    print(f"Using CHROMA_PATH: {os.path.abspath(CHROMA_PATH)}")
    
    if not os.path.exists(CHROMA_PATH):
        # This error should now only occur if the data folder truly doesn't exist
        print(f"🔴 ERROR: The ChromaDB data directory '{CHROMA_PATH}' was not found.")
        print("Please ensure your backend has been run successfully to create this folder.")
        return

    try:
        # We must use the same embedding function that created the data
        embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2" 
        )
        client = PersistentClient(path=CHROMA_PATH, embedding_function=embedding_function)
        
        # Dump Technician Logs
        dump_collection(client, TECH_LOGS_COLLECTION)
        
        # Dump Expert Knowledge Base
        dump_collection(client, EXPERT_KB_COLLECTION)

    except Exception as e:
        print(f"🔴 CRITICAL ERROR: Failed to initialize PersistentClient.")
        print(f"Details: {e}")

if __name__ == "__main__":
    dump_all_chroma_data()
