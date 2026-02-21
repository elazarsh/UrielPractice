import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import { Link } from 'react-router-dom'

interface CalendarEvent {
  id: string
  type: 'process' | 'tax_payment' | 'holiday'
  date: string
  title: string
  clientId: string | null
  clientName: string | null
  status: string
  isOverdue: boolean
  color: string
  entityId: string
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const TYPE_ICONS: Record<string, string> = {
  process: '📋',
  tax_payment: '🏛️',
  holiday: '✡️',
}

const TYPE_LABELS: Record<string, string> = {
  process: 'תהליך',
  tax_payment: 'תשלום מס',
  holiday: 'חג/מועד',
}

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<'list' | 'week'>('list')
  const [filterType, setFilterType] = useState<'all' | 'process' | 'tax_payment' | 'holiday'>('all')

  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const to = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString()

  const { data, isLoading } = useQuery({
    queryKey: ['calendar-events', from, to],
    queryFn: () => apiClient.get<{ events: CalendarEvent[]; totalEvents: number }>(
      `/calendar/events?from=${from}&to=${to}`
    ).then(r => r.data),
  })

  const { data: weekSummary } = useQuery({
    queryKey: ['calendar-weeks'],
    queryFn: () => apiClient.get<{ weeks: Array<{ weekStart: string; processCount: number; taxCount: number; overdueCount: number }> }>(
      '/calendar/deadlines-summary'
    ).then(r => r.data),
  })

  const allEvents = data?.events ?? []
  const events = filterType === 'all' ? allEvents : allEvents.filter(e => e.type === filterType)

  // Group by date for list view
  const grouped = events.reduce((acc, e) => {
    const date = e.date.slice(0, 10)
    if (!acc[date]) acc[date] = []
    acc[date].push(e)
    return acc
  }, {} as Record<string, CalendarEvent[]>)

  const sortedDates = Object.keys(grouped).sort()

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">יומן דדליינים</h1>
        <div className="flex gap-2">
          <button onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-sm rounded-lg border ${viewMode === 'list' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>
            רשימה
          </button>
          <button onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 text-sm rounded-lg border ${viewMode === 'week' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>
            לפי שבוע
          </button>
        </div>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-4 gap-3">
          {(['all', 'process', 'tax_payment', 'holiday'] as const).map(t => {
            const count = t === 'all' ? allEvents.length : allEvents.filter(e => e.type === t).length
            const isSelected = filterType === t
            return (
              <button key={t} onClick={() => setFilterType(t)}
                className={`rounded-xl border p-3 text-center transition-colors ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                <p className="text-2xl">{t === 'all' ? '📅' : TYPE_ICONS[t]}</p>
                <p className="text-xl font-bold text-gray-800">{count}</p>
                <p className="text-xs text-gray-500">{t === 'all' ? 'הכל' : TYPE_LABELS[t]}</p>
              </button>
            )
          })}
        </div>
      )}

      {viewMode === 'week' && weekSummary && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-800 mb-3">עומס לפי שבוע (30 יום)</h3>
          <div className="space-y-2">
            {weekSummary.weeks.map(w => (
              <div key={w.weekStart} className="flex items-center gap-4">
                <span className="text-sm text-gray-500 w-24 shrink-0">{formatDate(w.weekStart)}</span>
                <div className="flex-1 flex gap-2">
                  {w.processCount > 0 && (
                    <div className="flex items-center gap-1 bg-blue-100 rounded-lg px-2 py-1">
                      <span className="text-xs">📋</span>
                      <span className="text-xs font-medium text-blue-700">{w.processCount}</span>
                    </div>
                  )}
                  {w.taxCount > 0 && (
                    <div className="flex items-center gap-1 bg-purple-100 rounded-lg px-2 py-1">
                      <span className="text-xs">🏛️</span>
                      <span className="text-xs font-medium text-purple-700">{w.taxCount}</span>
                    </div>
                  )}
                  {w.overdueCount > 0 && (
                    <div className="flex items-center gap-1 bg-red-100 rounded-lg px-2 py-1">
                      <span className="text-xs">⚠️</span>
                      <span className="text-xs font-medium text-red-700">{w.overdueCount} באיחור</span>
                    </div>
                  )}
                </div>
                <div className="w-32">
                  <div className="bg-gray-100 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, ((w.processCount + w.taxCount) / 10) * 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events list */}
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-gray-400 text-center py-8">טוען...</p>
        ) : sortedDates.length === 0 ? (
          <p className="text-gray-400 text-center py-8">אין אירועים בתקופה זו</p>
        ) : (
          sortedDates.map(date => {
            const dayEvents = grouped[date]
            const d = new Date(date)
            const isToday = date === new Date().toISOString().slice(0, 10)
            const isPast = d < new Date()
            return (
              <div key={date}>
                <div className={`flex items-center gap-3 mb-2`}>
                  <div className={`text-sm font-semibold px-2 py-0.5 rounded-lg ${isToday ? 'bg-blue-600 text-white' : isPast ? 'text-red-500' : 'text-gray-600'}`}>
                    {d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'long' })}
                  </div>
                  <div className="flex-1 border-t border-gray-100" />
                </div>
                <div className="space-y-1.5 pr-2">
                  {dayEvents.map(e => (
                    <div key={e.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${e.isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-white hover:bg-gray-50'}`}>
                      <span>{TYPE_ICONS[e.type]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{e.title}</p>
                        {e.clientName && (
                          <p className="text-xs text-gray-400">{e.clientName}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${e.isOverdue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                          {e.isOverdue ? 'באיחור' : e.status}
                        </span>
                        {e.type === 'process' && (
                          <Link to={`/processes/${e.entityId}`} className="text-xs text-blue-600 hover:text-blue-800">פתח</Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
