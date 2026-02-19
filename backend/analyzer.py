import re
import logging
from textblob import TextBlob

class ScamAnalyzer:
    """
    Advanced analysis of conversation history using robust context-aware pattern matching.
    Analyzes sentence structure to distinguish between inquiries and commands.
    """
    
    def __init__(self):
        self.sophistication_score = 0.0
        self.intent = "unknown"
        
        # Behavioral Heuristic Keywords (Weighted)
        self.behavioral_keywords = {
            "urgency": ["urgent", "immediately", "now", "hurry", "fast", "seconds", "expires", "deadline", "today", "quick"],
            "pressure": ["police", "lawsuit", "jail", "arrest", "warrant", "legal", "court", "suspended", "blocked", "banned"],
            "financial": ["money", "card", "bank", "transfer", "wire", "deposit", "payment", "fee", "charge", "cost", "dollar", "rupee", "usd", "cash"],
            "data": ["password", "pin", "otp", "code", "credential", "login", "ssn", "identity", "account"],
            "demand": ["send", "pay", "give", "share", "tell", "click", "download", "install", "submit"]
        }
        
    def analyze_behavior(self, history):
        if not history:
            return 0.0, "unknown"

        scammer_msgs = [m["content"] for m in history if m["role"] == "scammer"]
        if not scammer_msgs:
            return 0.0, "unknown"

        full_text = " ".join(scammer_msgs)

        # 1. Intent Classification
        # First, try specific context patterns
        self.intent = self._classify_intent_context(full_text)
        
        # If no specific pattern matched, fall back to Behavioral Heuristics
        if self.intent == "GENERAL_INQUIRY" or self.intent == "unknown":
            heuristic_risk = self._calculate_heuristic_score(full_text)
            if heuristic_risk > 0.75:
                self.intent = "HIGH_RISK_BEHAVIOR"
            elif heuristic_risk > 0.5:
                self.intent = "SUSPICIOUS_BEHAVIOR"
        
        # 2. Sophistication Scoring
        words = full_text.split()
        unique_words = set(words)
        vocab_richness = len(unique_words) / len(words) if words else 0
        
        # Calculate score
        score = 0.5
        if vocab_richness < 0.4: score -= 0.1
        if "kindly" in full_text.lower(): score -= 0.2
        if len(scammer_msgs) > 5: score += 0.1
        
        blob = TextBlob(full_text)
        if blob.sentiment.subjectivity > 0.5: score += 0.1

        self.sophistication_score = max(0.0, min(1.0, score))
        
        # Map Intent to Threat Classification
        if self.intent in ["GENERAL_PHISHING", "FINANCIAL_THEFT", "AUTHORITY_IMPERSONATION", "CRYPTO_SCAM", "LOTTERY_SCAM", "MALICIOUS_LINK", "HIGH_RISK_BEHAVIOR"]:
            threat_classification = "scam"
            # Boost score for clear threats
            self.sophistication_score = max(self.sophistication_score, 0.95)
        elif self.intent in ["SUSPICIOUS_KEYWORD", "SUSPICIOUS_BEHAVIOR"]:
            threat_classification = "likely_scam"
            self.sophistication_score = max(self.sophistication_score, 0.75)
        else:
            threat_classification = "benign"

        logging.info(f"[Analyzer] Score: {self.sophistication_score:.2f} | Intent: {self.intent} | Threat: {threat_classification}")
        return self.sophistication_score, threat_classification

    def _classify_intent_context(self, text):
        text = text.lower()
        
        # Define Patterns with Context (Action + Target)
        
        # --- PHISHING (Credential Harvesting) ---
        # "Send context": send, give, share, tell, provide + otp, code, pin, password
        # Proximity check using Regex: Action...Target
        phishing_pattern = r"(send|give|share|tell|provide|input|enter).{0,30}(otp|code|pin|password|credential|login)"
        if re.search(phishing_pattern, text):
            return "GENERAL_PHISHING"
            
        # "Verify context": verify, confirm, link + account, details
        verify_pattern = r"(verify|confirm|validate|secure).{0,30}(account|detail|identity|limit)"
        if re.search(verify_pattern, text):
            return "GENERAL_PHISHING"

        # --- FINANCIAL THEFT ---
        # "Transfer context": transfer, wire, deposit + money, cash, fund
        financial_pattern = r"(transfer|wire|deposit|send).{0,30}(money|cash|fund|amount|payment)"
        if re.search(financial_pattern, text):
            return "FINANCIAL_THEFT"
            
        # --- AUTHORITY IMPERSONATION ---
        # "Legal context": police, warrant, arrest, jail, irs, federal
        authority_pattern = r"(police|warrant|arrest|jail|federal|irs|tax|court|legal)"
        if re.search(authority_pattern, text):
            return "AUTHORITY_IMPERSONATION"
            
        # --- CRYPTO ---
        # "Invest context": invest, yield, profit + crypto, bitcoin, btc
        crypto_pattern = r"(invest|yield|profit|return|mining).{0,30}(crypto|bitcoin|btc|eth|usdt)"
        if re.search(crypto_pattern, text):
            return "CRYPTO_SCAM"

        # --- LOTTERY / PRIZE ---
        # "Lottery context": won, claim, prize + lottery, reward, cash
        lottery_pattern = r"(won|claim|receive|awarded).{0,30}(lottery|prize|reward|cash|money|gift)"
        if re.search(lottery_pattern, text):
            return "LOTTERY_SCAM"
            
        # --- MALICIOUS LINKS ---
        # "Link context": click, tap, visit + link, url, website
        link_pattern = r"(click|tap|visit|open).{0,30}(link|url|website|page|attachment)"
        if re.search(link_pattern, text):
            return "MALICIOUS_LINK"

        # --- INQUIRY / SAFE CHECK ---
        # If user asks "What is...", it's likely safe (or the bait response)
        inquiry_pattern = r"(what|how|why|who).{0,30}(is|do|are)"
        if re.search(inquiry_pattern, text):
            return "GENERAL_INQUIRY"

        # Fallback Keywords (Low Confidence)
        if "otp" in text or "code" in text:
            return "SUSPICIOUS_KEYWORD" # Not fully flagged unless action is present
            
        return "GENERAL_INQUIRY"

    def _calculate_heuristic_score(self, text):
        """
        Calculates a risk score based on the presence of behavioral keywords.
        Risk = Urgency/Pressure + Demand + Financial/Data
        """
        text = text.lower()
        score = 0.0
        
        has_urgency = any(w in text for w in self.behavioral_keywords["urgency"])
        has_pressure = any(w in text for w in self.behavioral_keywords["pressure"])
        has_financial = any(w in text for w in self.behavioral_keywords["financial"])
        has_data = any(w in text for w in self.behavioral_keywords["data"])
        has_demand = any(w in text for w in self.behavioral_keywords["demand"])
        
        # Base Risk Factors
        if has_urgency: score += 0.3
        if has_pressure: score += 0.3
        
        # Target Assets
        if has_financial: score += 0.3
        if has_data: score += 0.4
        
        # Action Component (Amplifier)
        if has_demand: 
            score += 0.2
            # High Risk Combinations
            if has_financial or has_data:
                score += 0.2 # Demand + Asset = High Threat
            if has_urgency or has_pressure:
                score += 0.2 # Demand + Pressure = High Threat

        return min(1.0, score)
