# StudyVault • Private Document Sharing for 3 Friends (Python)

A secure, private study-document sharing platform created in **Python (Flask + SQLite)** specifically for a group of **exactly three authorized friends**.

StudyVault allows the three friends to upload, preview, download, and share **PDF**, **DOC**, and **DOCX** files with each other in complete privacy. Any outside visitor is strictly blocked at the security gate.

---

## 🔒 Security Guarantee

- **Strict Whitelist Access**: Only accounts matching the 3 configured emails are allowed to log in or access documents. Any unauthorized visitor is blocked with HTTP 403 Access Denied.
- **Configurable Friends (Environment Variables)**: The 3 friends' names and emails are configured securely via environment variables or a `.env` file (which is excluded from Git), so no personal emails are exposed in the public code.
- **Private Storage**: Documents are stored in `storage/private_documents/` outside of public web roots, accessible solely via authenticated Flask streaming endpoints (`/api/documents/<id>/preview` and `/api/documents/<id>/download`).
- **No Public Links**: Document URLs are never public. Files require active session authentication.
- **Google Drive Integration**: Optional Google Drive API v3 sync (`gdrive_service.py`) keeping files inside a private restricted Google Drive folder shared only with the 3 friends.

---

## ⚙️ Configuration (The 3 Friends)

Create a `.env` file (or set environment variables on your cloud host like Render/Railway):

```env
# The 3 Authorized Friends
FRIEND_1_NAME=Friend 1
FRIEND_1_EMAIL=friend1@example.com

FRIEND_2_NAME=Friend 2
FRIEND_2_EMAIL=friend2@example.com

FRIEND_3_NAME=Friend 3
FRIEND_3_EMAIL=friend3@example.com
```

---

## 🚀 How to Run

### 1. Install Requirements
```bash
pip install -r requirements.txt
```

### 2. Start the Server
```bash
python run.py
```
Open **`http://127.0.0.1:5000`** in your browser.

### 3. Run Automated Tests
```bash
python test_app.py
```

---

## 💻 Features & User Experience

- **Active Friend Switcher**: Click on any of the 3 friends in the top navigation bar to test views from the perspective of **Friend 1**, **Friend 2**, or **Friend 3**!
- **Prominent Upload**: Drag-and-drop or select any PDF, DOC, or DOCX document (up to 50MB) with title, subject/category, description, tags, and "Share with Group" toggle.
- **Group Sharing Flow**:
  - When **Friend 1** uploads a document with *Share with Group* enabled, **Friend 2** and **Friend 3** immediately see it under *All Documents* and *Shared Documents*.
  - When **Friend 2** uploads, **Friend 1** and **Friend 3** see it with full in-browser preview and download options.
- **In-Browser Document Previews**:
  - **PDF**: In-browser embedded PDF viewer with page navigation, zoom, and download.
  - **DOCX**: Formatted client-side Word document rendering using Mammoth.js directly in the browser!
  - **DOC**: Document summary and direct secure download.
- **Search & Filters**:
  - Live search by file name, subject, category, uploader, or tags.
  - Categories: *Notes, Assignments, Lab Files, Question Papers, Study Material, Projects, Other*.
  - View modes: Grid cards or compact List rows.
  - Dark / Light mode toggle.

---

## 📁 Project Structure

```
├── app.py              # Main Flask application, routes, and SQLite database
├── config.py           # Authorized 3 friends configuration & environment loader
├── gdrive_service.py   # Optional Google Drive API v3 integration
├── run.py              # Server entry point
├── test_app.py         # Automated verification tests for the 3 friends flow
├── templates/
│   ├── index.html      # Main dashboard with PDF/DOCX preview modals
│   └── login.html      # Security gate for outside visitors
├── storage/
│   └── private_documents/ # Private authenticated file store
├── requirements.txt    # Python dependencies
└── studyvault.db       # SQLite document metadata database
```
