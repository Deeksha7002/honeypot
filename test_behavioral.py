import urllib.request
import json

def analyze(text):
    url = "http://localhost:8000/api/analyze"
    data = {"text": text}
    req = urllib.request.Request(url)
    req.add_header('Content-Type', 'application/json')
    jsondata = json.dumps(data).encode('utf-8')
    req.add_header('Content-Length', len(jsondata))
    
    try:
        with urllib.request.urlopen(req, jsondata) as response:
            result = json.loads(response.read().decode('utf-8'))
            log = f"Input: '{text}'\n"
            log += f"  -> Intent: {result.get('intent')}\n"
            log += f"  -> Score: {result.get('score')}\n"
            log += f"  -> Classification: {result.get('classification')}\n"
            log += "-" * 30 + "\n"
            print(log)
            with open("test_results_v2.txt", "a", encoding="utf-8") as f:
                f.write(log)
    except Exception as e:
        print(f"Error analyzing '{text}': {e}")

print("Testing Behavioral Heuristics (Unknown Scams)...\n")

# 1. Unprogrammed "Horse Sick" Scam (Urgency + Financial Demand)
# No specific "horse" regex exists, relying purely on behavior.
analyze("My horse is sick, send vet fee immediately via card.") 

# 2. Unprogrammed "Legal Threat" (Pressure + Demand)
analyze("I am from the court. You have a lawsuit. Pay the fine.") 

# 3. Safe Inquiry
analyze("Can you help me with my project today?") 
