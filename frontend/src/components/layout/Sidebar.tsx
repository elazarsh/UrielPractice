import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

interface NavItem {
  to: string
  icon: string
  label: string
}

const navItems: NavItem[] = [
  { to: '/dashboard',  icon: '🏠', label: 'לוח בקרה'    },
  { to: '/clients',    icon: '👥', label: 'לקוחות'       },
  { to: '/processes',  icon: '📋', label: 'תהליכים'      },
  { to: '/tasks',      icon: '✅', label: 'משימות'       },
  { to: '/documents',  icon: '📁', label: 'מסמכים'       },
]

export function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className="w-60 bg-white border-l border-gray-200 flex flex-col shadow-sm">
      {/* Logo */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">רו"ח</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-900 text-sm truncate">משרד רו"ח</p>
            <p className="text-xs text-gray-500 truncate">מערכת ניהול</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      {user && (
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-gray-500 truncate">{roleLabel(user.role)}</p>
            </div>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-red-500 transition text-sm mr-2"
              title="יציאה"
            >
              ↩
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}

function roleLabel(role: string) {
  const map: Record<string, string> = {
    ADMIN: 'מנהל ראשי', ACCOUNTANT: 'רו"ח', BOOKKEEPER: 'מנהל חשבונות',
    OFFICE_MANAGER: 'מנהל משרד', PAYROLL: 'רפרנט שכר', REVIEWER: 'בוחן',
  }
  return map[role] ?? role
}
