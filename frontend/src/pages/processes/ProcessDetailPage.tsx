import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { processesApi } from '../../api/processes'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'

const STEP_STATUS_LABELS: Record<string, { label: string; color: 'default'|'red'|'yellow'|'green'|'blue'|'purple'|'gray' }> = {
  PENDING:        { label: 'ממתין',        color: 'gray'   },
  IN_PROGRESS:    { label: 'בעבודה',       color: 'blue'   },
  WAITING_CLIENT: { label: 'ממתין ללקוח',  color: 'yellow' },
  DONE:           { label: 'הושלם',        color: 'green'  },
  SKIPPED:        { label: 'דולג',         color: 'gray'   },
  BLOCKED:        { label: 'חסום',         color: 'red'    },
}

const PROCESS_STATUS_LABELS: Record<string, string> = {
  PENDING:        'ממתין',
  OPEN:           'פתוח',
  IN_PROGRESS:    'בעבודה',
  WAITING_CLIENT: 'ממתין ללקוח',
  READY_REVIEW:   'מוכן לבדיקה',
  UNDER_REVIEW:   'בבדיקה',
  APPROVED:       'אושר',
  SUBMITTED:      'הוגש',
  CLOSED:         'נסגר',
  CANCELLED:      'בוטל',
}

// Status flow: what transitions are allowed from each status
const STATUS_TRANSITIONS: Record<string, { status: string; label: string; color: string }[]> = {
  PENDING:     [{ status: 'IN_PROGRESS',    label: '▶ התחל עבודה',       color: 'blue'   }],
  OPEN:        [{ status: 'IN_PROGRESS',    label: '▶ התחל עבודה',       color: 'blue'   }],
  IN_PROGRESS: [
    { status: 'WAITING_CLIENT', label: '⏳ ממתין ללקוח',        color: 'yellow' },
    { status: 'READY_REVIEW',   label: '🔍 שלח לבדיקה',         color: 'purple' },
  ],
  WAITING_CLIENT: [
    { status: 'IN_PROGRESS',    label: '▶ קיבלנו תשובה',         color: 'blue'   },
    { status: 'READY_REVIEW',   label: '🔍 שלח לבדיקה',          color: 'purple' },
  ],
  READY_REVIEW: [
    { status: 'UNDER_REVIEW',   label: '🔎 התחל בדיקה',           color: 'purple' },
    { status: 'IN_PROGRESS',    label: '↩ החזר לעבודה',           color: 'blue'   },
  ],
  UNDER_REVIEW: [
    { status: 'APPROVED',       label: '✅ אשר',                   color: 'green'  },
    { status: 'IN_PROGRESS',    label: '↩ החזר לתיקון',            color: 'blue'   },
  ],
  APPROVED: [
    { status: 'SUBMITTED',      label: '📨 הגש',                   color: 'green'  },
  ],
}

// Button color classes
const BTN_COLORS: Record<string, string> = {
  blue:   'bg-blue-600 hover:bg-blue-700 text-white',
  yellow: 'bg-yellow-500 hover:bg-yellow-600 text-white',
  purple: 'bg-purple-600 hover:bg-purple-700 text-white',
  green:  'bg-green-600 hover:bg-green-700 text-white',
}

interface SubmitModalProps {
  onConfirm: (ref: string, notes: string) => void
  onClose: () => void
  isPending: boolean
}

function SubmitModal({ onConfirm, onClose, isPending }: SubmitModalProps) {
  const [ref, setRef] = useState('')
  const [notes, setNotes] = useState('')
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">📨 סיום הגשה</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">אסמכתא הגשה</label>
            <input
              value={ref}
              onChange={e => setRef(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="מס' אישור / אסמכתא..."
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">הערות</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 outline-none"
              rows={2}
              placeholder="הערות להגשה..."
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            ביטול
          </button>
          <button
            onClick={() => onConfirm(ref, notes)}
            disabled={isPending}
            className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold rounded-lg transition"
          >
            {isPending ? 'מגיש...' : '✅ אשר הגשה'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProcessDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  const { data: process, isLoading } = useQuery({
    queryKey: ['process', id],
    queryFn: () => processesApi.get(id!),
    enabled: !!id,
  })

  const statusMutation = useMutation({
    mutationFn: (body: { status: string; submissionRef?: string; submissionNotes?: string }) =>
      processesApi.updateStatus(id!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['process', id] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const stepMutation = useMutation({
    mutationFn: ({ stepId, status }: { stepId: string; status: string }) =>
      processesApi.updateStep(id!, stepId, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['process', id] }),
  })

  if (isLoading) return <div className="py-12 text-center text-gray-400">טוען...</div>
  if (!process) return <div className="text-red-600 p-4">תהליך לא נמצא</div>

  const statusLabel = PROCESS_STATUS_LABELS[process.status] ?? process.status
  const statusColor = {
    SUBMITTED: 'green', WAITING_CLIENT: 'yellow', APPROVED: 'green',
    READY_REVIEW: 'purple', UNDER_REVIEW: 'purple', CANCELLED: 'gray', CLOSED: 'gray',
  }[process.status] ?? 'blue'

  const availableTransitions = STATUS_TRANSITIONS[process.status] ?? []

  const completedSteps = process.steps?.filter(s => s.status === 'DONE').length ?? 0
  const totalSteps = process.steps?.length ?? 0

  return (
    <div className="space-y-5 max-w-4xl" dir="rtl">
      {showSubmitModal && (
        <SubmitModal
          isPending={statusMutation.isPending}
          onClose={() => setShowSubmitModal(false)}
          onConfirm={(ref, notes) => {
            statusMutation.mutate(
              { status: 'SUBMITTED', submissionRef: ref, submissionNotes: notes },
              { onSuccess: () => setShowSubmitModal(false) }
            )
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link to={`/clients/${process.client.id}`} className="text-blue-600 hover:underline text-sm">
            ← {process.client.name}
          </Link>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{process.template.name}</h1>
          <p className="text-gray-500">{process.periodLabel}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {process.isOverdue && (
            <Badge variant="red">{process.overdueDays} ימי חריגה</Badge>
          )}
          <Badge variant={statusColor as any}>{statusLabel}</Badge>
        </div>
      </div>

      {/* Dates + progress */}
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">דדליין הגשה</p>
            <p className={`font-semibold ${process.isOverdue ? 'text-red-600' : ''}`}>
              {new Date(process.dueDate).toLocaleDateString('he-IL')}
            </p>
          </div>
          <div>
            <p className="text-gray-500">SLA פנימי</p>
            <p className="font-semibold">{new Date(process.internalDueDate).toLocaleDateString('he-IL')}</p>
          </div>
          {process.submittedAt ? (
            <div>
              <p className="text-gray-500">הוגש ב</p>
              <p className="font-semibold text-green-600">{new Date(process.submittedAt).toLocaleDateString('he-IL')}</p>
            </div>
          ) : null}
          {process.submissionRef ? (
            <div>
              <p className="text-gray-500">אסמכתא</p>
              <p className="font-semibold font-mono" dir="ltr">{process.submissionRef}</p>
            </div>
          ) : null}
          {totalSteps > 0 && (
            <div>
              <p className="text-gray-500">התקדמות שלבים</p>
              <p className="font-semibold">{completedSteps} / {totalSteps}</p>
            </div>
          )}
        </div>
        {totalSteps > 0 && (
          <div className="mt-3">
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.round((completedSteps / totalSteps) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Steps timeline */}
      {process.steps && process.steps.length > 0 && (
        <Card title={`שלבי תהליך (${completedSteps}/${totalSteps})`}>
          <div className="space-y-2">
            {process.steps
              .sort((a, b) => a.templateStep.order - b.templateStep.order)
              .map(step => {
                const s = STEP_STATUS_LABELS[step.status] ?? { label: step.status, color: 'gray' as const }
                const isDone = step.status === 'DONE'
                const isSkipped = step.status === 'SKIPPED'
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-4 p-3 rounded-lg ${isDone ? 'bg-green-50' : 'bg-gray-50'}`}
                  >
                    {/* Circle */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      isDone
                        ? 'bg-green-500 text-white border-2 border-green-500'
                        : 'bg-white text-gray-600 border-2 border-gray-300'
                    }`}>
                      {isDone ? '✓' : step.templateStep.order}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {step.templateStep.name}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {step.templateStep.roleRequired && (
                          <span className="text-xs text-gray-400">{step.templateStep.roleRequired}</span>
                        )}
                        {step.assignee && (
                          <span className="text-xs text-gray-500">👤 {step.assignee.firstName} {step.assignee.lastName}</span>
                        )}
                        {step.completedAt && (
                          <span className="text-xs text-green-600">{new Date(step.completedAt).toLocaleDateString('he-IL')}</span>
                        )}
                      </div>
                    </div>

                    <Badge variant={s.color}>{s.label}</Badge>

                    {!isDone && !isSkipped && (
                      <div className="flex gap-2">
                        {step.status !== 'WAITING_CLIENT' && (
                          <button
                            onClick={() => stepMutation.mutate({ stepId: step.id, status: 'WAITING_CLIENT' })}
                            className="text-xs text-yellow-600 hover:text-yellow-800 font-medium"
                            title="ממתין ללקוח"
                          >
                            ⏳
                          </button>
                        )}
                        <button
                          onClick={() => stepMutation.mutate({ stepId: step.id, status: 'DONE' })}
                          disabled={stepMutation.isPending}
                          className="text-xs text-green-600 hover:text-green-800 font-medium whitespace-nowrap"
                        >
                          ✓ הושלם
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
          </div>
        </Card>
      )}

      {/* Status transitions */}
      {(availableTransitions.length > 0 || !['SUBMITTED', 'CLOSED', 'CANCELLED'].includes(process.status)) && (
        <Card title="פעולות">
          <div className="flex gap-3 flex-wrap">
            {availableTransitions.map(t => (
              <button
                key={t.status}
                onClick={() => {
                  if (t.status === 'SUBMITTED') {
                    setShowSubmitModal(true)
                  } else {
                    statusMutation.mutate({ status: t.status })
                  }
                }}
                disabled={statusMutation.isPending}
                className={`text-sm font-medium px-5 py-2.5 rounded-lg transition disabled:opacity-60 ${BTN_COLORS[t.color] ?? 'bg-gray-600 text-white hover:bg-gray-700'}`}
              >
                {t.label}
              </button>
            ))}

            {/* Submitted flow: show submit button if APPROVED or no transitions but not final */}
            {process.status === 'APPROVED' && (
              <button
                onClick={() => setShowSubmitModal(true)}
                disabled={statusMutation.isPending}
                className="text-sm font-medium px-5 py-2.5 rounded-lg transition bg-green-600 hover:bg-green-700 text-white disabled:opacity-60"
              >
                📨 הגש
              </button>
            )}
          </div>
          {statusMutation.isError && (
            <p className="text-red-600 text-sm mt-3">שגיאה בעדכון הסטטוס – נסה שוב</p>
          )}
        </Card>
      )}
    </div>
  )
}
