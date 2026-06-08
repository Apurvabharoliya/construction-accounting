import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/gst'
import { formatDate } from '@/lib/date'

// =============================================
// EXCEL EXPORT (using SheetJS/xlsx)
// =============================================

export async function exportToExcel(data: any[][], headers: string[], filename: string) {
  try {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
    
    // Auto-size columns
    const colWidths = headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...data.map(row => String(row[i] || '').length)
      )
      return { wch: Math.min(maxLen + 2, 50) }
    })
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    XLSX.writeFile(wb, `${filename}.xlsx`)
  } catch (error) {
    console.error('Excel export error:', error)
    throw new Error('Failed to export Excel')
  }
}

// =============================================
// PDF EXPORT (using jsPDF)
// =============================================

export async function exportToPDF(
  title: string,
  headers: string[],
  data: any[][],
  filename: string,
  options?: { subtitle?: string }
) {
  try {
    const { default: jsPDF } = await import('jspdf')
    await import('jspdf-autotable')
    
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    
    // Title
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(title, 14, 20)
    
    // Subtitle
    if (options?.subtitle) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(options.subtitle, 14, 28)
    }
    
    // Date
    doc.setFontSize(8)
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, options?.subtitle ? 34 : 28)
    
    // Table
    const startY = options?.subtitle ? 38 : 32
    
    ;(doc as any).autoTable({
      head: [headers],
      body: data,
      startY,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      margin: { top: 30 },
    })
    
    doc.save(`${filename}.pdf`)
  } catch (error) {
    console.error('PDF export error:', error)
    throw new Error('Failed to export PDF')
  }
}

// =============================================
// REPORT DATA FETCHERS
// =============================================

export async function getOutstandingExportData() {
  const { data: purchases } = await supabase
    .from('purchases')
    .select('supplier_id, balance_due, purchase_number, supplier:parties!supplier_id(name)')
    .gt('balance_due', 0)

  const { data: sales } = await supabase
    .from('sales')
    .select('client_id, balance_due, sale_number, client:parties!client_id(name)')
    .gt('balance_due', 0)

  const rows: any[][] = []
  purchases?.forEach((p: any) => {
    rows.push([p.supplier?.name || 'N/A', p.purchase_number, formatCurrency(Number(p.balance_due)), '-', 'Payable'])
  })
  sales?.forEach((s: any) => {
    rows.push([s.client?.name || 'N/A', s.sale_number, '-', formatCurrency(Number(s.balance_due)), 'Receivable'])
  })

  return rows
}

export async function getDailyExportData(date: string) {
  const { data: sales } = await supabase
    .from('sales')
    .select('sale_number, client:parties!client_id(name), total_amount, amount_received')
    .eq('invoice_date', date)

  const { data: purchases } = await supabase
    .from('purchases')
    .select('purchase_number, supplier:parties!supplier_id(name), total_amount, amount_paid')
    .eq('invoice_date', date)

  const rows: any[][] = []
  sales?.forEach((s: any) => {
    rows.push([formatDate(date), s.sale_number, s.client?.name || 'N/A', 'Sale', formatCurrency(Number(s.total_amount)), formatCurrency(Number(s.amount_received))])
  })
  purchases?.forEach((p: any) => {
    rows.push([formatDate(date), p.purchase_number, p.supplier?.name || 'N/A', 'Purchase', formatCurrency(Number(p.total_amount)), formatCurrency(Number(p.amount_paid))])
  })

  return rows
}

export async function getGstExportData(startDate: string, endDate: string) {
  const { data: sales } = await supabase
    .from('sales')
    .select('sale_number, client:parties!client_id(name), total_amount, cgst_amount, sgst_amount, igst_amount')
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate)

  const { data: purchases } = await supabase
    .from('purchases')
    .select('purchase_number, supplier:parties!supplier_id(name), total_amount, cgst_amount, sgst_amount, igst_amount')
    .gte('invoice_date', startDate)
    .lte('invoice_date', endDate)

  const rows: any[][] = []
  sales?.forEach((s: any) => {
    rows.push([s.sale_number, s.client?.name || 'N/A', 'Sale', formatCurrency(Number(s.total_amount)), formatCurrency(Number(s.cgst_amount)), formatCurrency(Number(s.sgst_amount)), formatCurrency(Number(s.igst_amount))])
  })
  purchases?.forEach((p: any) => {
    rows.push([p.purchase_number, p.supplier?.name || 'N/A', 'Purchase', formatCurrency(Number(p.total_amount)), formatCurrency(Number(p.cgst_amount)), formatCurrency(Number(p.sgst_amount)), formatCurrency(Number(p.igst_amount))])
  })

  return rows
}
