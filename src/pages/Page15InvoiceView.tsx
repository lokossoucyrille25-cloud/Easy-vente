import React, { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDateTime } from '../lib/utils'
import type { Invoice, Sale, SaleItem } from '../types/database'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { 
  ArrowLeft, 
  Printer, 
  Store, 
  MessageCircle,
  Download,
  CheckCircle2,
  X
} from 'lucide-react'

interface Page15InvoiceViewProps {
  invoiceId: string
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export const Page15InvoiceView: React.FC<Page15InvoiceViewProps> = ({ invoiceId, onNavigate }) => {
  const { shop } = useAuth()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [sale, setSale] = useState<Sale | null>(null)
  const [items, setItems] = useState<SaleItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!invoiceId || !shop?.id) return
    setLoading(true)

    const fetchInvoiceDetails = async () => {
      try {
        // 1. Facture
        const { data: invData } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', invoiceId)
          .eq('shop_id', shop.id)
          .single()

        if (!invData) return
        setInvoice(invData as Invoice)

        // 2. Vente associée + Client
        const { data: saleData } = await supabase
          .from('sales')
          .select(`
            *,
            customer:customers (id, name, phone, address)
          `)
          .eq('id', invData.sale_id)
          .single()

        if (saleData) setSale(saleData as unknown as Sale)

        // 3. Articles vendus
        const { data: itemsData } = await supabase
          .from('sale_items')
          .select(`
            *,
            product:products (name)
          `)
          .eq('sale_id', invData.sale_id)

        if (itemsData) setItems(itemsData as unknown as SaleItem[])
      } catch (err) {
        console.error('Erreur chargement facture:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchInvoiceDetails()
  }, [invoiceId, shop?.id])

  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [sharingWhatsapp, setSharingWhatsapp] = useState(false)
  const [whatsappInfoModal, setWhatsappInfoModal] = useState<string | null>(null)

  // Impression native / PDF du navigateur
  const handlePrint = () => {
    window.print()
  }

  // Fonction centrale pour générer le document PDF à partir du reçu
  const generatePdfDoc = async (): Promise<{ pdf: jsPDF; filename: string; blob: Blob } | null> => {
    if (!invoice) return null
    const receiptElement = document.getElementById('invoice-receipt-card')
    if (!receiptElement) return null

    const canvas = await html2canvas(receiptElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()

    // Marges de 15mm pour un rendu élégant et centré
    const margin = 15
    const imgWidth = pageWidth - margin * 2
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    if (imgHeight <= pageHeight - margin * 2) {
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight)
    } else {
      let heightLeft = imgHeight
      let position = margin

      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight)
      heightLeft -= (pageHeight - margin * 2)

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight)
        heightLeft -= (pageHeight - margin * 2)
      }
    }

    const filename = `Facture_${invoice.invoice_number}.pdf`
    const blob = pdf.output('blob')
    return { pdf, filename, blob }
  }

  // Partage WhatsApp du reçu de vente avec le fichier PDF
  const handleShareWhatsApp = async () => {
    if (!sale || !invoice || !shop) return

    setSharingWhatsapp(true)
    setWhatsappInfoModal(null)

    try {
      const generated = await generatePdfDoc()
      if (!generated) {
        alert("Impossible de générer le document PDF pour le partage.")
        return
      }

      const { pdf, filename, blob } = generated
      const file = new File([blob], filename, { type: 'application/pdf' })

      let text = `*FACTURE / REÇU : ${invoice.invoice_number}*\n`
      text += `*Boutique :* ${shop.name}\n`
      if (shop.phone) text += `*Tél :* ${shop.phone}\n`
      text += `*Date :* ${formatDateTime(invoice.invoice_date)}\n`
      text += `*Client :* ${sale.customer?.name || 'Client comptoir'}\n`
      text += `------------------------\n`
      items.forEach((item) => {
        text += `• ${item.product?.name || 'Article'} (x${item.quantity}) : ${formatCurrency(item.total_price, shop.currency)}\n`
      })
      text += `------------------------\n`
      if (sale.discount > 0) text += `*Remise :* -${formatCurrency(sale.discount, shop.currency)}\n`
      if (sale.vat_amount > 0) text += `*TVA :* +${formatCurrency(sale.vat_amount, shop.currency)}\n`
      text += `*TOTAL :* ${formatCurrency(sale.total, shop.currency)}\n`
      text += `*Payé :* ${formatCurrency(sale.paid_amount, shop.currency)}\n`
      if (sale.remaining_amount > 0) {
        text += `*RESTE À PAYER :* ${formatCurrency(sale.remaining_amount, shop.currency)}\n`
      }
      text += `------------------------\n`
      text += `📎 Veuillez trouver ci-joint votre reçu au format PDF.\n`
      text += `Merci pour votre fidélité !`

      // 1. Partage direct du fichier PDF via Web Share API (smartphones Android, iOS, PWA)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Facture ${invoice.invoice_number}`,
          text: text,
        })
        return
      }

      // 2. Repli pour les ordinateurs / navigateurs sans support direct du partage de fichier :
      // On télécharge le PDF automatiquement sur la machine
      pdf.save(filename)

      // Et on ouvre WhatsApp Web
      const cleanPhone = sale.customer?.phone?.replace(/\D/g, '') || ''
      const waUrl = cleanPhone 
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
        : `https://wa.me/?text=${encodeURIComponent(text)}`

      window.open(waUrl, '_blank')
      setWhatsappInfoModal(`Le fichier PDF (${filename}) a été téléchargé sur votre appareil. La discussion WhatsApp est ouverte : vous pouvez maintenant y glisser le fichier PDF.`)
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Erreur partage WhatsApp PDF:', err)
        alert("Une erreur est survenue lors de la préparation du PDF pour WhatsApp.")
      }
    } finally {
      setSharingWhatsapp(false)
    }
  }

  // Téléchargement direct du reçu / facture au format PDF
  const handleDownloadPDF = async () => {
    try {
      setDownloadingPdf(true)
      const generated = await generatePdfDoc()
      if (generated) {
        generated.pdf.save(generated.filename)
      }
    } catch (err) {
      console.error('Erreur génération PDF:', err)
    } finally {
      setDownloadingPdf(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-20">
        <span className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  if (!invoice || !sale) {
    return (
      <div className="text-center py-12 space-y-4 max-w-md mx-auto">
        <p className="text-sm text-slate-500">Facture introuvable.</p>
        <button
          type="button"
          onClick={() => onNavigate('invoices-list')}
          className="py-2.5 px-4 bg-emerald-600 text-white rounded-xl text-xs font-bold"
        >
          Retour aux factures
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto w-full">
      {/* En-tête de navigation & Actions */}
      <div className="flex items-center justify-between no-print">
        <button
          type="button"
          onClick={() => onNavigate('invoices-list')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 p-2 -ml-2 rounded-xl transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Toutes les factures</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            disabled={sharingWhatsapp}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-50 text-xs font-bold"
            title="Partager le PDF sur WhatsApp"
            aria-label="Partager le PDF sur WhatsApp"
          >
            {sharingWhatsapp ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
            ) : (
              <MessageCircle className="w-4 h-4" />
            )}
            <span>WhatsApp PDF</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPDF}
            disabled={downloadingPdf}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white transition cursor-pointer shadow disabled:opacity-50 text-xs font-bold"
            title="Télécharger le PDF"
            aria-label="Télécharger le PDF"
          >
            {downloadingPdf ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>PDF</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="p-2.5 rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 transition cursor-pointer shadow"
            title="Imprimer"
            aria-label="Imprimer"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Message d'information WhatsApp */}
      {whatsappInfoModal && (
        <div className="flex items-start justify-between gap-3 p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-800 dark:text-emerald-200 shadow-sm no-print">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{whatsappInfoModal}</span>
          </div>
          <button
            type="button"
            onClick={() => setWhatsappInfoModal(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:opacity-75 font-bold cursor-pointer p-0.5"
            aria-label="Fermer la notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Facture Papier Format Ticket / Mobile A4 */}
      <div 
        id="invoice-receipt-card"
        className="bg-white text-slate-900 rounded-3xl p-6 sm:p-8 shadow-md border border-slate-200 space-y-6 print:shadow-none print:border-none print:p-0"
      >
        {/* Entête Boutique avec Logo */}
        <div className="text-center border-b border-slate-200 pb-5">
          {shop?.logo_url ? (
            <div className="flex justify-center mb-2.5">
              <img
                src={shop.logo_url}
                alt={shop.name}
                className="w-16 h-16 object-contain rounded-2xl border border-slate-100 shadow-xs p-1 bg-white"
              />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-700 text-white mb-2">
              <Store className="w-6 h-6" />
            </div>
          )}
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
            {shop?.name}
          </h2>
          {shop?.address && (
            <p className="text-xs text-slate-500 mt-0.5">{shop.address}</p>
          )}
          {shop?.phone && (
            <p className="text-xs text-slate-500">Tél: {shop.phone}</p>
          )}
        </div>

        {/* Coordonnées Facture & Client */}
        <div className="grid grid-cols-2 gap-3 text-xs border-b border-slate-200 pb-5">
          <div>
            <p className="font-bold uppercase tracking-wider text-slate-400">Facture N°</p>
            <p className="font-black text-sm text-slate-900">{invoice.invoice_number}</p>
            <p className="text-slate-500 mt-1">{formatDateTime(invoice.invoice_date)}</p>
            <div className="mt-2">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  invoice.status === 'cancelled'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {invoice.status === 'cancelled' ? 'ANNULÉE' : 'RÈGLEMENT VALIDÉ'}
              </span>
            </div>
          </div>

          <div className="text-right">
            <p className="font-bold uppercase tracking-wider text-slate-400">Client</p>
            <p className="font-bold text-sm text-slate-900">
              {sale.customer?.name || 'Client comptoir'}
            </p>
            {sale.customer?.phone && (
              <p className="text-slate-500 mt-0.5">Tél: {sale.customer.phone}</p>
            )}
            <p className="text-[11px] text-slate-400 mt-2 uppercase">
              Mode: {sale.payment_method}
            </p>
          </div>
        </div>

        {/* Tableau des Articles */}
        <div className="space-y-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                <th className="text-left py-2">Désignation</th>
                <th className="text-center py-2">Qté</th>
                <th className="text-right py-2">P.U.</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="py-2">
                  <td className="py-2.5 font-medium text-slate-800">
                    {item.product?.name || 'Article'}
                  </td>
                  <td className="py-2.5 text-center text-slate-600">{item.quantity}</td>
                  <td className="py-2.5 text-right text-slate-600">
                    {formatCurrency(item.unit_price, shop?.currency)}
                  </td>
                  <td className="py-2.5 text-right font-bold text-slate-900">
                    {formatCurrency(item.total_price, shop?.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Synthèse des Totaux */}
        <div className="border-t border-slate-200 pt-4 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Sous-total</span>
            <span>{formatCurrency(sale.subtotal, shop?.currency)}</span>
          </div>

          {sale.discount > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Remise commerciale</span>
              <span>-{formatCurrency(sale.discount, shop?.currency)}</span>
            </div>
          )}

          {sale.vat_amount > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>TVA</span>
              <span>+{formatCurrency(sale.vat_amount, shop?.currency)}</span>
            </div>
          )}

          <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-200 pt-2">
            <span>Total Facture</span>
            <span className="text-emerald-700 text-lg">
              {formatCurrency(sale.total, shop?.currency)}
            </span>
          </div>

          <div className="flex justify-between text-slate-600 pt-1">
            <span>Montant perçu</span>
            <span>{formatCurrency(sale.paid_amount, shop?.currency)}</span>
          </div>

          {sale.remaining_amount > 0 && (
            <div className="flex justify-between text-xs font-bold text-rose-700 bg-rose-50 p-2 rounded-xl mt-1">
              <span>Reste à payer (Dette)</span>
              <span>{formatCurrency(sale.remaining_amount, shop?.currency)}</span>
            </div>
          )}
        </div>

        {/* Pied de facture */}
        <div className="text-center pt-4 border-t border-dashed border-slate-200 text-[11px] text-slate-400">
          <p>Merci pour votre confiance !</p>
          <p className="text-[10px] text-slate-300 mt-1">Émis par Easy vente</p>
        </div>
      </div>
    </div>
  )
}
