import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { communicationsApi, CommunicationMessage, MessageChannel } from '../../api/communications'
import { Card } from '../../components/ui/Card'

const CHANNEL_LABELS: Record<MessageChannel, string> = {
  INTERNAL: 'פנימי',
  EMAIL: 'אימייל',
  WHATSAPP: 'וואטסאפ',
  PHONE_NOTE: 'שיחה טלפונית',
}

const CHANNEL_COLORS: Record<MessageChannel, string> = {
  INTERNAL: 'bg-gray-100 text-gray-700',
  EMAIL: 'bg-blue-100 text-blue-700',
  WHATSAPP: 'bg-green-100 text-green-700',
  PHONE_NOTE: 'bg-purple-100 text-purple-700',
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function CommunicationsPage() {
  const qc = useQueryClient()
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ channel: 'INTERNAL' as MessageChannel, subject: '', body: '', isFromClient: false })

  const { data: unread = [] } = useQuery({
    queryKey: ['communications-unread'],
    queryFn: communicationsApi.unreadCounts,
  })
  const { data: clients } = useQuery({
    queryKey: ['clients-for-comms'],
    queryFn: () => fetch('/api/clients?limit=200', { credentials: 'include' }).then(r => r.json()).then((r: { data: { id: string; name: string }[] }) => r.data),
  })
  const { data: msgs, isLoading } = useQuery({
    queryKey: ['communications', selectedClient],
    queryFn: () => communicationsApi.listForClient(selectedClient!),
    enabled: !!selectedClient,
  })

  const sendMutation = useMutation({
    mutationFn: () => communicationsApi.send(selectedClient!, {
      channel: form.channel,
      subject: form.subject || undefined,
      body: form.body,
      isFromClient: form.isFromClient,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communications', selectedClient] })
      qc.invalidateQueries({ queryKey: ['communications-unread'] })
      setShowForm(false)
      setForm({ channel: 'INTERNAL', subject: '', body: '', isFromClient: false })
    },
  })

  const readMutation = useMutation({
    mutationFn: (id: string) => communicationsApi.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communications', selectedClient] })
      qc.invalidateQueries({ queryKey: ['communications-unread'] })
    },
  })

  const messages = msgs?.data ?? []
  const clientList = clients ?? []
  const unreadMap = Object.fromEntries(unread.map(u => [u.clientId, u.count]))

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]" dir="rtl">
      {/* Client list sidebar */}
      <div className="w-64 bg-white border border-gray-200 rounded-xl overflow-y-auto">
        <div className="p-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 text-sm">בחר לקוח</h2>
        </div>
        {clientList.map((c: { id: string; name: string }) => (
          <button
            key={c.id}
            onClick={() => setSelectedClient(c.id)}
            className={`w-full text-right px-3 py-2.5 text-sm flex items-center justify-between hover:bg-gray-50 border-b border-gray-50 ${
              selectedClient === c.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
            }`}
          >
            <span className="truncate">{c.name}</span>
            {unreadMap[c.id] > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0 mr-2">
                {unreadMap[c.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Messages area */}
      <div className="flex-1 flex flex-col gap-4">
        {selectedClient ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">
                {clientList.find((c: { id: string; name: string }) => c.id === selectedClient)?.name ?? ''}
              </h2>
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                + הודעה חדשה
              </button>
            </div>

            {showForm && (
              <Card>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">ערוץ</label>
                      <select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5"
                        value={form.channel} onChange={e => setForm(p => ({ ...p, channel: e.target.value as MessageChannel }))}>
                        {(Object.keys(CHANNEL_LABELS) as MessageChannel[]).map(ch => (
                          <option key={ch} value={ch}>{CHANNEL_LABELS[ch]}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">נושא</label>
                      <input className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm mt-0.5"
                        value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} />
                    </div>
                    <div className="flex items-end pb-1">
                      <label className="flex items-center gap-1 text-sm cursor-pointer">
                        <input type="checkbox" checked={form.isFromClient}
                          onChange={e => setForm(p => ({ ...p, isFromClient: e.target.checked }))} />
                        מלקוח
                      </label>
                    </div>
                  </div>
                  <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" rows={3}
                    placeholder="תוכן ההודעה..." value={form.body}
                    onChange={e => setForm(p => ({ ...p, body: e.target.value }))} />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowForm(false)} className="text-sm text-gray-500 px-3 py-1.5">ביטול</button>
                    <button onClick={() => sendMutation.mutate()} disabled={!form.body || sendMutation.isPending}
                      className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm disabled:opacity-50">
                      {sendMutation.isPending ? 'שולח...' : 'שלח'}
                    </button>
                  </div>
                </div>
              </Card>
            )}

            <div className="flex-1 overflow-y-auto space-y-2">
              {isLoading ? (
                <p className="text-gray-400 text-sm text-center py-8">טוען...</p>
              ) : messages.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">אין הודעות</p>
              ) : (
                messages.map((m: CommunicationMessage) => (
                  <div
                    key={m.id}
                    className={`flex ${m.isFromClient ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`max-w-[70%] rounded-xl px-4 py-3 ${
                      m.isFromClient ? 'bg-white border border-gray-200' : 'bg-blue-600 text-white'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${CHANNEL_COLORS[m.channel as MessageChannel]}`}>
                          {CHANNEL_LABELS[m.channel as MessageChannel]}
                        </span>
                        {m.subject && <span className="text-xs font-medium">{m.subject}</span>}
                        {!m.isRead && !m.isFromClient && (
                          <button onClick={() => readMutation.mutate(m.id)}
                            className="text-xs text-blue-200 hover:text-white">סמן כנקרא</button>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{m.body}</p>
                      <div className={`flex items-center justify-between mt-2 text-xs ${m.isFromClient ? 'text-gray-400' : 'text-blue-200'}`}>
                        <span>{m.sender ? `${m.sender.firstName} ${m.sender.lastName}` : m.isFromClient ? 'לקוח' : 'מערכת'}</span>
                        <span>{formatDateTime(m.sentAt)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            בחר לקוח לצפייה בתקשורת
          </div>
        )}
      </div>
    </div>
  )
}
