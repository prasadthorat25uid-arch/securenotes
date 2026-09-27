# StudyVault • Private Document Sharing for 3 Friends (Python)

A secure, private study-document sharing platform created in **Python (Flask + SQLite)** specifically for a group of **exactly three authorized friends**:

1. **Friend 1**: Saiprasad Thorat (`saiprasadthorat29@gmail.com`)
2. **Friend 2**: VKS (`vks20252026@gmail.com`)
3. **Friend 3**: Sanskar Kulkarni (`sanskarkulkarni9825@gmail.com`)

StudyVault allows these three friends to upload, preview, download, and share **PDF**, **DOC**, and **DOCX** files with each other in complete privacy. Any outside visitor is strictly blocked at the security gate.

---

## 🔒 Security Guarantee

- **Strict Whitelist Access**: Only accounts matching `saiprasadthorat29@gmail.com`, `vks20252026@gmail.com`, and `sanskarkulkarni9825@gmail.com` are allowed to log in or access documents. Any unauthorized visitor is blocked with HTTP 403 Access Denied.
- **Private Storage**: Documents are stored in `storage/private_documents/` outside of public web roots, accessible solely via authenticated Flask streaming endpoints (`/api/documents/<id>/preview` and `/api/documents/<id>/download`).
- **No Public Links**: Document URLs are never public. Files require active session authentication.
- **Google Drive Integration**: Optional Google Drive API v3 sync (`gdrive_service.py`) keeping files inside a private restricted Google Drive folder shared only with the 3 friends.

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

- **Active Friend Switcher**: Click on any of the 3 friends in the top navigation bar to test views from the perspective of **Saiprasad**, **VKS**, or **Sanskar**!
- **Prominent Upload**: Drag-and-drop or select any PDF, DOC, or DOCX document (up to 50MB) with title, subject/category, description, tags, and "Share with Group" toggle.
- **Group Sharing Flow**:
  - When **Saiprasad** uploads *"CN Unit 2 Notes.pdf"*, **VKS** and **Sanskar** immediately see it under *All Documents* and *Shared Documents*.
  - When **VKS** uploads *"DBMS Important Questions.docx"*, **Saiprasad** and **Sanskar** see it with full in-browser preview and download options.
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
├── config.py           # Authorized 3 friends emails, storage paths, security settings
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
