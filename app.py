import os
import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from functools import wraps

from flask import (
    Flask,
    request,
    jsonify,
    render_template,
    session,
    redirect,
    url_for,
    send_file,
    abort,
)
from werkzeug.utils import secure_filename

import config
from gdrive_service import GoogleDriveManager

app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = config.SECRET_KEY
app.config["MAX_CONTENT_LENGTH"] = config.MAX_CONTENT_LENGTH

drive_manager = GoogleDriveManager(
    folder_id=config.GOOGLE_DRIVE_FOLDER_ID,
    credentials_path=config.GOOGLE_CREDENTIALS_FILE,
)


def get_db():
    conn = sqlite3.connect(config.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize SQLite database and seed initial study documents if empty."""
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                file_name TEXT NOT NULL,
                title TEXT NOT NULL,
                file_type TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                storage_path TEXT NOT NULL,
                uploaded_by_email TEXT NOT NULL,
                uploaded_by_name TEXT NOT NULL,
                category TEXT DEFAULT 'Notes',
                description TEXT DEFAULT '',
                tags TEXT DEFAULT '[]',
                shared_with_group INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                is_drive INTEGER DEFAULT 0,
                drive_file_id TEXT DEFAULT ''
            )
        """)
        conn.commit()

        # Seed sample documents matching user requirements if table is empty
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM documents")
        count = cursor.fetchone()[0]

        if count == 0:
            seed_initial_documents(conn)


def create_minimal_pdf(filepath, title, text):
    """Creates a valid minimal PDF file on disk."""
    clean_title = title.replace("(", "").replace(")", "").replace("\\", "")
    clean_text = text.replace("(", "").replace(")", "").replace("\\", "").replace("\n", " ")
    content = f"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 200 >> stream
BT
/F1 16 Tf
50 720 Td
({clean_title}) Tj
/F1 12 Tf
0 -30 Td
({clean_text[:120]}) Tj
ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000236 00000 n 
0000000486 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
562
%%EOF"""
    with open(filepath, "wb") as f:
        f.write(content.encode("latin-1"))


def create_minimal_docx(filepath, title, text):
    """Creates a sample docx text file fallback."""
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(f"{title}\n\n{text}")


def seed_initial_documents(conn):
    """Pre-seeds the initial study documents for the 3 friends."""
    friends = {f["email"]: f for f in config.AUTHORIZED_FRIENDS}

    sample_docs = [
        {
            "id": "doc-cn-unit2",
            "file_name": "CN Unit 2 Notes.pdf",
            "title": "CN Unit 2 Notes",
            "file_type": "pdf",
            "file_size": 2516582,  # 2.4 MB
            "email": "saiprasadthorat29@gmail.com",
            "category": "Notes",
            "description": "Complete Computer Networks Unit 2 notes covering OSI Model, TCP/IP, and Flow Control.",
            "tags": ["Computer Networks", "Unit 2", "Exams"],
            "shared": 1,
            "created_at": "2026-09-27T09:15:00Z",
            "sample_text": "Computer Networks Unit 2: OSI 7-Layer Model, Sliding Window Protocol, Routing Algorithms."
        },
        {
            "id": "doc-dbms-questions",
            "file_name": "DBMS Important Questions.docx",
            "title": "DBMS Important Questions",
            "file_type": "docx",
            "file_size": 1153433,  # 1.1 MB
            "email": "vks20252026@gmail.com",
            "category": "Question Papers",
            "description": "Frequently asked exam questions: Normalization 1NF to BCNF, ACID Properties, Transactions.",
            "tags": ["DBMS", "SQL", "Viva Prep"],
            "shared": 1,
            "created_at": "2026-09-26T14:30:00Z",
            "sample_text": "DBMS Important Questions: 1. ACID Properties. 2. Normalization 1NF to BCNF. 3. Indexing."
        },
        {
            "id": "doc-os-lab4",
            "file_name": "OS Lab Experiment 4.pdf",
            "title": "OS Lab Experiment 4",
            "file_type": "pdf",
            "file_size": 3984588,  # 3.8 MB
            "email": "sanskarkulkarni9825@gmail.com",
            "category": "Lab Files",
            "description": "Operating Systems Lab Experiment 4: Producer-Consumer Problem using Semaphores.",
            "tags": ["Operating Systems", "Lab", "C Programming"],
            "shared": 1,
            "created_at": "2026-09-25T11:00:00Z",
            "sample_text": "OS Lab Exp 4: Process Synchronization and POSIX Semaphores Implementation in C."
        },
        {
            "id": "doc-algo-draft",
            "file_name": "Algorithms Personal Solutions.pdf",
            "title": "Algorithms Personal Solutions",
            "file_type": "pdf",
            "file_size": 1887436,  # 1.8 MB
            "email": "saiprasadthorat29@gmail.com",
            "category": "Study Material",
            "description": "Personal practice draft solutions for dynamic programming.",
            "tags": ["Algorithms", "Personal Draft"],
            "shared": 0,  # Private to Saiprasad
            "created_at": "2026-09-24T16:00:00Z",
            "sample_text": "Algorithm Solutions: Dynamic Programming - 0/1 Knapsack, LCS, Matrix Chain."
        }
    ]

    for item in sample_docs:
        storage_filename = f"{item['id']}_{item['file_name']}"
        storage_path = config.PRIVATE_STORAGE_DIR / storage_filename

        if item["file_type"] == "pdf":
            create_minimal_pdf(storage_path, item["title"], item["sample_text"])
        else:
            create_minimal_docx(storage_path, item["title"], item["sample_text"])

        friend = friends[item["email"]]
        conn.execute("""
            INSERT INTO documents (
                id, file_name, title, file_type, file_size, storage_path,
                uploaded_by_email, uploaded_by_name, category, description,
                tags, shared_with_group, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            item["id"],
            item["file_name"],
            item["title"],
            item["file_type"],
            item["file_size"],
            str(storage_path),
            item["email"],
            friend["name"],
            item["category"],
            item["description"],
            json.dumps(item["tags"]),
            item["shared"],
            item["created_at"],
            item["created_at"],
        ))
    conn.commit()


# Helper: get friend object by email
def get_friend_by_email(email):
    if not email:
        return None
    email_clean = email.strip().lower()
    for friend in config.AUTHORIZED_FRIENDS:
        if friend["email"].lower() == email_clean:
            return friend
    return None


# Helper: require login decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        current_email = session.get("user_email")
        if not current_email or current_email.lower() not in config.ALLOWED_EMAILS:
            if request.path.startswith("/api/"):
                return jsonify({"error": "Unauthorized. Please log in as an authorized friend."}), 401
            return redirect(url_for("login_page"))
        return f(*args, **kwargs)
    return decorated_function


@app.before_request
def setup_initial_session():
    # If no session yet, default to Friend 1 (Saiprasad) for immediate convenient local preview
    if "user_email" not in session:
        session["user_email"] = config.AUTHORIZED_FRIENDS[0]["email"]


# -------------------------
# Web Page Routes
# -------------------------

@app.route("/")
def index():
    user_email = session.get("user_email")
    if not user_email or user_email.lower() not in config.ALLOWED_EMAILS:
        return render_template("login.html", friends=config.AUTHORIZED_FRIENDS)
    return render_template("index.html")


@app.route("/login")
def login_page():
    return render_template("login.html", friends=config.AUTHORIZED_FRIENDS)


# -------------------------
# Authentication API
# -------------------------

@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()

    if email not in config.ALLOWED_EMAILS:
        return jsonify({
            "error": f"Access Denied: '{email}' is not one of the 3 authorized study group friends."
        }), 403

    friend = get_friend_by_email(email)
    session["user_email"] = friend["email"]
    return jsonify({"success": True, "user": friend})


@app.route("/api/switch-friend", methods=["POST"])
def api_switch_friend():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()

    if email not in config.ALLOWED_EMAILS:
        return jsonify({"error": "Invalid friend selection"}), 403

    friend = get_friend_by_email(email)
    session["user_email"] = friend["email"]
    return jsonify({"success": True, "user": friend})


@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.pop("user_email", None)
    return jsonify({"success": True})


@app.route("/api/current-user")
def api_current_user():
    user_email = session.get("user_email")
    friend = get_friend_by_email(user_email)
    if not friend:
        return jsonify({"authenticated": False}), 401
    return jsonify({
        "authenticated": True,
        "user": friend,
        "authorized_friends": config.AUTHORIZED_FRIENDS,
        "is_gdrive_configured": drive_manager.is_configured
    })


# -------------------------
# Documents API
# -------------------------

@app.route("/api/documents")
@login_required
def api_get_documents():
    current_email = session["user_email"].lower()
    tab = request.args.get("tab", "all")
    category = request.args.get("category", "all")
    query = (request.args.get("q") or "").strip().lower()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM documents ORDER BY created_at DESC")
        rows = cursor.fetchall()

    filtered = []
    for row in rows:
        doc = dict(row)
        doc["tags"] = json.loads(doc["tags"]) if doc["tags"] else []
        doc["shared_with_group"] = bool(doc["shared_with_group"])
        uploader_email = doc["uploaded_by_email"].lower()
        is_owner = (uploader_email == current_email)

        # 1. Security Check: Can this user see the document?
        # User sees: group shared documents OR documents they uploaded
        if not (doc["shared_with_group"] or is_owner):
            continue

        # 2. Tab filtering
        if tab == "my_uploads" and not is_owner:
            continue
        elif tab == "shared" and not doc["shared_with_group"]:
            continue

        # 3. Category filtering
        if category != "all" and doc["category"] != category:
            continue

        # 4. Search query filtering
        if query:
            matches_title = query in doc["title"].lower()
            matches_name = query in doc["file_name"].lower()
            matches_desc = query in (doc["description"] or "").lower()
            matches_cat = query in (doc["category"] or "").lower()
            matches_uploader = query in (doc["uploaded_by_name"] or "").lower()
            matches_tags = any(query in t.lower() for t in doc["tags"])

            if not (matches_title or matches_name or matches_desc or matches_cat or matches_uploader or matches_tags):
                continue

        filtered.append(doc)

    if tab == "recent":
        filtered = filtered[:10]

    return jsonify({"documents": filtered})


@app.route("/api/upload", methods=["POST"])
@login_required
def api_upload():
    if "file" not in request.files:
        return jsonify({"error": "No file part in upload request"}), 400

    file = request.files["file"]
    if not file or file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    original_filename = file.filename or "document"
    safe_disk_filename = secure_filename(file.filename) or "document"
    ext = Path(original_filename).suffix.lower()

    if ext not in config.ALLOWED_EXTENSIONS:
        return jsonify({
            "error": f"Invalid file type '{ext}'. Only PDF, DOC, and DOCX files are allowed."
        }), 400

    # Read file content
    file_bytes = file.read()
    file_size = len(file_bytes)

    if file_size > config.MAX_CONTENT_LENGTH:
        return jsonify({"error": "File size exceeds the 50MB limit."}), 400

    doc_id = f"doc_{uuid.uuid4().hex[:12]}"
    current_friend = get_friend_by_email(session["user_email"])

    title = request.form.get("title", "").strip() or Path(original_filename).stem
    category = request.form.get("category", "Notes")
    description = request.form.get("description", "").strip()
    tags_str = request.form.get("tags", "[]")
    try:
        tags = json.loads(tags_str) if isinstance(tags_str, str) else []
    except Exception:
        tags = [t.strip() for t in tags_str.split(",") if t.strip()]

    shared_with_group = 1 if request.form.get("shared_with_group", "true").lower() in ("true", "1") else 0
    now = datetime.now(timezone.utc).isoformat()

    # Save to private storage folder with secure disk name
    storage_filename = f"{doc_id}_{safe_disk_filename}"
    storage_path = config.PRIVATE_STORAGE_DIR / storage_filename
    with open(storage_path, "wb") as f:
        f.write(file_bytes)

    # Optional: Upload to Google Drive if configured
    is_drive = 0
    drive_file_id = ""
    if drive_manager.is_configured:
        try:
            import io
            drive_res = drive_manager.upload_file(
                file_stream=io.BytesIO(file_bytes),
                filename=original_filename,
                mimetype=file.mimetype or "application/octet-stream",
                metadata={
                    "title": title,
                    "description": description,
                    "category": category,
                    "tags": tags,
                    "shared_with_group": bool(shared_with_group),
                    "uploaded_by_name": current_friend["name"],
                    "uploaded_by_email": current_friend["email"],
                }
            )
            drive_file_id = drive_res.get("id", "")
            is_drive = 1
        except Exception as e:
            print(f"Drive upload notice: {e}")

    with get_db() as conn:
        conn.execute("""
            INSERT INTO documents (
                id, file_name, title, file_type, file_size, storage_path,
                uploaded_by_email, uploaded_by_name, category, description,
                tags, shared_with_group, created_at, updated_at, is_drive, drive_file_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            doc_id,
            original_filename,
            title,
            ext.replace(".", ""),
            file_size,
            str(storage_path),
            current_friend["email"],
            current_friend["name"],
            category,
            description,
            json.dumps(tags),
            shared_with_group,
            now,
            now,
            is_drive,
            drive_file_id
        ))
        conn.commit()

    return jsonify({
        "success": True,
        "document": {
            "id": doc_id,
            "file_name": original_filename,
            "title": title,
            "file_type": ext.replace(".", ""),
            "file_size": file_size,
            "category": category,
            "description": description,
            "tags": tags,
            "shared_with_group": bool(shared_with_group),
            "uploaded_by_name": current_friend["name"],
            "uploaded_by_email": current_friend["email"],
            "created_at": now,
        }
    })


@app.route("/api/documents/<doc_id>/preview")
@login_required
def api_preview_document(doc_id):
    current_email = session["user_email"].lower()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
        row = cursor.fetchone()

    if not row:
        abort(404, "Document not found")

    doc = dict(row)
    is_owner = (doc["uploaded_by_email"].lower() == current_email)
    if not (doc["shared_with_group"] or is_owner):
        abort(403, "Access Denied: You do not have permission to view this document.")

    storage_path = Path(doc["storage_path"])
    if not storage_path.exists():
        abort(404, "Document file not found on private storage.")

    mimetypes = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "doc": "application/msword",
    }
    mimetype = mimetypes.get(doc["file_type"], "application/octet-stream")

    return send_file(
        storage_path,
        mimetype=mimetype,
        as_attachment=False,
        download_name=doc["file_name"]
    )


@app.route("/api/documents/<doc_id>/download")
@login_required
def api_download_document(doc_id):
    current_email = session["user_email"].lower()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
        row = cursor.fetchone()

    if not row:
        abort(404, "Document not found")

    doc = dict(row)
    is_owner = (doc["uploaded_by_email"].lower() == current_email)
    if not (doc["shared_with_group"] or is_owner):
        abort(403, "Access Denied: You do not have permission to download this document.")

    storage_path = Path(doc["storage_path"])
    if not storage_path.exists():
        abort(404, "Document file not found on private storage.")

    return send_file(
        storage_path,
        as_attachment=True,
        download_name=doc["file_name"]
    )


@app.route("/api/documents/<doc_id>/toggle-share", methods=["POST"])
@login_required
def api_toggle_share(doc_id):
    current_email = session["user_email"].lower()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
        row = cursor.fetchone()

        if not row:
            abort(404, "Document not found")

        doc = dict(row)
        new_status = 0 if doc["shared_with_group"] else 1
        now = datetime.now(timezone.utc).isoformat()

        conn.execute("UPDATE documents SET shared_with_group = ?, updated_at = ? WHERE id = ?", (new_status, now, doc_id))
        conn.commit()

    return jsonify({"success": True, "shared_with_group": bool(new_status)})


@app.route("/api/documents/<doc_id>", methods=["PUT"])
@login_required
def api_edit_document(doc_id):
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    category = data.get("category", "Notes")
    description = (data.get("description") or "").strip()
    tags = data.get("tags", [])
    shared_with_group = 1 if data.get("shared_with_group", True) else 0
    now = datetime.now(timezone.utc).isoformat()

    if not title:
        return jsonify({"error": "Title cannot be empty"}), 400

    with get_db() as conn:
        conn.execute("""
            UPDATE documents 
            SET title = ?, category = ?, description = ?, tags = ?, shared_with_group = ?, updated_at = ?
            WHERE id = ?
        """, (title, category, description, json.dumps(tags), shared_with_group, now, doc_id))
        conn.commit()

    return jsonify({"success": True})


@app.route("/api/documents/<doc_id>", methods=["DELETE"])
@login_required
def api_delete_document(doc_id):
    current_email = session["user_email"].lower()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
        row = cursor.fetchone()

        if not row:
            abort(404, "Document not found")

        doc = dict(row)
        # Delete local file
        storage_path = Path(doc["storage_path"])
        if storage_path.exists():
            try:
                storage_path.unlink()
            except Exception as e:
                print(f"Error removing file {storage_path}: {e}")

        # Delete from Drive if present
        if doc.get("is_drive") and doc.get("drive_file_id"):
            drive_manager.delete_file(doc["drive_file_id"])

        conn.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
        conn.commit()

    return jsonify({"success": True})


@app.route("/api/stats")
@login_required
def api_stats():
    current_email = session["user_email"].lower()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM documents")
        rows = cursor.fetchall()

    total_count = 0
    shared_count = 0
    my_uploads_count = 0
    total_bytes = 0

    for row in rows:
        doc = dict(row)
        is_owner = (doc["uploaded_by_email"].lower() == current_email)
        is_shared = bool(doc["shared_with_group"])

        if is_shared or is_owner:
            total_count += 1
            total_bytes += doc["file_size"]
            if is_shared:
                shared_count += 1
            if is_owner:
                my_uploads_count += 1

    return jsonify({
        "total_count": total_count,
        "shared_count": shared_count,
        "my_uploads_count": my_uploads_count,
        "total_bytes": total_bytes,
    })


# Initialize DB on startup
init_db()

if __name__ == "__main__":
    print("=" * 65)
    print("[StudyVault] Private Document Sharing Server (Python)")
    print("Restricted Strictly to the 3 Authorized Friends:")
    for f in config.AUTHORIZED_FRIENDS:
        print(f"   * {f['name']} ({f['email']}) - {f['role']}")
    print("=" * 65)
    app.run(host="127.0.0.1", port=5000, debug=True)
