import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function UrssafFormDialog({ client, open, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    civilite: client?.civilite || '',
    first_name: client?.first_name || '',
    last_name: client?.last_name || '',
    nom_naissance: client?.nom_naissance || '',
    birthdate: client?.birthdate || '',
    pays_naissance: client?.pays_naissance || 'France',
    zipcode_naissance: client?.zipcode_naissance || '',
    email: client?.email || '',
    phone: client?.phone || '',
    iban: client?.iban || '',
    bic: client?.bic || '',
    account_holder: client?.account_holder || '',
    numero_voie: client?.numero_voie || '',
    lettre_voie: client?.lettre_voie || '',
    type_voie: client?.type_voie || '',
    nom_voie: client?.nom_voie || '',
    lieu_dit: client?.lieu_dit || '',
    complement_adresse: client?.complement_adresse || '',
    zipcode: client?.zipcode || '',
    city: client?.city || '',
    pays: client?.pays || 'France',
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!form.iban || !form.bic || !form.birthdate) {
      toast.error("Veuillez renseigner au minimum la date de naissance, l'IBAN et le BIC.");
      return;
    }
    setLoading(true);
    try {
      await base44.entities.Client.update(client.id, {
        ...form,
        urssaf_completed: true,
        urssaf_status: 'completed',
      });
      // Envoyer le webhook URSSAF
      const res = await base44.functions.invoke('sendUrssafWebhook', {
        clientId: client.id,
        action: 'create',
        formData: form,
      });
      if (res?.data?.idAbby) {
        await base44.entities.Client.update(client.id, { idAbby: res.data.idAbby });
      }
      toast.success("Dossier URSSAF enregistré et envoyé !");
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Erreur : " + (err.message || 'inconnue'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Formulaire URSSAF — {client?.first_name} {client?.last_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-sm">
          {/* Identité */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-3 border-b pb-1">Identité</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Civilité</Label>
                <Select value={form.civilite} onValueChange={(v) => set('civilite', v)}>
                  <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">M.</SelectItem>
                    <SelectItem value="Mme">Mme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Prénom</Label>
                <Input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Nom</Label>
                <Input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Nom de naissance</Label>
                <Input value={form.nom_naissance} onChange={(e) => set('nom_naissance', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Date de naissance *</Label>
                <Input type="date" value={form.birthdate} onChange={(e) => set('birthdate', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Pays de naissance</Label>
                <Input value={form.pays_naissance} onChange={(e) => set('pays_naissance', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>CP de naissance</Label>
                <Input value={form.zipcode_naissance} onChange={(e) => set('zipcode_naissance', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-3 border-b pb-1">Contact</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => set('email', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Téléphone</Label>
                <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Bancaire */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-3 border-b pb-1">Coordonnées bancaires</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label>Titulaire du compte</Label>
                <Input value={form.account_holder} onChange={(e) => set('account_holder', e.target.value)} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>IBAN *</Label>
                <Input value={form.iban} onChange={(e) => set('iban', e.target.value)} placeholder="FR76..." />
              </div>
              <div className="space-y-1">
                <Label>BIC *</Label>
                <Input value={form.bic} onChange={(e) => set('bic', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Adresse */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-3 border-b pb-1">Adresse postale</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>N° de voie</Label>
                <Input value={form.numero_voie} onChange={(e) => set('numero_voie', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Lettre de voie</Label>
                <Input value={form.lettre_voie} onChange={(e) => set('lettre_voie', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Type de voie</Label>
                <Input value={form.type_voie} onChange={(e) => set('type_voie', e.target.value)} placeholder="Rue, Avenue..." />
              </div>
              <div className="space-y-1">
                <Label>Nom de voie</Label>
                <Input value={form.nom_voie} onChange={(e) => set('nom_voie', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Lieu dit</Label>
                <Input value={form.lieu_dit} onChange={(e) => set('lieu_dit', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Complément</Label>
                <Input value={form.complement_adresse} onChange={(e) => set('complement_adresse', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Code postal</Label>
                <Input value={form.zipcode} onChange={(e) => set('zipcode', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Commune</Label>
                <Input value={form.city} onChange={(e) => set('city', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Pays</Label>
                <Input value={form.pays} onChange={(e) => set('pays', e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} disabled={loading} className="bg-[#E95678] hover:bg-[#d44565] text-white">
            {loading ? 'Enregistrement...' : 'Enregistrer & Envoyer URSSAF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}