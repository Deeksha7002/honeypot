from backend.database import SessionLocal, User
from backend.security import get_password_hash

db = SessionLocal()

users_to_restore = [
    {"username": "deeksha", "password": "123456"},
    {"username": "Divyam", "password": "MOMdad123"}
]

print("Restoring users...")

for u in users_to_restore:
    existing = db.query(User).filter(User.username == u["username"]).first()
    if not existing:
        print(f"Restoring {u['username']}...")
        hashed_pw = get_password_hash(u["password"])
        new_user = User(username=u["username"], hashed_password=hashed_pw, role="operator")
        db.add(new_user)
    else:
        print(f"User {u['username']} already exists.")

db.commit()
db.close()
print("Restore complete.")
