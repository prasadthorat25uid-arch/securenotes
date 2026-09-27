import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DocumentProvider } from './context/DocumentContext';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import UploadModal from './components/UploadModal';
import DocumentPreviewModal from './components/DocumentPreviewModal';
import EditModal from './components/EditModal';
import SettingsModal from './components/SettingsModal';
import AuthGate from './components/AuthGate';
import Toast from './components/Toast';

function AppContent() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <AuthGate />;
  }

  return (
    <DocumentProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
        <Navbar />
        <div className="flex-1">
          <Dashboard />
        </div>
        
        {/* Modals & Overlays */}
        <UploadModal />
        <DocumentPreviewModal />
        <EditModal />
        <SettingsModal />
        <Toast />

        {/* Footer */}
        <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-6 text-center text-xs text-slate-400">
          <p>StudyVault • Private Document Sharing Space for 3 Friends</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Secure storage powered by Google Drive Private Folder & Bearer Authentication
          </p>
        </footer>
      </div>
    </DocumentProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
