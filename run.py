#!/usr/bin/env python3
"""
StudyVault Entry Point
Runs the Flask private document-sharing application.
"""
from app import app, init_db
import config

if __name__ == "__main__":
    init_db()
    print("=" * 68)
    print("[StudyVault] Private Document Sharing Platform (Python)")
    print("=" * 68)
    print("Strictly Restricted to the 3 Authorized Study Friends:")
    for f in config.AUTHORIZED_FRIENDS:
        print(f"  * {f['name']:<20} <{f['email']}>")
    print("-" * 68)
    print("Running on http://127.0.0.1:5000")
    print("=" * 68)
    app.run(host="127.0.0.1", port=5000, debug=True)
