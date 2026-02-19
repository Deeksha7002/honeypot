from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging
import time
import json
import os
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# Internal Modules
from analyzer import ScamAnalyzer
from agent import HoneypotAgent
from database import SessionLocal, engine, init_db, User, Case, Stats
import security

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - [API] - %(message)s')

# Initialize DB tables
init_db()

app = FastAPI(title="Honeypot Cyber Cell API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Core Logic
analyzer = ScamAnalyzer()
agent = HoneypotAgent()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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

class LoginRequest(BaseModel):
    username: str
    password: str

# --- Endpoints ---

@app.get("/")
def read_root():
    return {"status": "active", "system": "Cyber Cell Core", "version": "2.0.0 (Fortified)"}

@app.post("/api/analyze")
def analyze_text(request: AnalysisRequest):
    """
    Performs deep heuristic analysis on a text snippet.
    """
    start_time = time.time()
    
    analysis_result = analyzer.analyze_behavior([{"role": "scammer", "content": request.text}])
    score, threat_classification = analysis_result
    
    # Simulate processing delay for "Deep Scan" effect
    time.sleep(0.5) 
    
    return {
        "classification": threat_classification,
        "score": score,
        "intent": analyzer.intent,
        "processing_time": time.time() - start_time,
        "verified": True
    }

# --- Stats Management ---
def get_or_create_stats(db: Session):
    stats = db.query(Stats).first()
    if not stats:
        stats = Stats(reports_filed=0, scams_detected=0, types_json={})
        db.add(stats)
        db.commit()
        db.refresh(stats)
    return stats

@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    # Calculate time-based stats dynamically from Cases
    now = datetime.utcnow()
    day_ago = now - timedelta(days=1)
    week_ago = now - timedelta(minutes=10080) # 7 days
    month_ago = now - timedelta(days=30)
    
    # helper to filter and count
    def count_since(time_threshold):
        # We fetch all and filter in python because storing timestamp as string makes SQL date math annoying in generic SQLite
        # Ideally timestamp should be datetime object in DB, but for now this works given low volume
        cases = db.query(Case).all()
        count = 0
        for c in cases:
            try:
                # Handle ISO format Z (trailing Z)
                c_time = datetime.fromisoformat(c.timestamp.replace('Z', '+00:00'))
                # If c_time is offset-aware and time_threshold is naive, make time_threshold aware
                if c_time.tzinfo is not None and time_threshold.tzinfo is None:
                    time_threshold = time_threshold.replace(tzinfo=datetime.timezone.utc)
                
                if c_time > time_threshold:
                    count += 1
            except Exception:
                pass # Ignore malformed dates
        return count

    stats = get_or_create_stats(db)
    
    return {
        "reports_filed": stats.reports_filed,
        "scams_detected": stats.scams_detected,
        "types": stats.types_json,
        "today": count_since(day_ago),
        "week": count_since(week_ago),
        "month": count_since(month_ago)
    }

# --- Cases Management ---

@app.get("/api/cases")
def get_cases(db: Session = Depends(get_db)):
    cases = db.query(Case).all()
    # Convert to list of dicts for JSON response
    return [{
        "id": c.id,
        "scammerName": c.scammer_name,
        "platform": c.platform,
        "status": c.status,
        "threatLevel": c.threat_level,
        "iocs": c.iocs,
        "transcript": c.transcript,
        "timestamp": c.timestamp,
        "autoReported": c.auto_reported
    } for c in cases]

@app.post("/api/report")
def submit_report(report: ReportRequest, db: Session = Depends(get_db)):
    """
    Receives official scam reports from the frontend honeypot.
    """
    logging.info(f"🚨 [REPORT RECEIVED] ID: {report.conversationId} | Type: {report.classification}")
    
    # Update Stats
    stats = get_or_create_stats(db)
    stats.reports_filed += 1
    
    scam_type = report.classification.upper()
    current_types = dict(stats.types_json) # Copy to modify
    current_types[scam_type] = current_types.get(scam_type, 0) + 1
    stats.types_json = current_types # Reassign to trigger update
    
    # Save Case
    existing_case = db.query(Case).filter(Case.id == report.conversationId).first()
    if not existing_case:
        new_case = Case(
            id=report.conversationId,
            scammer_name=report.scammerName,
            platform=report.platform,
            status="closed",
            threat_level=report.classification,
            iocs=report.iocs,
            transcript=report.transcript,
            timestamp=report.timestamp,
            auto_reported=True
        )
        db.add(new_case)
    
    db.commit()
    
    return {"status": "received", "case_id": f"CASE-{int(time.time())}"}

# --- Authentication ---

@app.post("/api/login")
def login(creds: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == creds.username).first()
    if not user:
        # Check for default admin creation on first run if DB is empty
        if creds.username == "admin" and creds.password == "password123":
             # Create default admin if it doesn't exist
             hashed_pw = security.get_password_hash("password123")
             admin_user = User(username="admin", hashed_password=hashed_pw, role="admin")
             db.add(admin_user)
             db.commit()
             user = admin_user
        else:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not security.verify_password(creds.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = security.create_access_token(data={"sub": user.username, "role": user.role})
    return {"status": "success", "token": access_token}

@app.post("/api/register")
def register(creds: LoginRequest, db: Session = Depends(get_db)):
    try:
        user = db.query(User).filter(User.username == creds.username).first()
        if user:
            raise HTTPException(status_code=400, detail="Operator ID already exists")
        
        hashed_pw = security.get_password_hash(creds.password)
        new_user = User(username=creds.username, hashed_password=hashed_pw, role="operator")
        db.add(new_user)
        db.commit()
        
        access_token = security.create_access_token(data={"sub": new_user.username, "role": new_user.role})
        return {"status": "created", "token": access_token}
    except Exception as e:
        logging.error(f"Registration Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
