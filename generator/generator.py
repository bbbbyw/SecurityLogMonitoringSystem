import os
import json
import time
import random
from datetime import datetime, timezone

import requests


API_URL = os.getenv("API_URL", "http://localhost:8080/api/logs")
CUSTOMER_ID = os.getenv("CUSTOMER_ID", "demo-corp")
USERS = ["user1", "user2", "user3"]
IPS = ["1.2.3.4", "5.6.7.8", "9.9.9.9"]
DEVICES = ["web", "mobile", "desktop"]


def send_event(event_type: str, user_id: str, ip: str):
    payload = {
        "customerId": CUSTOMER_ID,
        "userId": user_id,
        "event": event_type,
        "ip": ip,
        "device": random.choice(DEVICES),
        "eventTime": datetime.now(timezone.utc).isoformat()
    }
    try:
        r = requests.post(API_URL, json=payload, timeout=10)
        print(r.status_code, r.text)
    except Exception as e:
        print("request error", e)


def main():
    print("Sending events to", API_URL)
    # Burst failed logins to trigger detection
    target_user = random.choice(USERS)
    target_ip = random.choice(IPS)
    for _ in range(7):
        send_event("login_failed", target_user, target_ip)
        time.sleep(0.5)
    # Some successful logins/noise
    for _ in range(3):
        send_event("login_success", random.choice(USERS), random.choice(IPS))
        time.sleep(0.5)


if __name__ == "__main__":
    main()


