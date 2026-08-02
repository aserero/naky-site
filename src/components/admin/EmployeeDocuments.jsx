import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import { Trash2, Upload, FileText, Loader2, Eye, Pencil } from 'lucide-react';
import { EmployeeDocuments as EmployeeDocumentsRepo } from '@/api/db';
import { uploadFile, getSignedUrl, BUCKETS } from '@/api/storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const DOC_TYPES = [
  { value: 'piece_identite', label: "Pièce d'identité" },
  { value: 'auto_entrepreneur', label: 'Auto-entrepreneur' },
  { value: 'rib', label: 'RIB' },
  { value: 'casier_judiciaire', label: 'Casier judiciaire' },
  { value: 'contrat', label: 'Contrat de travail' },
  { value: 'autre', label: 'Autre' },
];

const TYPE_COLORS = {
  piece_identite: 'bg-blue-100 text-blue-700',
  auto_entrepreneur: 'bg-purple-100 text-purple-700',
  rib: 'bg-green-100 text-green-700',
  casier_judiciaire: 'bg-orange-100 text-orange-700',
  contrat: 'bg-slate-100 text-slate-700',
  autre: 'bg-gray-100 text-gray-700',
};

function isImage(path) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(path || '');
}

// Gestion autonome des documents d'une employée (table employee_documents,
// bucket privé employee-docs). Nécessite un employee_id existant.
export default function EmployeeDocuments({ employeeId }) {
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('piece_identite');
  const [viewDoc, setViewDoc] = useState(null);   // doc en cours de visualisation
  const [viewUrl, setViewUrl] = useState(null);   // URL signée du doc visualisé
  const [editName, setEditName] = useState('');
  const [deletingDoc, setDeletingDoc] = useState(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['employee-documents', employeeId],
    queryFn: () => EmployeeDocumentsRepo.filter({ employee_id: employeeId }, 'uploaded_at'),
    enabled: !!employeeId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['employee-documents'] });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }) => EmployeeDocumentsRepo.update(id, { name }),
    onSuccess: (updated) => {
      invalidate();
      setViewDoc(prev => (prev && prev.id === updated.id ? { ...prev, name: updated.name } : prev));
      toast.success('Document renommé');
    },
    onError: (err) => toast.error('Erreur : ' + (err.message || 'inconnue')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => EmployeeDocumentsRepo.remove(id),
    onSuccess: () => {
      invalidate();
      setViewDoc(null);
      setViewUrl(null);
      toast.success('Document supprimé');
    },
    onError: (err) => toast.error('Erreur : ' + (err.message || 'inconnue')),
  });

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { path } = await uploadFile(BUCKETS.employeeDocs, file, employeeId);
      await EmployeeDocumentsRepo.create({
        employee_id: employeeId,
        name: file.name,
        type: selectedType,
        storage_path: path,
      });
      invalidate();
      toast.success('Document ajouté');
    } catch (err) {
      toast.error("Erreur lors de l'ajout : " + (err.message || 'inconnue'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const openDoc = async (doc) => {
    setViewDoc(doc);
    setEditName(doc.name);
    setViewUrl(null);
    try {
      const url = await getSignedUrl(BUCKETS.employeeDocs, doc.storage_path);
      setViewUrl(url);
    } catch (err) {
      toast.error("Impossible d'ouvrir le document : " + (err.message || 'inconnue'));
    }
  };

  if (!employeeId) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Documents</p>
        <p className="text-xs text-slate-400 italic">
          Enregistrez d'abord l'employée pour pouvoir ajouter des documents.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-slate-700">Documents</p>

      {/* Zone d'upload */}
      <div className="flex gap-2">
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="flex-1 h-9 text-sm">
            <SelectValue placeholder="Type de document" />
          </SelectTrigger>
          <SelectContent>
            {DOC_TYPES.map(d => (
              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 shrink-0"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? 'Envoi...' : 'Ajouter'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileChange}
        />
      </div>

      {/* Liste des documents */}
      {isLoading ? (
        <p className="text-xs text-slate-400 italic">Chargement...</p>
      ) : documents.length === 0 ? (
        <p className="text-xs text-slate-400 italic">Aucun document ajouté</p>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const color = TYPE_COLORS[doc.type] || TYPE_COLORS.autre;
            const label = DOC_TYPES.find(d => d.value === doc.type)?.label || doc.type;
            const uploadedDate = doc.uploaded_at
              ? format(new Date(doc.uploaded_at), 'dd MMM yyyy', { locale: fr })
              : '';
            return (
              <div
                key={doc.id}
                className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => openDoc(doc)}
              >
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-0.5 ${color}`}>
                    {label}
                  </span>
                  <p className="text-xs text-slate-600 truncate">{doc.name}</p>
                  {uploadedDate && <p className="text-[10px] text-slate-400">{uploadedDate}</p>}
                </div>
                <Eye className="w-3.5 h-3.5 text-slate-400" />
              </div>
            );
          })}
        </div>
      )}

      {/* Popup de visualisation */}
      <Dialog open={!!viewDoc} onOpenChange={() => { setViewDoc(null); setViewUrl(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4 text-slate-500" />
              {viewDoc ? (DOC_TYPES.find(d => d.value === viewDoc.type)?.label || viewDoc.type) : ''}
            </DialogTitle>
          </DialogHeader>

          {viewDoc && (
            <div className="space-y-4">
              {/* Aperçu */}
              <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center min-h-48">
                {!viewUrl ? (
                  <div className="flex flex-col items-center gap-3 py-8 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <p className="text-sm">Chargement de l'aperçu...</p>
                  </div>
                ) : isImage(viewDoc.storage_path) ? (
                  <img src={viewUrl} alt={viewDoc.name} className="max-h-80 max-w-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8 text-slate-400">
                    <FileText className="w-12 h-12" />
                    <p className="text-sm">{viewDoc.name}</p>
                    <a href={viewUrl} target="_blank" rel="noopener noreferrer">
                      <Button type="button" variant="outline" size="sm" className="gap-2">
                        <Eye className="w-3.5 h-3.5" />
                        Ouvrir le PDF
                      </Button>
                    </a>
                  </div>
                )}
              </div>

              {/* Modifier le nom */}
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Nom du document</Label>
                <div className="flex gap-2">
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 gap-1.5 bg-slate-800 hover:bg-slate-700 text-white"
                    onClick={() => renameMutation.mutate({ id: viewDoc.id, name: editName })}
                    disabled={editName === viewDoc.name || !editName || renameMutation.isPending}
                  >
                    <Pencil className="w-3 h-3" />
                    Renommer
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={() => setDeletingDoc(viewDoc)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Supprimer
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => { setViewDoc(null); setViewUrl(null); }}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation de suppression */}
      <AlertDialog open={!!deletingDoc} onOpenChange={(open) => { if (!open) setDeletingDoc(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le document <strong>{deletingDoc?.name}</strong> sera définitivement supprimé. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { if (deletingDoc) deleteMutation.mutate(deletingDoc.id); setDeletingDoc(null); }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
