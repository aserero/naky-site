import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus, Trash2, Eye, Loader2, Building2, User } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { Invoices } from '@/api/db';
import { uploadFile, BUCKETS } from '@/api/storage';
import { INVOICE_ISSUER, INVOICE_COLORS } from '@/lib/constants';
import { NAKY_LOGO_DATAURL } from '@/lib/naky-logo';

const VAT_RATES = ['0', '5.5', '10', '20'];

const emptyLine = () => ({ label: '', unit: 'Heure', qty: 1, price: '' });

// Prochain numéro NAKY-{année}-{NNN} d'après les factures existantes
function nextInvoiceNumber(invoices, year) {
  const prefix = `NAKY-${year}-`;
  const max = invoices
    .filter((inv) => inv.number?.startsWith(prefix))
    .reduce((m, inv) => Math.max(m, parseInt(inv.number.slice(prefix.length), 10) || 0), 0);
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

export default function InvoiceCreateDialog({ open, onClose, clients, invoices }) {
  const [mode, setMode] = useState('b2c'); // 'b2c' | 'b2b'
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [recipient, setRecipient] = useState({ name: '', address: '', email: '', siret: '' });
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [status, setStatus] = useState('pending');
  const [vatRate, setVatRate] = useState('0');
  const [lines, setLines] = useState([emptyLine()]);
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;

  const effectiveRecipient = mode === 'b2c' && selectedClient
    ? {
        name: `${selectedClient.first_name} ${selectedClient.last_name}`,
        address: [selectedClient.address, `${selectedClient.zipcode || ''} ${selectedClient.city || ''}`.trim()]
          .filter(Boolean).join(', '),
        email: selectedClient.email || '',
        siret: '',
      }
    : recipient;

  const totals = useMemo(() => {
    const ht = lines.reduce((sum, l) => sum + (parseFloat(l.price) || 0) * (parseFloat(l.qty) || 0), 0);
    const tva = ht * (parseFloat(vatRate) / 100);
    return { ht, tva, ttc: ht + tva };
  }, [lines, vatRate]);

  const validLines = lines.filter((l) => l.label.trim() && parseFloat(l.price) > 0 && parseFloat(l.qty) > 0);
  const canSubmit = effectiveRecipient.name.trim() && validLines.length > 0 && totals.ttc > 0
    && (mode === 'b2c' ? !!selectedClient : true);

  const b2cClients = clients.filter((c) => (c.client_type || 'b2c') === 'b2c');
  const b2bClients = clients.filter((c) => c.client_type === 'b2b');

  const filteredClients = (clientSearch
    ? b2cClients.filter((c) =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(clientSearch.toLowerCase()))
    : b2cClients);

  const prefillFromB2BClient = (c) => {
    setRecipient({
      name: c.company_name || `${c.first_name} ${c.last_name}`,
      address: [c.address, `${c.zipcode || ''} ${c.city || ''}`.trim()].filter(Boolean).join(', '),
      email: c.email || '',
      siret: c.siret || '',
    });
    setSelectedClientId(c.id);
  };

  const buildPdf = (number) => {
    const doc = new jsPDF();
    const C = INVOICE_COLORS;
    const I = INVOICE_ISSUER;
    const fmtEUR = (n) => {
      const [int, dec] = n.toFixed(2).split('.');
      return int.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0') + ',' + dec + '\u00A0\u20AC';
    };
    const dateFr = format(new Date(invoiceDate + 'T00:00:00'), 'dd/MM/yyyy');

    // ---- En-tête : logo + titre ----
    try { doc.addImage(NAKY_LOGO_DATAURL, 'JPEG', 14, 12, 24, 24); } catch { /* logo optionnel */ }
    doc.setFont('helvetica', 'bold').setFontSize(24).setTextColor(...C.green);
    doc.text('Facture', 196, 21, { align: 'right' });
    doc.setFontSize(13).setTextColor(...C.navy);
    doc.text(number, 196, 29, { align: 'right' });
    if (status === 'paid') {
      doc.setFillColor(...C.badgeBg);
      doc.roundedRect(179, 32, 17, 6, 1.5, 1.5, 'F');
      doc.setFontSize(7.5).setTextColor(...C.badgeText);
      doc.text('PAYÉ', 187.5, 36, { align: 'center' });
    }

    // ---- Émetteur (gauche) ----
    let y = 48;
    doc.setFontSize(9.5).setTextColor(...C.navy).setFont('helvetica', 'bold');
    doc.text(I.legal, 14, y);
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...C.text);
    [I.brand, I.contact, I.email, I.phone, I.addressLine1, I.addressLine2,
      `N° SIRET : ${I.siret}`, `Capital social : ${I.capital}`].forEach((line) => {
      y += 4.8;
      doc.text(line, 14, y);
    });
    const issuerBottom = y;

    // ---- Destinataire (droite) ----
    let ry = 54;
    doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(...C.navy);
    doc.text(effectiveRecipient.name, 196, ry, { align: 'right' });
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...C.text);
    if (effectiveRecipient.address) {
      doc.splitTextToSize(effectiveRecipient.address, 80).forEach((l) => {
        ry += 4.8; doc.text(l, 196, ry, { align: 'right' });
      });
    }
    if (effectiveRecipient.email) { ry += 4.8; doc.text(effectiveRecipient.email, 196, ry, { align: 'right' }); }
    if (effectiveRecipient.siret) { ry += 4.8; doc.text(`N° SIRET : ${effectiveRecipient.siret}`, 196, ry, { align: 'right' }); }

    // ---- Dates ----
    y = Math.max(issuerBottom, ry) + 9;
    doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(...C.navy);
    doc.text("Date d'émission", 14, y);
    doc.text(dateFr, 75, y);
    y += 6;
    doc.text("Date d'exigibilité du paiement", 14, y);
    doc.text(dateFr, 75, y);

    // ---- Tableau ----
    y += 8;
    const vat = parseFloat(vatRate) / 100;
    doc.setFillColor(...C.green);
    doc.rect(14, y, 182, 8, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(255, 255, 255);
    doc.text('#', 17, y + 5.3);
    doc.text('Désignation et description', 23, y + 5.3);
    doc.text('Unité', 116, y + 5.3, { align: 'center' });
    doc.text('Quantité', 138, y + 5.3, { align: 'right' });
    doc.text('Prix unitaire', 158, y + 5.3, { align: 'right' });
    doc.text('Montant HT', 177, y + 5.3, { align: 'right' });
    doc.text('Montant TTC', 196, y + 5.3, { align: 'right' });
    y += 8;

    validLines.forEach((line, i) => {
      if (y > 235) { doc.addPage(); y = 20; }
      const qty = parseFloat(line.qty) || 0;
      const price = parseFloat(line.price) || 0;
      const ht = qty * price;
      doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...C.green);
      doc.text(String(i + 1), 17, y + 6.5);
      doc.setTextColor(...C.navy);
      doc.text(doc.splitTextToSize(line.label, 78)[0], 23, y + 6.5);
      doc.setFont('helvetica', 'italic').setFontSize(6.5).setTextColor(...C.muted);
      doc.text('Prestation de service', 23, y + 10.3);
      doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...C.text);
      doc.text(line.unit || 'Heure', 116, y + 6.5, { align: 'center' });
      doc.text(String(qty), 138, y + 6.5, { align: 'right' });
      doc.text(fmtEUR(price), 158, y + 6.5, { align: 'right' });
      doc.text(fmtEUR(ht), 177, y + 6.5, { align: 'right' });
      doc.text(fmtEUR(ht * (1 + vat)), 196, y + 6.5, { align: 'right' });
      y += 13.5;
      doc.setDrawColor(...C.lightLine);
      doc.line(14, y, 196, y);
    });

    // ---- Deux colonnes : conditions (gauche) / totaux (droite) ----
    let ly = y + 12;
    doc.setFont('helvetica', 'bold').setFontSize(12.5).setTextColor(...C.navy);
    doc.text('Conditions de paiement', 14, ly);
    ly += 7;
    I.paymentTerms.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...C.navy);
      doc.splitTextToSize(label, 90).forEach((l) => { doc.text(l, 14, ly); ly += 4.4; });
      doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...C.text);
      doc.text(value, 14, ly + 0.4);
      ly += 6.6;
    });
    ly += 3;
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(...C.navy);
    doc.text("Relevé d'identité Bancaire", 14, ly);
    ly += 5.5;
    [['Banque', I.bank.name], ['IBAN', I.bank.iban], ['BIC', I.bank.bic]].forEach(([label, value]) => {
      doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...C.muted);
      doc.text(label, 14, ly);
      doc.setFont('helvetica', 'bold').setTextColor(...C.navy);
      doc.text(value, 32, ly);
      ly += 5.5;
    });
    if (notes.trim()) {
      ly += 3;
      doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...C.text);
      doc.splitTextToSize(notes.trim(), 90).forEach((l) => { doc.text(l, 14, ly); ly += 4.4; });
    }

    // Totaux à droite
    let ty = y + 8;
    const bar = (label, amount) => {
      doc.setFillColor(...C.green);
      doc.rect(112, ty, 84, 9, 'F');
      doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(255, 255, 255);
      doc.text(label, 116, ty + 6);
      doc.text(fmtEUR(amount), 192, ty + 6, { align: 'right' });
      ty += 9;
    };
    bar('Total HT', totals.ht);
    if (vat > 0) {
      ty += 3;
      doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...C.text);
      doc.text(`TVA (${vatRate} %)`, 116, ty + 4);
      doc.text(fmtEUR(totals.tva), 192, ty + 4, { align: 'right' });
      ty += 8;
      bar('Total TTC', totals.ttc);
    } else {
      ty += 6;
      doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...C.muted);
      doc.text(I.vatExemptMention, 112, ty);
    }

    // ---- Pied de page ----
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...C.muted);
    doc.text('1/1', 196, 288, { align: 'right' });

    return doc;
  };

  const reset = () => {
    setMode('b2c'); setClientSearch(''); setSelectedClientId(null);
    setRecipient({ name: '', address: '', email: '', siret: '' });
    setInvoiceDate(format(new Date(), 'yyyy-MM-dd'));
    setStatus('pending'); setVatRate('0'); setLines([emptyLine()]); setNotes('');
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const number = nextInvoiceNumber(invoices, new Date(invoiceDate + 'T00:00:00').getFullYear());
      const doc = buildPdf(number);
      const file = new File([doc.output('blob')], `${number}.pdf`, { type: 'application/pdf' });
      const { path } = await uploadFile(BUCKETS.invoices, file, 'manual');
      return Invoices.create({
        type: mode === 'b2b' ? 'b2b' : 'client',
        number,
        client_id: selectedClient?.id ?? null,
        amount: Math.round(totals.ttc * 100) / 100,
        date: invoiceDate,
        status,
        file_path: path,
        recipient_name: effectiveRecipient.name,
        recipient_address: effectiveRecipient.address || null,
        recipient_email: effectiveRecipient.email || null,
        recipient_siret: effectiveRecipient.siret || null,
        lines: validLines.map((l) => ({ label: l.label.trim(), unit: (l.unit || 'Heure').trim(), qty: parseFloat(l.qty), price: parseFloat(l.price) })),
        vat_rate: parseFloat(vatRate),
        notes: notes.trim() || null,
      });
    },
    onSuccess: (inv) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(`Facture ${inv.number} créée`);
      reset();
      onClose();
    },
    onError: (err) => toast.error('Erreur : ' + (err.message || 'inconnue')),
  });

  const updateLine = (i, field, value) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle facture</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Type de destinataire */}
          <div className="flex rounded-lg bg-slate-100 p-0.5 w-fit">
            {[
              { key: 'b2c', label: 'Particulier (B2C)', icon: User },
              { key: 'b2b', label: 'Entreprise (B2B)', icon: Building2 },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => { setMode(key); setSelectedClientId(null); setRecipient({ name: '', address: '', email: '', siret: '' }); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  mode === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          {/* Destinataire */}
          {mode === 'b2c' ? (
            <div className="space-y-2">
              <Label>Client</Label>
              {selectedClient ? (
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                  <div className="text-sm">
                    <p className="font-medium text-slate-900">{selectedClient.first_name} {selectedClient.last_name}</p>
                    <p className="text-xs text-slate-500">{selectedClient.email} · {selectedClient.address ? `${selectedClient.address}, ${selectedClient.zipcode} ${selectedClient.city}` : 'adresse non renseignée'}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedClientId(null)}>Changer</Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Input
                    placeholder="Rechercher un client (nom, email)..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100">
                    {filteredClients.slice(0, 8).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedClientId(c.id)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                      >
                        <span className="font-medium">{c.first_name} {c.last_name}</span>
                        <span className="text-xs text-slate-400 ml-2">{c.email}</span>
                      </button>
                    ))}
                    {filteredClients.length === 0 && <p className="px-3 py-2 text-sm text-slate-400">Aucun client trouvé</p>}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {b2bClients.length > 0 && (
                <div className="col-span-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-400">Pré-remplir :</span>
                  {b2bClients.slice(0, 6).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => prefillFromB2BClient(c)}
                      className={`text-xs border rounded-md px-2 py-1 transition-colors ${
                        selectedClientId === c.id
                          ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 hover:border-slate-400 text-slate-600'
                      }`}
                    >
                      {c.company_name || `${c.first_name} ${c.last_name}`}
                    </button>
                  ))}
                </div>
              )}
              <div className="space-y-1 col-span-2">
                <Label>Raison sociale *</Label>
                <Input value={recipient.name} onChange={(e) => setRecipient({ ...recipient, name: e.target.value })} placeholder="Ex : ACME SAS" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Adresse</Label>
                <Input value={recipient.address} onChange={(e) => setRecipient({ ...recipient, address: e.target.value })} placeholder="12 rue Exemple, 75001 Paris" />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={recipient.email} onChange={(e) => setRecipient({ ...recipient, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>SIRET</Label>
                <Input value={recipient.siret} onChange={(e) => setRecipient({ ...recipient, siret: e.target.value })} />
              </div>
            </div>
          )}

          {/* Paramètres */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>TVA</Label>
              <Select value={vatRate} onValueChange={setVatRate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VAT_RATES.map((r) => <SelectItem key={r} value={r}>{r} %</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Statut</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="paid">Payée</SelectItem>
                  <SelectItem value="draft">Brouillon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lignes */}
          <div className="space-y-2">
            <Label>Prestations</Label>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Désignation (ex : Ménage bureaux — juillet 2026)"
                    value={line.label}
                    onChange={(e) => updateLine(i, 'label', e.target.value)}
                  />
                  <Input
                    className="w-20"
                    placeholder="Unité"
                    value={line.unit}
                    onChange={(e) => updateLine(i, 'unit', e.target.value)}
                  />
                  <Input
                    className="w-16 text-center"
                    type="number" min="0" step="0.5" placeholder="Qté"
                    value={line.qty}
                    onChange={(e) => updateLine(i, 'qty', e.target.value)}
                  />
                  <Input
                    className="w-24 text-right"
                    type="number" min="0" step="0.01" placeholder="PU HT €"
                    value={line.price}
                    onChange={(e) => updateLine(i, 'price', e.target.value)}
                  />
                  <Button
                    type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-slate-400 hover:text-red-600"
                    onClick={() => setLines((prev) => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev)}
                    disabled={lines.length === 1}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={() => setLines((prev) => [...prev, emptyLine()])}>
              <Plus className="w-3 h-3 mr-1" /> Ajouter une ligne
            </Button>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label>Notes (affichées sur la facture)</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Conditions de paiement, mentions particulières..." />
          </div>

          {/* Totaux */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex items-center justify-end gap-6 text-sm">
            <span className="text-slate-500">Total HT : <strong className="text-slate-800">{totals.ht.toFixed(2)} €</strong></span>
            <span className="text-slate-500">TVA {vatRate} % : <strong className="text-slate-800">{totals.tva.toFixed(2)} €</strong></span>
            <span className="text-slate-900 font-bold text-base">TTC : {totals.ttc.toFixed(2)} €</span>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button" variant="outline"
            disabled={!canSubmit}
            onClick={() => buildPdf(nextInvoiceNumber(invoices, new Date(invoiceDate + 'T00:00:00').getFullYear())).output('dataurlnewwindow')}
          >
            <Eye className="w-4 h-4 mr-1" /> Aperçu PDF
          </Button>
          <Button
            type="button"
            className="bg-[#E95678] hover:bg-[#d44565] text-white"
            disabled={!canSubmit || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Créer la facture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
