from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
import time
import json
import os
from fastapi.middleware.cors import CORSMiddleware
from analyzer import ScamAnalyzer
from agent import HoneypotAgent

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - [API] - %(message)s')

app = FastAPI(title="Honeypot Cyber Cell API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, specify the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Core Logic
analyzer = ScamAnalyzer()
agent = HoneypotAgent()

# --- Data Models ---
class AnalysisRequest(BaseModel):
    text: str
    context: Optional[str] = "general"

class ReportRequest(BaseModel):
    conversationId: str
    scammerName: Optional[str] = "Unknown"
    platform: Optional[str] = "chat"
    classification: str
    confidenceScore: float
    transcript: List[Dict[str, Any]]
    iocs: Dict[str, Any]
    timestamp: str

# --- Endpoints ---

@app.get("/")
def read_root():
    return {"status": "active", "system": "Cyber Cell Core", "version": "1.0.0"}

@app.post("/api/analyze")
def analyze_text(request: AnalysisRequest):
    """
    Performs deep heuristic analysis on a text snippet.
    """
    start_time = time.time()
    
    # Simple reuse of agent classification logic for now
    # In future, this could run heavier ML models
    classification = agent._classify(request.text)
    
    # Simulate processing delay for "Deep Scan" effect
    time.sleep(0.5) 
    
    return {
        "classification": classification,
        "processing_time": time.time() - start_time,
        "verified": True
    }

# --- Stats Persistence ---
STATS_FILE = "stats.json"

def load_stats():
    try:
        if os.path.exists(STATS_FILE):
            with open(STATS_FILE, "r") as f:
                return json.load(f)
    except Exception as e:
        logging.error(f"Failed to load stats: {e}")
    return {"scams_detected": 0, "reports_filed": 0, "types": {}}

def save_stats(stats):
    try:
        with open(STATS_FILE, "w") as f:
            json.dump(stats, f)
    except Exception as e:
        logging.error(f"Failed to save stats: {e}")

@app.get("/api/stats")
def get_stats():
    return load_stats()



# --- Cases Persistence ---
CASES_FILE = "cases.json"

def load_cases():
    try:
        if os.path.exists(CASES_FILE):
            with open(CASES_FILE, "r") as f:
                return json.load(f)
    except Exception as e:
        logging.error(f"Failed to load cases: {e}")
    return []

def save_cases(cases):
    try:
        with open(CASES_FILE, "w") as f:
            json.dump(cases, f)
    except Exception as e:
        logging.error(f"Failed to save cases: {e}")

@app.get("/api/cases")
def get_cases():
    return load_cases()

@app.post("/api/report")
def submit_report(report: ReportRequest):
    """
    Receives official scam reports from the frontend honeypot.
    """
    logging.info(f"🚨 [REPORT RECEIVED] ID: {report.conversationId} | Type: {report.classification}")
    
    # Update Persisted Stats
    stats = load_stats()
    stats["reports_filed"] += 1
    
    scam_type = report.classification.upper()
    stats["types"][scam_type] = stats["types"].get(scam_type, 0) + 1
    
    save_stats(stats)

    # Save Case File
    cases = load_cases()
    # Avoid duplicates
    if not any(c['id'] == report.conversationId for c in cases):
        new_case = {
            "id": report.conversationId,
            "scammerName": report.scammerName,
            "platform": report.platform,
            "status": "closed",
            "threatLevel": report.classification,
            "iocs": report.iocs,
            "transcript": report.transcript,
            "timestamp": report.timestamp,
            "autoReported": True
        }
        cases.append(new_case)
        save_cases(cases)
    
    return {"status": "received", "case_id": f"CASE-{int(time.time())}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
