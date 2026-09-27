// Configuration for the 3 authorized study friends and document categories

export const DEFAULT_FRIENDS = [
  {
    id: 'friend-1',
    name: 'Alex Rivera',
    email: 'alex.rivera@studyvault.org',
    role: 'Friend 1 (Study Lead)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    color: 'from-blue-500 to-indigo-600',
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900',
  },
  {
    id: 'friend-2',
    name: 'Sam Chen',
    email: 'sam.chen@studyvault.org',
    role: 'Friend 2 (Tech Lead)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    color: 'from-emerald-500 to-teal-600',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
  },
  {
    id: 'friend-3',
    name: 'Jordan Patel',
    email: 'jordan.patel@studyvault.org',
    role: 'Friend 3 (Note Master)',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    color: 'from-purple-500 to-pink-600',
    badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900',
  },
];

export const CATEGORIES = [
  { id: 'all', label: 'All Categories', icon: 'Folder' },
  { id: 'Notes', label: 'Notes', icon: 'BookOpen', color: 'text-amber-500' },
  { id: 'Assignments', label: 'Assignments', icon: 'ClipboardCheck', color: 'text-blue-500' },
  { id: 'Lab Files', label: 'Lab Files', icon: 'FlaskConical', color: 'text-emerald-500' },
  { id: 'Question Papers', label: 'Question Papers', icon: 'FileQuestion', color: 'text-rose-500' },
  { id: 'Study Material', label: 'Study Material', icon: 'GraduationCap', color: 'text-indigo-500' },
  { id: 'Projects', label: 'Projects', icon: 'Briefcase', color: 'text-cyan-500' },
  { id: 'Other', label: 'Other', icon: 'Archive', color: 'text-slate-500' },
];

export const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx'];
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
