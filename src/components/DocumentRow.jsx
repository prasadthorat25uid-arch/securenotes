import React, { useState } from 'react';
import {
  FileText,
  Eye,
  Download,
  Share2,
  Lock,
  MoreVertical,
  Trash2,
  Edit3,
} from 'lucide-react';
import { formatBytes, formatDate, getFileTypeInfo } from '../utils/formatters';
import { useDocuments } from '../context/DocumentContext';
import { useAuth } from '../context/AuthContext';

export default function DocumentRow({ doc }) {
  const { setPreviewDoc, downloadDocument, deleteDocument, toggleShare, setEditingDoc } = useDocuments();
  const { currentUser } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const fileTypeInfo = getFileTypeInfo(doc.fileType);
  const isOwner =
    doc.uploadedBy?.id === currentUser?.id ||
    doc.uploadedBy?.email?.toLowerCase() === currentUser?.email?.toLowerCase();

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${doc.fileName}"?`)) {
      await deleteDocument(doc);
    }
  };

  return (
    <div className="group flex items-center justify-between p-3.5 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-300 dark:hover:border-indigo-800 transition-all gap-4 text-xs">
      
      {/* File Type Icon & Title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[11px] uppercase shrink-0 ${fileTypeInfo.badge}`}
        >
          {fileTypeInfo.label}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4
              onClick={() => setPreviewDoc(doc)}
              className="font-semibold text-sm text-slate-900 dark:text-white truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              {doc.title || doc.fileName}
            </h4>

            {doc.sharedWithGroup ? (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <Share2 className="w-2.5 h-2.5" /> Group
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                <Lock className="w-2.5 h-2.5" /> Private
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono truncate">
            {doc.fileName}
          </p>
        </div>
      </div>

      {/* Category */}
      <div className="hidden md:block w-28 shrink-0">
        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
          {doc.category || 'Notes'}
        </span>
      </div>

      {/* Size */}
      <div className="hidden lg:block w-20 text-slate-500 dark:text-slate-400 shrink-0 font-medium">
        {formatBytes(doc.fileSize)}
      </div>

      {/* Uploader */}
      <div className="hidden sm:flex items-center gap-2 w-40 shrink-0">
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
          {(doc.uploadedBy?.name || 'F')[0]}
        </div>
        <span className="text-slate-700 dark:text-slate-300 truncate">
          {doc.uploadedBy?.name || 'Study Friend'}
          {isOwner && ' (You)'}
        </span>
      </div>

      {/* Date */}
      <div className="hidden xl:block w-28 text-slate-400 shrink-0">
        {formatDate(doc.createdAt)}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => setPreviewDoc(doc)}
          className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 transition-colors"
          title="View document"
        >
          <Eye className="w-4 h-4" />
        </button>

        <button
          onClick={() => downloadDocument(doc)}
          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Download document"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* More actions menu */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
              <div className="absolute right-0 mt-1 w-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 text-xs animate-in fade-in">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    toggleShare(doc);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-400" />
                  {doc.sharedWithGroup ? 'Unshare from Group' : 'Share with Group'}
                </button>

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setEditingDoc(doc);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                  Rename / Edit
                </button>

                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleDelete();
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
