/**
 * StudyVault Private Backend Server
 * Uses Google Drive API with Service Account credentials to keep the Drive folder
 * completely private while proxying requests only for the 3 authorized friends.
 */

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Whitelist of the 3 authorized friends
const AUTHORIZED_FRIENDS = [
  process.env.FRIEND_1_EMAIL || 'alex.rivera@studyvault.org',
  process.env.FRIEND_2_EMAIL || 'sam.chen@studyvault.org',
  process.env.FRIEND_3_EMAIL || 'jordan.patel@studyvault.org',
].map((e) => e.toLowerCase());

const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

// Multer memory storage for uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Google Drive Auth client (using Service Account key or credentials)
let driveClient = null;

function getDriveClient() {
  if (driveClient) return driveClient;

  let auth;
  const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.resolve('./service-account.json');

  if (fs.existsSync(keyFilePath)) {
    auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/drive']
    );
  } else {
    console.warn('⚠️ Google Service Account credentials not found. Drive API endpoints will return 503.');
    return null;
  }

  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

// Authentication Middleware: Enforce that requester is one of the 3 friends
function authenticateFriend(req, res, next) {
  const userEmail = (req.headers['x-user-email'] || '').trim().toLowerCase();

  if (!userEmail) {
    return res.status(401).json({ error: 'Missing user authentication header (x-user-email).' });
  }

  if (!AUTHORIZED_FRIENDS.includes(userEmail)) {
    return res.status(403).json({
      error: `Access Denied: ${userEmail} is not authorized. Access is strictly limited to the 3 group members.`,
    });
  }

  req.userEmail = userEmail;
  next();
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', authorizedCount: AUTHORIZED_FRIENDS.length });
});

// 1. List Documents
app.get('/api/documents', authenticateFriend, async (req, res) => {
  try {
    const drive = getDriveClient();
    if (!drive || !GOOGLE_DRIVE_FOLDER_ID) {
      return res.status(503).json({ error: 'Google Drive backend not configured.' });
    }

    const response = await drive.files.list({
      q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, description, appProperties)',
      orderBy: 'modifiedTime desc',
      pageSize: 100,
    });

    const files = (response.data.files || []).map((file) => {
      const props = file.appProperties || {};
      let tags = [];
      try {
        tags = props.tags ? JSON.parse(props.tags) : [];
      } catch (e) {
        tags = [];
      }

      return {
        id: file.id,
        title: props.documentTitle || file.name.replace(/\.[^/.]+$/, ''),
        fileName: props.originalFileName || file.name,
        fileType: props.fileType || file.name.split('.').pop() || 'pdf',
        fileSize: parseInt(file.size || 0, 10),
        description: file.description || '',
        category: props.category || 'Notes',
        tags,
        sharedWithGroup: props.sharedWithGroup !== 'false',
        uploadedBy: {
          name: props.uploadedByName || 'Study Friend',
          email: props.uploadedByEmail || '',
        },
        createdAt: file.createdTime,
        updatedAt: file.modifiedTime,
      };
    });

    // Filter: group shared OR uploaded by current user
    const accessibleFiles = files.filter((f) => {
      if (f.sharedWithGroup) return true;
      return f.uploadedBy.email.toLowerCase() === req.userEmail;
    });

    res.json({ documents: accessibleFiles });
  } catch (err) {
    console.error('List files error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Upload Document
app.post('/api/documents', authenticateFriend, upload.single('file'), async (req, res) => {
  try {
    const drive = getDriveClient();
    if (!drive || !GOOGLE_DRIVE_FOLDER_ID) {
      return res.status(503).json({ error: 'Google Drive backend not configured.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { title, category, description, tags, sharedWithGroup, userName } = req.body;
    const ext = req.file.originalname.split('.').pop().toLowerCase();

    const fileMetadata = {
      name: title ? `${title}.${ext}` : req.file.originalname,
      parents: [GOOGLE_DRIVE_FOLDER_ID],
      description: description || '',
      appProperties: {
        originalFileName: req.file.originalname,
        documentTitle: title || req.file.originalname.replace(/\.[^/.]+$/, ''),
        fileType: ext,
        category: category || 'Notes',
        tags: tags || '[]',
        sharedWithGroup: sharedWithGroup !== 'false' ? 'true' : 'false',
        uploadedByName: userName || 'Study Friend',
        uploadedByEmail: req.userEmail,
      },
    };

    const media = {
      mimeType: req.file.mimetype,
      body: req.file.buffer,
    };

    const driveRes = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, name, mimeType, size, createdTime, modifiedTime, description, appProperties',
    });

    res.status(201).json({ document: driveRes.data });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. Authenticated Download (Streamed binary, NO public links)
app.get('/api/documents/:fileId/download', authenticateFriend, async (req, res) => {
  try {
    const drive = getDriveClient();
    if (!drive) return res.status(503).json({ error: 'Drive backend not configured' });

    const fileId = req.params.fileId;
    const meta = await drive.files.get({ fileId, fields: 'id, name, mimeType, appProperties' });
    const originalName = meta.data.appProperties?.originalFileName || meta.data.name;

    const stream = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"`);
    res.setHeader('Content-Type', meta.data.mimeType || 'application/octet-stream');
    stream.data.pipe(res);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Failed to stream document' });
  }
});

// 4. Delete Document
app.delete('/api/documents/:fileId', authenticateFriend, async (req, res) => {
  try {
    const drive = getDriveClient();
    if (!drive) return res.status(503).json({ error: 'Drive backend not configured' });

    await drive.files.delete({ fileId: req.params.fileId });
    res.json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`StudyVault private backend running on port ${PORT}`);
  console.log(`Authorized members: ${AUTHORIZED_FRIENDS.join(', ')}`);
});
