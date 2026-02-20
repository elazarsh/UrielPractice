import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsApi } from '../../api/documents'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { Document } from '../../types'

const STATUS_LABELS: Record<string, { label: string; color: 'default'|'red'|'yellow'|'green'|'blue'|'purple'|'gray' }> = {
  RECEIVED: { label: 'התקבל',   color: 'blue'   },
  VALID:    { label: 'תקין',    color: 'green'  },
  INVALID:  { label: 'לא תקין', color: 'red'    },
  EXPIRED:  { label: 'פג תוקף', color: 'yellow' },
}

const DOC_TYPE_LABELS: Record<string, string> = {
  INVOICE:         'חשבונית',
  BANK_STATEMENT:  'דף חשבון בנק',
  TAX_REPORT:      'דוח מס',
  SALARY_SLIP:     'תלוש שכר',
  RECEIPT:         'קבלה',
  CONTRACT:        'חוזה',
  ID_COPY:         'צילום ת"ז',
  FINANCIAL_STMT:  'דוח כספי',
  VAT_REPORT:      'דוח מע"מ',
  OTHER:           'אחר',
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DocumentRow({ doc, onApprove, onReject }: {
  doc: Document
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  const s = STATUS_LABELS[doc.status] ?? { label: doc.status, color: 'gray' as const }
  return (
    <tr className="hover:bg-gray-50 transition border-b border-gray-100">
      <td className="px-4 py-3 text-sm text-gray-800 font-medium max-w-xs truncate">
        📄 {doc.fileName}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{formatSize(doc.fileSize)}</td>
      <td className="px-4 py-3">
        {doc.periodYear && (
          <span className="text-xs text-gray-400">
            {doc.periodMonth ? `${doc.periodMonth}/${doc.periodYear}` : doc.periodYear}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge variant={s.color} size="sm">{s.label}</Badge>
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">
        {new Date(doc.createdAt).toLocaleDateString('he-IL')}
      </td>
      <td className="px-4 py-3">
        {doc.status === 'RECEIVED' && (
          <div className="flex gap-2">
            <button
              onClick={() => onApprove(doc.id)}
              className="text-xs bg-green-50 hover:bg-green-100 text-green-700 font-medium px-3 py-1 rounded-lg transition"
            >
              ✓ אשר
            </button>
            <button
              onClick={() => onReject(doc.id)}
              className="text-xs bg-red-50 hover:bg-red-100 text-red-700 font-medium px-3 py-1 rounded-lg transition"
            >
              ✗ דחה
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

export default function DocumentsPage() {
  const [status, setStatus] = useState('')
  const [docType, setDocType] = useState('')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['documents', status, docType],
    queryFn: () => documentsApi.list({
      status: status || undefined,
      documentType: docType || undefined,
    }),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => documentsApi.updateStatus(id, 'VALID'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) => documentsApi.updateStatus(id, 'INVALID'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })

  return (
    <div className="space-y-5" dir="rtl">
      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
          >
            <option value="">כל הסטטוסים</option>
            <option value="RECEIVED">התקבל</option>
            <option value="VALID">תקין</option>
            <option value="INVALID">לא תקין</option>
            <option value="EXPIRED">פג תוקף</option>
          </select>
          <select
            value={docType}
            onChange={e => setDocType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none"
          >
            <option value="">כל סוגי המסמכים</option>
            {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <span className="text-sm text-gray-500 mr-auto">{data?.total ?? 0} מסמכים</span>
        </div>
      </Card>

      {/* Table */}
      {isLoading ? (
        <div className="py-12 text-center text-gray-400">טוען...</div>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">שם קובץ</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">סוג</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">גודל</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">תקופה</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">סטטוס</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">תאריך</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map(doc => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    onApprove={id => approveMutation.mutate(id)}
                    onReject={id => rejectMutation.mutate(id)}
                  />
                ))}
                {data?.data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      אין מסמכים להצגה
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
