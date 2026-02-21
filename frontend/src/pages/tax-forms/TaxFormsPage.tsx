import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'

type FormStatus = 'NOT_STARTED' | 'IN_PREPARATION' | 'PENDING_SIGNATURE' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'
type IsraeliFormType = 'FORM_1301' | 'FORM_1214' | 'FORM_102' | 'FORM_106' | 'FORM_856' | 'FORM_50' | 'FORM_1220' | 'FORM_134' | 'FORM_101' | 'OTHER'

const FORM_LABELS: Record<IsraeliFormType, string> = {
  FORM_1301: 'טופס 1301 – דוח שנתי ליחיד',
  FORM_1214: 'טופס 1214 – דוח שנתי לחברה',
  FORM_102:  'טופס 102 – ניכויים חודשיים',
  FORM_106:  'טופס 106 – אישור שכר שנתי',
  FORM_856:  'טופס 856 – אישור ניכוי במקור',
  FORM_50:   'טופס 50 – ריכוז הכנסות עצמאי',
  FORM_1220: 'טופס 1220 – קביעת מקדמות',
  FORM_134:  'טופס 134 – ביטוח לאומי שנתי',
  FORM_101:  'טופס 101 – כרטיס עובד',
  OTHER:     'אחר',
}

const STATUS_LABELS: Record<FormStatus, string> = {
  NOT_STARTED: 'לא התחיל',
  IN_PREPARATION: 'בהכנה',
  PENDING_SIGNATURE: 'ממתין לחתימה',
  SUBMITTED: 'הוגש',
  ACCEPTED: 'אושר',
  REJECTED: 'נדחה',
}

const STATUS_VARIANTS: Record<FormStatus, 'gray' | 'blue' | 'yellow' | 'green' | 'red'> = {
  NOT_STARTED: 'gray',
  IN_PREPARATION: 'blue',
  PENDING_SIGNATURE: 'yellow',
  SUBMITTED: 'blue',
  ACCEPTED: 'green',
  REJECTED: 'red',
}

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('he-IL')
}

export default function TaxFormsPage() {
  const qc = useQueryClient()
  const [year, setYear] = useState(new Date().getFullYear())
  const [tab, setTab] = useState<'overview' | 'pending'>('overview')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState<FormStatus>('IN_PREPARATION')
  const [newRef, setNewRef] = useState('')

  const { data: overview, isLoading } = useQuery({
    queryKey: ['tax-forms-overview', year],
    queryFn: () => apiClient.get<{
      year: number
      totalForms: number
      statusCounts: Record<string, number>
      forms: Array<{
        id: string
        clientId: string
        client: { name: string; taxId: string }
        formType: IsraeliFormType
        taxYear: number
        periodMonth: number | null
        status: FormStatus
        dueDate: string | null
        submittedAt: string | null
        referenceNumber: string | null
      }>
    }>(`/tax-forms/overview?year=${year}`).then(r => r.data),
    enabled: tab === 'overview',
  })

  const { data: pending, isLoading: loadingPending } = useQuery({
    queryKey: ['tax-forms-pending'],
    queryFn: () => apiClient.get<{ count: number; forms: Array<{ id: string; client: { name: string }; formType: IsraeliFormType; taxYear: number; dueDate: string | null; status: FormStatus }> }>(
      '/tax-forms/pending'
    ).then(r => r.data),
    enabled: tab === 'pending',
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, referenceNumber }: { id: string; status: FormStatus; referenceNumber?: string }) =>
      apiClient.patch(`/tax-forms/${id}/status`, { status, referenceNumber: referenceNumber || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tax-forms-overview'] })
      qc.invalidateQueries({ queryKey: ['tax-forms-pending'] })
      setUpdatingId(null)
      setNewRef('')
    },
  })

  const forms = tab === 'overview' ? (overview?.forms ?? []) : (pending?.forms ?? [])
  const isLoadingCurrent = tab === 'overview' ? isLoading : loadingPending

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">מעקב טפסי מס ישראליים</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">שנת מס:</label>
          <input type="number" className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-24"
            value={year} onChange={e => setYear(+e.target.value)} />
        </div>
      </div>

      {/* Status summary */}
      {overview && tab === 'overview' && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {(Object.entries(STATUS_LABELS) as [FormStatus, string][]).map(([s, label]) => (
            <div key={s} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-gray-800">{overview.statusCounts[s] ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('overview')}
          className={`px-4 py-2 text-sm font-medium rounded-lg border ${tab === 'overview' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>
          כל הטפסים ({overview?.totalForms ?? 0})
        </button>
        <button onClick={() => setTab('pending')}
          className={`px-4 py-2 text-sm font-medium rounded-lg border ${tab === 'pending' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200'}`}>
          ממתינים לטיפול {pending && <span className="bg-orange-100 text-orange-700 rounded-full px-1.5 ml-1">{pending.count}</span>}
        </button>
      </div>

      <Card>
        {isLoadingCurrent ? (
          <p className="text-gray-400 text-center py-8">טוען...</p>
        ) : forms.length === 0 ? (
          <p className="text-gray-400 text-center py-8">אין טפסים</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right border-b border-gray-100">
                  <th className="pb-2 font-semibold text-gray-600">לקוח</th>
                  <th className="pb-2 font-semibold text-gray-600">טופס</th>
                  <th className="pb-2 font-semibold text-gray-600">שנה</th>
                  <th className="pb-2 font-semibold text-gray-600">מועד</th>
                  <th className="pb-2 font-semibold text-gray-600">הוגש</th>
                  <th className="pb-2 font-semibold text-gray-600">סטטוס</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {forms.map((f: { id: string; client: { name: string; taxId?: string }; formType: IsraeliFormType; taxYear: number; dueDate: string | null; submittedAt?: string | null; referenceNumber?: string | null; status: FormStatus }) => (
                  <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 font-medium">{f.client.name}</td>
                    <td className="py-2 text-gray-600 text-xs">{FORM_LABELS[f.formType]}</td>
                    <td className="py-2 text-gray-500">{f.taxYear}</td>
                    <td className={`py-2 text-xs ${f.dueDate && new Date(f.dueDate) < new Date() && f.status !== 'ACCEPTED' ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                      {formatDate(f.dueDate)}
                    </td>
                    <td className="py-2 text-gray-400 text-xs">{formatDate('submittedAt' in f ? f.submittedAt : null)}</td>
                    <td className="py-2">
                      <Badge variant={STATUS_VARIANTS[f.status]}>{STATUS_LABELS[f.status]}</Badge>
                    </td>
                    <td className="py-2">
                      {updatingId === f.id ? (
                        <div className="flex items-center gap-1">
                          <select className="border border-gray-200 rounded px-1 py-0.5 text-xs" value={newStatus}
                            onChange={e => setNewStatus(e.target.value as FormStatus)}>
                            {(Object.keys(STATUS_LABELS) as FormStatus[]).map(s => (
                              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                            ))}
                          </select>
                          <input className="border border-gray-200 rounded px-1 py-0.5 text-xs w-20" value={newRef}
                            onChange={e => setNewRef(e.target.value)} placeholder="אסמכתא" />
                          <button onClick={() => updateStatusMutation.mutate({ id: f.id, status: newStatus, referenceNumber: newRef })}
                            disabled={updateStatusMutation.isPending}
                            className="text-xs text-green-600 hover:text-green-800">✓</button>
                          <button onClick={() => setUpdatingId(null)} className="text-xs text-gray-400">✗</button>
                        </div>
                      ) : (
                        <button onClick={() => { setUpdatingId(f.id); setNewStatus(f.status) }}
                          className="text-xs text-blue-600 hover:text-blue-800">עדכן סטטוס</button>
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
