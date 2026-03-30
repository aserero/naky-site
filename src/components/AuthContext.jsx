import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentClient, setCurrentClient] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    const { data } = await supabase.auth.getUser();
    const authUser = data.user;
    if (!authUser) {
      setCurrentClient(null);
      setLoading(false);
      return null;
    }

    const profile = await base44.auth.me().catch(() => null);
    setCurrentClient(profile);
    setLoading(false);
    return profile;
  };

  useEffect(() => {
    loadProfile();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return loadProfile();
  };

  const signup = async (clientData) => {
    const created = await base44.entities.Client.create(clientData);
    await loadProfile();
    return created;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentClient(null);
  };

  const updateClient = async (updates) => {
    if (!currentClient?.id) return null;
    const updated = await base44.entities.Client.update(currentClient.id, updates);
    setCurrentClient(updated);
    return updated;
  };

  const value = useMemo(() => ({
    currentClient,
    loading,
    login,
    signup,
    logout,
    updateClient,
  }), [currentClient, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
