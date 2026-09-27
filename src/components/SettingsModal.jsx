import React, { useState } from 'react';
import {
  X,
  Settings,
  HardDrive,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Key,
  FolderLock,
  Save,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDocuments } from '../context/DocumentContext';
import { storageService } from '../services/storageService';

export default function SettingsModal() {
  const {
    authorizedFriends,
    updateAuthorizedFriends,
    driveConfig,
    updateDriveConfig,
    loginWithGoogle,
    isAuthenticating,
  } = useAuth();
  const { isSettingsOpen, setIsSettingsOpen, fetchDocuments, showToast } = useDocuments();

  // Local form state
  const [friendsList, setFriendsList] = useState(authorizedFriends);
  const [isLiveDrive, setIsLiveDrive] = useState(driveConfig.isLiveDrive);
  const [clientId, setClientId] = useState(driveConfig.clientId);
  const [folderId, setFolderId] = useState(driveConfig.folderId);
  const [activeTab, setActiveTab] = useState('drive'); // 'drive', 'friends', 'instructions'

  if (!isSettingsOpen) return null;

  const handleFriendChange = (index, field, value) => {
    const updated = [...friendsList];
    updated[index] = { ...updated[index], [field]: value };
    setFriendsList(updated);
  };

  const handleSave = () => {
    updateAuthorizedFriends(friendsList);
    updateDriveConfig({
      isLiveDrive,
      clientId: clientId.trim(),
      folderId: folderId.trim(),
    });
    showToast('Settings updated successfully!', 'success');
    fetchDocuments();
    setIsSettingsOpen(false);
  };

  const handleResetData = async () => {
    if (window.confirm('Reset local study documents to default mock state?')) {
      await storageService.resetToDefaults();
      fetchDocuments();
      showToast('Vault reset to default study files', 'info');
      setIsSettingsOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                System & Security Settings
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure Google Drive API & the 3 Authorized Accounts
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsSettingsOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold bg-slate-50/50 dark:bg-slate-950/30">
          <button
            onClick={() => setActiveTab('drive')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'drive'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            Google Drive Setup
          </button>

          <button
            onClick={() => setActiveTab('friends')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'friends'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            The 3 Friends (Whitelist)
          </button>

          <button
            onClick={() => setActiveTab('instructions')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'instructions'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Security Guide
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          
          {/* TAB 1: Google Drive */}
          {activeTab === 'drive' && (
            <div className="space-y-4">
              
              {/* Storage Mode Selector */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      Storage Backend Mode
                    </h4>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                      {isLiveDrive
                        ? 'Google Drive API active: files stored in your private Google Drive folder'
                        : 'Simulated Private Vault active: offline & local zero-friction demo'}
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isLiveDrive}
                      onChange={(e) => setIsLiveDrive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              {/* Google Drive Configuration inputs */}
              <div className={`space-y-3 transition-opacity ${isLiveDrive ? 'opacity-100' : 'opacity-60'}`}>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Google OAuth 2.0 Client ID (Web Client)
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder="e.g. 123456789-abcdef.apps.googleusercontent.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Create in Google Cloud Console with your website domain in "Authorized JavaScript origins".
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Private Google Drive Folder ID
                  </label>
                  <div className="relative">
                    <FolderLock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={folderId}
                      onChange={(e) => setFolderId(e.target.value)}
                      placeholder="e.g. 1A2b3C4d5E6f7G8h9I0j"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    The folder ID from your Google Drive URL: drive.google.com/drive/folders/<strong>[FOLDER_ID]</strong>
                  </p>
                </div>

                {/* Google Authenticate Button */}
                {isLiveDrive && clientId && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={loginWithGoogle}
                      disabled={isAuthenticating}
                      className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl font-semibold bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xs"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      {driveConfig.accessToken ? 'Refresh Google Drive Authorization' : 'Authorize with Google'}
                    </button>
                    {driveConfig.accessToken && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 text-center mt-1 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Token active
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: The 3 Friends Whitelist */}
          {activeTab === 'friends' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300">
                <p className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Strict Access Gatekeeper (Exactly 3 Friends)
                </p>
                <p className="text-[11px] mt-0.5 leading-relaxed">
                  Only accounts matching these 3 email addresses will ever be allowed to log in and access the study documents.
                </p>
              </div>

              {friendsList.map((friend, idx) => (
                <div
                  key={friend.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2.5"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={friend.avatar}
                      alt={friend.name}
                      className="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-500/20"
                    />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Friend {idx + 1}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-500 dark:text-slate-400">Name</label>
                      <input
                        type="text"
                        value={friend.name}
                        onChange={(e) => handleFriendChange(idx, 'name', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 dark:text-slate-400">Authorized Email</label>
                      <input
                        type="email"
                        value={friend.email}
                        onChange={(e) => handleFriendChange(idx, 'email', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: Security Guide & Architecture */}
          {activeTab === 'instructions' && (
            <div className="space-y-3 leading-relaxed text-slate-600 dark:text-slate-300">
              <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-indigo-900 dark:text-indigo-200">
                <h4 className="font-bold text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Google Drive Privacy Guarantee
                </h4>
                <p className="text-[11px] mt-1">
                  Files are stored in your private Google Drive folder and accessed exclusively through authenticated Google Drive API calls with Bearer tokens.
                </p>
              </div>

              <div className="space-y-2">
                <h5 className="font-bold text-slate-800 dark:text-slate-200">
                  How to setup the Private Google Drive Folder:
                </h5>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400 pl-1">
                  <li>Create a new folder in Google Drive named <strong>StudyVault Private</strong>.</li>
                  <li>Click <strong>Share</strong> and add ONLY your 2 other friends' Google emails.</li>
                  <li>
                    <strong className="text-rose-600 dark:text-rose-400">
                      CRITICAL: Keep "General access" set to "Restricted". NEVER select "Anyone with the link".
                    </strong>
                  </li>
                  <li>Copy the folder ID from the URL and paste it into the Google Drive tab above.</li>
                  <li>Enable the <strong>Google Drive API</strong> in Google Cloud Console and create an OAuth 2.0 Client ID.</li>
                </ol>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleResetData}
                  className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:underline"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset local mock files to factory defaults
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            Changes are saved locally to your browser storage.
          </p>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white text-xs shadow-md shadow-indigo-500/20"
          >
            <Save className="w-4 h-4" />
            Save Configuration
          </button>
        </div>

      </div>
    </div>
  );
}
