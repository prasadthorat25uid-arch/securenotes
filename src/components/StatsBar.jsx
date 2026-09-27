import React from 'react';
import { Files, Share2, UploadCloud, HardDrive, CheckCircle2 } from 'lucide-react';
import { useDocuments } from '../context/DocumentContext';
import { formatBytes } from '../utils/formatters';

export default function StatsBar() {
  const { stats } = useDocuments();

  const statItems = [
    {
      label: 'All Documents',
      value: stats.totalCount,
      icon: Files,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    },
    {
      label: 'Shared with Group',
      value: stats.sharedCount,
      icon: Share2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      label: 'My Uploads',
      value: stats.myUploadsCount,
      icon: UploadCloud,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
    },
    {
      label: 'Private Storage',
      value: formatBytes(stats.totalBytes),
      icon: HardDrive,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/40',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 my-6">
      {statItems.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className="flex items-center gap-3.5 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all"
          >
            <div className={`p-2.5 rounded-xl ${item.bg} ${item.color} shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {item.value}
              </p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {item.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
