import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Trash2, Loader2, Eye } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import jsPDF from 'jspdf';

const CLIENT_INFO = {
  name: 'SAS JULI - Naky.fr',
  address: '11 rue François Ponsard',
  zipcode: '75016',
  city: 'Paris',
  siret: '',
};

function parseDurationToHours(duration) {
  if (!duration) return 0;
  // "3h", "2h30", "2.5", "2,5h"
  const matchHM = duration.match(/^(\d+)h(\d+)?/);
  if (matchHM) {
    return parseInt(matchHM[1], 10) + (matchHM[2] ? parseInt(matchHM[2], 10) / 60 : 0);
  }
  const matchNum = duration.match(/(\d+(?:[.,]\d+)?)/);
  if (matchNum) return parseFloat(matchNum[1].replace(',', '.'));
  return 0;
}

function generateInvoiceNumber(emp, month, year) {
  const initials = `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase();
  return `FACT-${initials}-${year}${String(month + 1).padStart(2, '0')}`;
}

export default function EmployeeInvoiceGenerator({ emp, bookings, clients = [], month, year, existingInvoice, onClose, open }) {
  const getClientName = (clientId) => {
    if (!clientId) return null;
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.first_name} ${client.last_name}` : null;
  };
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const completedBookings = bookings.filter(b =>
    b.employee_id === emp.id &&
    b.status === 'completed' &&
    b.date &&
    new Date(b.date).getMonth() === month &&
    new Date(b.date).getFullYear() === year
  ).sort((a, b) => a.date.localeCompare(b.date));

  const totalHours = completedBookings.reduce((sum, b) => sum + parseDurationToHours(b.duration), 0);
  const hourlyRate = emp.hourly_rate || 0;
  const totalAmount = totalHours * hourlyRate;
  const invoiceNumber = generateInvoiceNumber(emp, month, year);
  const monthLabel = format(new Date(year, month, 1), 'MMMM yyyy', { locale: fr });
  const periodStart = completedBookings[0]?.date || `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const periodEnd = completedBookings[completedBookings.length - 1]?.date || `${year}-${String(month + 1).padStart(2, '0')}-28`;

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(245, 245, 245);
    doc.rect(0, 0, pageW, 40, 'F');

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('FACTURE', 15, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`N° ${invoiceNumber}`, 15, 30);
    doc.text(`Date : ${format(new Date(), 'dd/MM/yyyy')}`, pageW - 15, 20, { align: 'right' });
    doc.text(`Période : ${format(new Date(periodStart), 'dd/MM/yyyy', { locale: fr })} – ${format(new Date(periodEnd), 'dd/MM/yyyy', { locale: fr })}`, pageW - 15, 28, { align: 'right' });

    // De / À
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Prestataire :', 15, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(`${emp.first_name} ${emp.last_name}`, 15, 63);
    if (emp.address) doc.text(emp.address, 15, 70);
    if (emp.email) doc.text(emp.email, 15, 77);
    if (emp.phone) doc.text(emp.phone, 15, 84);

    doc.setFont('helvetica', 'bold');
    doc.text('Facturé à :', pageW / 2 + 10, 55);
    doc.setFont('helvetica', 'normal');
    doc.text(CLIENT_INFO.name, pageW / 2 + 10, 63);
    doc.text(CLIENT_INFO.address, pageW / 2 + 10, 70);
    doc.text(`${CLIENT_INFO.zipcode} ${CLIENT_INFO.city}`, pageW / 2 + 10, 77);

    // Tableau des ménages
    const tableStartY = 100;
    doc.setFillColor(233, 86, 120);
    doc.rect(15, tableStartY, pageW - 30, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Date', 17, tableStartY + 5.5);
    doc.text('Adresse', 45, tableStartY + 5.5);
    doc.text('Durée', pageW - 55, tableStartY + 5.5);
    doc.text('Montant (€)', pageW - 30, tableStartY + 5.5, { align: 'right' });

    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'normal');
    let y = tableStartY + 14;
    completedBookings.forEach((b, i) => {
      if (i % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(15, y - 5, pageW - 30, 8, 'F');
      }
      const hours = parseDurationToHours(b.duration);
      const cost = hours * hourlyRate;
      doc.text(b.date ? format(parseISO(b.date), 'dd/MM/yyyy') : '—', 17, y);
      const clientName = getClientName(b.client_id);
      const addr = `${b.address || ''}, ${b.zipcode || ''} ${b.city || ''}`.trim().replace(/^,\s*/, '');
      const addrLine = clientName ? `${clientName} – ${addr}` : addr;
      doc.text(addrLine.substring(0, 50), 45, y);
      doc.text(`${hours.toFixed(1)}h`, pageW - 55, y);
      doc.text(`${cost.toFixed(2)}`, pageW - 30, y, { align: 'right' });
      y += 9;
      if (y > 260) { doc.addPage(); y = 20; }
    });

    // Ligne totale
    y += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, pageW - 15, y);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Total heures : ${totalHours.toFixed(1)}h`, 17, y);
    doc.text(`Taux horaire : ${hourlyRate.toFixed(2)} €/h`, pageW / 2, y);

    y += 10;
    doc.setFillColor(233, 86, 120);
    doc.rect(pageW - 80, y - 6, 65, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.text(`TOTAL : ${totalAmount.toFixed(2)} €`, pageW - 47, y + 2, { align: 'center' });

    // Footer
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Facture générée par Naky.fr', pageW / 2, 285, { align: 'center' });

    return doc;
  };

  const handleGenerateAndSave = async () => {
    if (completedBookings.length === 0) return;
    setIsGenerating(true);
    try {
      const doc = generatePDF();
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], `${invoiceNumber}.pdf`, { type: 'application/pdf' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      await base44.entities.Invoice.create({
        number: invoiceNumber,
        employee_id: emp.id,
        amount: totalAmount,
        date: new Date().toISOString().split('T')[0],
        period_start: periodStart,
        period_end: periodEnd,
        status: 'pending',
        file_url,
      });

      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = () => {
    const doc = generatePDF();
    doc.output('dataurlnewwindow');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#E95678]" />
            Facture – {emp.first_name} {emp.last_name}
            <span className="capitalize text-slate-500 font-normal text-sm">({monthLabel})</span>
          </DialogTitle>
        </DialogHeader>

        {/* Info facture */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4 text-sm">
          <div>
            <p className="text-xs text-slate-400 mb-1">Prestataire</p>
            <p className="font-semibold">{emp.first_name} {emp.last_name}</p>
            {emp.email && <p className="text-slate-500">{emp.email}</p>}
            {emp.hourly_rate && <p className="text-green-700 font-medium">{emp.hourly_rate} €/h</p>}
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Facturé à</p>
            <p className="font-semibold">{CLIENT_INFO.name}</p>
            <p className="text-slate-500">{CLIENT_INFO.address}</p>
            <p className="text-slate-500">{CLIENT_INFO.zipcode} {CLIENT_INFO.city}</p>
          </div>
        </div>

        {/* Liste des ménages */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">
            Ménages effectués ({completedBookings.length})
          </p>
          {completedBookings.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg">
              Aucun ménage terminé ce mois-ci
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {completedBookings.map((b) => {
                const hours = parseDurationToHours(b.duration);
                const cost = hours * hourlyRate;
                return (
                  <div key={b.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                   <div>
                     <span className="font-medium text-slate-800">
                       {b.date ? format(parseISO(b.date), 'dd MMM yyyy', { locale: fr }) : '—'}
                     </span>
                     {getClientName(b.client_id) && (
                       <span className="font-medium text-[#E95678] ml-2">{getClientName(b.client_id)}</span>
                     )}
                     <span className="text-slate-500 ml-2">{b.address}, {b.city}</span>
                   </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="font-medium text-slate-800">{hours.toFixed(1)}h</p>
                      {hourlyRate > 0 && <p className="text-xs text-green-700">{cost.toFixed(2)} €</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Total */}
        <div className="bg-[#E95678]/5 border border-[#E95678]/20 rounded-lg p-4 flex justify-between items-center">
          <div>
            <p className="text-sm text-slate-600">Total heures : <strong>{totalHours.toFixed(1)}h</strong></p>
            <p className="text-sm text-slate-600">Taux horaire : <strong>{hourlyRate.toFixed(2)} €/h</strong></p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Montant total</p>
            <p className="text-2xl font-bold text-[#E95678]">{totalAmount.toFixed(2)} €</p>
          </div>
        </div>

        {existingInvoice && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-700">
            ⚠️ Une facture existe déjà pour ce mois ({existingInvoice.number}). En générer une nouvelle créera un doublon.
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end flex-wrap">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button variant="outline" className="gap-2" onClick={handlePreview} disabled={completedBookings.length === 0}>
            <Eye className="w-4 h-4" /> Aperçu PDF
          </Button>
          <Button
            className="bg-[#E95678] hover:bg-[#d44565] text-white gap-2"
            onClick={handleGenerateAndSave}
            disabled={isGenerating || completedBookings.length === 0 || !hourlyRate}
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Générer & enregistrer
          </Button>
        </div>
        {!hourlyRate && (
          <p className="text-xs text-red-500 text-right">Taux horaire non défini pour cette employée</p>
        )}
      </DialogContent>
    </Dialog>
  );
}