import requests

OLLAMA_URL = "http://127.0.0.1:11434/api/chat"
MODEL_NAME = "phi3"

def chat_with_ollama(messages):
    """
    Send a conversation history to Ollama and stream the AI's reply.
    """
    payload = {
        "model": MODEL_NAME,
        "messages": messages,
        "stream": False  # True for streaming output
    }
    try:
        res = requests.post(OLLAMA_URL, json=payload, timeout=60)
        res.raise_for_status()
        data = res.json()
        return data.get("message", {}).get("content", "")
    except Exception as e:
        print(f"❌ Chat failed: {e}")
        return "Sorry, I couldn't connect to the local AI engine."
