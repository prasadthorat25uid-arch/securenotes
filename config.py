import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# The 3 Authorized Friends Whitelist (STRICT ACCESS CONTROL)
AUTHORIZED_FRIENDS = [
    {
        "id": "friend-1",
        "name": "Saiprasad Thorat",
        "email": "saiprasadthorat29@gmail.com",
        "role": "Friend 1",
        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Saiprasad&backgroundColor=b6e3f4",
        "color": "from-blue-500 to-indigo-600",
    },
    {
        "id": "friend-2",
        "name": "VKS",
        "email": "vks20252026@gmail.com",
        "role": "Friend 2",
        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=VKS&backgroundColor=c0aede",
        "color": "from-emerald-500 to-teal-600",
    },
    {
        "id": "friend-3",
        "name": "Sanskar Kulkarni",
        "email": "sanskarkulkarni9825@gmail.com",
        "role": "Friend 3",
        "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Sanskar&backgroundColor=ffd5dc",
        "color": "from-purple-500 to-pink-600",
    },
]

# Set of allowed lowercase emails for fast O(1) whitelist verification
ALLOWED_EMAILS = {friend["email"].lower() for friend in AUTHORIZED_FRIENDS}

# Storage Folders (Private, NOT in public static directory)
PRIVATE_STORAGE_DIR = BASE_DIR / "storage" / "private_documents"
PRIVATE_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_PATH = BASE_DIR / "studyvault.db"

# Secret Key for secure sessions
SECRET_KEY = os.environ.get("SECRET_KEY", "studyvault-super-secure-session-key-2026")

# Allowed Document Extensions & Size Limit
ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}
MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB

# Google Drive Configuration
GOOGLE_DRIVE_FOLDER_ID = os.environ.get("GOOGLE_DRIVE_FOLDER_ID", "")
GOOGLE_CREDENTIALS_FILE = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", str(BASE_DIR / "service-account.json"))
