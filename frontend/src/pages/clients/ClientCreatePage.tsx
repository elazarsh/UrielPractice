import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { clientsApi } from '../../api/clients'
import { Card } from '../../components/ui/Card'
import { ClientType } from '../../types'

const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  OSEK_PATUR:   'עוסק פטור',
  OSEK_MURSHE:  'עוסק מורשה',
  CHEVRA_BVM:   'חברה בע"מ',
  SHUTAFUT:     'שותפות',
  AMUTA:        'עמותה',
  KIBBUTZ:      'קיבוץ',
  INDIVIDUAL:   'יחיד',
}

const VAT_FREQ_LABELS: Record<string, string> = {
  MONTHLY: 'חודשי',
  BIMONTHLY: 'דו-חודשי',
  EXEMPT: 'פטור',
}

interface FormData {
  name: string
  legalName: string
  taxId: string
  vatNumber: string
  clientType: ClientType
  industry: string
  email: string
  phone: string
  mobile: string
  city: string
  address: string
  vatFrequency: string
  hasPayroll: boolean
  powerOfAttorneyActive: boolean
  internalNotes: string
  tags: string
}

const INITIAL: FormData = {
  name: '', legalName: '', taxId: '', vatNumber: '', clientType: 'OSEK_MURSHE',
  industry: '', email: '', phone: '', mobile: '', city: '', address: '',
  vatFrequency: 'BIMONTHLY', hasPayroll: false, powerOfAttorneyActive: false,
  internalNotes: '', tags: '',
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 mr-1">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"

export default function ClientCreatePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormData>(INITIAL)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  const mutation = useMutation({
    mutationFn: () => {
      const tags = form.tags
        ? form.tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => ({ tag }))
        : []
      return clientsApi.create({
        name: form.name,
        legalName: form.legalName || undefined,
        taxId: form.taxId,
        vatNumber: form.vatNumber || undefined,
        clientType: form.clientType,
        industry: form.industry || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        mobile: form.mobile || undefined,
        city: form.city || undefined,
        address: form.address || undefined,
        vatFrequency: form.vatFrequency,
        hasPayroll: form.hasPayroll,
        powerOfAttorneyActive: form.powerOfAttorneyActive,
        internalNotes: form.internalNotes || undefined,
        tags,
        isActive: true,
        isFrozen: false,
      } as any)
    },
    onSuccess: (client) => navigate(`/clients/${client.id}`),
  })

  const set = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
    setForm(f => ({ ...f, [field]: value }))
    setErrors(err => { const n = { ...err }; delete n[field]; return n })
  }

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormData, string>> = {}
    if (!form.name.trim()) e.name = 'שם הלקוח נדרש'
    if (!form.taxId.trim()) e.taxId = 'ת.ז / ח.פ נדרש'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    mutation.mutate()
  }

  return (
    <div className="max-w-3xl space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/clients" className="text-gray-400 hover:text-gray-600 text-sm">← חזור לרשימת לקוחות</Link>
        <span className="text-gray-300">|</span>
        <h1 className="text-xl font-bold text-gray-900">לקוח חדש</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <Card title="פרטים בסיסיים">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="שם לקוח" required>
              <input value={form.name} onChange={set('name')} className={inputClass} placeholder="שם לתצוגה" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </Field>

            <Field label="שם משפטי">
              <input value={form.legalName} onChange={set('legalName')} className={inputClass} placeholder="שם רשמי (אם שונה)" />
            </Field>

            <Field label="ת.ז / ח.פ" required>
              <input value={form.taxId} onChange={set('taxId')} className={`${inputClass} font-mono`} placeholder="123456789" dir="ltr" />
              {errors.taxId && <p className="text-red-500 text-xs mt-1">{errors.taxId}</p>}
            </Field>

            <Field label={'מספר עוסק / מע"מ'}>
              <input value={form.vatNumber} onChange={set('vatNumber')} className={`${inputClass} font-mono`} placeholder="מספר עוסק" dir="ltr" />
            </Field>

            <Field label="סוג לקוח">
              <select value={form.clientType} onChange={set('clientType')} className={inputClass}>
                {Object.entries(CLIENT_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>

            <Field label="ענף / תחום עיסוק">
              <input value={form.industry} onChange={set('industry')} className={inputClass} placeholder="תעשייה, מסחר, שירותים..." />
            </Field>
          </div>
        </Card>

        {/* Contact Info */}
        <Card title="פרטי יצירת קשר">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="אימייל">
              <input type="email" value={form.email} onChange={set('email')} className={inputClass} placeholder="client@example.com" dir="ltr" />
            </Field>
            <Field label="טלפון">
              <input value={form.phone} onChange={set('phone')} className={inputClass} placeholder="03-1234567" dir="ltr" />
            </Field>
            <Field label="נייד">
              <input value={form.mobile} onChange={set('mobile')} className={inputClass} placeholder="050-1234567" dir="ltr" />
            </Field>
            <Field label="עיר">
              <input value={form.city} onChange={set('city')} className={inputClass} placeholder="תל אביב" />
            </Field>
            <Field label="כתובת">
              <input value={form.address} onChange={set('address')} className={`${inputClass} md:col-span-2`} placeholder="רחוב, מספר, עיר" />
            </Field>
          </div>
        </Card>

        {/* Accounting Settings */}
        <Card title="הגדרות חשבונאות">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label='תדירות דיווח מע"מ'>
              <select value={form.vatFrequency} onChange={set('vatFrequency')} className={inputClass}>
                {Object.entries(VAT_FREQ_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>

            <div className="flex flex-col justify-center gap-3 pt-5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.hasPayroll}
                  onChange={set('hasPayroll')}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">ניהול שכר (Payroll)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.powerOfAttorneyActive}
                  onChange={set('powerOfAttorneyActive')}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">ייפוי כוח פעיל</span>
              </label>
            </div>
          </div>
        </Card>

        {/* Tags & Notes */}
        <Card title="תגיות והערות">
          <div className="space-y-4">
            <Field label="תגיות (מופרדות בפסיקים)">
              <input
                value={form.tags}
                onChange={set('tags')}
                className={inputClass}
                placeholder="VIP, מועדף, דחוף..."
              />
            </Field>
            <Field label="הערות פנימיות">
              <textarea
                value={form.internalNotes}
                onChange={set('internalNotes')}
                className={`${inputClass} resize-none`}
                rows={3}
                placeholder="הערות לצוות המשרד בלבד..."
              />
            </Field>
          </div>
        </Card>

        {/* Error from server */}
        {mutation.isError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            שגיאה ביצירת הלקוח – בדוק שהפרטים תקינים ונסה שוב
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Link
            to="/clients"
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            ביטול
          </Link>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition"
          >
            {mutation.isPending ? 'יוצר לקוח...' : '+ צור לקוח'}
          </button>
        </div>
      </form>
    </div>
  )
}
