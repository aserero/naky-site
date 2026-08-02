import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Mail } from 'lucide-react';
import { Leads } from '@/api/db';
import { ZONE_LABEL } from '@/lib/constants';
import { toast } from 'sonner';

export default function OutOfZoneDialog({ open, onClose, address, zipcode, city }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await Leads.create({
        kind: 'out_of_zone',
        email,
        address,
        zipcode,
        city
      });

      toast.success("Merci ! Nous vous contacterons dès que nous couvrirons votre zone.");
      onClose();
    } catch (error) {
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#E95678]">
            <MapPin className="w-5 h-5" />
            Zone non couverte
          </DialogTitle>
          <DialogDescription className="pt-4">
            Malheureusement, nous n'intervenons pas encore dans votre secteur (code postal {zipcode}).
            Actuellement, nos services sont disponibles uniquement sur {ZONE_LABEL}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Laissez-nous votre email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="votre@email.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12"
            />
            <p className="text-xs text-slate-500">
              Nous vous préviendrons dès que nous interviendrons dans votre zone.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#E95678] hover:bg-[#d44565]"
            >
              {loading ? 'Envoi...' : 'Me prévenir'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}