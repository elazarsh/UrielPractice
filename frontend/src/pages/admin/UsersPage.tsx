import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { User, UserRole } from '../../types'
import { useAuth } from '../../hooks/useAuth'

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN:          'מנהל ראשי',
  ACCOUNTANT:     'רו"ח',
  BOOKKEEPER:     'מנהל חשבונות',
  OFFICE_MANAGER: 'מנהל משרד',
  PAYROLL:        'רפרנט שכר',
  REVIEWER:       'בוחן',
  CLIENT_USER:    'משתמש לקוח',
}

const ROLE_COLOR: Record<UserRole, 'default'|'red'|'yellow'|'green'|'blue'|'purple'|'gray'> = {
  ADMIN:          'red',
  ACCOUNTANT:     'blue',
  BOOKKEEPER:     'blue',
  OFFICE_MANAGER: 'purple',
  PAYROLL:        'yellow',
  REVIEWER:       'green',
  CLIENT_USER:    'gray',
}

interface UserWithStats extends User {
  openTasks?: number
}

function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.get<UserWithStats[]>('/users').then(r => r.data),
  })
}

interface InviteForm {
  email: string
  firstName: string
  lastName: string
  role: UserRole
  password: string
}

const INVITE_INITIAL: InviteForm = {
  email: '', firstName: '', lastName: '', role: 'BOOKKEEPER', password: '',
}

const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"

function InviteModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<InviteForm>(INVITE_INITIAL)
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => apiClient.post('/users', form).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      onClose()
    },
    onError: () => setError('שגיאה ביצירת המשתמש – ייתכן שהאימייל כבר קיים'),
  })

  const set = (field: keyof InviteForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm(f => ({ ...f, [field]: e.target.value }))

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">הזמנת משתמש חדש</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">שם פרטי *</label>
              <input value={form.firstName} onChange={set('firstName')} className={inputClass} placeholder="ישראל" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">שם משפחה *</label>
              <input value={form.lastName} onChange={set('lastName')} className={inputClass} placeholder="ישראלי" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">אימייל *</label>
            <input type="email" value={form.email} onChange={set('email')} className={inputClass} placeholder="user@firm.co.il" dir="ltr" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">סיסמה ראשונית *</label>
            <input type="password" value={form.password} onChange={set('password')} className={inputClass} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">תפקיד</label>
            <select value={form.role} onChange={set('role')} className={inputClass}>
              {Object.entries(ROLE_LABELS).filter(([k]) => k !== 'CLIENT_USER').map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            ביטול
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.email || !form.firstName || !form.password}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-lg transition"
          >
            {mutation.isPending ? 'יוצר...' : 'צור משתמש'}
          </button>
        </div>
      </div>
    </div>
  )
}

function UserRow({ user, onToggle, isMe }: { user: UserWithStats; onToggle: () => void; isMe: boolean }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
            {user.firstName[0]}{user.lastName[0]}
          </div>
          <div>
            <p className="font-medium text-gray-900 text-sm">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-gray-500" dir="ltr">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant={ROLE_COLOR[user.role]}>{ROLE_LABELS[user.role]}</Badge>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{user.phone ?? '—'}</td>
      <td className="px-4 py-3">
        <Badge variant={user.isActive ? 'green' : 'gray'}>{user.isActive ? 'פעיל' : 'מושהה'}</Badge>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('he-IL') : 'מעולם לא'}
      </td>
      <td className="px-4 py-3">
        {!isMe && (
          <button
            onClick={onToggle}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${
              user.isActive
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-green-50 text-green-600 hover:bg-green-100'
            }`}
          >
            {user.isActive ? 'השהה' : 'הפעל'}
          </button>
        )}
        {isMe && <span className="text-xs text-gray-400">זה אתה</span>}
      </td>
    </tr>
  )
}

export default function UsersPage() {
  const { user: me } = useAuth()
  const [showInvite, setShowInvite] = useState(false)
  const qc = useQueryClient()

  const { data: users, isLoading } = useUsers()

  const toggleMutation = useMutation({
    mutationFn: (u: User) => apiClient.patch(`/users/${u.id}`, { isActive: !u.isActive }).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const activeCount = users?.filter(u => u.isActive).length ?? 0

  return (
    <div className="space-y-5" dir="rtl">
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ניהול משתמשים</h1>
          <p className="text-sm text-gray-500 mt-0.5">{activeCount} משתמשים פעילים</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          + הוסף משתמש
        </button>
      </div>

      {/* Role summary */}
      {users && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {(Object.keys(ROLE_LABELS) as UserRole[]).filter(r => r !== 'CLIENT_USER').map(role => {
            const count = users.filter(u => u.role === role).length
            if (count === 0) return null
            return (
              <div key={role} className="bg-white border border-gray-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500 mt-0.5">{ROLE_LABELS[role]}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">טוען...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['משתמש', 'תפקיד', 'טלפון', 'סטטוס', 'כניסה אחרונה', ''].map(h => (
                    <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users?.map(u => (
                  <UserRow
                    key={u.id}
                    user={u}
                    isMe={u.id === me?.id}
                    onToggle={() => toggleMutation.mutate(u)}
                  />
                ))}
                {users?.length === 0 && (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400">אין משתמשים</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info */}
      <Card>
        <p className="text-sm text-gray-500">
          <span className="font-medium">שים לב:</span> {' '}
          השהיית משתמש מונעת ממנו להתחבר אך אינה מוחקת את הנתונים שלו. לניהול הרשאות מפורט פנה למנהל המערכת.
        </p>
      </Card>
    </div>
  )
}
