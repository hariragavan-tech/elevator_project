import requests
import json
from datetime import datetime
import random
import time

# Flask API endpoint
API_URL = "http://127.0.0.1:8001/store_log"

# Load generated expert logs (you’ll create this file next)
with open("expert_logs.json", "r") as f:
    logs = json.load(f)

print(f"📦 Preparing to upload {len(logs)} expert logs to ChromaDB...\n")

for i, log in enumerate(logs, start=1):
    payload = {
        "elevator_id": log["elevator_id"],
        "problem": log["problem"],
        "cause": log["cause"],
        "steps": log["steps"],
        "expert_id": f"expert_{random.randint(1, 5)}",  # random expert tag
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    try:
        r = requests.post(API_URL, json=payload)
        if r.status_code == 201:
            print(f"✅ [{i}/{len(logs)}] Stored → {log['elevator_id']} | {log['problem']}")
        elif r.status_code == 200 and "AI chat not stored" in r.text:
            print(f"ℹ️ [{i}] Skipped chat log")
        else:
            print(f"⚠️ [{i}] {r.status_code} → {r.text}")
    except Exception as e:
        print(f"❌ [{i}] Error: {e}")

    time.sleep(0.15)  # small delay to avoid flooding requests

print("\n🎯 Seeding complete! All expert logs uploaded to ChromaDB.")
