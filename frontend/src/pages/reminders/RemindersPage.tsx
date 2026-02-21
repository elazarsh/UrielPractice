import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'

interface ReminderTemplate {
  id: string
  name: string
  triggerType: string
  daysBeforeDue: number
  channel: string
  bodyTemplate: string
  subjectTemplate?: string
  isActive: boolean
  _count?: { reminders: number }
}

interface ScheduledReminder {
  id: string
  clientId: string
  client: { id: string; name: string }
  template: { name: string; triggerType: string }
  processId?: string
  scheduledFor: string
  sentAt?: string
  status: 'PENDING' | 'SENT' | 'SKIPPED' | 'FAILED'
  renderedBody: string
  renderedSubject?: string
}

const TRIGGER_LABELS: Record<string, string> = {
  PROCESS_DUE_SOON: 'תהליך קרוב למועד',
  DOCUMENT_MISSING: 'מסמך חסר',
  PAYMENT_OVERDUE: 'תשלום באיחור',
  PROCESS_OVERDUE: 'תהליך באיחור',
  CUSTOM: 'מותאם',
}

const CHANNEL_LABELS: Record<string, string> = {
  INTERNAL: 'פנימי',
  EMAIL: 'אימייל',
  WHATSAPP: 'וואטסאפ',
  PHONE_NOTE: 'שיחה טלפונית',
}

const STATUS_VARIANTS: Record<string, 'yellow' | 'green' | 'gray' | 'red'> = {
  PENDING: 'yellow',
  SENT: 'green',
  SKIPPED: 'gray',
  FAILED: 'red',
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function RemindersPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<'scheduled' | 'templates'>('scheduled')
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [tForm, setTForm] = useState({
    name: '', triggerType: 'PROCESS_DUE_SOON', daysBeforeDue: '7',
    channel: 'EMAIL', subjectTemplate: '', bodyTemplate: '', isActive: true,
  })

  const { data: pending } = useQuery({
    queryKey: ['reminders-pending-count'],
    queryFn: () => apiClient.get<{ count: number }>('/reminders/pending-count').then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: scheduled, isLoading: loadingScheduled } = useQuery({
    queryKey: ['scheduled-reminders'],
    queryFn: () => apiClient.get<{ data: ScheduledReminder[]; total: number }>('/reminders/scheduled').then(r => r.data),
    enabled: tab === 'scheduled',
  })

  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['reminder-templates'],
    queryFn: () => apiClient.get<ReminderTemplate[]>('/reminders/templates').then(r => r.data),
    enabled: tab === 'templates',
  })

  const generateMutation = useMutation({
    mutationFn: () => apiClient.post<{ created: number; skipped: number; processedTemplates: number }>('/reminders/generate', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scheduled-reminders'] }),
  })

  const sendMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/reminders/scheduled/${id}/send`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduled-reminders'] })
      qc.invalidateQueries({ queryKey: ['reminders-pending-count'] })
    },
  })

  const skipMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/reminders/scheduled/${id}/skip`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scheduled-reminders'] }),
  })

  const createTemplateMutation = useMutation({
    mutationFn: () => apiClient.post('/reminders/templates', {
      name: tForm.name,
      triggerType: tForm.triggerType,
      daysBeforeDue: parseInt(tForm.daysBeforeDue),
      channel: tForm.channel,
      subjectTemplate: tForm.subjectTemplate || undefined,
      bodyTemplate: tForm.bodyTemplate,
      isActive: tForm.isActive,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reminder-templates'] })
      setShowNewTemplate(false)
      setTForm({ name: '', triggerType: 'PROCESS_DUE_SOON', daysBeforeDue: '7', channel: 'EMAIL', subjectTemplate: '', bodyTemplate: '', isActive: true })
    },
  })

  const reminders = scheduled?.data ?? []
  const tmplList = templates ?? []

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">מערכת תזכורות</h1>
        <div className="flex gap-2">
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
          >
            {generateMutation.isPending ? 'מייצר...' : '⚡ צור תזכורות אוטומטיות'}
          </button>
        </div>
      </div>

      {generateMutation.data && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
          נוצרו {(generateMutation.data as unknown as { data: { created: number } }).data?.created ?? 0} תזכורות חדשות
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('scheduled')}
          className={`px-4 py-2 text-sm font-medium rounded-lg border ${tab === 'scheduled' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>
          תזכורות מתוזמנות
          {pending && pending.count > 0 && (
            <span className="bg-orange-500 text-white text-xs rounded-full px-1.5 ml-2">{pending.count}</span>
          )}
        </button>
        <button onClick={() => setTab('templates')}
          className={`px-4 py-2 text-sm font-medium rounded-lg border ${tab === 'templates' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>
          תבניות ({tmplList.length})
        </button>
      </div>

      {tab === 'scheduled' && (
        <Card title={`תזכורות (${scheduled?.total ?? 0})`}>
          {loadingScheduled ? (
            <p className="text-gray-400 text-center py-8">טוען...</p>
          ) : reminders.length === 0 ? (
            <p className="text-gray-400 text-center py-8">אין תזכורות – לחץ על "צור תזכורות אוטומטיות" כדי לייצר</p>
          ) : (
            <div className="space-y-2">
              {reminders.map((r: ScheduledReminder) => (
                <div key={r.id} className={`p-3 border rounded-xl ${r.status === 'PENDING' ? 'border-orange-200 bg-orange-50' : 'border-gray-100'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_VARIANTS[r.status]}>{r.status === 'PENDING' ? 'ממתין' : r.status === 'SENT' ? 'נשלח' : r.status === 'SKIPPED' ? 'דולג' : 'נכשל'}</Badge>
                      <span className="font-medium text-sm">{r.client.name}</span>
                      <span className="text-xs text-gray-400">{r.template.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{formatDateTime(r.scheduledFor)}</span>
                      {r.status === 'PENDING' && (
                        <>
                          <button onClick={() => sendMutation.mutate(r.id)} disabled={sendMutation.isPending}
                            className="text-xs text-green-600 hover:text-green-800 font-medium">שלח</button>
                          <button onClick={() => skipMutation.mutate(r.id)} disabled={skipMutation.isPending}
                            className="text-xs text-gray-400 hover:text-gray-600">דלג</button>
                        </>
                      )}
                    </div>
                  </div>
                  {r.renderedSubject && <p className="text-xs font-medium text-gray-700 mb-0.5">{r.renderedSubject}</p>}
                  <p className="text-xs text-gray-500 line-clamp-2">{r.renderedBody}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'templates' && (
        <>
          <div className="flex justify-end">
            <button onClick={() => setShowNewTemplate(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              + תבנית חדשה
            </button>
          </div>

          {showNewTemplate && (
            <Card title="תבנית תזכורת חדשה">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">שם התבנית</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5" value={tForm.name}
                    onChange={e => setTForm(p => ({ ...p, name: e.target.value }))} placeholder="תזכורת הגשת מע&quot;מ – שבוע לפני" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">טריגר</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5" value={tForm.triggerType}
                    onChange={e => setTForm(p => ({ ...p, triggerType: e.target.value }))}>
                    {Object.entries(TRIGGER_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">ימים לפני</label>
                  <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5" value={tForm.daysBeforeDue}
                    onChange={e => setTForm(p => ({ ...p, daysBeforeDue: e.target.value }))} min="0" max="60" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">ערוץ</label>
                  <select className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5" value={tForm.channel}
                    onChange={e => setTForm(p => ({ ...p, channel: e.target.value }))}>
                    {Object.entries(CHANNEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">נושא (אופציונלי)</label>
                  <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5" value={tForm.subjectTemplate}
                    onChange={e => setTForm(p => ({ ...p, subjectTemplate: e.target.value }))} placeholder="תזכורת: {{processName}}" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">תוכן הודעה (משתנים: {'{{clientName}}, {{dueDate}}, {{processName}}, {{daysLeft}}'})</label>
                  <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-0.5" rows={3}
                    value={tForm.bodyTemplate} onChange={e => setTForm(p => ({ ...p, bodyTemplate: e.target.value }))}
                    placeholder="שלום {{clientName}}, יש לכם {{daysLeft}} ימים להגשת {{processName}} עד תאריך {{dueDate}}." />
                </div>
              </div>
              <div className="flex gap-2 mt-3 justify-end">
                <button onClick={() => setShowNewTemplate(false)} className="text-sm text-gray-500 px-3 py-1.5">ביטול</button>
                <button onClick={() => createTemplateMutation.mutate()}
                  disabled={!tForm.name || !tForm.bodyTemplate || createTemplateMutation.isPending}
                  className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm disabled:opacity-50">
                  {createTemplateMutation.isPending ? 'שומר...' : 'שמור תבנית'}
                </button>
              </div>
            </Card>
          )}

          <div className="grid gap-3">
            {loadingTemplates ? <p className="text-gray-400 text-center py-6">טוען...</p> :
              tmplList.length === 0 ? <p className="text-gray-400 text-center py-6">אין תבניות – צור תבנית ראשונה</p> :
                tmplList.map((t: ReminderTemplate) => (
                  <Card key={t.id}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{t.name}</span>
                          {t.isActive ? <Badge variant="green">פעיל</Badge> : <Badge variant="gray">לא פעיל</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-400">{TRIGGER_LABELS[t.triggerType]}</span>
                          <span className="text-xs text-gray-400">{t.daysBeforeDue} ימים לפני</span>
                          <span className="text-xs text-gray-400">{CHANNEL_LABELS[t.channel]}</span>
                          {t._count && <span className="text-xs text-gray-400">{t._count.reminders} תזכורות</span>}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 border-t border-gray-50 pt-2 line-clamp-2">{t.bodyTemplate}</p>
                  </Card>
                ))}
          </div>
        </>
      )}
    </div>
  )
}
