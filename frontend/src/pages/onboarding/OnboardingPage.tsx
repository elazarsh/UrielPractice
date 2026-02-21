import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'

interface ChecklistItem {
  id: string
  title: string
  done: boolean
  required: boolean
}

interface OnboardingRecord {
  id: string
  clientId: string
  client: { id: string; name: string; taxId?: string; clientType: string }
  status: string
  checklist: ChecklistItem[]
  notes?: string
  startedAt: string
  completedAt?: string
  progress: { total: number; done: number; percent: number }
}

const STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'בתהליך',
  COMPLETED: 'הושלם',
  ON_HOLD: 'מושהה',
  CANCELLED: 'בוטל',
}

const STATUS_VARIANTS: Record<string, 'blue' | 'green' | 'yellow' | 'red' | 'gray'> = {
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  ON_HOLD: 'yellow',
  CANCELLED: 'red',
}

export default function OnboardingPage() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState<string | null>(null)
  const [startClientId, setStartClientId] = useState('')

  const { data: onboardings = [], isLoading } = useQuery({
    queryKey: ['onboardings'],
    queryFn: () => apiClient.get<OnboardingRecord[]>('/onboarding').then(r => r.data),
  })

  const { data: selectedOnboarding, isLoading: loadingSelected } = useQuery({
    queryKey: ['onboarding', selected],
    queryFn: () => apiClient.get<OnboardingRecord & { allRequiredDone?: boolean }>(`/onboarding/${selected}`).then(r => r.data),
    enabled: !!selected,
  })

  const { data: clients } = useQuery({
    queryKey: ['clients-for-onboarding'],
    queryFn: () => fetch('/api/clients?limit=200', { credentials: 'include' }).then(r => r.json()).then((r: { data: { id: string; name: string }[] }) => r.data),
  })

  const startMutation = useMutation({
    mutationFn: (clientId: string) => apiClient.post(`/onboarding/${clientId}/start`, {}),
    onSuccess: (_, clientId) => {
      qc.invalidateQueries({ queryKey: ['onboardings'] })
      setSelected(clientId)
      setStartClientId('')
    },
  })

  const updateChecklistMutation = useMutation({
    mutationFn: ({ clientId, items }: { clientId: string; items: { id: string; done: boolean }[] }) =>
      apiClient.patch(`/onboarding/${clientId}/checklist`, { items }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['onboarding', selected] })
      qc.invalidateQueries({ queryKey: ['onboardings'] })
    },
  })

  const toggleItem = (item: ChecklistItem) => {
    if (!selected || !selectedOnboarding) return
    const currentChecklist = selectedOnboarding.checklist ?? []
    const updatedItems = currentChecklist.map(i => i.id === item.id ? { id: i.id, done: !i.done } : { id: i.id, done: i.done })
    updateChecklistMutation.mutate({ clientId: selected, items: updatedItems })
  }

  return (
    <div className="flex gap-6 min-h-0" dir="rtl">
      {/* List panel */}
      <div className="w-72 space-y-3 shrink-0">
        {/* Start new onboarding */}
        <Card>
          <p className="text-sm font-semibold text-gray-700 mb-2">קליטת לקוח חדש</p>
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2"
            value={startClientId}
            onChange={e => setStartClientId(e.target.value)}
          >
            <option value="">בחר לקוח...</option>
            {(clients ?? []).map((c: { id: string; name: string }) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={() => startMutation.mutate(startClientId)}
            disabled={!startClientId || startMutation.isPending}
            className="w-full bg-blue-600 text-white py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700"
          >
            {startMutation.isPending ? 'פותח...' : 'פתח קליטה'}
          </button>
        </Card>

        {/* Active onboardings list */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-sm text-gray-800">קליטות פעילות ({onboardings.length})</h2>
          </div>
          {isLoading ? (
            <p className="text-gray-400 text-xs text-center p-4">טוען...</p>
          ) : onboardings.length === 0 ? (
            <p className="text-gray-400 text-xs text-center p-4">אין קליטות פעילות</p>
          ) : (
            onboardings.map((o: OnboardingRecord) => (
              <button
                key={o.clientId}
                onClick={() => setSelected(o.clientId)}
                className={`w-full text-right px-4 py-3 border-b border-gray-50 hover:bg-gray-50 ${selected === o.clientId ? 'bg-blue-50' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800 truncate">{o.client.name}</span>
                  <Badge variant={STATUS_VARIANTS[o.status] ?? 'gray'}>{STATUS_LABELS[o.status] ?? o.status}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${o.progress.percent}%` }} />
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{o.progress.done}/{o.progress.total}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Checklist panel */}
      <div className="flex-1">
        {!selected ? (
          <div className="flex items-center justify-center h-64 text-gray-400">בחר קליטה לצפייה</div>
        ) : loadingSelected ? (
          <div className="flex items-center justify-center h-64 text-gray-400">טוען...</div>
        ) : selectedOnboarding ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedOnboarding.client?.name}</h2>
                <p className="text-sm text-gray-500">{selectedOnboarding.client?.clientType}</p>
              </div>
              <div className="text-left">
                <div className="text-3xl font-bold text-blue-600">{selectedOnboarding.progress?.percent ?? 0}%</div>
                <div className="text-xs text-gray-400">{selectedOnboarding.progress?.done}/{selectedOnboarding.progress?.total} פעולות</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${selectedOnboarding.progress?.percent ?? 0}%` }}
              />
            </div>

            {/* Checklist */}
            <Card title="רשימת בדיקה – קליטת לקוח">
              <div className="space-y-2">
                {(selectedOnboarding.checklist ?? []).map((item: ChecklistItem) => (
                  <label
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      item.done
                        ? 'border-green-200 bg-green-50'
                        : item.required
                          ? 'border-blue-100 bg-blue-50 hover:border-blue-300'
                          : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggleItem(item)}
                      className="w-4 h-4 rounded accent-blue-600"
                      disabled={updateChecklistMutation.isPending}
                    />
                    <span className={`text-sm flex-1 ${item.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {item.title}
                    </span>
                    {item.required && !item.done && (
                      <span className="text-xs text-orange-500 font-medium shrink-0">חובה</span>
                    )}
                    {item.done && (
                      <span className="text-green-500 text-lg shrink-0">✓</span>
                    )}
                  </label>
                ))}
              </div>
              {selectedOnboarding.progress?.percent === 100 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl text-center">
                  <p className="text-green-700 font-semibold">🎉 כל הפעולות הושלמו! קליטת הלקוח הסתיימה בהצלחה.</p>
                </div>
              )}
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  )
}
