import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

export default function CleaningSuppliesDialog({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900">
            Matériel de nettoyage à mettre à disposition chez soi
          </DialogTitle>
        </DialogHeader>
        <div className="border-t border-slate-200 my-2" />

        <p className="text-slate-600 text-sm leading-relaxed mb-4">
          Afin que votre agent Naky puisse travailler dans de bonnes conditions et fournir une prestation de qualité, il est nécessaire d'avoir chez soi un ensemble de produits ménagers. Il est aussi important que vous rangiez votre intérieur, c'est autant de temps gagné en ménage !
        </p>

        <div className="space-y-4">
          <div className="flex gap-3 items-start">
            <CheckCircle2 className="w-5 h-5 text-[#E95678] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#E95678]">3 produits liquides de nettoyage</p>
              <p className="text-slate-600 text-sm">Un détergent, un dégraissant, un désinfectant WC</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <CheckCircle2 className="w-5 h-5 text-[#E95678] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#E95678]">1 aspirateur</p>
              <p className="text-slate-600 text-sm">Permet d'aspirer tous types de surfaces</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <CheckCircle2 className="w-5 h-5 text-[#E95678] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#E95678]">1 kit d'entretien des sols</p>
              <p className="text-slate-600 text-sm">Seau, serpillière/panosse, pelle et balayette</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <CheckCircle2 className="w-5 h-5 text-[#E95678] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#E95678]">Plumeau & les produits suivants :</p>
              <p className="text-slate-600 text-sm">1 paire de gants, 1 microfibre pour le verre, 2 éponges, plusieurs chiffons intégrés dans les lots</p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 my-4" />

        <div>
          <p className="font-bold text-slate-800 text-sm mb-2">
            Si vous avez sélectionné des extras lors de votre réservation assurez-vous d'être en possession de :
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
            <li>Un décapant pour le four</li>
            <li>De la lessive et un adoucissant pour vos vêtements</li>
            <li>Des microfibres ou un produit lave-vitre pour vos fenêtres</li>
            <li>Un fer ainsi qu'une planche à repasser</li>
          </ul>
        </div>

        <div className="border-t border-slate-200 mt-4" />
        <div className="flex justify-center mt-2">
          <Button 
            onClick={onClose} 
            className="bg-[#E95678] hover:bg-[#d44565] text-white rounded-full px-10"
          >
            Compris !
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}