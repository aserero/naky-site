import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
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
  FileText,
  ClipboardList
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/textarea';
import UrssafFormDialog from '@/components/admin/UrssafFormDialog';
import CreateClientDialog from '@/components/admin/CreateClientDialog';

export default function AdminClients() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [urssafClient, setUrssafClient] = useState(null);
  const [urssafFormClient, setUrssafFormClient] = useState(null);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
  });

  const { data: bookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list(),
    initialData: [],
  });

  const getClientUrssafStatus = (client) => {
    if (client.urssaf_completed) {
      // Si un statut AI est défini, l'afficher
      if (client.urssaf_status && ['ai_requested', 'ai_accepted', 'ai_refused'].includes(client.urssaf_status)) {
        return client.urssaf_status;
      }
      return 'completed';
    }
    if (client.urssaf_status && client.urssaf_status !== 'none') return client.urssaf_status;
    return null;
  };

  const URSSAF_COLORS = {
    pending: 'bg-yellow-100 text-yellow-800',
    requested: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    refused: 'bg-red-100 text-red-800'
  };

  const URSSAF_LABELS = {
    completed: 'URSSAF : Complété — Faire la demande d\'AI',
    ai_requested: 'URSSAF : AI Demandée',
    ai_accepted: 'URSSAF : AI Acceptée',
    ai_refused: 'URSSAF : AI Refusée',
    pending: 'URSSAF : En attente',
    accepted: 'URSSAF : Accepté',
    refused: 'URSSAF : Refusé'
  };

  const URSSAF_COLORS_CLIENT = {
    completed: 'bg-blue-100 text-blue-800',
    ai_requested: 'bg-yellow-100 text-yellow-800',
    ai_accepted: 'bg-green-100 text-green-800',
    ai_refused: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-green-100 text-green-800',
    refused: 'bg-red-100 text-red-800'
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsDialogOpen(false);
      setEditingClient(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsDialogOpen(false);
      setEditingClient(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      first_name: formData.get('first_name'),
      last_name: formData.get('last_name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      address: formData.get('address'),
      zipcode: formData.get('zipcode'),
      city: formData.get('city'),
      digicode: formData.get('digicode'),
      instructions: formData.get('instructions'),
      status: 'active',
    };

    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredClients = clients.filter(client => 
    client.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openEdit = (client) => {
    setEditingClient(client);
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
            <DialogTrigger asChild>
              <span /></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingClient ? 'Modifier client' : 'Nouveau client'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Prénom</Label>
                    <Input id="first_name" name="first_name" defaultValue={editingClient?.first_name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Nom</Label>
                    <Input id="last_name" name="last_name" defaultValue={editingClient?.last_name} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" defaultValue={editingClient?.email} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input id="phone" name="phone" defaultValue={editingClient?.phone} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input id="address" name="address" defaultValue={editingClient?.address} required />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zipcode">Code postal</Label>
                    <Input id="zipcode" name="zipcode" defaultValue={editingClient?.zipcode} required />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="city">Ville</Label>
                    <Input id="city" name="city" defaultValue={editingClient?.city} required />
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
                  <Button type="submit" className="bg-[#E95678] hover:bg-[#d44565] text-white">
                    {editingClient ? 'Mettre à jour' : 'Créer'}
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

        <div className="space-y-3">
          {filteredClients.map((client) => (
            <div key={client.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-100">
              {/* Main row */}
              <div className="flex items-center gap-4 p-4">
                {/* Avatar initials */}
                <div className="w-10 h-10 rounded-full bg-[#E95678]/10 flex items-center justify-center text-[#E95678] font-bold text-sm shrink-0">
                  {client.first_name?.[0]}{client.last_name?.[0]}
                </div>

                {/* Name + badges */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900">{client.first_name} {client.last_name}</h3>
                    <Badge className={`border-none text-xs ${client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {client.status === 'active' ? 'Actif' : 'Inactif'}
                    </Badge>
                    {(() => {
                      const urssaf = getClientUrssafStatus(client);
                      if (!urssaf) return null;
                      return (
                        <Badge className={`border-none text-xs ${URSSAF_COLORS_CLIENT[urssaf]}`}>
                          {URSSAF_LABELS[urssaf]}
                        </Badge>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{client.email}</span>
                    {client.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{client.phone}</span>}
                    {client.address && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{client.address}, {client.zipcode} {client.city}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  {!client.urssaf_completed && (client.urssaf_status === 'pending' || bookings.some(b => b.client_id === client.id && b.advance_immediate)) && (
                    <Button variant="outline" size="sm" className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 h-8 text-xs" onClick={() => setUrssafFormClient(client)}>
                      <ClipboardList className="w-3.5 h-3.5 mr-1" /> Remplir URSSAF
                    </Button>
                  )}
                  {client.urssaf_completed && (
                    <Button variant="outline" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 text-xs" onClick={() => setUrssafClient(client)}>
                      <ClipboardList className="w-3.5 h-3.5 mr-1" /> Dossier URSSAF
                    </Button>
                  )}
                  {client.urssaf_completed && (
                    <select
                      className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white text-slate-700 cursor-pointer hover:border-slate-400 transition-colors h-8"
                      value={getClientUrssafStatus(client) || 'completed'}
                      onChange={(e) => updateMutation.mutate({ id: client.id, data: { urssaf_status: e.target.value } })}
                    >
                      <option value="completed">Dossier complet — AI à demander</option>
                      <option value="ai_requested">AI Demandée</option>
                      <option value="ai_accepted">AI Acceptée</option>
                      <option value="ai_refused">AI Refusée</option>
                    </select>
                  )}
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openEdit(client)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Modifier
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteMutation.mutate(client.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Instructions row (if any) */}
              {client.instructions && (
                <div className="px-4 pb-3 border-t border-slate-50">
                  <p className="text-xs text-slate-500 bg-slate-50 rounded px-3 py-2 mt-2 italic">
                    📝 {client.instructions}
                  </p>
                </div>
              )}
            </div>
          ))}
          {filteredClients.length === 0 && (
             <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-dashed">
                Aucun client trouvé
             </div>
          )}
        </div>
      </div>

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

      {/* URSSAF Info Dialog */}
      <Dialog open={!!urssafClient} onOpenChange={(open) => { if (!open) setUrssafClient(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dossier URSSAF — {urssafClient?.first_name} {urssafClient?.last_name}</DialogTitle>
          </DialogHeader>
          {urssafClient && (
            <div className="space-y-6 text-sm">
              {/* Identité */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-3 border-b pb-1">Identité</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-slate-500">Civilité</span><p className="font-medium">{urssafClient.civilite || '—'}</p></div>
                  <div><span className="text-slate-500">Prénom</span><p className="font-medium">{urssafClient.first_name || '—'}</p></div>
                  <div><span className="text-slate-500">Nom</span><p className="font-medium">{urssafClient.last_name || '—'}</p></div>
                  <div><span className="text-slate-500">Nom de naissance</span><p className="font-medium">{urssafClient.nom_naissance || '—'}</p></div>
                  <div><span className="text-slate-500">Date de naissance</span><p className="font-medium">{urssafClient.birthdate || '—'}</p></div>
                  <div><span className="text-slate-500">Pays de naissance</span><p className="font-medium">{urssafClient.pays_naissance || '—'}</p></div>
                  <div><span className="text-slate-500">CP de naissance</span><p className="font-medium">{urssafClient.zipcode_naissance || '—'}</p></div>
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
                  <div><span className="text-slate-500">Titulaire</span><p className="font-medium">{urssafClient.account_holder || '—'}</p></div>
                  <div><span className="text-slate-500">BIC</span><p className="font-medium">{urssafClient.bic || '—'}</p></div>
                  <div className="col-span-2"><span className="text-slate-500">IBAN</span><p className="font-medium font-mono">{urssafClient.iban || '—'}</p></div>
                </div>
              </div>
              {/* Adresse */}
              <div>
                <h3 className="font-semibold text-slate-700 mb-3 border-b pb-1">Adresse postale</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-slate-500">N° de voie</span><p className="font-medium">{urssafClient.numero_voie || '—'}</p></div>
                  <div><span className="text-slate-500">Lettre de voie</span><p className="font-medium">{urssafClient.lettre_voie || '—'}</p></div>
                  <div><span className="text-slate-500">Type de voie</span><p className="font-medium">{urssafClient.type_voie || '—'}</p></div>
                  <div><span className="text-slate-500">Nom de voie</span><p className="font-medium">{urssafClient.nom_voie || '—'}</p></div>
                  <div><span className="text-slate-500">Lieu dit</span><p className="font-medium">{urssafClient.lieu_dit || '—'}</p></div>
                  <div><span className="text-slate-500">Complément</span><p className="font-medium">{urssafClient.complement_adresse || '—'}</p></div>
                  <div><span className="text-slate-500">Code postal</span><p className="font-medium">{urssafClient.zipcode || '—'}</p></div>
                  <div><span className="text-slate-500">Commune</span><p className="font-medium">{urssafClient.city || '—'}</p></div>
                  <div><span className="text-slate-500">Pays</span><p className="font-medium">{urssafClient.pays || '—'}</p></div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}