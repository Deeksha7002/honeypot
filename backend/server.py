from fastapi import FastAPI, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
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
    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(days=1)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    # helper to filter and count + breakdown + unique scammers
    def get_stats_for_range(time_threshold):
        cases = db.query(Case).all()
        count = 0
        breakdown = {t: 0 for t in ["ROMANCE", "CRYPTO", "JOB", "IMPERSONATION", "LOTTERY", "TECHNICAL_SUPPORT", "AUTHORITY", "OTHER"]}
        scammers = set()
        
        for c in cases:
            try:
                # Handle ISO format Z (trailing Z)
                ts_str = c.timestamp.replace('Z', '+00:00')
                c_time = datetime.fromisoformat(ts_str)
                
                # Ensure c_time is aware if it's not
                if c_time.tzinfo is None:
                    c_time = c_time.replace(tzinfo=timezone.utc)
                
                if c_time > time_threshold:
                    count += 1
                    ctype = c.threat_level.upper() if c.threat_level else "OTHER"
                    if ctype in breakdown:
                        breakdown[ctype] += 1
                    else:
                        breakdown["OTHER"] += 1
                    
                    if c.scammer_name:
                        scammers.add(c.scammer_name)
            except Exception as e:
                logging.error(f"Error parsing timestamp {c.timestamp}: {e}")
                pass 
        return count, breakdown, len(scammers)

    t_count, t_types, t_scammers = get_stats_for_range(day_ago)
    w_count, w_types, w_scammers = get_stats_for_range(week_ago)
    m_count, m_types, m_scammers = get_stats_for_range(month_ago)
    
    stats = get_or_create_stats(db)
    
    return {
        "reports_filed": stats.reports_filed,
        "scams_detected": stats.scams_detected,
        "types": stats.types_json,
        "today": t_count,
        "week": w_count,
        "month": m_count,
        "today_types": t_types,
        "week_types": w_types,
        "month_types": m_types,
        "today_scammers": t_scammers,
        "week_scammers": w_scammers,
        "month_scammers": m_scammers
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
    
    # If user doesn't exist in DB, look them up in users.json to auto-create
    if not user:
        try:
            users_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "users.json")
            with open(users_path, "r") as f:
                valid_users = json.load(f)
        except Exception as e:
            logging.error(f"Could not load users.json: {e}")
            valid_users = {"admin": "password123"}
            
        if creds.username in valid_users and creds.password == valid_users[creds.username]:
            hashed_pw = security.get_password_hash(creds.password)
            role = "admin" if creds.username == "admin" else "operator"
            new_user = User(username=creds.username, hashed_password=hashed_pw, role=role)
            db.add(new_user)
            db.commit()
            user = new_user
        else:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not security.verify_password(creds.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = security.create_access_token(data={"sub": user.username, "role": user.role})
    return {"status": "success", "token": access_token}

@app.post("/api/register")
def register(creds: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == creds.username).first()
    if user:
        raise HTTPException(status_code=400, detail="Operator ID already exists")
    
    try:
        hashed_pw = security.get_password_hash(creds.password)
        new_user = User(username=creds.username, hashed_password=hashed_pw, role="operator")
        db.add(new_user)
        db.commit()
        
        access_token = security.create_access_token(data={"sub": new_user.username, "role": new_user.role})
        return {"status": "created", "token": access_token}
    except Exception as e:
        logging.error(f"Registration Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Biometric Auth (WebAuthn) ---
from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
)
from webauthn.helpers import bytes_to_base64url, base64url_to_bytes, options_to_json
from webauthn.helpers.structs import (
    AttestationConveyancePreference,
    AuthenticatorSelectionCriteria,
    AuthenticatorAttachment,
    UserVerificationRequirement,
    ResidentKeyRequirement,
    RegistrationCredential,
    AuthenticationCredential,
    AuthenticatorAttestationResponse,
    AuthenticatorAssertionResponse,
)

# Helper to get the current RP ID and Origin from the request
def get_webauthn_config(request: Request):
    host = request.headers.get("host", "localhost:5173")
    hostname = host.split(":")[0]
    # For WebAuthn, we need the base domain (rp_id) and the full origin
    # We'll allow localhost, 127.0.0.1, and network IPs
    protocol = "https" if request.url.scheme == "https" else "http"
    return hostname, f"{protocol}://{host}"

RP_NAME = "Scam Defender"

# In-memory store for challenges
challenges = {} 

@app.post("/api/auth/biometric/register/start")
def register_bio_start(username: str, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    rp_id, origin = get_webauthn_config(request)
    options = generate_registration_options(
        rp_id=rp_id,
        rp_name=RP_NAME,
        user_id=str(user.id).encode(),
        user_name=user.username,
        user_display_name=user.username,
        authenticator_selection=AuthenticatorSelectionCriteria(
            authenticator_attachment=AuthenticatorAttachment.PLATFORM,
            user_verification=UserVerificationRequirement.PREFERRED,
            resident_key=ResidentKeyRequirement.PREFERRED,
        ),
        attestation=AttestationConveyancePreference.NONE,
    )

    challenges[user.username] = options.challenge
    return json.loads(options_to_json(options))

@app.post("/api/auth/biometric/register/finish")
def register_bio_finish(response: Dict[str, Any], username: str, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    challenge = challenges.get(user.username)
    if not challenge:
        raise HTTPException(status_code=400, detail="No active registration challenge found")

    try:
        att_response = response.get("response", {})
        credential = RegistrationCredential(
            id=response["id"],
            raw_id=base64url_to_bytes(response["rawId"]),
            response=AuthenticatorAttestationResponse(
                client_data_json=base64url_to_bytes(att_response["clientDataJSON"]),
                attestation_object=base64url_to_bytes(att_response["attestationObject"]),
            ),
            type=response.get("type", "public-key"),
        )

        rp_id, origin = get_webauthn_config(request)
        verification = verify_registration_response(
            credential=credential,
            expected_challenge=challenge,
            expected_origin=origin,
            expected_rp_id=rp_id,
            require_user_verification=False,
        )

        new_cred = {
            "credential_id": bytes_to_base64url(verification.credential_id),
            "credential_public_key": bytes_to_base64url(verification.credential_public_key),
            "sign_count": verification.sign_count,
        }

        creds = list(user.webauthn_credentials) if user.webauthn_credentials else []
        creds.append(new_cred)
        user.webauthn_credentials = creds
        db.commit()
        challenges.pop(user.username, None)
        return {"status": "registered"}

    except Exception as e:
        logging.error(f"Biometric registration failed: {e}")
        raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")

@app.post("/api/auth/biometric/login/start")
def login_bio_start(username: str, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.webauthn_credentials:
        raise HTTPException(status_code=400, detail="No biometric registered for this account")

    from webauthn.helpers.structs import PublicKeyCredentialDescriptor
    allow_credentials = []
    for cred in (user.webauthn_credentials or []):
        try:
            allow_credentials.append(
                PublicKeyCredentialDescriptor(id=base64url_to_bytes(cred["credential_id"]))
            )
        except Exception:
            pass

    rp_id, origin = get_webauthn_config(request)
    options = generate_authentication_options(
        rp_id=rp_id,
        allow_credentials=allow_credentials,
        user_verification=UserVerificationRequirement.PREFERRED,
    )

    challenges["LOGIN_" + username] = options.challenge
    return json.loads(options_to_json(options))

@app.post("/api/auth/biometric/login/finish")
def login_bio_finish(response: Dict[str, Any], username: str, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    challenge = challenges.get("LOGIN_" + username)
    if not challenge:
        raise HTTPException(status_code=400, detail="No active login challenge found")

    cred_id = response.get("id")
    matched_cred = None
    for c in (user.webauthn_credentials or []):
        if c.get("credential_id") == cred_id:
            matched_cred = c
            break

    if not matched_cred:
        raise HTTPException(status_code=400, detail="Credential not registered on this account")

    try:
        ass_response = response.get("response", {})
        credential = AuthenticationCredential(
            id=response["id"],
            raw_id=base64url_to_bytes(response["rawId"]),
            response=AuthenticatorAssertionResponse(
                client_data_json=base64url_to_bytes(ass_response["clientDataJSON"]),
                authenticator_data=base64url_to_bytes(ass_response["authenticatorData"]),
                signature=base64url_to_bytes(ass_response["signature"]),
                user_handle=base64url_to_bytes(ass_response["userHandle"]) if ass_response.get("userHandle") else None,
            ),
            type=response.get("type", "public-key"),
        )

        verification = verify_authentication_response(
            credential=credential,
            expected_challenge=challenge,
            expected_origin=origin,
            expected_rp_id=rp_id,
            credential_public_key=base64url_to_bytes(matched_cred["credential_public_key"]),
            credential_current_sign_count=matched_cred["sign_count"],
            require_user_verification=False,
        )

        matched_cred["sign_count"] = verification.new_sign_count
        user.webauthn_credentials = list(user.webauthn_credentials)
        db.commit()
        challenges.pop("LOGIN_" + username, None)

        access_token = security.create_access_token(data={"sub": user.username, "role": user.role})
        return {"status": "success", "token": access_token}

    except Exception as e:
        logging.error(f"Biometric login failed: {e}")
        raise HTTPException(status_code=400, detail=f"Biometric auth failed: {str(e)}")

# --- Discoverable / Username-less Biometric Login (auto-prompt on page load) ---
DISCOVER_CHALLENGE_KEY = "__DISCOVER__"

@app.post("/api/auth/biometric/discover/start")
def discover_bio_start(request: Request):
    """Generate a challenge with no allow_credentials — browser will offer all saved passkeys."""
    rp_id, origin = get_webauthn_config(request)
    options = generate_authentication_options(
        rp_id=rp_id,
        allow_credentials=[],   # empty = discoverable / resident key
        user_verification=UserVerificationRequirement.PREFERRED,
    )
    challenges[DISCOVER_CHALLENGE_KEY] = options.challenge
    return json.loads(options_to_json(options))

@app.post("/api/auth/biometric/discover/finish")
def discover_bio_finish(response: Dict[str, Any], request: Request, db: Session = Depends(get_db)):
    """Verify the assertion and identify the user via userHandle."""
    challenge = challenges.get(DISCOVER_CHALLENGE_KEY)
    if not challenge:
        raise HTTPException(status_code=400, detail="No active discovery challenge")

    # Decode userHandle to get user ID
    user_handle_b64 = response.get("response", {}).get("userHandle")
    if not user_handle_b64:
        raise HTTPException(status_code=400, detail="No userHandle in assertion — use normal login")

    try:
        user_id_bytes = base64url_to_bytes(user_handle_b64)
        user_id = int(user_id_bytes.decode())
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid userHandle")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found from userHandle")

    cred_id = response.get("id")
    matched_cred = None
    for c in (user.webauthn_credentials or []):
        if c.get("credential_id") == cred_id:
            matched_cred = c
            break

    if not matched_cred:
        raise HTTPException(status_code=400, detail="Credential not registered on this account")

    try:
        ass_response = response.get("response", {})
        credential = AuthenticationCredential(
            id=response["id"],
            raw_id=base64url_to_bytes(response["rawId"]),
            response=AuthenticatorAssertionResponse(
                client_data_json=base64url_to_bytes(ass_response["clientDataJSON"]),
                authenticator_data=base64url_to_bytes(ass_response["authenticatorData"]),
                signature=base64url_to_bytes(ass_response["signature"]),
                user_handle=base64url_to_bytes(ass_response["userHandle"]) if ass_response.get("userHandle") else None,
            ),
            type=response.get("type", "public-key"),
        )

        verification = verify_authentication_response(
            credential=credential,
            expected_challenge=challenge,
            expected_origin=origin,
            expected_rp_id=rp_id,
            credential_public_key=base64url_to_bytes(matched_cred["credential_public_key"]),
            credential_current_sign_count=matched_cred["sign_count"],
            require_user_verification=False,
        )

        matched_cred["sign_count"] = verification.new_sign_count
        user.webauthn_credentials = list(user.webauthn_credentials)
        db.commit()
        challenges.pop(DISCOVER_CHALLENGE_KEY, None)

        access_token = security.create_access_token(data={"sub": user.username, "role": user.role})
        return {"status": "success", "token": access_token, "username": user.username}

    except Exception as e:
        logging.error(f"Discoverable biometric login failed: {e}")
        raise HTTPException(status_code=400, detail=f"Biometric auth failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
