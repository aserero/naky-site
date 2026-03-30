import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserCheck, X, Phone, Mail, MapPin, FileText, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';

const STATUS_LABELS = {
  pending: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800' },
  accepted: { label: 'Acceptée', className: 'bg-green-100 text-green-800' },
  rejected: { label: 'Refusée', className: 'bg-red-100 text-red-800' },
};

const PERMIS_LABELS = {
  francaise: 'Nationalité française',
  europeenne: 'Citoyenneté européenne',
  titre_residence: 'Titre de résidence',
  visa: 'Visa',
  aucun: 'Aucun permis de travail',
};

const EXPERIENCE_LABELS = {
  aucune: 'Aucune',
  moins_2ans: 'Moins de 2 ans',
  plus_2ans: 'Plus de 2 ans',
  plus_5ans: 'Plus de 5 ans',
};

const VEHICULE_LABELS = {
  voiture: 'Voiture',
  scooter: 'Scooter',
  velo: 'Vélo',
  non: 'Non',
};

export default function AdminCandidatures() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected] = useState(null);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: candidatures = [], isLoading } = useQuery({
    queryKey: ['candidatures'],
    queryFn: () => base44.entities.Candidature.list('-created_date'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Candidature.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['candidatures'] }),
  });

  const acceptAndCreateEmployee = async (candidature) => {
    // Créer l'employée
    await base44.entities.Employee.create({
      first_name: candidature.first_name,
      last_name: candidature.last_name,
      email: candidature.email,
      phone: candidature.phone,
      address: candidature.address ? `${candidature.address}, ${candidature.zipcode} ${candidature.city}` : '',
      status: 'active',
      joined_date: new Date().toISOString().split('T')[0],
    });
    // Mettre à jour la candidature
    await updateMutation.mutateAsync({ id: candidature.id, data: { status: 'accepted' } });
    setShowAcceptDialog(false);
    setSelected(null);
  };

  const filtered = candidatures.filter(c => {
    const matchSearch = !search ||
      c.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Candidatures</h1>
          <p className="text-slate-500">{candidatures.filter(c => c.status === 'pending').length} en attente de traitement</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-lg shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input placeholder="Rechercher..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {['all', 'pending', 'accepted', 'rejected'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === s ? 'bg-[#E95678] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s === 'all' ? 'Toutes' : STATUS_LABELS[s]?.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <p className="text-center text-slate-400 py-10">Chargement...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-slate-400 py-10">Aucune candidature trouvée.</p>
        ) : (
          <div className="grid gap-4">
            {filtered.map(c => {
              const statusInfo = STATUS_LABELS[c.status] || STATUS_LABELS.pending;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex justify-between items-start flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-slate-900 text-lg">
                          {c.first_name} {c.last_name}
                        </h3>
                        <Badge className={`${statusInfo.className} border-none text-xs`}>{statusInfo.label}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                        {c.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{c.email}</span>}
                        {c.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{c.phone}</span>}
                        {c.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{c.city}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      {c.created_date ? format(parseISO(c.created_date), 'dd MMM yyyy', { locale: fr }) : ''}
                    </div>
                  </div>

                  {c.status === 'pending' && (
                    <div className="flex gap-2 mt-4" onClick={e => e.stopPropagation()}>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                        onClick={() => { setSelected(c); setShowAcceptDialog(true); }}
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Accepter & créer employée
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
                        onClick={() => updateMutation.mutate({ id: c.id, data: { status: 'rejected' } })}
                      >
                        <X className="w-3.5 h-3.5" /> Refuser
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      {selected && !showAcceptDialog && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Candidature — {selected.first_name} {selected.last_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-slate-400 text-xs mb-0.5">Email</p><p className="font-medium">{selected.email}</p></div>
                <div><p className="text-slate-400 text-xs mb-0.5">Téléphone</p><p className="font-medium">{selected.phone || '—'}</p></div>
                <div><p className="text-slate-400 text-xs mb-0.5">Adresse</p><p className="font-medium">{selected.address || '—'}, {selected.zipcode} {selected.city}</p></div>
                <div><p className="text-slate-400 text-xs mb-0.5">Permis de séjour</p><p className="font-medium">{PERMIS_LABELS[selected.permis_sejour] || '—'}</p></div>
                <div><p className="text-slate-400 text-xs mb-0.5">Heures/semaine</p><p className="font-medium">{selected.heures_semaine ? `${selected.heures_semaine}h` : '—'}</p></div>
                <div><p className="text-slate-400 text-xs mb-0.5">Expérience</p><p className="font-medium">{EXPERIENCE_LABELS[selected.annees_experience] || '—'}</p></div>
                <div><p className="text-slate-400 text-xs mb-0.5">Véhicule</p><p className="font-medium">{VEHICULE_LABELS[selected.vehicule] || '—'}</p></div>
                <div><p className="text-slate-400 text-xs mb-0.5">Lieux d'expérience</p><p className="font-medium">{selected.lieux_experience?.join(', ') || '—'}</p></div>
              </div>
              {selected.cv_url && (
                <a href={selected.cv_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[#E95678] underline">
                  <FileText className="w-4 h-4" /> Voir le CV
                </a>
              )}
            </div>
            {selected.status === 'pending' && (
              <DialogFooter className="gap-2 mt-4">
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                  onClick={() => setShowAcceptDialog(true)}
                >
                  <UserCheck className="w-4 h-4" /> Accepter & créer employée
                </Button>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200"
                  onClick={() => { updateMutation.mutate({ id: selected.id, data: { status: 'rejected' } }); setSelected(null); }}
                >
                  <X className="w-4 h-4" /> Refuser
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Confirm accept dialog */}
      <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer l'acceptation</DialogTitle>
          </DialogHeader>
          <p className="text-slate-600 text-sm">
            Voulez-vous accepter la candidature de <strong>{selected?.first_name} {selected?.last_name}</strong> et créer automatiquement son profil employée ?
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAcceptDialog(false)}>Annuler</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => selected && acceptAndCreateEmployee(selected)}
            >
              <UserCheck className="w-4 h-4 mr-1" /> Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}