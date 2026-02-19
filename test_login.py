import urllib.request
import urllib.parse
import json
import ssl

def test_login():
    url = "http://localhost:8000/api/login"
    # Basic credentials
    creds_wrong = {"username": "deeksha", "password": "abc"}
    creds_correct = {"username": "deeksha", "password": "123456"}
    
    print(f"Testing connection to {url}...")
    
    # Check Root
    try:
        with urllib.request.urlopen("http://localhost:8000/") as response:
            print(f"Root endpoint status: {response.status}")
            print(f"Root endpoint content: {response.read().decode('utf-8')}")
    except urllib.error.URLError as e:
        print(f"ERROR: Could not connect to backend. Is it running? {e}")
        return

    # Helper function for POST
    def post_json(url, data):
        req = urllib.request.Request(url)
        req.add_header('Content-Type', 'application/json; charset=utf-8')
        jsondata = json.dumps(data).encode('utf-8')
        req.add_header('Content-Length', len(jsondata))
        try:
            with urllib.request.urlopen(req, jsondata) as response:
                return response.status, response.read().decode('utf-8')
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode('utf-8')
        except urllib.error.URLError as e:
            return None, str(e)

    print("\nTesting login with WRONG credentials...")
    status, content = post_json(url, creds_wrong)
    print(f"Status Code: {status}")
    print(f"Response: {content}")

    print("\nTesting login with CORRECT credentials (deeksha:123456)...")
    status, content = post_json(url, creds_correct)
    print(f"Status Code: {status}")
    print(f"Response: {content}")

if __name__ == "__main__":
    test_login()
