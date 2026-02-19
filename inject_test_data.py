from datetime import datetime
import urllib.request
import json
import time

def report_scam(type):
    url = "http://localhost:8000/api/report"
    data = {
        "conversationId": f"TEST-{int(time.time()*1000)}",
        "scammerName": "Test Scammer",
        "platform": "whatsapp",
        "classification": type,
        "confidenceScore": 0.95,
        "iocs": {"urls": [], "paymentMethods": []},
        "transcript": [],
        "timestamp": datetime.utcnow().isoformat()
    }
    
    req = urllib.request.Request(url, method='POST')
    req.add_header('Content-Type', 'application/json')
    jsondata = json.dumps(data).encode('utf-8')
    req.add_header('Content-Length', len(jsondata))
    
    try:
        with urllib.request.urlopen(req, jsondata) as response:
            print(f"Reported {type}: {response.status}")
    except Exception as e:
        print(f"Failed to report {type}: {e}")

print("Injecting test reports...")
report_scam("ROMANCE")
report_scam("CRYPTO")
report_scam("LOTTERY")
report_scam("JOB")
print("Done.")
