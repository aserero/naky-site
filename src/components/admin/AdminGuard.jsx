import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthContext';

export default function AdminGuard({ children }) {
  const { currentClient, loading } = useAuth();
  const [status, setStatus] = useState('loading'); // 'loading' | 'authorized' | 'unauthorized'

  useEffect(() => {
    if (loading) {
      setStatus('loading');
      return;
    }

    if (!currentClient) {
      setStatus('unauthorized');
      window.location.href = `/connexion?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }

    setStatus(currentClient.role === 'admin' ? 'authorized' : 'unauthorized');
  }, [currentClient, loading]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#E95678] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Vérification des droits...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthorized') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-700 font-medium text-lg">Accès refusé</p>
          <p className="text-slate-500 text-sm mt-2">Vous n'avez pas les droits administrateur.</p>
        </div>
      </div>
    );
  }

  return children;
}
