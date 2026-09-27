import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useDocuments } from '../context/DocumentContext';

export default function Toast() {
  const { toast, showToast } = useDocuments();

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl backdrop-blur-md transition-all animate-bounce-in border text-sm font-medium bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-slate-800">
      {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
      {isError && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />}
      {!isSuccess && !isError && <Info className="w-5 h-5 text-indigo-500 shrink-0" />}

      <span className="text-slate-800 dark:text-slate-200 max-w-sm">{toast.message}</span>

      <button
        onClick={() => showToast(null)}
        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
