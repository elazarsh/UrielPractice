import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthContext } from './hooks/useAuth'
import { useAuthProvider } from './hooks/useAuthProvider'
import { Layout } from './components/layout/Layout'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import ClientsPage from './pages/clients/ClientsPage'
import ClientDetailPage from './pages/clients/ClientDetailPage'
import ProcessesPage from './pages/processes/ProcessesPage'
import ProcessDetailPage from './pages/processes/ProcessDetailPage'
import TasksPage from './pages/tasks/TasksPage'
import DocumentsPage from './pages/documents/DocumentsPage'
import BillingPage from './pages/billing/BillingPage'
import TaxPaymentsPage from './pages/tax-payments/TaxPaymentsPage'
import CommunicationsPage from './pages/communications/CommunicationsPage'
import PayrollPage from './pages/payroll/PayrollPage'
import AuditLogPage from './pages/admin/AuditLogPage'
import CalendarPage from './pages/calendar/CalendarPage'
import ReportsPage from './pages/reports/ReportsPage'
import TaxFormsPage from './pages/tax-forms/TaxFormsPage'
import OnboardingPage from './pages/onboarding/OnboardingPage'
import RemindersPage from './pages/reminders/RemindersPage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const auth = useAuthProvider()
  if (auth.isLoading) return <div className="flex items-center justify-center h-screen">טוען...</div>
  if (!auth.isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const auth = useAuthProvider()
  return (
    <AuthContext.Provider value={auth}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"          element={<DashboardPage />} />
          <Route path="clients"            element={<ClientsPage />} />
          <Route path="clients/:id"        element={<ClientDetailPage />} />
          <Route path="processes"          element={<ProcessesPage />} />
          <Route path="processes/:id"      element={<ProcessDetailPage />} />
          <Route path="tasks"              element={<TasksPage />} />
          <Route path="documents"          element={<DocumentsPage />} />
          <Route path="billing"            element={<BillingPage />} />
          <Route path="tax-payments"       element={<TaxPaymentsPage />} />
          <Route path="communications"     element={<CommunicationsPage />} />
          <Route path="payroll"            element={<PayrollPage />} />
          <Route path="audit-log"          element={<AuditLogPage />} />
          <Route path="calendar"           element={<CalendarPage />} />
          <Route path="reports"            element={<ReportsPage />} />
          <Route path="tax-forms"          element={<TaxFormsPage />} />
          <Route path="onboarding"         element={<OnboardingPage />} />
          <Route path="reminders"          element={<RemindersPage />} />
        </Route>
      </Routes>
    </AuthContext.Provider>
  )
}
