try:
    import passlib
    import jose
    from passlib.context import CryptContext
    print("Dependencies OK")
except Exception as e:
    print(f"Dependency Error: {e}")
