'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import DatePicker from '@/components/ui/DatePicker'
import { Label } from '@/components/ui/label'
import { formatCurrency, PAYMENT_MODES } from '@/lib/gst'
import { recordInvoicePayment } from '@/lib/api/ledger'
import { Banknote, FileText, Loader2, CheckCircle2, ArrowUp } from 'lucide-react'
import type { InvoiceSummary } from '@/lib/api/ledger'

interface RecordPaymentDialogProps {
  invoice: InvoiceSummary
  partyName: string
  partyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface PaymentResult {
  invoice_number: string
  newStatus: string
  newBalanceDue: number
}

export default function RecordPaymentDialog({
  invoice,
  partyName,
  partyId,
  open,
  onOpenChange,
  onSuccess
}: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState<number>(invoice.balance_due)
  const [paymentMode, setPaymentMode] = useState<string>(invoice.payment_mode || '')
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)
  const [paidAmount, setPaidAmount] = useState<number>(0)

  // Reset form when dialog opens
  function handleOpenChange(open: boolean) {
    if (open) {
      setAmount(invoice.balance_due)
      setPaymentMode(invoice.payment_mode || '')
      setPaymentDate(new Date().toISOString().split('T')[0])
      setError(null)
      setPaymentResult(null)
      setPaidAmount(0)
    }
    onOpenChange(open)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const paymentAmount = Number(amount)
    if (!paymentAmount || paymentAmount <= 0) {
      setError('Enter a valid payment amount')
      return
    }
    if (paymentAmount > invoice.balance_due) {
      setError(`Amount cannot exceed pending balance of ${formatCurrency(invoice.balance_due)}`)
      return
    }
    if (!paymentDate) {
      setError('Select a payment date')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await recordInvoicePayment(invoice.id, invoice.type, {
        amount: paymentAmount,
        payment_mode: paymentMode || undefined,
        payment_date: paymentDate
      }, partyId)

      setPaidAmount(paymentAmount)
      setPaymentResult(result)
      toast.success(`Payment of ${formatCurrency(paymentAmount)} recorded for ${result.invoice_number}`)
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Failed to record payment')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleClose() {
    onOpenChange(false)
    // Reset result after dialog closes
    setTimeout(() => setPaymentResult(null), 200)
  }

  const isPurchase = invoice.type === 'purchase'
  const isFullyPaid = paymentResult?.newStatus === 'paid'

  // --- SUCCESS STATE ---
  if (paymentResult) {
    return (
      <Dialog open={open} onOpenChange={(open) => { if (!open) handleClose() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Payment Recorded
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Success banner */}
            <div className={`rounded-xl p-4 text-center ${
              isFullyPaid
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200'
                : 'bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200'
            }`}>
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 ${
                isFullyPaid ? 'bg-green-100' : 'bg-blue-100'
              }`}>
                <CheckCircle2 className={`w-6 h-6 ${isFullyPaid ? 'text-green-600' : 'text-blue-600'}`} />
              </div>
              <p className={`text-lg font-bold ${isFullyPaid ? 'text-green-700' : 'text-blue-700'}`}>
                {formatCurrency(paidAmount)} {isPurchase ? 'Paid' : 'Received'}!
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {isFullyPaid 
                  ? `${paymentResult.invoice_number} is now fully settled`
                  : `Partial payment for ${paymentResult.invoice_number}`
                }
              </p>
            </div>

            {/* Updated amounts breakdown */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Updated Balance</p>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Invoice</span>
                <span className="font-semibold text-gray-900">{paymentResult.invoice_number}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Party</span>
                <span className="font-semibold text-gray-900">{partyName}</span>
              </div>

              <div className="border-t border-gray-200 pt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Total Amount</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(invoice.total_amount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <ArrowUp className="w-3.5 h-3.5 text-green-500" />
                    <span>Previously Paid</span>
                  </div>
                  <span className="font-semibold text-green-600">{formatCurrency(invoice.amount_paid)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-green-600">
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span className="font-medium">Just {isPurchase ? 'Paid' : 'Received'}</span>
                  </div>
                  <span className="font-bold text-green-700 text-base">{formatCurrency(paidAmount)}</span>
                </div>

                <div className="border-t border-gray-200 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      {isFullyPaid ? 'Status' : 'Remaining Balance'}
                    </span>
                    {isFullyPaid ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 ring-1 ring-green-600/20">
                        <CheckCircle2 className="w-3 h-3" /> Fully Paid
                      </span>
                    ) : (
                      <span className="text-base font-bold text-orange-600">
                        {formatCurrency(paymentResult.newBalanceDue)}
                      </span>
                    )}
                  </div>
                  {!isFullyPaid && (
                    <p className="text-xs text-gray-400 mt-1 text-right">
                      {((paidAmount / invoice.total_amount) * 100).toFixed(0)}% of invoice paid so far
                    </p>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {!isFullyPaid && (
                <div className="pt-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all duration-700"
                        style={{
                          width: `${Math.min(((invoice.amount_paid + paidAmount) / invoice.total_amount) * 100, 100)}%`
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-500 min-w-[36px] text-right">
                      {Math.round(((invoice.amount_paid + paidAmount) / invoice.total_amount) * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <DialogFooter className="!mt-4">
              <Button onClick={handleClose} className="w-full">
                {isFullyPaid ? 'Done' : 'Close'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // --- FORM STATE ---
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Banknote className="w-5 h-5 text-green-600" />
            Record {isPurchase ? 'Payment' : 'Receipt'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invoice Info */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 border border-gray-100">
            <div className="flex items-center gap-1.5 text-sm">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-gray-900">{invoice.invoice_number}</span>
              <span className="text-gray-400 mx-1">•</span>
              <span className="text-gray-600">{partyName}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-200">
              <span>Total: <span className="font-semibold text-gray-700">{formatCurrency(invoice.total_amount)}</span></span>
              <span>Paid: <span className="font-semibold text-green-600">{formatCurrency(invoice.amount_paid)}</span></span>
              <span>Pending: <span className="font-semibold text-orange-600">{formatCurrency(invoice.balance_due)}</span></span>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">Payment Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={invoice.balance_due}
              value={amount}
              onChange={(e) => {
                setAmount(Number(e.target.value))
                setError(null)
              }}
              placeholder="Enter amount"
              className="text-lg font-semibold h-10"
              required
            />
          </div>

          {/* Quick amount buttons */}
          {invoice.balance_due > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setAmount(invoice.balance_due)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  amount === invoice.balance_due
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Full ({formatCurrency(invoice.balance_due)})
              </button>
              {invoice.balance_due > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(Math.round(invoice.balance_due / 2 * 100) / 100)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    amount === Math.round(invoice.balance_due / 2 * 100) / 100
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Half ({formatCurrency(Math.round(invoice.balance_due / 2 * 100) / 100)})
                </button>
              )}
            </div>
          )}

          {/* Payment Mode & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="paymentMode">Payment Mode</Label>
              <select
                id="paymentMode"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="">Select</option>
                {PAYMENT_MODES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paymentDate">Payment Date</Label>
              <DatePicker
                value={paymentDate}
                onChange={setPaymentDate}
                required
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          {/* Actions */}
          <DialogFooter className="!mt-6">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Banknote className="w-4 h-4" />
                  Record {isPurchase ? 'Payment' : 'Receipt'}
                </span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
