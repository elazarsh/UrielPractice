import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { processesApi } from '../../api/processes'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'

const STEP_STATUS_LABELS: Record<string, { label: string; color: 'default'|'red'|'yellow'|'green'|'blue'|'purple'|'gray' }> = {
  PENDING:        { label: 'ממתין',      color: 'gray'   },
  IN_PROGRESS:    { label: 'בעבודה',     color: 'blue'   },
  WAITING_CLIENT: { label: 'ממתין ללקוח', color: 'yellow' },
  DONE:           { label: 'הושלם',     color: 'green'  },
  SKIPPED:        { label: 'דולג',       color: 'gray'   },
  BLOCKED:        { label: 'חסום',       color: 'red'    },
}

export default function ProcessDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const { data: process, isLoading } = useQuery({
    queryKey: ['process', id],
    queryFn: () => processesApi.get(id!),
    enabled: !!id,
  })

  const submitMutation = useMutation({
    mutationFn: (ref: string) => processesApi.updateStatus(id!, { status: 'SUBMITTED', submissionRef: ref }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['process', id] }),
  })

  const stepMutation = useMutation({
    mutationFn: ({ stepId, status }: { stepId: string; status: string }) =>
      processesApi.updateStep(id!, stepId, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['process', id] }),
  })

  if (isLoading) return <div className="py-12 text-center text-gray-400">טוען...</div>
  if (!process) return <div className="text-red-600 p-4">תהליך לא נמצא</div>

  return (
    <div className="space-y-5 max-w-4xl" dir="rtl">
      <div className="flex items-start justify-between">
        <div>
          <Link to={`/clients/${process.client.id}`} className="text-blue-600 hover:underline text-sm">{process.client.name}</Link>
          <h1 className="text-xl font-bold text-gray-900 mt-1">{process.template.name}</h1>
          <p className="text-gray-500">{process.periodLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          {process.isOverdue && <Badge variant="red">{process.overdueDays} ימי חריגה</Badge>}
          <Badge variant={process.status === 'SUBMITTED' ? 'green' : process.status === 'WAITING_CLIENT' ? 'yellow' : 'blue'}>
            {process.status}
          </Badge>
        </div>
      </div>

      {/* Dates */}
      <Card>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div><p className="text-gray-500">דדליין הגשה</p><p className="font-semibold">{new Date(process.dueDate).toLocaleDateString('he-IL')}</p></div>
          <div><p className="text-gray-500">SLA פנימי</p><p className="font-semibold">{new Date(process.internalDueDate).toLocaleDateString('he-IL')}</p></div>
          {process.submittedAt && <div><p className="text-gray-500">הוגש ב</p><p className="font-semibold text-green-600">{new Date(process.submittedAt).toLocaleDateString('he-IL')}</p></div>}
        </div>
      </Card>

      {/* Steps timeline */}
      {process.steps && process.steps.length > 0 && (
        <Card title="שלבי תהליך">
          <div className="space-y-3">
            {process.steps
              .sort((a, b) => a.templateStep.order - b.templateStep.order)
              .map(step => {
                const s = STEP_STATUS_LABELS[step.status] ?? { label: step.status, color: 'gray' as const }
                return (
                  <div key={step.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-white border-2 border-gray-300 shrink-0">
                      {step.status === 'DONE' ? '✓' : step.templateStep.order}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{step.templateStep.name}</p>
                      {step.assignee && <p className="text-xs text-gray-500">{step.assignee.firstName} {step.assignee.lastName}</p>}
                    </div>
                    <Badge variant={s.color}>{s.label}</Badge>
                    {step.status !== 'DONE' && step.status !== 'SKIPPED' && (
                      <button
                        onClick={() => stepMutation.mutate({ stepId: step.id, status: 'DONE' })}
                        className="text-xs text-green-600 hover:text-green-800 font-medium"
                      >
                        סמן הושלם
                      </button>
                    )}
                  </div>
                )
              })}
          </div>
        </Card>
      )}

      {/* Submit action */}
      {!['SUBMITTED', 'CLOSED', 'CANCELLED'].includes(process.status) && (
        <Card title="פעולות">
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => {
                const ref = prompt('אסמכתא הגשה:')
                if (ref !== null) submitMutation.mutate(ref)
              }}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
            >
              ✅ סמן כהוגש
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}
