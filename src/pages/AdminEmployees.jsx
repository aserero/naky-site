import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Search, Phone, Mail, MapPin,
  Trash2, Pencil, Paperclip, Camera, Loader2, ChevronDown
} from 'lucide-react';
import { Employees, EmployeeDocuments as EmployeeDocumentsRepo } from '@/api/db';
import { uploadFile, getSignedUrl, BUCKETS } from '@/api/storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import EmployeeDocuments from '@/components/admin/EmployeeDocuments';

const DOC_TYPE_LABELS = {
  piece_identite: "Pièce d'identité",
  auto_entrepreneur: 'Auto-entrepreneur',
  rib: 'RIB',
  casier_judiciaire: 'Casier judiciaire',
  contrat: 'Contrat de travail',
  autre: 'Autre',
};

export default function AdminEmployees() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deletingEmployee, setDeletingEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [status, setStatus] = useState('active');
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => Employees.list(),
    initialData: [],
  });

  // Tous les documents (pour afficher les pastilles sur les cartes)
  const { data: allDocuments } = useQuery({
    queryKey: ['employee-documents'],
    queryFn: () => EmployeeDocumentsRepo.list('uploaded_at'),
    initialData: [],
  });

  const documentsByEmployee = allDocuments.reduce((acc, doc) => {
    (acc[doc.employee_id] = acc[doc.employee_id] || []).push(doc);
    return acc;
  }, {});

  const createMutation = useMutation({
    mutationFn: (data) => Employees.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsDialogOpen(false);
      setEditingEmployee(null);
      toast.success('Employée ajoutée');
    },
    onError: (err) => toast.error('Erreur : ' + (err.message || 'inconnue')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => Employees.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsDialogOpen(false);
      setEditingEmployee(null);
      toast.success('Employée mise à jour');
    },
    onError: (err) => toast.error('Erreur : ' + (err.message || 'inconnue')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => Employees.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employée supprimée');
    },
    onError: (err) => toast.error('Erreur : ' + (err.message || 'inconnue')),
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
      hourly_rate: formData.get('hourly_rate') ? parseFloat(formData.get('hourly_rate')) : null,
      status,
      joined_date: editingEmployee ? editingEmployee.joined_date : format(new Date(), 'yyyy-MM-dd'),
      photo_url: photoUrl || null,
    };

    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredEmployees = employees.filter(employee =>
    employee.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openEdit = (employee) => {
    setEditingEmployee(employee);
    setPhotoUrl(employee.photo_url || '');
    setStatus(employee.status || 'active');
    setIsDialogOpen(true);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      // Bucket public : on stocke directement l'URL publique
      const { publicUrl } = await uploadFile(BUCKETS.photos, file);
      setPhotoUrl(publicUrl);
    } catch (err) {
      toast.error("Erreur lors de l'envoi de la photo : " + (err.message || 'inconnue'));
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const openDocument = async (doc) => {
    try {
      const url = await getSignedUrl(BUCKETS.employeeDocs, doc.storage_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error("Impossible d'ouvrir le document : " + (err.message || 'inconnue'));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Employées</h1>
            <p className="text-slate-500">{employees.length} employées au total</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) { setEditingEmployee(null); setPhotoUrl(''); setStatus('active'); }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
                <Plus className="w-4 h-4" /> Nouvelle employée
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingEmployee ? 'Modifier employée' : 'Nouvelle employée'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Photo */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200 shrink-0">
                    {photoUrl ? (
                      <img src={photoUrl} alt="Photo" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <Label className="text-sm text-slate-600 mb-1 block">Photo de profil</Label>
                    <label className="cursor-pointer inline-flex items-center gap-2 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-md transition-colors">
                      {uploadingPhoto ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                      {uploadingPhoto ? 'Envoi...' : 'Choisir une photo'}
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Prénom</Label>
                    <Input id="first_name" name="first_name" defaultValue={editingEmployee?.first_name} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Nom</Label>
                    <Input id="last_name" name="last_name" defaultValue={editingEmployee?.last_name} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={editingEmployee?.email} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input id="phone" name="phone" defaultValue={editingEmployee?.phone} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input id="address" name="address" defaultValue={editingEmployee?.address} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hourly_rate">Coût horaire (€/h)</Label>
                    <Input id="hourly_rate" name="hourly_rate" type="number" step="0.01" min="0" defaultValue={editingEmployee?.hourly_rate} placeholder="Ex: 12.50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Statut</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Statut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <EmployeeDocuments employeeId={editingEmployee?.id} />
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                    {editingEmployee ? 'Mettre à jour' : 'Ajouter'}
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
              placeholder="Rechercher par nom ou email..."
              className="pl-10 border-slate-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <p className="text-sm text-slate-500">
          {filteredEmployees.length} employée{filteredEmployees.length > 1 ? 's' : ''}
        </p>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 divide-y divide-slate-100 overflow-hidden">
          {filteredEmployees.length === 0 && (
            <p className="p-8 text-center text-slate-500">Aucune employée trouvée</p>
          )}
          {filteredEmployees.map((employee) => {
            const employeeDocs = documentsByEmployee[employee.id] || [];
            const isExpanded = expandedId === employee.id;
            const isInactive = employee.status !== 'active';
            return (
              <div key={employee.id} className={isInactive ? 'opacity-60' : ''}>
                {/* Ligne compacte */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : employee.id)}
                  className="w-full flex items-center gap-3 md:gap-4 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200 shrink-0">
                    {employee.photo_url ? (
                      <img src={employee.photo_url} alt={employee.first_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-slate-400">
                        {employee.first_name?.[0]}{employee.last_name?.[0]}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {employee.first_name} {employee.last_name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{employee.phone}</p>
                  </div>
                  <div className="hidden md:block w-28 shrink-0">
                    {employee.hourly_rate != null ? (
                      <p className="text-sm font-medium text-slate-700">{employee.hourly_rate} €/h</p>
                    ) : (
                      <p className="text-sm text-orange-500">Taux non défini</p>
                    )}
                  </div>
                  <div className="hidden sm:flex items-center gap-1 w-32 shrink-0 text-xs text-slate-500">
                    <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                    {employeeDocs.length > 0
                      ? `${employeeDocs.length} document${employeeDocs.length > 1 ? 's' : ''}`
                      : <span className="text-slate-400">Aucun document</span>}
                  </div>
                  <Badge className={`border-none shrink-0 ${employee.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-100'}`}>
                    {employee.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Zone dépliée */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 bg-slate-50/60 border-t border-slate-100">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
                      <div className="space-y-2 text-sm text-slate-600">
                        <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400 shrink-0" />{employee.phone || '—'}</p>
                        <p className="flex items-center gap-2 break-all"><Mail className="w-4 h-4 text-slate-400 shrink-0" />{employee.email || '—'}</p>
                        <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400 shrink-0" />{employee.address || <span className="text-slate-400">Adresse non renseignée</span>}</p>
                        <p className="text-xs text-slate-400 pt-1">
                          Ajoutée le {employee.joined_date ? format(parseISO(employee.joined_date), 'd MMMM yyyy', { locale: fr }) : 'date inconnue'}
                          {employee.hourly_rate != null && <span className="md:hidden"> · {employee.hourly_rate} €/h</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-400 uppercase mb-2">Documents</p>
                        {employeeDocs.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {employeeDocs.map((doc) => (
                              <button
                                key={doc.id}
                                onClick={() => openDocument(doc)}
                                className="flex items-center gap-1 text-xs bg-white border border-slate-200 hover:border-slate-400 text-slate-600 rounded-md px-2 py-1 transition-colors"
                                title={doc.name}
                              >
                                <Paperclip className="w-3 h-3 shrink-0" />
                                <span className="max-w-[140px] truncate">{doc.name || DOC_TYPE_LABELS[doc.type]}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400">Aucun document — ajoutez-les via « Modifier »</p>
                        )}
                      </div>
                      <div className="flex md:flex-col md:items-end gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => openEdit(employee)}>
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Modifier
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeletingEmployee(employee)}>
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
      <AlertDialog open={!!deletingEmployee} onOpenChange={(open) => { if (!open) setDeletingEmployee(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette employée ?</AlertDialogTitle>
            <AlertDialogDescription>
              La fiche de <strong>{deletingEmployee?.first_name} {deletingEmployee?.last_name}</strong> et ses documents seront définitivement supprimés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { if (deletingEmployee) deleteMutation.mutate(deletingEmployee.id); setDeletingEmployee(null); }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
