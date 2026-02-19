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
            print(f"Input: '{text}'")
            print(f"  -> Intent: {result.get('intent')}")
            print(f"  -> Score: {result.get('score')}")
            print(f"  -> Classification: {result.get('classification')}")
            print("-" * 30)
    except Exception as e:
        print(f"Error analyzing '{text}': {e}")

print("Testing Context Awareness...\n")

# 1. Inquiry vs Demand (OTP)
analyze("What is an OTP?") # Expected: Safe
analyze("Send me the OTP") # Expected: Phishing

# 2. Description vs Command (Bank)
analyze("I am going to the bank") # Expected: Safe
analyze("Go to the bank and wire money") # Expected: Financial Theft

# 3. Safe vs Unsafe Keywords
analyze("I love my family") # Expected: Safe
analyze("Honey, I need money for my ticket") # Expected: Romance Scam

# 4. Lottery / Link
analyze("you have won a lottery .click on this link to claim prize") # Expected: LOTTERY_SCAM / MALICIOUS_LINK
