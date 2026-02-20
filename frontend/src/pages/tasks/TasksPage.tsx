import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '../../api/tasks'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { Task } from '../../types'

const PRIORITY_LABELS: Record<string, { label: string; color: 'default'|'red'|'yellow'|'green'|'blue'|'purple'|'gray' }> = {
  URGENT: { label: 'דחוף',   color: 'red'    },
  HIGH:   { label: 'גבוה',   color: 'yellow' },
  MEDIUM: { label: 'בינוני', color: 'blue'   },
  LOW:    { label: 'נמוך',   color: 'gray'   },
}

const TASK_TYPE_LABELS: Record<string, string> = {
  DATA_ENTRY:       'קליטת נתונים',
  REVIEW:           'בדיקה',
  CLIENT_CALL:      'שיחה עם לקוח',
  SUBMISSION:       'הגשה',
  DOCUMENT_REQUEST: 'בקשת מסמך',
  COLLECTION:       'גביה',
  ONBOARDING:       'קליטת לקוח',
  OTHER:            'אחר',
}

function TaskCard({ task, onDone }: { task: Task; onDone: (id: string) => void }) {
  const p = PRIORITY_LABELS[task.priority] ?? { label: task.priority, color: 'gray' as const }
  return (
    <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-medium text-gray-900 text-sm leading-snug">{task.title}</p>
        <Badge variant={p.color} size="sm">{p.label}</Badge>
      </div>
      {task.client && <p className="text-xs text-gray-500 mb-1">👥 {task.client.name}</p>}
      <p className="text-xs text-gray-400 mb-3">{TASK_TYPE_LABELS[task.taskType] ?? task.taskType}</p>
      {task.dueDate && (
        <p className={`text-xs mb-3 font-medium ${new Date(task.dueDate) < new Date() ? 'text-red-600' : 'text-gray-500'}`}>
          📅 {new Date(task.dueDate).toLocaleDateString('he-IL')}
        </p>
      )}
      {task.assignee && (
        <p className="text-xs text-gray-500 mb-3">👤 {task.assignee.firstName} {task.assignee.lastName}</p>
      )}
      <button
        onClick={() => onDone(task.id)}
        className="w-full text-xs bg-green-50 hover:bg-green-100 text-green-700 font-medium py-1.5 rounded-lg transition"
      >
        ✓ סיים משימה
      </button>
    </div>
  )
}

export default function TasksPage() {
  const [myTasks, setMyTasks] = useState(false)
  const [status, setStatus] = useState('OPEN')
  const [priority, setPriority] = useState('')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', myTasks, status, priority],
    queryFn: () => tasksApi.list({
      myTasks: myTasks ? true : undefined,
      status: status || undefined,
      priority: priority || undefined,
      limit: 50,
    }),
  })

  const doneMutation = useMutation({
    mutationFn: (id: string) => tasksApi.update(id, { status: 'DONE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  return (
    <div className="space-y-5" dir="rtl">
      <Card>
        <div className="flex flex-wrap gap-3 items-center">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={myTasks} onChange={e => setMyTasks(e.target.checked)} className="rounded" />
            המשימות שלי בלבד
          </label>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
            <option value="OPEN">פתוח</option>
            <option value="IN_PROGRESS">בעבודה</option>
            <option value="">הכל</option>
          </select>
          <select value={priority} onChange={e => setPriority(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none">
            <option value="">כל העדיפויות</option>
            <option value="URGENT">דחוף</option>
            <option value="HIGH">גבוה</option>
            <option value="MEDIUM">בינוני</option>
          </select>
          <span className="text-sm text-gray-500 mr-auto">{data?.total ?? 0} משימות</span>
        </div>
      </Card>

      {isLoading ? (
        <div className="py-12 text-center text-gray-400">טוען...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data?.data.map(task => (
            <TaskCard key={task.id} task={task} onDone={id => doneMutation.mutate(id)} />
          ))}
          {data?.data.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-400">אין משימות להצגה</div>
          )}
        </div>
      )}
    </div>
  )
}
