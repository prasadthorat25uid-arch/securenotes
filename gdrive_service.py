"""
Google Drive API Integration Service (Python)
Accesses private Google Drive folder via Google Service Account or OAuth credentials.
No public links are exposed — all streams require backend authentication.
"""

import os
import io
import json
from pathlib import Path
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload
from google.oauth2 import service_account

class GoogleDriveManager:
    def __init__(self, folder_id=None, credentials_path=None):
        self.folder_id = folder_id or os.environ.get("GOOGLE_DRIVE_FOLDER_ID", "")
        self.credentials_path = credentials_path or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "")
        self.service = None
        self._init_service()

    def _init_service(self):
        if not self.credentials_path or not Path(self.credentials_path).exists():
            return

        try:
            creds = service_account.Credentials.from_service_account_file(
                self.credentials_path,
                scopes=["https://www.googleapis.com/auth/drive"]
            )
            self.service = build("drive", "v3", credentials=creds)
        except Exception as e:
            print(f"⚠️ Google Drive Service initialization notice: {e}")
            self.service = None

    @property
    def is_configured(self):
        return bool(self.service and self.folder_id)

    def upload_file(self, file_stream, filename, mimetype, metadata=None):
        """Uploads a file directly into the private Google Drive folder."""
        if not self.is_configured:
            raise RuntimeError("Google Drive service is not configured.")

        metadata = metadata or {}
        file_metadata = {
            "name": metadata.get("title") or filename,
            "parents": [self.folder_id],
            "description": metadata.get("description", ""),
            "appProperties": {
                "originalFileName": filename,
                "category": metadata.get("category", "Notes"),
                "tags": json.dumps(metadata.get("tags", [])),
                "sharedWithGroup": "true" if metadata.get("shared_with_group", True) else "false",
                "uploadedByName": metadata.get("uploaded_by_name", ""),
                "uploadedByEmail": metadata.get("uploaded_by_email", ""),
            }
        }

        media = MediaIoBaseUpload(file_stream, mimetype=mimetype, resumable=True)
        drive_file = self.service.files().create(
            body=file_metadata,
            media_body=media,
            fields="id, name, mimeType, size, createdTime, modifiedTime"
        ).execute()

        return drive_file

    def download_file(self, file_id):
        """Downloads binary stream of a file from private Google Drive."""
        if not self.is_configured:
            raise RuntimeError("Google Drive service is not configured.")

        request = self.service.files().get_media(fileId=file_id)
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while not done:
            status, done = downloader.next_chunk()

        fh.seek(0)
        return fh

    def delete_file(self, file_id):
        """Deletes a file from Google Drive."""
        if not self.is_configured:
            return False
        try:
            self.service.files().delete(fileId=file_id).execute()
            return True
        except Exception as e:
            print(f"Error deleting file from Drive: {e}")
            return False
