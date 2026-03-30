import React, { useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
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
  MoreVertical, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin,
  Calendar,
  Trash2,
  Pencil,
  Paperclip,
  Camera,
  Loader2
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import EmployeeDocuments from '@/components/admin/EmployeeDocuments';

export default function AdminEmployees() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const queryClient = useQueryClient();

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Employee.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsDialogOpen(false);
      setEditingEmployee(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsDialogOpen(false);
      setEditingEmployee(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Employee.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
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
      hourly_rate: formData.get('hourly_rate') ? parseFloat(formData.get('hourly_rate')) : undefined,
      status: 'active',
      joined_date: editingEmployee ? editingEmployee.joined_date : new Date().toISOString().split('T')[0],
      documents,
      photo_url: photoUrl || undefined,
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
    setDocuments(employee.documents || []);
    setPhotoUrl(employee.photo_url || '');
    setIsDialogOpen(true);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPhotoUrl(file_url);
    setUploadingPhoto(false);
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
            if (!open) { setEditingEmployee(null); setDocuments([]); setPhotoUrl(''); }
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
                <div className="space-y-2">
                  <Label htmlFor="hourly_rate">Coût horaire (€/h)</Label>
                  <Input id="hourly_rate" name="hourly_rate" type="number" step="0.01" min="0" defaultValue={editingEmployee?.hourly_rate} placeholder="Ex: 12.50" />
                </div>
                <EmployeeDocuments documents={documents} onChange={setDocuments} />
                <DialogFooter>
                  <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
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
          <div className="w-48">
             {/* Status Filter Placeholder */}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((employee) => (
            <div key={employee.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-slate-100">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200 shrink-0">
                    {employee.photo_url ? (
                      <img src={employee.photo_url} alt={employee.first_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-slate-400">
                        {employee.first_name?.[0]}{employee.last_name?.[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{employee.first_name} {employee.last_name}</h3>
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none mt-1">
                      {employee.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4 text-slate-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(employee)}>
                      <Pencil className="w-4 h-4 mr-2" /> Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={() => deleteMutation.mutate(employee.id)}>
                      <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400" />
                  {employee.phone}
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {employee.email}
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {employee.address || 'Pas d\'adresse renseignée'}
                </div>
                {employee.hourly_rate && (
                  <div className="flex items-center gap-3 font-medium text-slate-700">
                    <span className="text-slate-400">€</span>
                    {employee.hourly_rate} €/h
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400 mb-2">
                  Ajoutée le {employee.joined_date ? format(parseISO(employee.joined_date), 'd MMMM yyyy', { locale: fr }) : 'Date inconnue'}
                </p>
                {employee.documents?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {employee.documents.map((doc, i) => (
                      <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded px-2 py-1 transition-colors">
                        <Paperclip className="w-3 h-3" />
                        {doc.label || doc.type}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}