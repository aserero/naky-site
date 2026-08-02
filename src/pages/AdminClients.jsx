import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Trash2,
  Pencil,
  ClipboardList,
  ChevronDown,
  Building2
} from 'lucide-react';
import { Clients, Bookings, UrssafDetails } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { AI_STATUS_LABELS } from '@/lib/constants';
import UrssafFormDialog from '@/components/admin/UrssafFormDialog';
import CreateClientDialog from '@/components/admin/CreateClientDialog';

const AI_STATUS_COLORS = {
  none: 'bg-slate-100 text-slate-500',
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-blue-100 text-blue-800',
  ai_requested: 'bg-purple-100 text-purple-800',
  ai_accepted: 'bg-green-100 text-green-800',
  ai_refused: 'bg-red-100 text-red-800',
};

export default function AdminClients() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [urssafClient, setUrssafClient] = useState(null);
  const [urssafFormClient, setUrssafFormClient] = useState(null);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [deletingClient, setDeletingClient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all'); // all | b2c | b2b
  const [editType, setEditType] = useState('b2c');
  const queryClient = useQueryClient();

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => Clients.list(),
    initialData: [],
  });

  const { data: bookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => Bookings.list(),
    initialData: [],
  });

  // Dossier URSSAF (lecture seule) — table client_urssaf_details
  const { data: urssafDetails, isLoading: urssafDetailsLoading } = useQuery({
    queryKey: ['urssaf-details', urssafClient?.id],
    queryFn: () => UrssafDetails.getByClientId(urssafClient.id),
    enabled: !!urssafClient,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => Clients.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsDialogOpen(false);
      setEditingClient(null);
    },
    onError: (err) => toast.error('Erreur : ' + (err.message || 'inconnue')),
  });

  const aiStatusMutation = useMutation({
    mutationFn: ({ id, data }) => Clients.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
    onError: (err) => toast.error('Erreur : ' + (err.message || 'inconnue')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Clients.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('Client supprimé');
    },
    onError: (err) => toast.error('Erreur : ' + (err.message || 'inconnue')),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!editingClient) return;
    const formData = new FormData(e.target);
    const data = {
      client_type: editType,
      company_name: editType === 'b2b' ? (formData.get('company_name') || null) : null,
      siret: editType === 'b2b' ? (formData.get('siret') || null) : null,
      first_name: formData.get('first_name'),
      last_name: formData.get('last_name'),
      email: (formData.get('email') || '').trim() || null,
      phone: formData.get('phone'),
      address: formData.get('address'),
      zipcode: formData.get('zipcode'),
      city: formData.get('city'),
      digicode: formData.get('digicode'),
      instructions: formData.get('instructions'),
    };
    updateMutation.mutate({ id: editingClient.id, data });
  };

  const filteredClients = clients.filter(client => {
    if (typeFilter !== 'all' && (client.client_type || 'b2c') !== typeFilter) return false;
    const q = searchQuery.toLowerCase();
    return (
      client.first_name?.toLowerCase().includes(q) ||
      client.last_name?.toLowerCase().includes(q) ||
      client.company_name?.toLowerCase().includes(q) ||
      client.email?.toLowerCase().includes(q) ||
      client.address?.toLowerCase().includes(q)
    );
  });

  const openEdit = (client) => {
    setEditingClient(client);
    setEditType(client.client_type || 'b2c');
    setIsDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Clients</h1>
            <p className="text-slate-500">{clients.length} clients au total</p>
          </div>
          <Button className="bg-[#E95678] hover:bg-[#d44565] text-white gap-2" onClick={() => setCreateClientOpen(true)}>
            <Plus className="w-4 h-4" /> Nouveau client
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingClient(null);
          }}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Modifier client</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Type de client</Label>
                  <div className="flex gap-2">
                    {[{ key: 'b2c', label: 'Particulier (B2C)' }, { key: 'b2b', label: 'Entreprise (B2B)' }].map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setEditType(key)}
                        className={`flex-1 py-2 rounded-lg border-2 font-medium text-sm transition-all ${
                          editType === key
                            ? 'border-[#E95678] bg-[#E95678]/10 text-[#E95678]'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {editType === 'b2b' && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="company_name">Raison sociale</Label>
                      <Input id="company_name" name="company_name" defaultValue={editingClient?.company_name} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="siret">SIRET</Label>
                      <Input id="siret" name="siret" defaultValue={editingClient?.siret} />
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Prénom</Label>
                    <Input id="first_name" name="first_name" defaultValue={editingClient?.first_name} required={editType !== 'b2b'} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Nom</Label>
                    <Input id="last_name" name="last_name" defaultValue={editingClient?.last_name} required={editType !== 'b2b'} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" defaultValue={editingClient?.email} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input id="phone" name="phone" defaultValue={editingClient?.phone} required={editType !== 'b2b'} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input id="address" name="address" defaultValue={editingClient?.address} required={editType !== 'b2b'} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zipcode">Code postal</Label>
                    <Input id="zipcode" name="zipcode" defaultValue={editingClient?.zipcode} required={editType !== 'b2b'} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="city">Ville</Label>
                    <Input id="city" name="city" defaultValue={editingClient?.city} required={editType !== 'b2b'} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="digicode">Digicode / Interphone</Label>
                  <Input id="digicode" name="digicode" defaultValue={editingClient?.digicode} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instructions">Instructions permanentes</Label>
                  <Textarea id="instructions" name="instructions" defaultValue={editingClient?.instructions} placeholder="Accès, clés, particularités..." />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={updateMutation.isPending} className="bg-[#E95678] hover:bg-[#d44565] text-white">
                    Mettre à jour
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Rechercher par nom, adresse ou téléphone..."
              className="pl-10 border-slate-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center rounded-lg bg-slate-100 p-0.5 w-fit">
            {[{ key: 'all', label: 'Tous' }, { key: 'b2c', label: 'Particuliers' }, { key: 'b2b', label: 'Entreprises' }].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTypeFilter(key)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  typeFilter === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-sm text-slate-500">
            {filteredClients.length} client{filteredClients.length > 1 ? 's' : ''}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
          {filteredClients.length === 0 && (
            <p className="p-8 text-center text-slate-500">Aucun client trouvé</p>
          )}
          {filteredClients.map((client) => {
            const isExpanded = expandedId === client.id;
            const isB2B = client.client_type === 'b2b';
            const clientBookings = bookings.filter(b => b.client_id === client.id);
            const needsUrssafForm = !isB2B && !client.urssaf_completed &&
              (client.ai_status === 'pending' || clientBookings.some(b => b.advance_immediate));
            return (
              <div key={client.id}>
                {/* Ligne compacte */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : client.id)}
                  className="w-full flex items-center gap-3 md:gap-4 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isB2B ? 'bg-indigo-100 text-indigo-600' : 'bg-[#E95678]/10 text-[#E95678]'}`}>
                    {isB2B ? <Building2 className="w-4 h-4" /> : <>{client.first_name?.[0]}{client.last_name?.[0]}</>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate flex items-center gap-2">
                      {isB2B ? (client.company_name || `${client.first_name} ${client.last_name}`) : `${client.first_name} ${client.last_name}`}
                      {isB2B && <Badge className="border-none text-[10px] bg-indigo-100 text-indigo-700 hover:bg-indigo-100 shrink-0">B2B</Badge>}
                      {client.status !== 'active' && <span className="text-xs font-normal text-slate-400">(inactif)</span>}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {isB2B ? ([`${client.first_name || ''} ${client.last_name || ''}`.trim(), client.phone || client.email].filter(Boolean).join(' · ') || '—') : (client.phone || client.email || '—')}
                    </p>
                  </div>
                  <div className="hidden md:block w-40 shrink-0 text-sm text-slate-500 truncate">
                    {client.city || '—'}
                  </div>
                  <div className="hidden sm:block w-24 shrink-0 text-xs text-slate-500">
                    {clientBookings.length > 0
                      ? `${clientBookings.length} ménage${clientBookings.length > 1 ? 's' : ''}`
                      : <span className="text-slate-400">Aucun ménage</span>}
                  </div>
                  <div className="w-40 md:w-48 shrink-0 flex justify-end">
                    {needsUrssafForm ? (
                      <Badge className="border-none text-xs bg-orange-100 text-orange-700 hover:bg-orange-100">
                        Dossier URSSAF à remplir
                      </Badge>
                    ) : client.ai_status && client.ai_status !== 'none' ? (
                      <Badge className={`border-none text-xs ${AI_STATUS_COLORS[client.ai_status] || AI_STATUS_COLORS.none} hover:${AI_STATUS_COLORS[client.ai_status] || AI_STATUS_COLORS.none}`}>
                        {AI_STATUS_LABELS[client.ai_status] || client.ai_status}
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Zone dépliée */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 bg-slate-50/60 border-t border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
                      <div className="space-y-2 text-sm text-slate-600">
                        <p className="flex items-center gap-2 break-all"><Mail className="w-4 h-4 text-slate-400 shrink-0" />{client.email}</p>
                        <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400 shrink-0" />{client.phone || '—'}</p>
                        <p className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                          <span>{client.address ? `${client.address}, ${client.zipcode} ${client.city}` : <span className="text-slate-400">Adresse non renseignée</span>}</span>
                        </p>
                        {client.digicode && <p className="text-xs text-slate-500">Digicode / interphone : {client.digicode}</p>}
                        {isB2B && client.siret && <p className="text-xs text-slate-500">SIRET : {client.siret}</p>}
                      </div>
                      <div className="space-y-2">
                        {client.instructions && (
                          <div>
                            <p className="text-xs font-medium text-slate-400 uppercase mb-1">Instructions permanentes</p>
                            <p className="text-xs text-slate-600 bg-white border border-slate-200 rounded-md px-3 py-2 italic">{client.instructions}</p>
                          </div>
                        )}
                        {!isB2B && client.urssaf_completed && (
                          <div>
                            <p className="text-xs font-medium text-slate-400 uppercase mb-1">Statut avance immédiate</p>
                            <Select
                              value={['completed', 'ai_requested', 'ai_accepted', 'ai_refused'].includes(client.ai_status) ? client.ai_status : 'completed'}
                              onValueChange={(value) => aiStatusMutation.mutate({ id: client.id, data: { ai_status: value } })}
                            >
                              <SelectTrigger className="h-8 w-full md:w-auto gap-1.5 text-xs bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {['completed', 'ai_requested', 'ai_accepted', 'ai_refused'].map(s => (
                                  <SelectItem key={s} value={s} className="text-xs">{AI_STATUS_LABELS[s]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap md:flex-col md:items-end gap-2 content-start">
                        {needsUrssafForm && (
                          <Button variant="outline" size="sm" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 h-8 text-xs" onClick={() => setUrssafFormClient(client)}>
                            <ClipboardList className="w-3.5 h-3.5 mr-1" /> Remplir URSSAF
                          </Button>
                        )}
                        {!isB2B && client.urssaf_completed && (
                          <Button variant="outline" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 text-xs" onClick={() => setUrssafClient(client)}>
                            <ClipboardList className="w-3.5 h-3.5 mr-1" /> Dossier URSSAF
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openEdit(client)}>
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Modifier
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeletingClient(client)}>
                          <Trash2 className="w-3.5 h-3.5 mr-1" /> Supprimer
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation de suppression */}
      <AlertDialog open={!!deletingClient} onOpenChange={(open) => { if (!open) setDeletingClient(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              La fiche de <strong>{deletingClient?.first_name} {deletingClient?.last_name}</strong> sera définitivement supprimée. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { if (deletingClient) deleteMutation.mutate(deletingClient.id); setDeletingClient(null); }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Client Dialog */}
      <CreateClientDialog
        open={createClientOpen}
        onClose={() => setCreateClientOpen(false)}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['clients'] })}
      />

      {/* URSSAF Form Dialog (admin fill) */}
      {urssafFormClient && (
        <UrssafFormDialog
          client={urssafFormClient}
          open={!!urssafFormClient}
          onClose={() => setUrssafFormClient(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ['clients'] })}
        />
      )}

      {/* URSSAF Info Dialog (lecture seule) */}
      <Dialog open={!!urssafClient} onOpenChange={(open) => { if (!open) setUrssafClient(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dossier URSSAF — {urssafClient?.first_name} {urssafClient?.last_name}</DialogTitle>
          </DialogHeader>
          {urssafClient && urssafDetailsLoading && (
            <p className="text-sm text-slate-400 py-6 text-center">Chargement du dossier...</p>
          )}
          {urssafClient && !urssafDetailsLoading && !urssafDetails && (
            <p className="text-sm text-slate-400 py-6 text-center">Aucun dossier URSSAF enregistré pour ce client.</p>
          )}
          {urssafClient && urssafDetails && (
            <div className="space-y-6 text-sm">
              {/* Identité */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-3 border-b pb-1">Identité</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-slate-500">Civilité</span><p className="font-medium">{urssafClient.civilite || '—'}</p></div>
                  <div><span className="text-slate-500">Prénom</span><p className="font-medium">{urssafClient.first_name || '—'}</p></div>
                  <div><span className="text-slate-500">Nom</span><p className="font-medium">{urssafClient.last_name || '—'}</p></div>
                  <div><span className="text-slate-500">Nom de naissance</span><p className="font-medium">{urssafDetails.nom_naissance || '—'}</p></div>
                  <div><span className="text-slate-500">Date de naissance</span><p className="font-medium">{urssafDetails.birthdate || '—'}</p></div>
                  <div><span className="text-slate-500">Pays de naissance</span><p className="font-medium">{urssafDetails.pays_naissance || '—'}</p></div>
                  <div><span className="text-slate-500">CP de naissance</span><p className="font-medium">{urssafDetails.zipcode_naissance || '—'}</p></div>
                </div>
              </div>
              {/* Contact */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-3 border-b pb-1">Contact</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-slate-500">Email</span><p className="font-medium">{urssafClient.email || '—'}</p></div>
                  <div><span className="text-slate-500">Téléphone</span><p className="font-medium">{urssafClient.phone || '—'}</p></div>
                </div>
              </div>
              {/* Coordonnées bancaires */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-3 border-b pb-1">Coordonnées bancaires</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-slate-500">Titulaire</span><p className="font-medium">{urssafDetails.account_holder || '—'}</p></div>
                  <div><span className="text-slate-500">BIC</span><p className="font-medium">{urssafDetails.bic || '—'}</p></div>
                  <div className="col-span-2"><span className="text-slate-500">IBAN</span><p className="font-medium font-mono">{urssafDetails.iban || '—'}</p></div>
                </div>
              </div>
              {/* Adresse */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-3 border-b pb-1">Adresse postale</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-slate-500">N° de voie</span><p className="font-medium">{urssafDetails.numero_voie || '—'}</p></div>
                  <div><span className="text-slate-500">Lettre de voie</span><p className="font-medium">{urssafDetails.lettre_voie || '—'}</p></div>
                  <div><span className="text-slate-500">Type de voie</span><p className="font-medium">{urssafDetails.type_voie || '—'}</p></div>
                  <div><span className="text-slate-500">Nom de voie</span><p className="font-medium">{urssafDetails.nom_voie || '—'}</p></div>
                  <div><span className="text-slate-500">Lieu dit</span><p className="font-medium">{urssafDetails.lieu_dit || '—'}</p></div>
                  <div><span className="text-slate-500">Complément</span><p className="font-medium">{urssafDetails.complement_adresse || '—'}</p></div>
                  <div><span className="text-slate-500">Code postal</span><p className="font-medium">{urssafDetails.zipcode || '—'}</p></div>
                  <div><span className="text-slate-500">Commune</span><p className="font-medium">{urssafDetails.city || '—'}</p></div>
                  <div><span className="text-slate-500">Pays</span><p className="font-medium">{urssafDetails.pays || '—'}</p></div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
