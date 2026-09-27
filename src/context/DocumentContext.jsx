import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { storageService } from '../services/storageService';

const DocumentContext = createContext(null);

export function DocumentProvider({ children }) {
  const { currentUser, driveConfig } = useAuth();

  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'my_uploads', 'shared', 'recent'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Modals state
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);

  // Toast / Status notification
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  // Fetch documents whenever user or drive config changes
  const fetchDocuments = useCallback(async () => {
    if (!currentUser) {
      setDocuments([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const docs = await storageService.getDocuments({
        isLiveDrive: driveConfig.isLiveDrive,
        folderId: driveConfig.folderId,
        accessToken: driveConfig.accessToken,
        currentUser,
      });
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents:', err);
      showToast(err.message || 'Failed to load documents', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, driveConfig, showToast]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Upload document
  const uploadDocument = async (file, metadata) => {
    if (!currentUser) throw new Error('You must be logged in to upload files.');

    try {
      const newDoc = await storageService.uploadDocument({
        file,
        metadata,
        isLiveDrive: driveConfig.isLiveDrive,
        folderId: driveConfig.folderId,
        accessToken: driveConfig.accessToken,
        currentUser,
      });

      setDocuments((prev) => [newDoc, ...prev]);
      showToast(`"${newDoc.fileName}" uploaded successfully!`, 'success');
      return newDoc;
    } catch (err) {
      showToast(err.message || 'Upload failed', 'error');
      throw err;
    }
  };

  // Download document
  const downloadDocument = async (doc) => {
    try {
      showToast(`Preparing download for ${doc.fileName}...`, 'info');
      const blob = await storageService.getFileBlob(doc, {
        isLiveDrive: driveConfig.isLiveDrive,
        accessToken: driveConfig.accessToken,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName || `${doc.title}.${doc.fileType}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast(`Downloaded ${doc.fileName}`, 'success');
    } catch (err) {
      console.error('Download error:', err);
      showToast(`Failed to download ${doc.fileName}`, 'error');
    }
  };

  // Delete document
  const deleteDocument = async (doc) => {
    try {
      await storageService.deleteDocument(doc, {
        isLiveDrive: driveConfig.isLiveDrive,
        accessToken: driveConfig.accessToken,
      });

      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      showToast(`Deleted "${doc.fileName}"`, 'success');
      if (previewDoc?.id === doc.id) setPreviewDoc(null);
      if (editingDoc?.id === doc.id) setEditingDoc(null);
    } catch (err) {
      showToast(err.message || 'Delete failed', 'error');
    }
  };

  // Toggle group sharing
  const toggleShare = async (doc) => {
    try {
      const updatedStatus = !doc.sharedWithGroup;
      const updated = await storageService.updateDocument(
        doc.id,
        { sharedWithGroup: updatedStatus, isFromDrive: doc.isFromDrive },
        { isLiveDrive: driveConfig.isLiveDrive, accessToken: driveConfig.accessToken }
      );

      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? updated : d)));
      showToast(
        updatedStatus
          ? `Shared "${doc.fileName}" with the group!`
          : `Made "${doc.fileName}" private to you.`,
        'success'
      );
    } catch (err) {
      showToast(err.message || 'Failed to update sharing status', 'error');
    }
  };

  // Update document metadata
  const updateDocumentMetadata = async (docId, updates) => {
    try {
      const updated = await storageService.updateDocument(
        docId,
        updates,
        { isLiveDrive: driveConfig.isLiveDrive, accessToken: driveConfig.accessToken }
      );

      setDocuments((prev) => prev.map((d) => (d.id === docId ? updated : d)));
      showToast('Document details updated successfully', 'success');
      setEditingDoc(null);
    } catch (err) {
      showToast(err.message || 'Update failed', 'error');
    }
  };

  // Filtered documents computation
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // 1. Tab filter
      if (activeTab === 'my_uploads') {
        const isOwner =
          doc.uploadedBy?.id === currentUser?.id ||
          doc.uploadedBy?.email?.toLowerCase() === currentUser?.email?.toLowerCase();
        if (!isOwner) return false;
      } else if (activeTab === 'shared') {
        if (!doc.sharedWithGroup) return false;
      }

      // 2. Category filter
      if (selectedCategory !== 'all' && doc.category !== selectedCategory) {
        return false;
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = doc.title?.toLowerCase().includes(q);
        const matchesFileName = doc.fileName?.toLowerCase().includes(q);
        const matchesDescription = doc.description?.toLowerCase().includes(q);
        const matchesCategory = doc.category?.toLowerCase().includes(q);
        const matchesUploader = doc.uploadedBy?.name?.toLowerCase().includes(q);
        const matchesTags = (doc.tags || []).some((t) => t.toLowerCase().includes(q));

        if (!matchesTitle && !matchesFileName && !matchesDescription && !matchesCategory && !matchesUploader && !matchesTags) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Sort newest first
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [documents, activeTab, selectedCategory, searchQuery, currentUser]);

  // Stats calculation
  const stats = useMemo(() => {
    const totalCount = documents.length;
    const sharedCount = documents.filter((d) => d.sharedWithGroup).length;
    const myUploadsCount = documents.filter(
      (d) => d.uploadedBy?.id === currentUser?.id || d.uploadedBy?.email === currentUser?.email
    ).length;
    const totalBytes = documents.reduce((acc, d) => acc + (d.fileSize || 0), 0);

    return { totalCount, sharedCount, myUploadsCount, totalBytes };
  }, [documents, currentUser]);

  return (
    <DocumentContext.Provider
      value={{
        documents,
        filteredDocuments,
        isLoading,
        activeTab,
        setActiveTab,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        viewMode,
        setViewMode,
        previewDoc,
        setPreviewDoc,
        isUploadOpen,
        setIsUploadOpen,
        isSettingsOpen,
        setIsSettingsOpen,
        editingDoc,
        setEditingDoc,
        toast,
        showToast,
        fetchDocuments,
        uploadDocument,
        downloadDocument,
        deleteDocument,
        toggleShare,
        updateDocumentMetadata,
        stats,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocuments() {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
}
