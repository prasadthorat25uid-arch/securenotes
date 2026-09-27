// Utility formatters for file sizes, dates, and file types

/**
 * Format bytes to human readable string (e.g. 2.4 MB, 850 KB)
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format ISO date string to friendly readable format:
 * e.g. "27 September 2026"
 */
export function formatDate(dateString) {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Recently';

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Format relative time (e.g. "2 hours ago", "Yesterday")
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 172800) return 'Yesterday';
  return formatDate(dateString);
}

/**
 * Get visual styling attributes for a file type
 */
export function getFileTypeInfo(fileType) {
  const type = (fileType || '').toLowerCase().replace('.', '');

  switch (type) {
    case 'pdf':
      return {
        label: 'PDF',
        color: 'text-rose-600 dark:text-rose-400',
        bg: 'bg-rose-500/10 dark:bg-rose-500/20',
        border: 'border-rose-200 dark:border-rose-900',
        badge: 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300',
      };
    case 'docx':
      return {
        label: 'DOCX',
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-500/10 dark:bg-blue-500/20',
        border: 'border-blue-200 dark:border-blue-900',
        badge: 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300',
      };
    case 'doc':
      return {
        label: 'DOC',
        color: 'text-indigo-600 dark:text-indigo-400',
        bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
        border: 'border-indigo-200 dark:border-indigo-900',
        badge: 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300',
      };
    default:
      return {
        label: type.toUpperCase(),
        color: 'text-slate-600 dark:text-slate-400',
        bg: 'bg-slate-500/10 dark:bg-slate-500/20',
        border: 'border-slate-200 dark:border-slate-800',
        badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
      };
  }
}
