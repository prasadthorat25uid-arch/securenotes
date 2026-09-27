import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_FRIENDS } from '../config/friends';
import { requestGoogleAccessToken } from '../services/googleDrive';

const AuthContext = createContext(null);

const STORAGE_KEY_FRIENDS = 'studyvault_authorized_friends';
const STORAGE_KEY_CURRENT_USER = 'studyvault_current_user';
const STORAGE_KEY_DRIVE_CONFIG = 'studyvault_drive_config';

export function AuthProvider({ children }) {
  // 1. Authorized friends list (exactly 3 friends)
  const [authorizedFriends, setAuthorizedFriends] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FRIENDS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_FRIENDS;
  });

  // 2. Currently logged-in friend
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    // Default to Friend 1 for immediate demo/testing
    return DEFAULT_FRIENDS[0];
  });

  // 3. Google Drive Configuration
  const [driveConfig, setDriveConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DRIVE_CONFIG);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      isLiveDrive: false,
      clientId: '',
      folderId: '',
      accessToken: null,
      tokenExpiresAt: 0,
    };
  });

  const [authError, setAuthError] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FRIENDS, JSON.stringify(authorizedFriends));
  }, [authorizedFriends]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DRIVE_CONFIG, JSON.stringify(driveConfig));
  }, [driveConfig]);

  // Check if an email belongs to the 3 authorized friends
  const isAuthorizedEmail = (email) => {
    if (!email) return false;
    const cleanEmail = email.trim().toLowerCase();
    return authorizedFriends.some((f) => f.email.toLowerCase() === cleanEmail);
  };

  // Direct login as one of the 3 friends
  const loginAsFriend = (friendId) => {
    setAuthError(null);
    const friend = authorizedFriends.find((f) => f.id === friendId);
    if (friend) {
      setCurrentUser(friend);
      return true;
    }
    return false;
  };

  // Login via email & password
  const loginWithEmail = (email, password) => {
    setAuthError(null);
    const cleanEmail = (email || '').trim().toLowerCase();
    const friend = authorizedFriends.find((f) => f.email.toLowerCase() === cleanEmail);

    if (!friend) {
      setAuthError('Access Denied: Only the 3 authorized study group friends are allowed.');
      return false;
    }

    setCurrentUser(friend);
    return true;
  };

  // Login via Google OAuth 2.0 (for Live Google Drive)
  const loginWithGoogle = () => {
    if (!driveConfig.clientId) {
      setAuthError('Please configure your Google OAuth Client ID in Settings first.');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    requestGoogleAccessToken({
      clientId: driveConfig.clientId,
      userEmail: currentUser?.email,
      onSuccess: async (token, expiresIn) => {
        setIsAuthenticating(false);
        try {
          // Fetch user info from Google to check email
          const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const googleUser = await res.json();
            const matchedFriend = authorizedFriends.find(
              (f) => f.email.toLowerCase() === googleUser.email.toLowerCase()
            );

            if (!matchedFriend) {
              setAuthError(`Unauthorized Google Account (${googleUser.email}). This space is restricted to the 3 authorized friends.`);
              return;
            }

            const updatedUser = {
              ...matchedFriend,
              name: googleUser.name || matchedFriend.name,
              avatar: googleUser.picture || matchedFriend.avatar,
            };

            setCurrentUser(updatedUser);
            setDriveConfig((prev) => ({
              ...prev,
              accessToken: token,
              tokenExpiresAt: Date.now() + expiresIn * 1000,
            }));
          } else {
            // Token valid, save token
            setDriveConfig((prev) => ({
              ...prev,
              accessToken: token,
              tokenExpiresAt: Date.now() + expiresIn * 1000,
            }));
          }
        } catch (err) {
          console.error('Error verifying Google user:', err);
        }
      },
      onError: (err) => {
        setIsAuthenticating(false);
        setAuthError(err.message || 'Google Sign-In failed');
      },
    });
  };

  // Logout
  const logout = () => {
    setCurrentUser(null);
    setAuthError(null);
    setDriveConfig((prev) => ({ ...prev, accessToken: null, tokenExpiresAt: 0 }));
  };

  // Update friend configurations
  const updateAuthorizedFriends = (newFriends) => {
    setAuthorizedFriends(newFriends);
    // Refresh current user if updated
    if (currentUser) {
      const updatedCurrent = newFriends.find((f) => f.id === currentUser.id);
      if (updatedCurrent) setCurrentUser(updatedCurrent);
    }
  };

  // Update Drive configuration
  const updateDriveConfig = (newConfig) => {
    setDriveConfig((prev) => ({ ...prev, ...newConfig }));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        authorizedFriends,
        driveConfig,
        authError,
        isAuthenticating,
        isAuthenticated: !!currentUser,
        loginAsFriend,
        loginWithEmail,
        loginWithGoogle,
        logout,
        updateAuthorizedFriends,
        updateDriveConfig,
        isAuthorizedEmail,
        setAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
