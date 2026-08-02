import React, { useState, useEffect } from 'react';
import { Bookings, PublicEmployees } from '@/api/db';
import { getSignedUrl, BUCKETS } from '@/api/storage';
import { SERVICE_LABELS } from '@/lib/constants';
import { formatTime, formatDuration, formatPrice } from '@/lib/format';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Clock, MapPin, CheckCircle2, FileText, User as UserIcon, Plus, XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { useAuth } from '@/components/AuthContext';
import QuickBookingDialog from '@/components/booking/QuickBookingDialog';

export default function UserDashboard() {
  const { currentClient, loading, updateClient } = useAuth();
  const queryClient = useQueryClient();
  const [showQuickBooking, setShowQuickBooking] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState({});

  useEffect(() => {
    if (!loading && !currentClient) {
      window.location.href = createPageUrl('Connexion');
    }
    if (currentClient) {
      setProfileData({
        first_name: currentClient.first_name,
        last_name: currentClient.last_name,
        phone: currentClient.phone,
        address: currentClient.address,
        zipcode: currentClient.zipcode,
        city: currentClient.city,
        has_animals: currentClient.has_animals || false
      });
    }
  }, [currentClient, loading]);

  const { data: bookings = [], isLoading: isLoadingBookings } = useQuery({
    queryKey: ['bookings', currentClient?.id],
    queryFn: () => Bookings.filter({ client_id: currentClient.id }),
    enabled: !!currentClient?.id,
  });

  // Vue publique restreinte (id, first_name, photo_url) — la table employees est interdite aux clients (RLS)
  const { data: employees = [] } = useQuery({
    queryKey: ['employees_public'],
    queryFn: () => PublicEmployees.list(),
    initialData: []
  });

  const updateClientMutation = useMutation({
    mutationFn: (data) => updateClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', currentClient?.id] });
      toast.success("Vos informations ont été mises à jour avec succès.");
      setEditMode(false);
    },
    onError: () => {
      toast.error("Une erreur est survenue lors de la mise à jour.");
    }
  });

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    updateClientMutation.mutate(profileData);
  };

  const handleDownloadInvoice = async (path) => {
    try {
      const url = await getSignedUrl(BUCKETS.invoices, path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error(err);
      toast.error("Impossible de récupérer la facture. Réessayez plus tard.");
    }
  };

  if (loading || isLoadingBookings) {
    return <div className="p-8 text-center text-slate-500">Chargement de votre espace...</div>;
  }

  if (!currentClient) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-none">En attente</Badge>;
      case 'confirmed': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none">Confirmé</Badge>;
      case 'completed': return <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-none">Terminé</Badge>;
      case 'cancelled': return <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-none">Annulé</Badge>;
      default: return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Bonjour, {currentClient.first_name}</h1>
          <p className="text-slate-500">Bienvenue dans votre espace client Naky.</p>
        </div>
        <Button
          onClick={() => setShowQuickBooking(true)}
          className="bg-[#E95678] hover:bg-[#d44565] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle réservation
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900">Mes informations</h2>
            <Button variant="outline" onClick={() => setEditMode(!editMode)}>
              {editMode ? 'Annuler' : 'Modifier'}
            </Button>
          </div>

          {editMode ? (
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prénom</Label>
                  <Input value={profileData.first_name} onChange={(e) => setProfileData({...profileData, first_name: e.target.value})} disabled={currentClient.urssaf_completed} />
                </div>
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input value={profileData.last_name} onChange={(e) => setProfileData({...profileData, last_name: e.target.value})} disabled={currentClient.urssaf_completed} />
                </div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Adresse</Label>
                  <Input value={profileData.address} onChange={(e) => setProfileData({...profileData, address: e.target.value})} disabled={currentClient.urssaf_completed} />
                </div>
                <div className="space-y-2">
                  <Label>Code postal</Label>
                  <Input value={profileData.zipcode} onChange={(e) => setProfileData({...profileData, zipcode: e.target.value})} disabled={currentClient.urssaf_completed} />
                </div>
                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Input value={profileData.city} onChange={(e) => setProfileData({...profileData, city: e.target.value})} disabled={currentClient.urssaf_completed} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has_animals"
                      checked={profileData.has_animals || false}
                      onCheckedChange={(checked) => setProfileData({...profileData, has_animals: checked})}
                    />
                    <Label htmlFor="has_animals" className="cursor-pointer font-normal">
                      J'ai des animaux
                    </Label>
                  </div>
                </div>
              </div>
              {currentClient.urssaf_completed && (
                <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded">
                  Les informations liées à l'URSSAF ne peuvent plus être modifiées après validation.
                </p>
              )}
              <div className="flex justify-end">
                <Button type="submit" disabled={updateClientMutation.isPending} className="bg-[#E95678] hover:bg-[#d44565]">
                  {updateClientMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-500">Nom complet</p>
                <p className="font-medium">{currentClient.first_name} {currentClient.last_name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Email</p>
                <p className="font-medium">{currentClient.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Téléphone</p>
                <p className="font-medium">{currentClient.phone}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Adresse</p>
                <p className="font-medium">{currentClient.address}, {currentClient.zipcode} {currentClient.city}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Animaux</p>
                <p className="font-medium">{currentClient.has_animals ? 'Oui' : 'Non'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">URSSAF complété</p>
                <p className="font-medium flex items-center gap-1">
                  {currentClient.urssaf_completed ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Oui
                    </span>
                  ) : (
                    <span className="text-orange-600">Non</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Encadré URSSAF selon le statut (clients.ai_status — vocabulaire unifié) */}
      {(() => {
        const aiStatus = currentClient.ai_status || 'none';
        const urssafCompleted = currentClient.urssaf_completed;
        const hasDoneRequest = urssafCompleted || aiStatus !== 'none';

        if (!hasDoneRequest) {
          // N'a pas encore fait la demande → rouge, incitation à le faire
          return (
            <Card className="border-2 border-red-400 bg-red-50 shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-red-700">⚠️ Crédit d'impôt 50% — Dossier incomplet</h3>
                    <p className="text-red-600">
                      Vous n'avez pas encore fait votre demande d'avance immédiate. Complétez votre dossier URSSAF pour en bénéficier.
                    </p>
                  </div>
                  <Link to={createPageUrl('UrssafForm')}>
                    <Button className="bg-red-500 hover:bg-red-600 text-white font-semibold whitespace-nowrap">
                      Faire ma demande
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        }

        if (aiStatus === 'ai_accepted') {
          return (
            <Card className="bg-gradient-to-br from-[#E95678] to-[#d44565] text-white border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-bold mb-2">✓ Avance Immédiate acceptée !</h3>
                    <p className="text-white/90">Votre demande d'avance immédiate a été acceptée par l'URSSAF. Vous bénéficiez du crédit d'impôt de 50% sur vos prochaines prestations.</p>
                  </div>
                  <div className="bg-white/20 rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap">AI Acceptée ✓</div>
                </div>
              </CardContent>
            </Card>
          );
        }

        if (aiStatus === 'ai_refused') {
          return (
            <Card className="border-2 border-red-300 bg-red-50 shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-red-700">Avance Immédiate refusée</h3>
                    <p className="text-red-600">Votre demande d'avance immédiate a été refusée. Contactez-nous pour plus d'informations.</p>
                  </div>
                  <div className="bg-red-200 text-red-700 rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap">AI Refusée</div>
                </div>
              </CardContent>
            </Card>
          );
        }

        if (aiStatus === 'ai_requested') {
          return (
            <Card className="border-2 border-yellow-200 bg-yellow-50 shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-yellow-700">Avance Immédiate — Demande en cours</h3>
                    <p className="text-yellow-600">La demande d'avance immédiate a été soumise à l'URSSAF. Vous serez informé dès que votre dossier sera traité.</p>
                  </div>
                  <div className="bg-yellow-200 text-yellow-700 rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap">AI Demandée</div>
                </div>
              </CardContent>
            </Card>
          );
        }

        if (aiStatus === 'completed' || urssafCompleted) {
          // Dossier complété mais AI pas encore demandée
          return (
            <Card className="border-2 border-blue-200 bg-blue-50 shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-blue-700">Crédit d'impôt 50% — Dossier en attente</h3>
                    <p className="text-blue-600">
                      Votre dossier URSSAF est complet. Notre équipe va effectuer la demande d'avance immédiate auprès de l'URSSAF. Vous serez informé dès validation.
                    </p>
                  </div>
                  <div className="bg-blue-200 text-blue-700 rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap">Dossier complet</div>
                </div>
              </CardContent>
            </Card>
          );
        }

        // ai_status === 'pending' (dossier souhaité mais pas complété) → gris, lecture seule
        return (
          <Card className="border-2 border-slate-200 bg-slate-50 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold mb-2 text-slate-600">Crédit d'impôt 50% — En cours de validation</h3>
                  <p className="text-slate-500">
                    Votre dossier URSSAF est en cours de traitement. Vous serez notifié dès validation.
                  </p>
                </div>
                <div className="bg-slate-200 text-slate-600 rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap">En attente</div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Vos réservations</h2>
        {bookings.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-slate-500 mb-4">Vous n'avez pas encore de réservation.</p>
            <Link to={createPageUrl('Booking')}>
              <Button className="bg-[#E95678] hover:bg-[#d44565] text-white">
                Réserver un ménage
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {[...bookings].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map(booking => (
              <Card key={booking.id} className="border-slate-100 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        {getStatusBadge(booking.status)}
                        <span className="font-semibold text-slate-900 capitalize">
                          {SERVICE_LABELS[booking.service_type] || booking.service_type}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="w-4 h-4 text-slate-400" />
                          {booking.date ? format(parseISO(booking.date), 'dd MMMM yyyy', { locale: fr }) : 'Date non définie'}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-slate-400" />
                          {booking.start_time ? formatTime(booking.start_time) : 'Heure non définie'} ({formatDuration(booking.duration_minutes)})
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {booking.address}, {booking.zipcode} {booking.city}
                      </div>
                      
                      {booking.advance_immediate && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-[#E95678]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Demande d'avance immédiate (URSSAF)
                        </div>
                      )}
                      {booking.urssaf_status && booking.urssaf_status !== 'none' && (
                        <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full w-fit ${
                          booking.urssaf_status === 'accepted' ? 'bg-green-100 text-green-700' :
                          booking.urssaf_status === 'refused' ? 'bg-red-100 text-red-700' :
                          booking.urssaf_status === 'requested' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          <FileText className="w-3 h-3" />
                          URSSAF : {
                            booking.urssaf_status === 'pending' ? 'En attente' :
                            booking.urssaf_status === 'requested' ? 'Demandé' :
                            booking.urssaf_status === 'accepted' ? 'Accepté ✓' :
                            'Refusé'
                          }
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-start md:items-end justify-between gap-3">
                      {(booking.advance_immediate || currentClient?.urssaf_completed || currentClient?.ai_status === 'ai_accepted') ? (
                        <div className="text-right">
                          <div className="text-2xl font-bold text-[#E95678]">
                            {booking.total_price ? formatPrice(booking.total_price / 2) : '—'}
                          </div>
                          <div className="text-xs text-slate-400 line-through">{formatPrice(booking.total_price)}</div>
                          <div className="text-xs text-slate-500">Après crédit d'impôt 50%</div>
                        </div>
                      ) : (
                        <div className="text-2xl font-bold text-slate-900">
                          {formatPrice(booking.total_price)}
                        </div>
                      )}
                      
                      {booking.employee_id ? (
                        <div className="text-sm text-green-600 flex items-center gap-1">
                          <UserIcon className="w-4 h-4" /> 
                          {employees.find(e => e.id === booking.employee_id)?.first_name || 'Agent attribué'}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 flex items-center gap-1">
                          <Clock className="w-4 h-4" /> Recherche d'agent...
                        </div>
                      )}

                      {booking.invoice_file_path && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadInvoice(booking.invoice_file_path)}
                          className="gap-1.5 text-green-700 border-green-200 hover:bg-green-50"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Télécharger ma facture
                        </Button>
                      )}

                      {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors">
                              <XCircle className="w-3.5 h-3.5" />
                              Annuler le RDV
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Annuler votre rendez-vous</AlertDialogTitle>
                              <AlertDialogDescription>
                                Pour annuler votre rendez-vous, veuillez contacter notre support par email :<br /><br />
                                <a href="mailto:contact@naky.fr" className="font-semibold text-[#E95678] underline">contact@naky.fr</a>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Fermer</AlertDialogCancel>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <QuickBookingDialog
        open={showQuickBooking}
        onClose={() => setShowQuickBooking(false)}
        client={currentClient}
      />
    </div>
  );
}