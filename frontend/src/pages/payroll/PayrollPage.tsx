import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { payrollApi, Employee, PayrollRecord } from '../../api/payroll'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(n)
}

const MONTHS_HE = ['', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

const now = new Date()
const CUR_YEAR = now.getFullYear()
const CUR_MONTH = now.getMonth() + 1

export default function PayrollPage() {
  const qc = useQueryClient()
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [tab, setTab] = useState<'employees' | 'records'>('employees')
  const [year, setYear] = useState(CUR_YEAR)
  const [month, setMonth] = useState(CUR_MONTH)
  const [showNewEmployee, setShowNewEmployee] = useState(false)
  const [empForm, setEmpForm] = useState({ firstName: '', lastName: '', idNumber: '', startDate: '', monthlySalary: '', pensionFund: '', bankAccount: '', notes: '' })

  const { data: clients } = useQuery({
    queryKey: ['clients-for-payroll'],
    queryFn: () => fetch('/api/clients?limit=200', { credentials: 'include' }).then(r => r.json()).then((r: { data: { id: string; name: string; hasPayroll: boolean }[] }) => r.data.filter(c => c.hasPayroll)),
  })
  const { data: employees = [], isLoading: loadingEmp } = useQuery({
    queryKey: ['employees', selectedClient],
    queryFn: () => payrollApi.listEmployees(selectedClient!),
    enabled: !!selectedClient && tab === 'employees',
  })
  const { data: records = [], isLoading: loadingRec } = useQuery({
    queryKey: ['payroll-records', selectedClient, year, month],
    queryFn: () => payrollApi.listRecords(selectedClient!, { year, month }),
    enabled: !!selectedClient && tab === 'records',
  })
  const { data: summary } = useQuery({
    queryKey: ['payroll-summary', selectedClient, year, month],
    queryFn: () => payrollApi.summary(selectedClient!, year, month),
    enabled: !!selectedClient && tab === 'records',
  })

  const createEmpMutation = useMutation({
    mutationFn: () => payrollApi.createEmployee(selectedClient!, {
      firstName: empForm.firstName,
      lastName: empForm.lastName,
      idNumber: empForm.idNumber,
      startDate: new Date(empForm.startDate).toISOString(),
      monthlySalary: empForm.monthlySalary ? parseFloat(empForm.monthlySalary) : undefined,
      pensionFund: empForm.pensionFund || undefined,
      bankAccount: empForm.bankAccount || undefined,
      notes: empForm.notes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees', selectedClient] })
      setShowNewEmployee(false)
      setEmpForm({ firstName: '', lastName: '', idNumber: '', startDate: '', monthlySalary: '', pensionFund: '', bankAccount: '', notes: '' })
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => payrollApi.deactivateEmployee(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees', selectedClient] }),
  })

  const clientList = clients ?? []

  return (
    <div className="flex gap-6 min-h-0" dir="rtl">
      {/* Client sidebar */}
      <div className="w-56 bg-white border border-gray-200 rounded-xl overflow-y-auto shrink-0" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
        <div className="p-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 text-sm">לקוחות עם שכר</h2>
        </div>
        {clientList.length === 0 ? (
          <p className="text-xs text-gray-400 p-3">אין לקוחות עם מודול שכר</p>
        ) : clientList.map((c: { id: string; name: string }) => (
          <button
            key={c.id}
            onClick={() => setSelectedClient(c.id)}
            className={`w-full text-right px-3 py-2.5 text-sm border-b border-gray-50 hover:bg-gray-50 ${
              selectedClient === c.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Main area */}
      <div className="flex-1 space-y-4 min-w-0">
        {!selectedClient ? (
          <div className="flex items-center justify-center h-64 text-gray-400">בחר לקוח מהרשימה</div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2">
              <button onClick={() => setTab('employees')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border ${tab === 'employees' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                עובדים ({employees.length})
              </button>
              <button onClick={() => setTab('records')}
                className={`px-4 py-2 rounded-lg text-sm font-medium border ${tab === 'records' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                תלושי שכר
              </button>
            </div>

            {tab === 'employees' && (
              <>
                <div className="flex justify-end">
                  <button onClick={() => setShowNewEmployee(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                    + עובד חדש
                  </button>
                </div>

                {showNewEmployee && (
                  <Card title="הוספת עובד">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-500">שם פרטי</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5" value={empForm.firstName}
                          onChange={e => setEmpForm(p => ({ ...p, firstName: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">שם משפחה</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5" value={empForm.lastName}
                          onChange={e => setEmpForm(p => ({ ...p, lastName: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">מספר ת"ז</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5" value={empForm.idNumber}
                          onChange={e => setEmpForm(p => ({ ...p, idNumber: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">תאריך התחלה</label>
                        <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5" value={empForm.startDate}
                          onChange={e => setEmpForm(p => ({ ...p, startDate: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">משכורת חודשית ₪</label>
                        <input type="number" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5" value={empForm.monthlySalary}
                          onChange={e => setEmpForm(p => ({ ...p, monthlySalary: e.target.value }))} />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">קרן פנסיה</label>
                        <input className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5" value={empForm.pensionFund}
                          onChange={e => setEmpForm(p => ({ ...p, pensionFund: e.target.value }))} placeholder="מגדל, מנורה, ..." />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4 justify-end">
                      <button onClick={() => setShowNewEmployee(false)} className="text-sm text-gray-500 px-3 py-1.5">ביטול</button>
                      <button onClick={() => createEmpMutation.mutate()}
                        disabled={!empForm.firstName || !empForm.lastName || !empForm.idNumber || !empForm.startDate || createEmpMutation.isPending}
                        className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm disabled:opacity-50">
                        {createEmpMutation.isPending ? 'שומר...' : 'הוסף עובד'}
                      </button>
                    </div>
                  </Card>
                )}

                <Card title="רשימת עובדים">
                  {loadingEmp ? <p className="text-gray-400 text-sm text-center py-6">טוען...</p> :
                    employees.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">אין עובדים רשומים</p> : (
                      <div className="space-y-2">
                        {(employees as Employee[]).map(emp => (
                          <div key={emp.id} className="flex items-center justify-between py-2.5 border-b border-gray-50">
                            <div>
                              <p className="font-medium text-sm">{emp.firstName} {emp.lastName}</p>
                              <p className="text-xs text-gray-400">ת"ז: {emp.idNumber} {emp.monthlySalary ? `| ${formatCurrency(emp.monthlySalary)}/חודש` : ''}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              {emp.isActive ? <Badge variant="green">פעיל</Badge> : <Badge variant="red">לא פעיל</Badge>}
                              {emp.isActive && (
                                <button onClick={() => deactivateMutation.mutate(emp.id)}
                                  className="text-xs text-red-500 hover:text-red-700">סיים העסקה</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </Card>
              </>
            )}

            {tab === 'records' && (
              <>
                {/* Period selector */}
                <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
                  <span className="text-sm text-gray-600">תקופה:</span>
                  <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm" value={month} onChange={e => setMonth(+e.target.value)}>
                    {MONTHS_HE.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                  </select>
                  <input type="number" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm w-24" value={year} onChange={e => setYear(+e.target.value)} />
                </div>

                {/* Summary */}
                {summary && (
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    <Card className="text-center p-3">
                      <p className="text-xs text-gray-400">עובדים</p>
                      <p className="text-xl font-bold">{summary.employeeCount}</p>
                    </Card>
                    <Card className="text-center p-3">
                      <p className="text-xs text-gray-400">ברוטו</p>
                      <p className="text-lg font-bold text-gray-800">{formatCurrency(summary.totalGross)}</p>
                    </Card>
                    <Card className="text-center p-3">
                      <p className="text-xs text-gray-400">נטו</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(summary.totalNet)}</p>
                    </Card>
                    <Card className="text-center p-3">
                      <p className="text-xs text-gray-400">עלות מעסיק</p>
                      <p className="text-lg font-bold text-orange-600">{formatCurrency(summary.totalEmployerCost)}</p>
                    </Card>
                    <Card className="text-center p-3">
                      <p className="text-xs text-gray-400">טופס 102</p>
                      <p className="text-lg font-bold text-purple-600">{formatCurrency(summary.form102Amount)}</p>
                    </Card>
                  </div>
                )}

                <Card title="תלושי שכר">
                  {loadingRec ? <p className="text-gray-400 text-sm text-center py-6">טוען...</p> :
                    records.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">אין תלושים לתקופה זו</p> : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-right border-b border-gray-100">
                            <th className="pb-2 font-semibold text-gray-600">עובד</th>
                            <th className="pb-2 font-semibold text-gray-600">ברוטו</th>
                            <th className="pb-2 font-semibold text-gray-600">מ"ה</th>
                            <th className="pb-2 font-semibold text-gray-600">בל"ל עובד</th>
                            <th className="pb-2 font-semibold text-gray-600">פנסיה</th>
                            <th className="pb-2 font-semibold text-gray-600">נטו</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(records as PayrollRecord[]).map(rec => (
                            <tr key={rec.id} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="py-2 font-medium">{rec.employee ? `${rec.employee.firstName} ${rec.employee.lastName}` : '—'}</td>
                              <td className="py-2">{formatCurrency(rec.grossSalary)}</td>
                              <td className="py-2 text-red-600">-{formatCurrency(rec.incomeTaxWithheld)}</td>
                              <td className="py-2 text-red-600">-{formatCurrency(rec.nationalInsuranceEmp)}</td>
                              <td className="py-2 text-red-600">-{formatCurrency(rec.pensionEmployee)}</td>
                              <td className="py-2 font-bold text-green-700">{formatCurrency(rec.netSalary)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
