import urllib.request
import json

def get_stats():
    url = "http://localhost:8000/api/stats"
    try:
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode('utf-8'))
            print("Current Stats from API:")
            print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Error: {e}")

get_stats()
