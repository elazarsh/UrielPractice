import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { billingApi, BillingCharge } from '../../api/billing'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'

const VAT_RATE = 0.17

function formatCurrency(n: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(n)
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('he-IL')
}
function isOverdue(charge: BillingCharge) {
  return !charge.isPaid && new Date(charge.dueDate) < new Date()
}

export default function BillingPage() {
  const qc = useQueryClient()
  const [filterPaid, setFilterPaid] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [showNewCharge, setShowNewCharge] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [newCharge, setNewCharge] = useState({ description: '', amount: '', chargeDate: '', dueDate: '', clientId: '', notes: '' })
  const [payForm, setPayForm] = useState({ amount: '', method: 'bank_transfer', reference: '', notes: '' })

  const params = filterPaid === 'all' ? {} : { isPaid: filterPaid === 'paid' ? 'true' : 'false' }
  const { data, isLoading } = useQuery({
    queryKey: ['billing', filterPaid],
    queryFn: () => billingApi.list(params),
  })
  const { data: summary } = useQuery({ queryKey: ['billing-summary'], queryFn: billingApi.summary })
  const { data: clients } = useQuery({
    queryKey: ['clients-for-billing'],
    queryFn: () => fetch('/api/clients?limit=200', { credentials: 'include' }).then(r => r.json()).then((r: { data: { id: string; name: string }[] }) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => {
      const amount = parseFloat(newCharge.amount)
      return billingApi.createCharge(newCharge.clientId, {
        description: newCharge.description,
        amount,
        chargeDate: new Date(newCharge.chargeDate).toISOString(),
        dueDate: new Date(newCharge.dueDate).toISOString(),
        notes: newCharge.notes || undefined,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing'] })
      qc.invalidateQueries({ queryKey: ['billing-summary'] })
      setShowNewCharge(false)
      setNewCharge({ description: '', amount: '', chargeDate: '', dueDate: '', clientId: '', notes: '' })
    },
  })

  const payMutation = useMutation({
    mutationFn: (chargeId: string) => billingApi.recordPayment(chargeId, {
      amount: parseFloat(payForm.amount),
      method: payForm.method || undefined,
      reference: payForm.reference || undefined,
      notes: payForm.notes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['billing'] })
      qc.invalidateQueries({ queryKey: ['billing-summary'] })
      setPayingId(null)
      setPayForm({ amount: '', method: 'bank_transfer', reference: '', notes: '' })
    },
  })

  const charges = data?.data ?? []

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">חיוב וגביה</h1>
        <button
          onClick={() => setShowNewCharge(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + חיוב חדש
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="text-center">
            <p className="text-xs text-gray-500 mb-1">סה"כ חויב</p>
            <p className="text-xl font-bold text-gray-800">{formatCurrency(summary.totalCharged)}</p>
          </Card>
          <Card className="text-center">
            <p className="text-xs text-gray-500 mb-1">שולם</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(summary.totalPaid)}</p>
          </Card>
          <Card className="text-center">
            <p className="text-xs text-gray-500 mb-1">יתרה לגביה</p>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(summary.totalUnpaid)}</p>
          </Card>
          <Card className="text-center">
            <p className="text-xs text-gray-500 mb-1">פגי תוקף</p>
            <p className="text-xl font-bold text-red-600">{summary.overdueCount}</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'unpaid', 'paid'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterPaid(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              filterPaid === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
            }`}
          >
            {f === 'all' ? 'הכל' : f === 'paid' ? 'שולם' : 'טרם שולם'}
          </button>
        ))}
      </div>

      {/* New charge modal */}
      {showNewCharge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" dir="rtl">
            <h2 className="text-lg font-bold mb-4">חיוב חדש</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">לקוח</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
                  value={newCharge.clientId}
                  onChange={e => setNewCharge(p => ({ ...p, clientId: e.target.value }))}
                >
                  <option value="">בחר לקוח...</option>
                  {clients?.map((c: { id: string; name: string }) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600">תיאור</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" value={newCharge.description}
                  onChange={e => setNewCharge(p => ({ ...p, description: e.target.value }))} placeholder="דמי ניהול ינואר 2026" />
              </div>
              <div>
                <label className="text-sm text-gray-600">סכום (לפני מע"מ) ₪</label>
                <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" value={newCharge.amount}
                  onChange={e => setNewCharge(p => ({ ...p, amount: e.target.value }))} placeholder="1000" />
                {newCharge.amount && (
                  <p className="text-xs text-gray-400 mt-1">
                    מע"מ: {formatCurrency(parseFloat(newCharge.amount) * VAT_RATE)} | סה"כ: {formatCurrency(parseFloat(newCharge.amount) * 1.17)}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600">תאריך חיוב</label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" value={newCharge.chargeDate}
                    onChange={e => setNewCharge(p => ({ ...p, chargeDate: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">תאריך לתשלום</label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" value={newCharge.dueDate}
                    onChange={e => setNewCharge(p => ({ ...p, dueDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600">הערות</label>
                <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" rows={2} value={newCharge.notes}
                  onChange={e => setNewCharge(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setShowNewCharge(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">ביטול</button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!newCharge.clientId || !newCharge.description || !newCharge.amount || createMutation.isPending}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isPending ? 'שומר...' : 'צור חיוב'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay modal */}
      {payingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6" dir="rtl">
            <h2 className="text-lg font-bold mb-4">רישום תשלום</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">סכום ₪</label>
                <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" value={payForm.amount}
                  onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-gray-600">אמצעי תשלום</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" value={payForm.method}
                  onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))}>
                  <option value="bank_transfer">העברה בנקאית</option>
                  <option value="check">צ'ק</option>
                  <option value="credit_card">כרטיס אשראי</option>
                  <option value="cash">מזומן</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600">אסמכתא</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1" value={payForm.reference}
                  onChange={e => setPayForm(p => ({ ...p, reference: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setPayingId(null)} className="px-4 py-2 text-sm text-gray-600">ביטול</button>
              <button
                onClick={() => payMutation.mutate(payingId)}
                disabled={!payForm.amount || payMutation.isPending}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {payMutation.isPending ? 'שומר...' : 'אשר תשלום'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Charges table */}
      <Card title={`חיובים (${charges.length})`}>
        {isLoading ? (
          <p className="text-gray-400 text-sm text-center py-8">טוען...</p>
        ) : charges.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">אין חיובים</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right border-b border-gray-100">
                  <th className="pb-2 font-semibold text-gray-600">לקוח</th>
                  <th className="pb-2 font-semibold text-gray-600">תיאור</th>
                  <th className="pb-2 font-semibold text-gray-600">סכום</th>
                  <th className="pb-2 font-semibold text-gray-600">מע"מ</th>
                  <th className="pb-2 font-semibold text-gray-600">סה"כ</th>
                  <th className="pb-2 font-semibold text-gray-600">לתשלום</th>
                  <th className="pb-2 font-semibold text-gray-600">סטטוס</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {charges.map(ch => (
                  <tr key={ch.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 font-medium">{ch.client?.name ?? '—'}</td>
                    <td className="py-2.5 text-gray-600 max-w-[200px] truncate">{ch.description}</td>
                    <td className="py-2.5">{formatCurrency(ch.amount)}</td>
                    <td className="py-2.5 text-gray-400">{formatCurrency(ch.vatAmount)}</td>
                    <td className="py-2.5 font-semibold">{formatCurrency(ch.totalAmount)}</td>
                    <td className={`py-2.5 ${isOverdue(ch) ? 'text-red-600 font-medium' : 'text-gray-600'}`}>{formatDate(ch.dueDate)}</td>
                    <td className="py-2.5">
                      {ch.isPaid
                        ? <Badge variant="green">שולם</Badge>
                        : isOverdue(ch)
                          ? <Badge variant="red">באיחור</Badge>
                          : <Badge variant="yellow">ממתין</Badge>}
                    </td>
                    <td className="py-2.5">
                      {!ch.isPaid && (
                        <button
                          onClick={() => { setPayingId(ch.id); setPayForm(p => ({ ...p, amount: String(ch.totalAmount) })) }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          רשום תשלום
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
