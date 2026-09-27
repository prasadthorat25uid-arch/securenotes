// Google Drive API v3 Service for Private Folder Access

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

/**
 * Request access token using Google Identity Services (GIS)
 */
export function requestGoogleAccessToken({ clientId, userEmail, onSuccess, onError }) {
  if (!window.google?.accounts?.oauth2) {
    onError(new Error('Google Identity Services script not yet loaded. Please check your internet connection.'));
    return;
  }

  try {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
      hint: userEmail || undefined,
      callback: (tokenResponse) => {
        if (tokenResponse.error) {
          onError(new Error(tokenResponse.error_description || tokenResponse.error));
          return;
        }
        onSuccess(tokenResponse.access_token, tokenResponse.expires_in);
      },
    });

    tokenClient.requestAccessToken({ prompt: userEmail ? 'none' : 'select_account' });
  } catch (err) {
    onError(err);
  }
}

/**
 * List files inside the private Google Drive Folder
 */
export async function listDriveFiles(folderId, accessToken) {
  if (!folderId || !accessToken) {
    throw new Error('Google Drive folder ID and access token are required');
  }

  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const fields = encodeURIComponent('files(id, name, mimeType, size, createdTime, modifiedTime, description, appProperties, webViewLink, webContentLink)');
  const url = `${DRIVE_API_BASE}/files?q=${query}&fields=${fields}&orderBy=modifiedTime desc&pageSize=100`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Failed to fetch files from Google Drive (HTTP ${response.status})`);
  }

  const data = await response.json();
  return (data.files || []).map(normalizeDriveFile);
}

/**
 * Upload a document directly into the private Google Drive folder
 */
export async function uploadFileToDrive({ file, metadata, folderId, accessToken, onProgress }) {
  if (!folderId || !accessToken) {
    throw new Error('Google Drive folder ID and access token are required for upload');
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const fileMetadata = {
    name: metadata.title ? `${metadata.title}.${file.name.split('.').pop()}` : file.name,
    originalFilename: file.name,
    parents: [folderId],
    description: metadata.description || '',
    appProperties: {
      originalFileName: file.name,
      documentTitle: metadata.title || file.name.replace(/\.[^/.]+$/, ''),
      fileType: getNormalizedFileType(file.name),
      category: metadata.category || 'Notes',
      tags: JSON.stringify(metadata.tags || []),
      sharedWithGroup: metadata.sharedWithGroup ? 'true' : 'false',
      uploadedById: metadata.uploadedBy?.id || '',
      uploadedByName: metadata.uploadedBy?.name || '',
      uploadedByEmail: metadata.uploadedBy?.email || '',
    },
  };

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(fileMetadata)}`;
  const fileHeader = `${delimiter}Content-Type: ${file.type || 'application/octet-stream'}\r\nContent-Transfer-Encoding: base64\r\n\r\n`;

  // Convert file to base64
  const base64Data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.substring(result.indexOf(',') + 1);
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const multipartBody = metadataPart + fileHeader + base64Data + closeDelimiter;

  const response = await fetch(`${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,modifiedTime,description,appProperties`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Failed to upload file to Google Drive (HTTP ${response.status})`);
  }

  const uploadedDriveFile = await response.json();
  return normalizeDriveFile(uploadedDriveFile);
}

/**
 * Fetch binary blob for a private Drive file using Bearer token
 * (Guarantees NO public sharing link is needed!)
 */
export async function downloadDriveFileBlob(fileId, accessToken) {
  const url = `${DRIVE_API_BASE}/files/${fileId}?alt=media`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download file content (HTTP ${response.status})`);
  }

  return await response.blob();
}

/**
 * Delete a file in Google Drive
 */
export async function deleteDriveFile(fileId, accessToken) {
  const url = `${DRIVE_API_BASE}/files/${fileId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 204 && response.status !== 404) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Failed to delete file from Google Drive`);
  }
  return true;
}

/**
 * Update file metadata (title, category, shared status) in Drive
 */
export async function updateDriveFileMetadata(fileId, metadata, accessToken) {
  const url = `${DRIVE_API_BASE}/files/${fileId}?fields=id,name,description,appProperties`;

  const body = {};
  if (metadata.name) body.name = metadata.name;
  if (metadata.description !== undefined) body.description = metadata.description;

  const appProperties = {};
  if (metadata.category) appProperties.category = metadata.category;
  if (metadata.tags) appProperties.tags = JSON.stringify(metadata.tags);
  if (metadata.sharedWithGroup !== undefined) appProperties.sharedWithGroup = metadata.sharedWithGroup ? 'true' : 'false';
  if (metadata.title) appProperties.documentTitle = metadata.title;

  if (Object.keys(appProperties).length > 0) {
    body.appProperties = appProperties;
  }

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error?.message || `Failed to update file metadata`);
  }

  const updatedFile = await response.json();
  return normalizeDriveFile(updatedFile);
}

/**
 * Helper to normalize Google Drive file object to our application Document model
 */
function normalizeDriveFile(driveFile) {
  const props = driveFile.appProperties || {};
  let tags = [];
  try {
    tags = props.tags ? JSON.parse(props.tags) : [];
  } catch (e) {
    tags = [];
  }

  const extension = (driveFile.name || '').split('.').pop()?.toLowerCase();
  const fileType = props.fileType || extension || 'pdf';

  return {
    id: driveFile.id,
    title: props.documentTitle || driveFile.name.replace(/\.[^/.]+$/, ''),
    fileName: props.originalFileName || driveFile.name,
    fileType: fileType,
    fileSize: parseInt(driveFile.size || 0, 10),
    description: driveFile.description || '',
    category: props.category || 'Notes',
    tags: tags,
    sharedWithGroup: props.sharedWithGroup !== 'false',
    uploadedBy: {
      id: props.uploadedById || 'unknown',
      name: props.uploadedByName || 'Study Friend',
      email: props.uploadedByEmail || '',
    },
    createdAt: driveFile.createdTime || new Date().toISOString(),
    updatedAt: driveFile.modifiedTime || driveFile.createdTime || new Date().toISOString(),
    isFromDrive: true,
  };
}

function getNormalizedFileType(fileName) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'docx') return 'docx';
  if (ext === 'doc') return 'doc';
  return 'pdf';
}
