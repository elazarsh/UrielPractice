import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { taxPaymentsApi, TaxPayment, TaxPaymentType, TAX_PAYMENT_TYPE_LABELS } from '../../api/taxPayments'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(n)
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('he-IL')
}

const MONTHS_HE = ['', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

export default function TaxPaymentsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'upcoming' | 'overdue'>('upcoming')

  const { data: upcoming = [], isLoading: loadingUpcoming } = useQuery({
    queryKey: ['tax-payments-upcoming'],
    queryFn: taxPaymentsApi.upcoming,
    enabled: tab === 'upcoming',
  })
  const { data: overdue = [], isLoading: loadingOverdue } = useQuery({
    queryKey: ['tax-payments-overdue'],
    queryFn: taxPaymentsApi.overdue,
    enabled: tab === 'overdue',
  })

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => taxPaymentsApi.markPaid(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-payments-upcoming'] })
      qc.invalidateQueries({ queryKey: ['tax-payments-overdue'] })
    },
  })

  const payments: TaxPayment[] = tab === 'upcoming' ? upcoming : overdue
  const isLoading = tab === 'upcoming' ? loadingUpcoming : loadingOverdue

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">תשלומי מסים לרשויות</h1>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab('upcoming')}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            tab === 'upcoming' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          קרובים (30 יום)
        </button>
        <button
          onClick={() => setTab('overdue')}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            tab === 'overdue' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          באיחור {overdue.length > 0 && <span className="bg-red-100 text-red-700 rounded-full px-1.5 py-0.5 text-xs mr-1">{overdue.length}</span>}
        </button>
      </div>

      <Card title={`${tab === 'upcoming' ? 'תשלומים קרובים' : 'תשלומים שעברו מועד'} (${payments.length})`}>
        {isLoading ? (
          <p className="text-gray-400 text-sm text-center py-8">טוען...</p>
        ) : payments.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">אין תשלומים</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right border-b border-gray-100">
                  <th className="pb-2 font-semibold text-gray-600">לקוח</th>
                  <th className="pb-2 font-semibold text-gray-600">סוג</th>
                  <th className="pb-2 font-semibold text-gray-600">תקופה</th>
                  <th className="pb-2 font-semibold text-gray-600">סכום</th>
                  <th className="pb-2 font-semibold text-gray-600">מועד תשלום</th>
                  <th className="pb-2 font-semibold text-gray-600">סטטוס</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => {
                  const overdueDays = p.daysOverdue ?? 0
                  const daysUntil = p.daysUntilDue ?? 0
                  return (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 font-medium">{p.client?.name ?? '—'}</td>
                      <td className="py-2.5">{TAX_PAYMENT_TYPE_LABELS[p.paymentType as TaxPaymentType]}</td>
                      <td className="py-2.5 text-gray-500">
                        {p.periodMonth ? `${MONTHS_HE[p.periodMonth]} ` : ''}{p.periodYear}
                      </td>
                      <td className="py-2.5 font-semibold">{formatCurrency(p.amount)}</td>
                      <td className={`py-2.5 ${overdueDays > 0 ? 'text-red-600 font-semibold' : daysUntil <= 5 ? 'text-orange-600' : 'text-gray-600'}`}>
                        {formatDate(p.dueDate)}
                        {overdueDays > 0 && <span className="text-xs mr-1">({overdueDays} ימים)</span>}
                        {daysUntil > 0 && <span className="text-xs text-gray-400 mr-1">(בעוד {daysUntil} י')</span>}
                      </td>
                      <td className="py-2.5">
                        {p.isPaid
                          ? <Badge variant="green">שולם</Badge>
                          : overdueDays > 0
                            ? <Badge variant="red">באיחור</Badge>
                            : <Badge variant="yellow">ממתין</Badge>}
                      </td>
                      <td className="py-2.5">
                        {!p.isPaid && (
                          <button
                            onClick={() => markPaidMutation.mutate(p.id)}
                            disabled={markPaidMutation.isPending}
                            className="text-xs text-green-600 hover:text-green-800 font-medium"
                          >
                            סמן שולם
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
