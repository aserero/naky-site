import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/components/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronLeft, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { createPageUrl } from '@/utils';

export default function UrssafFormPage() {
  const { currentClient, updateClient } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [openSection, setOpenSection] = useState('item-1');
  const [formData, setFormData] = useState({
    // Identité
    civilite: '',
    first_name: '',
    last_name: '',
    nom_naissance: '',
    birthdate: '',
    pays_naissance: 'France',
    zipcode_naissance: '',
    // Information de contact
    email: '',
    phone: '',
    // Coordonnées bancaires
    iban: '',
    bic: '',
    account_holder: '',
    // Adresse postale
    numero_voie: '',
    lettre_voie: '',
    type_voie: '',
    nom_voie: '',
    lieu_dit: '',
    complement_adresse: '',
    pays: 'France',
    zipcode: '',
    city: ''
  });

  const typeVoieOptions = [
    'Rue', 'Avenue', 'Boulevard', 'Place', 'Allée', 'Chemin', 'Impasse', 
    'Route', 'Cours', 'Square', 'Voie', 'Passage', 'Quai', 'Promenade'
  ];

  useEffect(() => {
    if (!currentClient) {
      // Ne pas rediriger immédiatement - le client peut être en cours de chargement
      return;
    }

    // Pré-remplir avec les données existantes
    setFormData({
      civilite: currentClient.civilite || '',
      first_name: currentClient.first_name || '',
      last_name: currentClient.last_name || '',
      nom_naissance: currentClient.nom_naissance || currentClient.last_name || '',
      birthdate: currentClient.birthdate || '',
      pays_naissance: currentClient.pays_naissance || 'France',
      zipcode_naissance: currentClient.zipcode_naissance || '',
      email: currentClient.email || '',
      phone: currentClient.phone || '',
      iban: currentClient.iban || '',
      bic: currentClient.bic || '',
      account_holder: currentClient.account_holder || `${currentClient.first_name} ${currentClient.last_name}`,
      numero_voie: currentClient.numero_voie || '',
      lettre_voie: currentClient.lettre_voie || '',
      type_voie: currentClient.type_voie || '',
      nom_voie: currentClient.nom_voie || '',
      lieu_dit: currentClient.lieu_dit || '',
      complement_adresse: currentClient.complement_adresse || '',
      pays: currentClient.pays || 'France',
      zipcode: currentClient.zipcode || '',
      city: currentClient.city || ''
    });

    setLoading(false);
  }, [currentClient]);

  const requiredFields = ['civilite', 'first_name', 'last_name', 'nom_naissance', 'birthdate', 'pays_naissance', 'zipcode_naissance', 'email', 'phone', 'account_holder', 'iban', 'bic', 'pays', 'zipcode', 'city', 'numero_voie', 'type_voie', 'nom_voie'];

  const isValidIban = (iban) => {
    const clean = iban.replace(/\s/g, '');
    // IBAN français = 27 caractères, commence par FR
    return clean.length === 27 && clean.toUpperCase().startsWith('FR');
  };

  const fieldLabels = {
    civilite: 'Civilité',
    first_name: 'Prénom',
    last_name: 'Nom',
    nom_naissance: 'Nom de naissance',
    birthdate: 'Date de naissance',
    pays_naissance: 'Pays de naissance',
    zipcode_naissance: 'Code postal de naissance',
    email: 'Adresse email',
    phone: 'Numéro de téléphone',
    account_holder: 'Titulaire du compte',
    iban: 'IBAN',
    bic: 'BIC',
    numero_voie: 'Numéro de voie',
    type_voie: 'Type de voie',
    nom_voie: 'Nom de voie',
    pays: 'Pays',
    zipcode: 'Code postal',
    city: 'Commune',
  };

  const getFieldError = (field) => {
    if (!submitted) return null;
    if (field === 'iban') {
      if (!formData.iban) return 'L\'IBAN est obligatoire';
      if (!isValidIban(formData.iban)) return 'L\'IBAN doit être un IBAN français valide (27 caractères, commençant par FR)';
      return null;
    }
    if (requiredFields.includes(field) && !formData[field]) {
      return `${fieldLabels[field] || field} est obligatoire`;
    }
    return null;
  };

  const isFieldError = (field) => !!getFieldError(field);
  const selectError = (field) => submitted && !formData[field] ? 'border-red-500 ring-1 ring-red-500' : '';

  const sectionFields = {
    'item-1': ['civilite', 'first_name', 'last_name', 'nom_naissance', 'birthdate', 'pays_naissance', 'zipcode_naissance'],
    'item-2': ['email', 'phone'],
    'item-3': ['account_holder', 'iban', 'bic'],
    'item-4': ['numero_voie', 'type_voie', 'nom_voie', 'pays', 'zipcode', 'city'],
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    const hasErrors = requiredFields.some(f => !formData[f]) || !isValidIban(formData.iban);
    if (hasErrors) {
      // Trouver la première section avec une erreur et l'ouvrir
      for (const [section, fields] of Object.entries(sectionFields)) {
        const sectionHasError = fields.some(f => {
          if (f === 'iban') return !isValidIban(formData.iban);
          return !formData[f];
        });
        if (sectionHasError) {
          setOpenSection(section);
          setTimeout(() => {
            const el = document.getElementById(section);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
          break;
        }
      }
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    setLoading(true);

    try {
      const clients = await base44.entities.Client.filter({ email: currentClient.email });
      if (clients.length === 0) {
        toast.error('Client non trouvé');
        return;
      }

      await base44.entities.Client.update(clients[0].id, {
        ...formData,
        urssaf_completed: true,
        urssaf_status: 'pending'
      });

      // Set urssaf_status to 'pending' on all active bookings of this client
      const clientBookings = await base44.entities.Booking.filter({ client_id: clients[0].id });
      await Promise.all(
        clientBookings
          .filter(b => b.status !== 'cancelled' && b.payment_method === 'urssaf')
          .map(b => base44.entities.Booking.update(b.id, { urssaf_status: 'pending' }))
      );

      updateClient({ ...currentClient, ...formData, urssaf_completed: true });

      // Send webhook to Make
      base44.functions.invoke('sendUrssafWebhook', {
        clientId: clients[0].id,
        action: 'create',
        formData
      }).then(res => {
        if (res?.data?.idAbby && !clients[0].idAbby) {
          base44.entities.Client.update(clients[0].id, { idAbby: res.data.idAbby }).catch(console.error);
        }
      }).catch(err => console.error('URSSAF webhook error:', err));

      // Envoyer un e-mail de confirmation URSSAF au client
      base44.integrations.Core.SendEmail({
        from_name: 'Naky',
        to: formData.email,
        subject: 'Votre dossier URSSAF a bien été envoyé',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #E95678;">Votre dossier URSSAF est en cours de validation</h2>
            <p>Bonjour ${formData.first_name},</p>
            <p>Nous avons bien reçu vos informations et votre dossier a été transmis à l'URSSAF.</p>
            <div style="background: #fff8e1; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-weight: bold; color: #92400e;">⏳ En attente de validation</p>
              <p style="margin: 8px 0 0 0; color: #78350f;">
                L'URSSAF va vous envoyer sous peu un e-mail pour valider vos informations. 
                Ce n'est pas encore terminé — vous devrez confirmer votre inscription directement depuis cet e-mail de l'URSSAF.
              </p>
            </div>
            <p>Une fois votre dossier validé par l'URSSAF, vous bénéficierez automatiquement de l'avance immédiate du crédit d'impôt de 50% sur vos prochaines prestations Naky.</p>
            <p>Si vous ne recevez pas d'e-mail de l'URSSAF dans les prochains jours, pensez à vérifier vos spams ou contactez-nous.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #888; font-size: 14px;">Cordialement,<br>L'équipe Naky</p>
          </div>
        `
      }).catch(err => console.error('Email URSSAF error:', err));

      toast.success('Dossier URSSAF enregistré avec succès !');
      window.location.href = createPageUrl('UserDashboard');
    } catch (error) {
      toast.error('Une erreur est survenue lors de l\'enregistrement');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => window.history.back()}
          className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Retour
        </button>

        <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
          <h1 className="text-2xl font-bold mb-2">Dossier URSSAF</h1>
          <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4 mb-6">
            <p className="text-amber-800 font-semibold text-center text-base">
              ⚠️ Afin de bénéficier de l'aide crédit d'impôt de l'URSSAF, il faut que les informations Naky et celles de l'URSSAF correspondent exactement.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <Accordion type="single" collapsible value={openSection} onValueChange={setOpenSection} className="space-y-4">
              {/* Section 1: Identité */}
              <AccordionItem value="item-1" id="item-1" className="border rounded-lg bg-white">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-semibold">1</span>
                    <span className="font-semibold text-lg">Identité</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                     <Label>Civilité *</Label>
                     <Select value={formData.civilite} onValueChange={(value) => setFormData({ ...formData, civilite: value })}>
                       <SelectTrigger className={selectError('civilite')}>
                         <SelectValue placeholder="Sélectionner" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="M">M.</SelectItem>
                         <SelectItem value="Mme">Mme</SelectItem>
                       </SelectContent>
                     </Select>
                     {getFieldError('civilite') && <p className="text-red-500 text-xs mt-1">{getFieldError('civilite')}</p>}
                    </div>

                    <div>
                     <Label>Prénom *</Label>
                     <Input
                       value={formData.first_name}
                       onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                       className={isFieldError('first_name') ? 'border-red-500 ring-1 ring-red-500' : ''}
                     />
                     {getFieldError('first_name') && <p className="text-red-500 text-xs mt-1">{getFieldError('first_name')}</p>}
                    </div>

                    <div>
                     <Label>Nom *</Label>
                     <Input
                       value={formData.last_name}
                       onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                       className={isFieldError('last_name') ? 'border-red-500 ring-1 ring-red-500' : ''}
                     />
                     {getFieldError('last_name') && <p className="text-red-500 text-xs mt-1">{getFieldError('last_name')}</p>}
                    </div>

                    <div>
                     <Label>Nom de naissance *</Label>
                     <Input
                       value={formData.nom_naissance}
                       onChange={(e) => setFormData({ ...formData, nom_naissance: e.target.value })}
                       className={isFieldError('nom_naissance') ? 'border-red-500 ring-1 ring-red-500' : ''}
                     />
                     {getFieldError('nom_naissance') && <p className="text-red-500 text-xs mt-1">{getFieldError('nom_naissance')}</p>}
                    </div>

                    <div>
                     <Label>Date de naissance *</Label>
                     <Input
                       type="date"
                       value={formData.birthdate}
                       onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                       className={isFieldError('birthdate') ? 'border-red-500 ring-1 ring-red-500' : ''}
                     />
                     {getFieldError('birthdate') && <p className="text-red-500 text-xs mt-1">{getFieldError('birthdate')}</p>}
                    </div>

                    <div>
                     <Label>Pays de naissance *</Label>
                     <Input
                       value={formData.pays_naissance}
                       onChange={(e) => setFormData({ ...formData, pays_naissance: e.target.value })}
                       className={isFieldError('pays_naissance') ? 'border-red-500 ring-1 ring-red-500' : ''}
                     />
                     {getFieldError('pays_naissance') && <p className="text-red-500 text-xs mt-1">{getFieldError('pays_naissance')}</p>}
                    </div>

                    <div>
                     <Label>Code postal de naissance *</Label>
                     <Input
                       value={formData.zipcode_naissance}
                       onChange={(e) => setFormData({ ...formData, zipcode_naissance: e.target.value })}
                       className={isFieldError('zipcode_naissance') ? 'border-red-500 ring-1 ring-red-500' : ''}
                     />
                     {getFieldError('zipcode_naissance') && <p className="text-red-500 text-xs mt-1">{getFieldError('zipcode_naissance')}</p>}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Section 2: Information de contact */}
              <AccordionItem value="item-2" id="item-2" className="border rounded-lg bg-white">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-semibold">2</span>
                    <span className="font-semibold text-lg">Information de contact</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                     <Label>Adresse email *</Label>
                     <Input
                       type="email"
                       value={formData.email}
                       onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                       className={isFieldError('email') ? 'border-red-500 ring-1 ring-red-500' : ''}
                     />
                     {getFieldError('email') && <p className="text-red-500 text-xs mt-1">{getFieldError('email')}</p>}
                    </div>

                    <div>
                     <Label>Numéro de téléphone *</Label>
                     <Input
                       type="tel"
                       value={formData.phone}
                       onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                       className={isFieldError('phone') ? 'border-red-500 ring-1 ring-red-500' : ''}
                     />
                     {getFieldError('phone') && <p className="text-red-500 text-xs mt-1">{getFieldError('phone')}</p>}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Section 3: Coordonnées bancaires */}
              <AccordionItem value="item-3" id="item-3" className="border rounded-lg bg-white">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-semibold">3</span>
                    <span className="font-semibold text-lg">Coordonnées bancaires</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                     <Label>Titulaire du compte *</Label>
                     <Input
                       value={formData.account_holder}
                       onChange={(e) => setFormData({ ...formData, account_holder: e.target.value })}
                       className={isFieldError('account_holder') ? 'border-red-500 ring-1 ring-red-500' : ''}
                     />
                     {getFieldError('account_holder') && <p className="text-red-500 text-xs mt-1">{getFieldError('account_holder')}</p>}
                    </div>

                    <div>
                     <Label>IBAN *</Label>
                     <Input
                       value={formData.iban}
                       onChange={(e) => {
                         const raw = e.target.value.replace(/\s/g, '').toUpperCase();
                         const clean = raw.replace(/[^A-Z0-9]/g, '').slice(0, 27);
                         const formatted = clean.replace(/(.{4})/g, '$1 ').trim();
                         setFormData({ ...formData, iban: formatted });
                       }}
                       placeholder="FR76 3000 6000 0112 3456 7890 189"
                       maxLength={33}
                       className={isFieldError('iban') ? 'border-red-500 ring-1 ring-red-500' : ''}
                     />
                     {getFieldError('iban') && <p className="text-red-500 text-xs mt-1">{getFieldError('iban')}</p>}
                    </div>

                    <div>
                     <Label>BIC *</Label>
                     <Input
                       value={formData.bic}
                       onChange={(e) => setFormData({ ...formData, bic: e.target.value })}
                       placeholder="XXXXXXXX"
                       className={isFieldError('bic') ? 'border-red-500 ring-1 ring-red-500' : ''}
                     />
                     {getFieldError('bic') && <p className="text-red-500 text-xs mt-1">{getFieldError('bic')}</p>}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Section 4: Adresse postale */}
              <AccordionItem value="item-4" id="item-4" className="border rounded-lg bg-white">
                <AccordionTrigger className="px-6 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-sm font-semibold">4</span>
                    <span className="font-semibold text-lg">Adresse postale</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2">
                  <Alert className="mb-4 bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-sm text-blue-900">
                      <p className="font-medium mb-2">
                        Si votre client possède déjà un compte Urssaf Particulier, vous devez utiliser les mêmes informations pour l'adresse postale. Attention, le moindre caractère doit être identique. Votre client peut se rendre sur son espace Urssaf Particulier pour retrouver ces informations et vous les transmettre :
                      </p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Le numéro, le type de voie, la commune et le code postal ne doivent pas être répétés dans le champ Adresse</li>
                        <li>Si un numéro de voie est renseigné, vous devez saisir le Type de voie ou le Complément d'adresse ou le Lieu dit</li>
                      </ul>
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                     <Label>Numéro de voie *</Label>
                     <Input
                       type="number"
                       min="1"
                       value={formData.numero_voie}
                       onChange={(e) => setFormData({ ...formData, numero_voie: e.target.value })}
                       placeholder="Numéro de voie"
                       className={isFieldError('numero_voie') ? 'border-red-500 ring-1 ring-red-500' : ''}
                     />
                     {getFieldError('numero_voie') && <p className="text-red-500 text-xs mt-1">{getFieldError('numero_voie')}</p>}
                    </div>

                    <div>
                      <Label>Lettre de voie</Label>
                      <Input
                        value={formData.lettre_voie}
                        onChange={(e) => setFormData({ ...formData, lettre_voie: e.target.value })}
                        placeholder="Lettre de voie"
                        maxLength={1}
                      />
                    </div>

                    <div>
                     <Label>Type de voie *</Label>
                     <Select value={formData.type_voie} onValueChange={(value) => setFormData({ ...formData, type_voie: value })}>
                       <SelectTrigger className={selectError('type_voie')}>
                         <SelectValue placeholder="Type de voie" />
                       </SelectTrigger>
                       <SelectContent>
                         {typeVoieOptions.map((type) => (
                           <SelectItem key={type} value={type}>
                             {type}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                     {getFieldError('type_voie') && <p className="text-red-500 text-xs mt-1">{getFieldError('type_voie')}</p>}
                    </div>

                    <div>
                     <Label>Nom de voie *</Label>
                     <Input
                       value={formData.nom_voie}
                       onChange={(e) => setFormData({ ...formData, nom_voie: e.target.value })}
                       placeholder="Nom de voie"
                       className={isFieldError('nom_voie') ? 'border-red-500 ring-1 ring-red-500' : ''}
                     />
                     {getFieldError('nom_voie') && <p className="text-red-500 text-xs mt-1">{getFieldError('nom_voie')}</p>}
                    </div>

                    <div>
                      <Label>Lieu dit</Label>
                      <Input
                        value={formData.lieu_dit}
                        onChange={(e) => setFormData({ ...formData, lieu_dit: e.target.value })}
                        placeholder="Lieu dit"
                      />
                    </div>

                    <div>
                      <Label>Complément d'adresse</Label>
                      <Input
                        value={formData.complement_adresse}
                        onChange={(e) => setFormData({ ...formData, complement_adresse: e.target.value })}
                        placeholder="Bâtiment, étage, appartement..."
                      />
                    </div>

                    <div>
                     <Label>Pays *</Label>
                     <Input
                       value={formData.pays}
                       onChange={(e) => setFormData({ ...formData, pays: e.target.value })}
                       className={isFieldError('pays') ? 'border-red-500 ring-1 ring-red-500' : ''}
                     />
                     {getFieldError('pays') && <p className="text-red-500 text-xs mt-1">{getFieldError('pays')}</p>}
                    </div>

                    <div>
                     <Label>Code postal *</Label>
                     <Input
                       value={formData.zipcode}
                       onChange={(e) => setFormData({ ...formData, zipcode: e.target.value })}
                       className={isFieldError('zipcode') ? 'border-red-500 ring-1 ring-red-500' : ''}
                     />
                     {getFieldError('zipcode') && <p className="text-red-500 text-xs mt-1">{getFieldError('zipcode')}</p>}
                    </div>

                    <div className="md:col-span-2">
                     <Label>Commune *</Label>
                     <Input
                       value={formData.city}
                       onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                       className={isFieldError('city') ? 'border-red-500 ring-1 ring-red-500' : ''}
                     />
                     {getFieldError('city') && <p className="text-red-500 text-xs mt-1">{getFieldError('city')}</p>}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex justify-end gap-3 mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.history.back()}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#E95678] hover:bg-[#d44565]"
              >
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}