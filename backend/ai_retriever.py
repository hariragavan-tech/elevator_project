from sentence_transformers import SentenceTransformer
import torch

# ✅ SAME MODEL as main.py
MODEL_NAME = "all-mpnet-base-v2"

try:
    embedder = SentenceTransformer(MODEL_NAME)
    print(f"✅ AI Retriever loaded model: {MODEL_NAME}")
except Exception as e:
    print(f"⚠️ Failed to load embedding model: {e}")
    embedder = None


def semantic_rephrase_query(raw_query: str) -> str:
    q = raw_query.strip().lower()
    if "stuck" in q:
        return "elevator stuck between floors or motor jammed"
    elif "noise" in q:
        return "elevator making unusual mechanical noise"
    elif "vibration" in q:
        return "elevator vibrating due to misalignment or bearing fault"
    elif "not moving" in q:
        return "elevator not moving possibly due to control failure or power issue"
    elif "overheat" in q or "hot" in q:
        return "motor overheating or electrical contactor failure"
    elif "door" in q:
        return "elevator door not closing or door sensor malfunction"
    else:
        return raw_query.strip()


def embed_query(query: str):
    if embedder is None:
        raise RuntimeError("Embedding model not initialized properly.")
    with torch.no_grad():
        vector = embedder.encode(query, convert_to_tensor=True)
        return vector
