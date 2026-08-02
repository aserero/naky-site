import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// Auth unique (clients ET admins) basée sur Supabase Auth.
// - session/user : l'utilisateur Supabase
// - role : 'client' | 'admin' (table profiles)
// - currentClient : la fiche clients liée (null pour un admin pur)

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

async function fetchProfileAndClient(userId) {
  const [{ data: profile }, { data: client }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
    supabase.from('clients').select('*').eq('user_id', userId).maybeSingle(),
  ]);
  return { role: profile?.role ?? 'client', client: client ?? null };
}

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [currentClient, setCurrentClient] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (sess) => {
    if (!sess?.user) {
      setRole(null);
      setCurrentClient(null);
      return;
    }
    const { role: r, client } = await fetchProfileAndClient(sess.user.id);
    setRole(r);
    setCurrentClient(client);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data: { session: sess } }) => {
      if (!mounted) return;
      setSession(sess);
      await refresh(sess);
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      if (!mounted) return;
      setSession(sess);
      await refresh(sess);
      setLoading(false);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [refresh]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Email ou mot de passe incorrect');
    const { client } = await fetchProfileAndClient(data.user.id);
    return client;
  };

  // clientData : { civilite, first_name, last_name, email, phone, address, zipcode, city, has_animals? }
  const signup = async (password, clientData) => {
    const { data, error } = await supabase.auth.signUp({
      email: clientData.email,
      password,
    });
    if (error) {
      if (error.message?.toLowerCase().includes('already registered')) {
        throw new Error('Un compte existe déjà avec cet email');
      }
      throw error;
    }
    const { data: client, error: insertError } = await supabase
      .from('clients')
      .insert({ ...clientData, user_id: data.user.id })
      .select()
      .single();
    if (insertError) throw insertError;
    setCurrentClient(client);
    return client;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('naky_booking_state');
    setCurrentClient(null);
    setRole(null);
  };

  const updateClient = async (updates) => {
    if (!currentClient) return null;
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', currentClient.id)
      .select()
      .single();
    if (error) throw error;
    setCurrentClient(data);
    return data;
  };

  const resetPassword = async (email) => {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/NouveauMotDePasse`,
    });
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      role,
      isAdmin: role === 'admin',
      currentClient,
      loading,
      login,
      signup,
      logout,
      updateClient,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
