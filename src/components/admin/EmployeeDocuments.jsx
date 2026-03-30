import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Paperclip, Trash2, Upload, FileText, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const DOC_TYPES = [
  { value: 'piece_identite', label: "Pièce d'identité" },
  { value: 'auto_entrepreneur', label: 'Statut auto-entrepreneur' },
  { value: 'rib', label: 'RIB' },
  { value: 'casier_judiciaire', label: 'Casier judiciaire' },
  { value: 'contrat', label: 'Contrat de travail' },
  { value: 'autre', label: 'Autre' },
];

export default function EmployeeDocuments({ documents = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState('piece_identite');
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const docType = DOC_TYPES.find(d => d.value === selectedType);
      const newDoc = {
        name: file.name,
        type: selectedType,
        label: docType?.label || selectedType,
        url: file_url,
        uploaded_at: new Date().toISOString(),
      };
      onChange([...documents, newDoc]);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeDoc = (index) => {
    onChange(documents.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label>Documents</Label>
      <div className="flex gap-2">
        <div className="flex-1 flex items-center border border-input rounded-md px-3 h-9 text-sm text-muted-foreground bg-transparent">
          Document
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? 'Envoi...' : 'Ajouter'}
        </Button>
        <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} />
      </div>
      {documents.length > 0 && (
        <p className="text-xs text-slate-400">{documents.length} document(s) ajouté(s)</p>
      )}
    </div>
  );
}