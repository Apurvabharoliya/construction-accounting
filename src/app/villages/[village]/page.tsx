'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getVillageMaterials, getMaterialTransactions, addMaterialReceipt, recordMaterialUsage } from '@/lib/api/villages'
import { VILLAGES, MATERIALS, getContractorsForMaterial, hasOtherOption } from '@/lib/village-constants'
import type { VillageMaterialStock, MaterialTransaction } from '@/lib/village-constants'
import { formatDate, formatDateTime } from '@/lib/date'
import { ArrowLeft, Plus, MinusCircle, TrendingUp, TrendingDown, Package, Truck, Wrench, Clock, History, Search, X, Check } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import DatePicker from '@/components/ui/DatePicker'

const villageColors: Record<string, string> = {
  varnama: 'from-blue-500 to-blue-600',
  dharapura: 'from-emerald-500 to-emerald-600',
  dodhka: 'from-orange-500 to-orange-600',
  rayka: 'from-purple-500 to-purple-600',
  talsad: 'from-rose-500 to-rose-600',
}

const materialIcons: Record<string, React.ReactNode> = {
  'Bricks': <Package className="w-8 h-8" />,
  'Sand/Reti': <Truck className="w-8 h-8" />,
  'Kapchi': <Package className="w-8 h-8" />,
  'Cement': <Package className="w-8 h-8" />,
  'Steel': <TrendingUp className="w-8 h-8" />,
  'Door Frame': <Package className="w-8 h-8" />,
}

export default function VillageDetailPage() {
  const params = useParams()
  const router = useRouter()
  const villageParam = Array.isArray(params.village) ? params.village[0] : params.village
  const villageName = villageParam
    ? VILLAGES.find(v => v.toLowerCase() === villageParam.toLowerCase()) || villageParam
    : ''

  const [materials, setMaterials] = useState<VillageMaterialStock[]>([])
  const [transactions, setTransactions] = useState<MaterialTransaction[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [receiptDialog, setReceiptDialog] = useState(false)
  const [usageDialog, setUsageDialog] = useState(false)

  // Receipt form
  const [receiptMaterial, setReceiptMaterial] = useState(MATERIALS[0])
  const [receiptQty, setReceiptQty] = useState(0)
  const [receiptContractor, setReceiptContractor] = useState('')
  const [receiptOtherContractor, setReceiptOtherContractor] = useState('')
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split('T')[0])
  const [receiptNotes, setReceiptNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Usage form
  const [usageMaterial, setUsageMaterial] = useState(MATERIALS[0])
  const [usageQty, setUsageQty] = useState(0)
  const [usageDate, setUsageDate] = useState(new Date().toISOString().split('T')[0])
  const [usageNotes, setUsageNotes] = useState('')
  const [usageSubmitting, setUsageSubmitting] = useState(false)

  const isValidVillage = VILLAGES.some(v => v.toLowerCase() === villageName.toLowerCase())

  useEffect(() => {
    if (isValidVillage) loadData()
    else setLoading(false)
  }, [villageName])

  async function loadData() {
    setLoading(true)
    try {
      const [materialsData, txnData] = await Promise.all([
        getVillageMaterials(villageName),
        getMaterialTransactions(villageName, 50)
      ])
      setMaterials(materialsData)
      setTransactions(txnData)
    } catch (error) {
      console.error('Error loading village data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddReceipt(e: React.FormEvent) {
    e.preventDefault()
    if (!receiptQty || receiptQty <= 0) {
      toast.error('Enter a valid quantity')
      return
    }

    setSubmitting(true)
    try {
      const contractorName = receiptContractor === '__other__' ? receiptOtherContractor : receiptContractor
      await addMaterialReceipt({
        village_name: villageName,
        material_name: receiptMaterial,
        quantity: receiptQty,
        contractor_name: contractorName || undefined,
        notes: receiptNotes || undefined,
        transaction_date: receiptDate
      })
      toast.success(`Added ${receiptQty} ${receiptMaterial} to ${villageName}`)
      setReceiptDialog(false)
      resetReceiptForm()
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add receipt')
    } finally {
      setSubmitting(false)
    }
  }

  function resetReceiptForm() {
    setReceiptMaterial(MATERIALS[0])
    setReceiptQty(0)
    setReceiptContractor('')
    setReceiptOtherContractor('')
    setReceiptDate(new Date().toISOString().split('T')[0])
    setReceiptNotes('')
  }

  async function handleRecordUsage(e: React.FormEvent) {
    e.preventDefault()
    if (!usageQty || usageQty <= 0) {
      toast.error('Enter a valid quantity')
      return
    }

    setUsageSubmitting(true)
    try {
      await recordMaterialUsage({
        village_name: villageName,
        material_name: usageMaterial,
        quantity: usageQty,
        notes: usageNotes || undefined,
        transaction_date: usageDate
      })
      toast.success(`Recorded ${usageQty} ${usageMaterial} usage at ${villageName}`)
      setUsageDialog(false)
      resetUsageForm()
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Failed to record usage')
    } finally {
      setUsageSubmitting(false)
    }
  }

  function resetUsageForm() {
    setUsageMaterial(MATERIALS[0])
    setUsageQty(0)
    setUsageDate(new Date().toISOString().split('T')[0])
    setUsageNotes('')
  }

  if (!isValidVillage) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Village not found</p>
        <Link href="/villages" className="text-blue-600 hover:underline font-medium text-sm mt-2 inline-block">← Back to villages</Link>
      </div>
    )
  }

  const gradient = villageColors[villageName.toLowerCase()] || 'from-gray-500 to-gray-600'

  // Calculate totals
  const totalReceived = materials.reduce((s, m) => s + m.quantity_received, 0)
  const totalRemaining = materials.reduce((s, m) => s + m.quantity_remaining, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className={`bg-gradient-to-r ${gradient} p-4 sm:p-6 text-white`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => router.push('/villages')} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold truncate">{villageName}</h1>
                <p className="text-white/80 text-sm mt-0.5">Construction Material Inventory</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setReceiptDialog(true)}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium flex-1 sm:flex-none"
              >
                <Plus className="w-4 h-4" /> Add Stock
              </button>
              <button
                onClick={() => setUsageDialog(true)}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm font-medium flex-1 sm:flex-none"
              >
                <MinusCircle className="w-4 h-4" /> Record Usage
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 divide-x divide-gray-100">
          <div className="p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Received</p>
            <p className="text-xl font-bold text-green-600 mt-1">{totalReceived.toFixed(0)}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Remaining</p>
            <p className="text-xl font-bold text-blue-600 mt-1">{totalRemaining.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Material Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold">Material Stock</h2>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full responsive-table-card">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-4 text-left text-sm font-medium text-gray-500">Material</th>
                  <th className="p-4 text-right text-sm font-medium text-gray-500">Received</th>
                  <th className="p-4 text-right text-sm font-medium text-gray-500">Remaining</th>
                  <th className="p-4 text-right text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {MATERIALS.map((material) => {
                  const stock = materials.find(m => m.material_name === material)
                  const received = stock?.quantity_received || 0
                  const remaining = stock?.quantity_remaining || 0

                  return (
                    <tr key={material} className="border-t hover:bg-gray-50 transition-colors">
                      <td className="p-4" data-label="Material">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            remaining > 0 ? 'bg-blue-50' : 'bg-gray-50'
                          }`}>
                            {materialIcons[material] || <Package className="w-5 h-5 text-gray-500" />}
                          </div>
                          <span className="font-medium text-gray-900">{material}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right" data-label="Received">
                        <span className="font-semibold text-green-600">{received.toFixed(0)}</span>
                      </td>
                      <td className="p-4 text-right" data-label="Remaining">
                        <span className="font-bold text-lg">{remaining.toFixed(0)}</span>
                      </td>
                      <td className="p-4 text-right" data-label="">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setReceiptMaterial(material as any)
                              setReceiptDialog(true)
                            }}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Add Stock"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setUsageMaterial(material as any)
                              setUsageDialog(true)
                            }}
                            className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                            title="Record Usage"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold">Material Activity Log</h2>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No activity recorded yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((txn) => (
              <div key={txn.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${
                    txn.transaction_type === 'receipt' ? 'bg-green-50' : 'bg-orange-50'
                  }`}>
                    {txn.transaction_type === 'receipt'
                      ? <TrendingDown className="w-4 h-4 text-green-600" />
                      : <TrendingUp className="w-4 h-4 text-orange-600" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {txn.transaction_type === 'receipt' ? 'Received' : 'Used'} {txn.material_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(txn.transaction_date)}
                      {txn.contractor_name && ` • ${txn.contractor_name}`}
                      {txn.notes && ` • ${txn.notes}`}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${
                  txn.transaction_type === 'receipt' ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {txn.transaction_type === 'receipt' ? '+' : '-'}{txn.quantity}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Stock Dialog */}
      <Dialog open={receiptDialog} onOpenChange={(open) => { if (!open) { setReceiptDialog(false); resetReceiptForm() }}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-green-600" />
              Add Stock — {villageName}
            </DialogTitle>
            <DialogDescription>Record new material received at this site</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddReceipt} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Material *</Label>
              <select
                value={receiptMaterial}
                onChange={(e) => {
                  setReceiptMaterial(e.target.value as any)
                  setReceiptContractor('')
                  setReceiptOtherContractor('')
                }}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {MATERIALS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Quantity *</Label>
              <Input
                type="number"
                step="0.001"
                min="0.001"
                value={receiptQty || ''}
                onChange={(e) => setReceiptQty(Number(e.target.value))}
                placeholder="Enter quantity"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Contractor</Label>
              <div>
                {receiptContractor === '__other__' ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={receiptOtherContractor}
                      onChange={(e) => setReceiptOtherContractor(e.target.value)}
                      placeholder="Enter contractor name"
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setReceiptContractor('')}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {getContractorsForMaterial(receiptMaterial).map((c) => {
                      if (c === '__other__') {
                        return (
                          <button
                            key="other"
                            type="button"
                            onClick={() => setReceiptContractor('__other__')}
                            className="px-3 py-1.5 text-sm border border-dashed border-gray-300 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-colors"
                          >
                            + Other
                          </button>
                        )
                      }
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setReceiptContractor(c)}
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                            receiptContractor === c
                              ? 'bg-blue-50 border-blue-300 text-blue-700'
                              : 'border-gray-200 text-gray-600 hover:border-blue-200 hover:text-blue-600'
                          }`}
                        >
                          {receiptContractor === c && <Check className="w-3 h-3 inline mr-1" />}
                          {c}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Date *</Label>
              <DatePicker value={receiptDate} onChange={setReceiptDate} />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input
                value={receiptNotes}
                onChange={(e) => setReceiptNotes(e.target.value)}
                placeholder="Optional notes"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setReceiptDialog(false); resetReceiptForm() }}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Adding...' : `Add ${receiptQty || 0} ${receiptMaterial}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Usage Dialog */}
      <Dialog open={usageDialog} onOpenChange={(open) => { if (!open) { setUsageDialog(false); resetUsageForm() }}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MinusCircle className="w-5 h-5 text-orange-600" />
              Record Usage — {villageName}
            </DialogTitle>
            <DialogDescription>Record material consumed at this site</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordUsage} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Material *</Label>
              <select
                value={usageMaterial}
                onChange={(e) => setUsageMaterial(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {MATERIALS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Quantity Used *</Label>
              <Input
                type="number"
                step="0.001"
                min="0.001"
                value={usageQty || ''}
                onChange={(e) => setUsageQty(Number(e.target.value))}
                placeholder="Enter quantity"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Date *</Label>
              <DatePicker value={usageDate} onChange={setUsageDate} />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input
                value={usageNotes}
                onChange={(e) => setUsageNotes(e.target.value)}
                placeholder="Purpose of usage, location, etc."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setUsageDialog(false); resetUsageForm() }}>
                Cancel
              </Button>
              <Button type="submit" disabled={usageSubmitting} className="bg-orange-600 hover:bg-orange-700">
                {usageSubmitting ? 'Recording...' : `Record ${usageQty || 0} ${usageMaterial} Usage`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
