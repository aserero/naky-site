import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function EnterpriseDialog({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.first_name) e.first_name = 'Obligatoire';
    if (!form.last_name) e.last_name = 'Obligatoire';
    if (!form.email) e.email = 'Obligatoire';
    if (!form.phone) e.phone = 'Obligatoire';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await base44.functions.invoke('sendEnterpriseRequest', {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
      });
      setShowSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={!showSuccess ? onClose : undefined}>
      <DialogContent className="max-w-md">
        {showSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="text-5xl">🙏</div>
            <h2 className="text-xl font-bold text-slate-900">Merci pour votre demande !</h2>
            <p className="text-slate-600 text-sm">
              Nous allons revenir vers vous très rapidement pour établir votre devis sur mesure.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  setForm({ first_name: '', last_name: '', email: '', phone: '' });
                  setErrors({});
                  setShowSuccess(false);
                }}
                className="bg-[#E95678] hover:bg-[#d44565] text-white rounded-full px-8"
              >
                Faire une nouvelle demande
              </Button>
              <Button variant="ghost" onClick={() => { onSuccess(); onClose(); }} className="text-slate-500 text-sm">
                Fermer
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Demande de devis Entreprise</DialogTitle>
            </DialogHeader>
            <p className="text-slate-500 text-sm mb-4">
              Laissez-nous vos coordonnées, nous vous recontacterons sous 24h pour établir un devis sur mesure.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Prénom *</Label>
                  <Input value={form.first_name} onChange={e => setForm(f => ({...f, first_name: e.target.value}))} className={`h-11 ${errors.first_name ? 'border-red-500' : ''}`} />
                  {errors.first_name && <p className="text-xs text-red-500">{errors.first_name}</p>}
                </div>
                <div className="space-y-1">
                  <Label>Nom *</Label>
                  <Input value={form.last_name} onChange={e => setForm(f => ({...f, last_name: e.target.value}))} className={`h-11 ${errors.last_name ? 'border-red-500' : ''}`} />
                  {errors.last_name && <p className="text-xs text-red-500">{errors.last_name}</p>}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className={`h-11 ${errors.email ? 'border-red-500' : ''}`} />
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>
              <div className="space-y-1">
                <Label>Téléphone *</Label>
                <Input type="tel" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} className={`h-11 ${errors.phone ? 'border-red-500' : ''}`} />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1 bg-[#E95678] hover:bg-[#d44565] text-white">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}