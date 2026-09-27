// Unified Storage Service: Manages Private Google Drive or Simulated Local Private Vault

import {
  listDriveFiles,
  uploadFileToDrive,
  downloadDriveFileBlob,
  deleteDriveFile,
  updateDriveFileMetadata,
} from './googleDrive';
import { DEFAULT_FRIENDS } from '../config/friends';

const DB_NAME = 'StudyVaultDB';
const DB_VERSION = 1;
const STORE_FILES = 'files';
const STORE_METADATA = 'metadata';

// Sample preloaded study documents matching user specifications
const INITIAL_MOCK_DOCUMENTS = [
  {
    id: 'mock-doc-1',
    title: 'CN Unit 2 Notes',
    fileName: 'CN Unit 2 Notes.pdf',
    fileType: 'pdf',
    fileSize: 2457600, // 2.4 MB
    description: 'Complete computer networks unit 2 handwritten notes covering OSI model, TCP/IP, and sliding window protocol.',
    category: 'Notes',
    tags: ['Computer Networks', 'Unit 2', 'Exams'],
    sharedWithGroup: true,
    uploadedBy: {
      id: DEFAULT_FRIENDS[0].id,
      name: DEFAULT_FRIENDS[0].name,
      email: DEFAULT_FRIENDS[0].email,
    },
    createdAt: '2026-09-27T09:30:00.000Z',
    updatedAt: '2026-09-27T09:30:00.000Z',
    isFromDrive: false,
    mockContent: generateSamplePdfContent('Computer Networks Unit 2 Notes\n\nTopics:\n1. OSI 7-Layer Reference Model\n2. TCP vs UDP Protocol Analysis\n3. Sliding Window Flow Control\n4. Routing Algorithms: Dijkstra vs Bellman-Ford\n\nPrepared for Group Study Session.'),
  },
  {
    id: 'mock-doc-2',
    title: 'DBMS Important Questions',
    fileName: 'DBMS Important Questions.docx',
    fileType: 'docx',
    fileSize: 1153433, // 1.1 MB
    description: 'Frequently asked questions in university exams: Normalization (1NF to BCNF), ACID properties, and SQL indexing.',
    category: 'Question Papers',
    tags: ['DBMS', 'SQL', 'Viva Prep'],
    sharedWithGroup: true,
    uploadedBy: {
      id: DEFAULT_FRIENDS[1].id,
      name: DEFAULT_FRIENDS[1].name,
      email: DEFAULT_FRIENDS[1].email,
    },
    createdAt: '2026-09-26T14:15:00.000Z',
    updatedAt: '2026-09-26T14:15:00.000Z',
    isFromDrive: false,
    mockContent: 'Database Management Systems - Important Exam Questions\n\n1. Explain ACID properties with real-world banking transaction examples.\n2. Detail the steps of Normalization from 1NF to BCNF with functional dependencies.\n3. Differentiate between Clustered Index and Non-Clustered Index in SQL.\n4. Explain Two-Phase Locking (2PL) protocol for concurrency control.',
  },
  {
    id: 'mock-doc-3',
    title: 'OS Lab Experiment 4',
    fileName: 'OS Lab Experiment 4 - Semaphores.pdf',
    fileType: 'pdf',
    fileSize: 3984588, // 3.8 MB
    description: 'Operating Systems practical lab report on Producer-Consumer problem implementation using POSIX semaphores in C.',
    category: 'Lab Files',
    tags: ['Operating Systems', 'Lab', 'C Programming'],
    sharedWithGroup: true,
    uploadedBy: {
      id: DEFAULT_FRIENDS[2].id,
      name: DEFAULT_FRIENDS[2].name,
      email: DEFAULT_FRIENDS[2].email,
    },
    createdAt: '2026-09-25T11:00:00.000Z',
    updatedAt: '2026-09-25T11:00:00.000Z',
    isFromDrive: false,
    mockContent: generateSamplePdfContent('Operating Systems Lab\nExperiment 4: Producer-Consumer Problem using POSIX Semaphores\n\nAim:\nTo implement process synchronization using mutex locks and counting semaphores.\n\nCode verified and compiled successfully on Linux kernel.'),
  },
  {
    id: 'mock-doc-4',
    title: 'Algorithms Midterm Solutions',
    fileName: 'Algorithms Midterm Solutions.pdf',
    fileType: 'pdf',
    fileSize: 1887436, // 1.8 MB
    description: 'Personal draft solutions for dynamic programming and divide & conquer questions.',
    category: 'Study Material',
    tags: ['Algorithms', 'Personal Notes'],
    sharedWithGroup: false, // Private to Friend 1
    uploadedBy: {
      id: DEFAULT_FRIENDS[0].id,
      name: DEFAULT_FRIENDS[0].name,
      email: DEFAULT_FRIENDS[0].email,
    },
    createdAt: '2026-09-24T16:45:00.000Z',
    updatedAt: '2026-09-24T16:45:00.000Z',
    isFromDrive: false,
    mockContent: generateSamplePdfContent('Algorithm Analysis & Design\nPersonal Midterm Solutions\n\nTopics:\n- Dynamic Programming: 0/1 Knapsack\n- Matrix Chain Multiplication\n- Longest Common Subsequence'),
  },
];

// Open IndexedDB connection
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES);
      }
      if (!db.objectStoreNames.contains(STORE_METADATA)) {
        db.createObjectStore(STORE_METADATA, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Storage Service API
 */
export const storageService = {
  /**
   * Load all documents accessible to the current user
   */
  async getDocuments({ isLiveDrive, folderId, accessToken, currentUser }) {
    if (isLiveDrive && folderId && accessToken) {
      try {
        const driveFiles = await listDriveFiles(folderId, accessToken);
        // In Drive, all files in the private folder belong to the 3 friends.
        // We filter based on shared status and ownership if metadata specifies:
        return driveFiles.filter((doc) => {
          if (doc.sharedWithGroup) return true;
          return doc.uploadedBy?.email === currentUser?.email || doc.uploadedBy?.id === currentUser?.id;
        });
      } catch (err) {
        console.warn('Error fetching from Google Drive API, falling back to local vault:', err);
        throw err;
      }
    }

    // Local / Simulated Vault
    return await this.getLocalDocuments(currentUser);
  },

  /**
   * Get documents from local IndexedDB + seed data
   */
  async getLocalDocuments(currentUser) {
    const db = await openDB();
    const tx = db.transaction([STORE_METADATA], 'readonly');
    const store = tx.objectStore(STORE_METADATA);

    const storedDocs = await new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    let allDocs = storedDocs;
    if (allDocs.length === 0) {
      // Initialize with default study files
      allDocs = [...INITIAL_MOCK_DOCUMENTS];
      const writeTx = db.transaction([STORE_METADATA], 'readwrite');
      const writeStore = writeTx.objectStore(STORE_METADATA);
      for (const doc of allDocs) {
        writeStore.put(doc);
      }
    }

    // Filter documents: user can see documents that are shared with group OR uploaded by themselves
    return allDocs.filter((doc) => {
      if (doc.sharedWithGroup) return true;
      if (!currentUser) return false;
      return doc.uploadedBy?.id === currentUser.id || doc.uploadedBy?.email === currentUser.email;
    });
  },

  /**
   * Upload a document
   */
  async uploadDocument({ file, metadata, isLiveDrive, folderId, accessToken, currentUser }) {
    if (isLiveDrive && folderId && accessToken) {
      return await uploadFileToDrive({
        file,
        metadata: {
          ...metadata,
          uploadedBy: currentUser,
        },
        folderId,
        accessToken,
      });
    }

    // Local Vault upload
    const db = await openDB();
    const docId = 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    const extension = file.name.split('.').pop().toLowerCase();

    const newDoc = {
      id: docId,
      title: metadata.title?.trim() || file.name.replace(/\.[^/.]+$/, ''),
      fileName: file.name,
      fileType: extension,
      fileSize: file.size,
      description: metadata.description?.trim() || '',
      category: metadata.category || 'Notes',
      tags: metadata.tags || [],
      sharedWithGroup: metadata.sharedWithGroup !== false,
      uploadedBy: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isFromDrive: false,
    };

    // Store binary file Blob in IndexedDB
    const tx = db.transaction([STORE_FILES, STORE_METADATA], 'readwrite');
    tx.objectStore(STORE_FILES).put(file, docId);
    tx.objectStore(STORE_METADATA).put(newDoc);

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });

    return newDoc;
  },

  /**
   * Get file blob for preview or download
   */
  async getFileBlob(doc, { isLiveDrive, accessToken }) {
    if (doc.isFromDrive && isLiveDrive && accessToken) {
      return await downloadDriveFileBlob(doc.id, accessToken);
    }

    // Retrieve from local IndexedDB
    const db = await openDB();
    const tx = db.transaction([STORE_FILES], 'readonly');
    const store = tx.objectStore(STORE_FILES);

    const blob = await new Promise((resolve) => {
      const req = store.get(doc.id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });

    if (blob) {
      return blob;
    }

    // If mock sample document without stored blob, generate synthetic blob
    if (doc.fileType === 'pdf') {
      return new Blob([doc.mockContent || generateSamplePdfContent(doc.title)], { type: 'application/pdf' });
    } else if (doc.fileType === 'docx') {
      return new Blob([doc.mockContent || 'Sample document content for ' + doc.title], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
    }

    return new Blob([doc.description || 'Sample document content'], { type: 'text/plain' });
  },

  /**
   * Delete a document
   */
  async deleteDocument(doc, { isLiveDrive, accessToken }) {
    if (doc.isFromDrive && isLiveDrive && accessToken) {
      await deleteDriveFile(doc.id, accessToken);
      return true;
    }

    const db = await openDB();
    const tx = db.transaction([STORE_FILES, STORE_METADATA], 'readwrite');
    tx.objectStore(STORE_FILES).delete(doc.id);
    tx.objectStore(STORE_METADATA).delete(doc.id);

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    return true;
  },

  /**
   * Update metadata (rename, change category, toggle share)
   */
  async updateDocument(docId, updates, { isLiveDrive, accessToken }) {
    if (updates.isFromDrive && isLiveDrive && accessToken) {
      return await updateDriveFileMetadata(docId, updates, accessToken);
    }

    const db = await openDB();
    const tx = db.transaction([STORE_METADATA], 'readwrite');
    const store = tx.objectStore(STORE_METADATA);

    const existingDoc = await new Promise((resolve) => {
      const req = store.get(docId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });

    if (!existingDoc) {
      throw new Error('Document not found in storage');
    }

    const updated = {
      ...existingDoc,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    store.put(updated);
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
    });

    return updated;
  },

  /**
   * Reset local storage to initial mock state (useful for test resets)
   */
  async resetToDefaults() {
    const db = await openDB();
    const tx = db.transaction([STORE_FILES, STORE_METADATA], 'readwrite');
    tx.objectStore(STORE_FILES).clear();
    tx.objectStore(STORE_METADATA).clear();
    for (const doc of INITIAL_MOCK_DOCUMENTS) {
      tx.objectStore(STORE_METADATA).put(doc);
    }
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
    });
  },
};

/**
 * Creates a valid minimal PDF file blob in memory with readable text
 */
function generateSamplePdfContent(text) {
  const content = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 200 >> stream
BT
/F1 16 Tf
50 720 Td
(${sanitizePdfText(text.split('\n')[0] || 'StudyVault Document')}) Tj
/F1 12 Tf
0 -30 Td
(${sanitizePdfText(text.replace(/\n/g, '   '))}) Tj
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
%%EOF`;

  return content;
}

function sanitizePdfText(str) {
  return str.replace(/[()\\]/g, '').substring(0, 150);
}
