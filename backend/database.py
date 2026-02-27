from sqlalchemy import create_engine, Column, Integer, String, Float, Text, Boolean, JSON, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime
import os

# On Render, the persistent disk is mounted at /data
# Locally, use the project root
DB_PATH = os.environ.get("DATABASE_URL", "sqlite:///./scam_honeypot.db")
if DB_PATH.startswith("sqlite"):
    SQLALCHEMY_DATABASE_URL = DB_PATH
else:
    SQLALCHEMY_DATABASE_URL = DB_PATH

connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default="operator")
    webauthn_credentials = Column(JSON, default=[]) # Store list of registered credentials

class Case(Base):
    __tablename__ = "cases"

    id = Column(String, primary_key=True, index=True)
    scammer_name = Column(String)
    platform = Column(String)
    status = Column(String)
    threat_level = Column(String)
    iocs = Column(JSON)
    transcript = Column(JSON)
    timestamp = Column(String)
    auto_reported = Column(Boolean, default=True)

class Stats(Base):
    __tablename__ = "stats"

    id = Column(Integer, primary_key=True, index=True)
    reports_filed = Column(Integer, default=0)
    scams_detected = Column(Integer, default=0)
    types_json = Column(JSON, default={}) # Store scam types count as JSON

def init_db():
    Base.metadata.create_all(bind=engine)
