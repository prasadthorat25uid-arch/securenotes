import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  FileText,
  Share2,
  Calendar,
  Lock,
  Maximize2,
  Minimize2,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { renderAsync } from 'docx-preview';
import { useDocuments } from '../context/DocumentContext';
import { useAuth } from '../context/AuthContext';
import { formatBytes, formatDate, getFileTypeInfo } from '../utils/formatters';
import { storageService } from '../services/storageService';

export default function DocumentPreviewModal() {
  const { previewDoc, setPreviewDoc, downloadDocument, toggleShare } = useDocuments();
  const { driveConfig } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState(null);
  const [docContent, setDocContent] = useState('');
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const docxContainerRef = useRef(null);

  useEffect(() => {
    if (!previewDoc) {
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setError(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);
    setDocContent('');

    async function loadDocument() {
      try {
        const blob = await storageService.getFileBlob(previewDoc, {
          isLiveDrive: driveConfig.isLiveDrive,
          accessToken: driveConfig.accessToken,
        });

        if (!isMounted) return;

        const ext = (previewDoc.fileType || '').toLowerCase();

        if (ext === 'pdf') {
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
          setIsLoading(false);
        } else if (ext === 'docx') {
          // Render DOCX in browser with docx-preview
          setIsLoading(true);
          try {
            if (docxContainerRef.current) {
              docxContainerRef.current.innerHTML = '';
              await renderAsync(blob, docxContainerRef.current, undefined, {
                className: 'docx-preview-container',
                inWrapper: true,
                ignoreWidth: false,
                ignoreHeight: false,
              });
            }
          } catch (docxErr) {
            console.warn('DOCX rendering warning:', docxErr);
            // Fallback: read text
            const text = await blob.text().catch(() => '');
            setDocContent(text || previewDoc.description || 'Binary Word document ready for download.');
          }
          setIsLoading(false);
        } else {
          // .doc or other formats
          const text = await blob.text().catch(() => '');
          setDocContent(text || previewDoc.description || 'Binary document ready for download.');
          setIsLoading(false);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to load document for preview:', err);
        setError(err.message || 'Unable to load document preview');
        setIsLoading(false);
      }
    }

    loadDocument();

    return () => {
      isMounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [previewDoc, driveConfig]);

  if (!previewDoc) return null;

  const fileTypeInfo = getFileTypeInfo(previewDoc.fileType);
  const isPdf = (previewDoc.fileType || '').toLowerCase() === 'pdf';
  const isDocx = (previewDoc.fileType || '').toLowerCase() === 'docx';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in">
      <div
        className={`w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen ? 'fixed inset-2 z-50' : 'max-w-5xl h-[88vh]'
        }`}
      >
        
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          
          {/* Left: Title & File Badge */}
          <div className="flex items-center gap-3 min-w-0 mr-4">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase shrink-0 ${fileTypeInfo.badge}`}
            >
              <FileText className="w-3.5 h-3.5" />
              {fileTypeInfo.label}
            </span>

            <div className="min-w-0">
              <h2 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate" title={previewDoc.title || previewDoc.fileName}>
                {previewDoc.title || previewDoc.fileName}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                {previewDoc.fileName} • {formatBytes(previewDoc.fileSize)} • Uploaded by {previewDoc.uploadedBy?.name}
              </p>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => toggleShare(previewDoc)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Toggle group sharing"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{previewDoc.sharedWithGroup ? 'Shared with Group' : 'Private'}</span>
            </button>

            <button
              onClick={() => downloadDocument(previewDoc)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
              title="Download file"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setPreviewDoc(null)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Content Viewer Body */}
        <div className="relative flex-1 bg-slate-100/70 dark:bg-slate-950 overflow-hidden flex flex-col items-center justify-center p-2 sm:p-4">
          
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Loading secure document preview...
              </p>
            </div>
          )}

          {error && !isLoading && (
            <div className="text-center p-6 max-w-md bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 rounded-2xl shadow-lg">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
              <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                Unable to display preview
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                {error}
              </p>
              <button
                onClick={() => downloadDocument(previewDoc)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white"
              >
                <Download className="w-4 h-4" />
                Download to Open Locally
              </button>
            </div>
          )}

          {/* 1. PDF Viewer */}
          {!isLoading && !error && isPdf && blobUrl && (
            <div className="w-full h-full rounded-xl overflow-hidden shadow-inner bg-slate-800 border border-slate-300 dark:border-slate-800">
              <object
                data={blobUrl}
                type="application/pdf"
                className="w-full h-full"
              >
                <iframe
                  src={blobUrl}
                  title={previewDoc.title}
                  className="w-full h-full"
                >
                  <p className="p-4 text-center text-xs text-white">
                    Your browser does not support inline PDF viewing.
                    <button
                      onClick={() => downloadDocument(previewDoc)}
                      className="underline ml-1 font-bold"
                    >
                      Click here to download.
                    </button>
                  </p>
                </iframe>
              </object>
            </div>
          )}

          {/* 2. DOCX In-Browser Renderer */}
          {!isLoading && !error && isDocx && (
            <div className="w-full h-full overflow-y-auto p-4 flex justify-center">
              <div
                ref={docxContainerRef}
                className="bg-white text-slate-900 dark:bg-white dark:text-slate-900 rounded-xl p-6 sm:p-10 shadow-lg max-w-4xl w-full min-h-[500px]"
              />
            </div>
          )}

          {/* 3. DOC / Fallback Text Preview */}
          {!isLoading && !error && !isPdf && !isDocx && (
            <div className="text-center p-8 max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
                {previewDoc.title || previewDoc.fileName}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                This is a Microsoft Word binary document ({previewDoc.fileType.toUpperCase()}). You can download and open it in Microsoft Word, Google Docs, or LibreOffice.
              </p>

              {previewDoc.description && (
                <div className="p-3 mb-5 text-left rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-0.5">
                    Description / Notes:
                  </p>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    {previewDoc.description}
                  </p>
                </div>
              )}

              <button
                onClick={() => downloadDocument(previewDoc)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md text-xs"
              >
                <Download className="w-4 h-4" />
                Download Document ({formatBytes(previewDoc.fileSize)})
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
