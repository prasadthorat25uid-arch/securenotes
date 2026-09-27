import React, { useState } from 'react';
import {
  FileText,
  Eye,
  Download,
  Share2,
  MoreVertical,
  Trash2,
  Edit3,
  Calendar,
  Lock,
  Tag,
  Check,
} from 'lucide-react';
import { formatBytes, formatDate, getFileTypeInfo } from '../utils/formatters';
import { useDocuments } from '../context/DocumentContext';
import { useAuth } from '../context/AuthContext';

export default function DocumentCard({ doc }) {
  const { setPreviewDoc, downloadDocument, deleteDocument, toggleShare, setEditingDoc } = useDocuments();
  const { currentUser } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileTypeInfo = getFileTypeInfo(doc.fileType);
  const isOwner =
    doc.uploadedBy?.id === currentUser?.id ||
    doc.uploadedBy?.email?.toLowerCase() === currentUser?.email?.toLowerCase();

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${doc.fileName}"?`)) {
      setIsDeleting(true);
      await deleteDocument(doc);
      setIsDeleting(false);
    }
  };

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-xs hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-800/60 transition-all duration-200">
      
      {/* Top Header: File Type Badge, Category, & More Actions */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* File Type Pill */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider ${fileTypeInfo.badge}`}
            >
              <FileText className="w-3.5 h-3.5" />
              {fileTypeInfo.label}
            </span>

            {/* Category Pill */}
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {doc.category || 'Notes'}
            </span>

            {/* Shared with group badge */}
            {doc.sharedWithGroup ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Share2 className="w-3 h-3" />
                Group
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Lock className="w-3 h-3" />
                Private
              </span>
            )}
          </div>

          {/* Action Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="More actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95">
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
                    Rename / Edit Info
                  </button>

                  <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleDelete();
                    }}
                    disabled={isDeleting}
                    className="w-full text-left px-3.5 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Document
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Title and File Name */}
        <h3
          onClick={() => setPreviewDoc(doc)}
          className="font-semibold text-base text-slate-900 dark:text-white line-clamp-1 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
          title={doc.title || doc.fileName}
        >
          {doc.title || doc.fileName}
        </h3>

        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate mt-0.5" title={doc.fileName}>
          {doc.fileName}
        </p>

        {/* Description if any */}
        {doc.description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-2 leading-relaxed">
            {doc.description}
          </p>
        )}

        {/* Tags */}
        {doc.tags && doc.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
            {doc.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400"
              >
                #{tag}
              </span>
            ))}
            {doc.tags.length > 3 && (
              <span className="text-[10px] text-slate-400">
                +{doc.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Section: Metadata & Action Buttons */}
      <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
        
        {/* File Size & Upload Info */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {fileTypeInfo.label} • {formatBytes(doc.fileSize)}
          </span>
          <span className="flex items-center gap-1 text-[11px]">
            <Calendar className="w-3 h-3 text-slate-400" />
            {formatDate(doc.createdAt)}
          </span>
        </div>

        {/* Uploader identification */}
        <div className="flex items-center gap-2 mb-4 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
            {(doc.uploadedBy?.name || 'F')[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">
              Uploaded by <span className="font-semibold text-slate-900 dark:text-white">{doc.uploadedBy?.name || 'Study Friend'}</span>
            </p>
          </div>
          {isOwner && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              You
            </span>
          )}
        </div>

        {/* Prominent Action Buttons: [View] [Download] */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setPreviewDoc(doc)}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/80 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </button>

          <button
            onClick={() => downloadDocument(doc)}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
        </div>

      </div>

    </div>
  );
}
