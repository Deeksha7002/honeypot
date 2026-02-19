import urllib.request
import json

def post(endpoint, data):
    url = f"http://localhost:8000/api{endpoint}"
    req = urllib.request.Request(url, method='POST')
    req.add_header('Content-Type', 'application/json')
    jsondata = json.dumps(data).encode('utf-8')
    req.add_header('Content-Length', len(jsondata))
    try:
        with urllib.request.urlopen(req, jsondata) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error: {e}")
        return None

print("Verifying 'deeksha'...")
res = post("/login", {"username": "deeksha", "password": "123456"})
if res and "token" in res:
    print("SUCCESS: Login OK")
else:
    print("FAILED")
