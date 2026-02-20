import { useAuth } from '../../hooks/useAuth'
import { useLocation } from 'react-router-dom'

const pageTitles: Record<string, string> = {
  '/dashboard':  'לוח בקרה',
  '/clients':    'לקוחות',
  '/processes':  'תהליכים',
  '/tasks':      'משימות',
  '/documents':  'מסמכים',
}

export function TopBar() {
  const { user } = useAuth()
  const location = useLocation()
  const title = Object.entries(pageTitles).find(([path]) => location.pathname.startsWith(path))?.[1] ?? ''

  return (
    <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between shadow-sm">
      <h2 className="font-semibold text-gray-800">{title}</h2>
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>{new Date().toLocaleDateString('he-IL')}</span>
        {user && <span className="text-gray-400">|</span>}
        {user && <span>שלום, {user.firstName}</span>}
      </div>
    </header>
  )
}
