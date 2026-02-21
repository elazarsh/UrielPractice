/**
 * בוט #10 – חשב שכר עצמאי
 * שם: יוסי מזרחי (ADMIN credentials)
 * תפקיד: חשב שכר עצמאי שמנהל שכר ללקוחות רבים
 * מסכים: שכר, עובדים, טופס 102, תשלומי מס
 */

import { ApiClient, runScenario, fb } from '../api-client.js'
import { BotConfig, BotReport, FeedbackItem, ScenarioResult } from '../types.js'

const CONFIG: BotConfig = {
  id: 'freelance-accountant',
  personaName: 'יוסי מזרחי',
  personaRole: 'חשב שכר עצמאי',
  personaDescription:
    'אני חשב שכר עצמאי עם ניסיון של 12 שנה. מנהל שכר ל-35 לקוחות עסקיים. ' +
    'כל חודש אני צריך לעבד שכר, להגיש טופס 102 לרשויות ולוודא שהתשלומים הועברו בזמן. ' +
    'הכי חשוב לי: מעקב עובדים לכל לקוח, ראיית מועדי הגשה ותזכורות לטופס 102.',
  credentials: { email: 'admin@uriel-practice.co.il', password: 'Demo1234!' },
  baseUrl: 'http://localhost:3001',
}

export async function runFreelanceAccountantBot(): Promise<BotReport> {
  const api = new ApiClient(CONFIG.baseUrl, CONFIG.credentials!.email, CONFIG.credentials!.password)
  const scenarios: ScenarioResult[] = []
  const globalFeedback: FeedbackItem[] = []

  const loginOk = await api.login()
  if (!loginOk) {
    globalFeedback.push(fb('חובה', 'כניסה', 'חשב שכר עצמאי לא הצליח להתחבר', 'כניסה מוצלחת', 'נכשל'))
    return buildReport(CONFIG, scenarios, globalFeedback)
  }

  // ─── תרחיש 1: צפייה ברשימת עובדים ────────────
  scenarios.push(await runScenario('עובדים – צפייה ברשימת עובדים לפי לקוח', async () => {
    const feedback: FeedbackItem[] = []

    // קבל לקוח ראשון
    const clientsRes = await api.get<any>('/api/clients?limit=5')
    if (!clientsRes.ok) {
      feedback.push(fb('חובה', 'עובדים', 'לא ניתן לטעון לקוחות', 'רשימת לקוחות', `שגיאה ${clientsRes.status}`))
      return { status: clientsRes.status, data: null, feedback }
    }

    const clients = clientsRes.data?.data ?? []
    if (clients.length === 0) {
      feedback.push(fb('חובה', 'עובדים', 'אין לקוחות בדמו', 'לפחות לקוח אחד', '0 לקוחות'))
      return { status: 200, data: null, feedback }
    }

    // בדוק עובדים ל-3 לקוחות ראשונים
    let foundEmployees = false
    for (const client of clients.slice(0, 3)) {
      const empRes = await api.get<any>(`/api/payroll/client/${client.id}/employees`)
      if (!empRes.ok) {
        feedback.push(fb('חובה', 'עובדים', `אין גישה לעובדי לקוח ${client.name ?? client.id}`, 'רשימת עובדים', `שגיאה ${empRes.status}`))
        continue
      }
      const employees = Array.isArray(empRes.data) ? empRes.data : (empRes.data?.employees ?? [])
      if (employees.length > 0) {
        foundEmployees = true
        const emp = employees[0]
        if (!emp.name && !emp.fullName) {
          feedback.push(fb('חשוב', 'עובדים', 'שם העובד חסר בתגובת ה-API', 'שדה name/fullName', 'שדה חסר'))
        }
        if (!emp.idNumber && !emp.employeeId) {
          feedback.push(fb('חשוב', 'עובדים', 'תעודת זהות עובד חסרה', 'שדה idNumber', 'שדה חסר'))
        }
        if (emp.salary === undefined && emp.grossSalary === undefined) {
          feedback.push(fb('חשוב', 'עובדים', 'שכר עובד לא מוצג ברשימה', 'שדה salary/grossSalary', 'שדה חסר'))
        }
      }
    }

    if (!foundEmployees) {
      feedback.push(fb('חשוב', 'עובדים', 'לא נמצאו עובדים באף לקוח', 'עובדים לפי לקוח', '0 עובדים'))
    }

    feedback.push(fb('חשוב', 'עובדים', 'חסרת אפשרות לחפש עובד ספציפי על פני כל הלקוחות', 'חיפוש עובד גלובלי', 'חיפוש לפי לקוח בלבד'))
    feedback.push(fb('נחמד', 'עובדים', 'חסרת ייצוא רשימת עובדים ל-Excel לצורך הגשות', 'כפתור ייצוא Excel', 'אין'))

    return { status: 200, data: { clientsChecked: clients.slice(0, 3).length }, feedback }
  }))

  // ─── תרחיש 2: מועדי שכר קרובים ──────────────
  scenarios.push(await runScenario('שכר – מועדי הגשה קרובים', async () => {
    const feedback: FeedbackItem[] = []

    const upcomingRes = await api.get<any>('/api/tax-payments/upcoming')
    if (!upcomingRes.ok) {
      feedback.push(fb('חובה', 'מועדי שכר', 'לא ניתן לטעון תשלומי מס קרובים', 'רשימת תשלומים קרובים', `שגיאה ${upcomingRes.status}`))
      return { status: upcomingRes.status, data: null, feedback }
    }

    const upcoming = Array.isArray(upcomingRes.data) ? upcomingRes.data : (upcomingRes.data?.data ?? [])

    if (upcoming.length === 0) {
      feedback.push(fb('חשוב', 'מועדי שכר', 'אין תשלומי מס קרובים בדמו', 'לפחות תשלום אחד קרוב', '0'))
    } else {
      const payrollPayments = upcoming.filter((p: any) =>
        p.type === 'PAYROLL' || p.description?.includes('שכר') || p.description?.includes('ניכויים')
      )
      if (payrollPayments.length === 0) {
        feedback.push(fb('חשוב', 'מועדי שכר', 'לא נמצאו תשלומי שכר/ניכויים ברשימת התשלומים הקרובים', 'תשלומי PAYROLL', 'אין'))
      }
    }

    feedback.push(fb('חובה', 'מועדי שכר', 'חסר מסך ייעודי "מועדי הגשת שכר" עם ספירה לאחור ל-15 לחודש', 'ספירה לאחור עם אזהרה 3 ימים לפני', 'אין'))
    feedback.push(fb('חשוב', 'מועדי שכר', 'חסרת קישור ישיר מרשימת המועדים לטיפול בלקוח', 'כפתור "טפל עכשיו" ליד כל מועד', 'אין'))

    return { status: 200, data: upcomingRes.data, feedback }
  }))

  // ─── תרחיש 3: מעקב טופס 102 ──────────────────
  scenarios.push(await runScenario('טופס 102 – מעקב הגשות לכל לקוח', async () => {
    const feedback: FeedbackItem[] = []

    const procRes = await api.get<any>('/api/processes?limit=50')
    if (!procRes.ok) {
      feedback.push(fb('חובה', 'טופס 102', 'לא ניתן לטעון תהליכים', 'רשימת תהליכים', `שגיאה ${procRes.status}`))
      return { status: procRes.status, data: null, feedback }
    }

    const processes = procRes.data?.data ?? procRes.data ?? []
    const form102Processes = Array.isArray(processes)
      ? processes.filter((p: any) =>
          p.template?.processCode === 'FORM_102' ||
          p.processCode === 'FORM_102' ||
          p.name?.includes('102') ||
          p.title?.includes('102')
        )
      : []

    if (form102Processes.length === 0) {
      feedback.push(fb('חובה', 'טופס 102', 'לא נמצאו תהליכי טופס 102 בדמו', 'תהליכי הגשת 102 לכל לקוח', '0 תהליכים'))
    }

    feedback.push(fb('חובה', 'טופס 102', 'חסר מסך "ריכוז טופס 102" שמציג כל הלקוחות + סטטוס הגשה לחודש הנוכחי', 'טבלת: לקוח | חודש | סטטוס | תאריך הגשה', 'אין מסך ייעודי'))
    feedback.push(fb('חובה', 'טופס 102', 'חסרת אפשרות לסמן "טופס 102 הוגש" מבלי לפתוח תהליך מלא', 'צ\'קבוקס מהיר ברשימת לקוחות', 'צריך לנווט לתהליך'))
    feedback.push(fb('חשוב', 'טופס 102', 'חסרת ייצוא אוטומטי לקובץ הגשה לרשות המסים', 'ייצוא בפורמט רשות המסים', 'הכנה ידנית'))
    feedback.push(fb('נחמד', 'טופס 102', 'היה שימושי להציג גם את סכום ההגשה הצפוי לפי נתוני שכר', 'עמודת "סכום" בריכוז 102', 'אין'))

    return { status: 200, data: { form102Count: form102Processes.length }, feedback }
  }))

  // ─── תרחיש 4: תשלומים באיחור ─────────────────
  scenarios.push(await runScenario('שכר – לקוחות עם תשלומים באיחור', async () => {
    const feedback: FeedbackItem[] = []

    const overdueRes = await api.get<any>('/api/tax-payments/overdue')
    if (!overdueRes.ok) {
      feedback.push(fb('חובה', 'תשלומים באיחור', 'לא ניתן לטעון תשלומים באיחור', 'רשימת תשלומים', `שגיאה ${overdueRes.status}`))
      return { status: overdueRes.status, data: null, feedback }
    }

    const overdue = Array.isArray(overdueRes.data) ? overdueRes.data : (overdueRes.data?.data ?? [])
    if (overdue.length === 0) {
      feedback.push(fb('חשוב', 'תשלומים באיחור', 'אין תשלומים באיחור בדמו', 'נתוני דמו עם איחורים', '0'))
    } else {
      const hasClientName = overdue.some((p: any) => p.clientName || p.client?.name)
      if (!hasClientName) {
        feedback.push(fb('חשוב', 'תשלומים באיחור', 'שם הלקוח חסר בתצוגת תשלומים באיחור', 'שם לקוח ברור', 'רק מזהה'))
      }
      const hasDaysOverdue = overdue.some((p: any) => p.daysOverdue !== undefined)
      if (!hasDaysOverdue) {
        feedback.push(fb('חשוב', 'תשלומים באיחור', 'חסר מספר ימי איחור לכל תשלום', 'שדה daysOverdue', 'שדה חסר'))
      }
    }

    feedback.push(fb('חובה', 'תשלומים באיחור', 'חסרת שליחת SMS/אימייל אוטומטי ללקוח על תשלום שעבר מועדו', 'שליחה אוטומטית מהמסך', 'אין'))
    feedback.push(fb('נחמד', 'תשלומים באיחור', 'הייתה שימושית קישורית ישירה לאתר ביטוח לאומי לתשלום', 'קישור deep-link לתשלום', 'אין'))

    return { status: 200, data: overdueRes.data, feedback }
  }))

  return buildReport(CONFIG, scenarios, globalFeedback)
}

function buildReport(config: BotConfig, scenarios: ScenarioResult[], globalFeedback: FeedbackItem[]): BotReport {
  const allFeedback = [...globalFeedback, ...scenarios.flatMap(s => s.feedback)]
  return {
    botId: config.id,
    personaName: config.personaName,
    personaRole: config.personaRole,
    personaDescription: config.personaDescription,
    runAt: new Date().toISOString(),
    totalScenarios: scenarios.length,
    successfulScenarios: scenarios.filter(s => s.success).length,
    failedScenarios: scenarios.filter(s => !s.success).length,
    allFeedback,
    feedbackByPriority: {
      'חובה': allFeedback.filter(f => f.priority === 'חובה'),
      'חשוב': allFeedback.filter(f => f.priority === 'חשוב'),
      'נחמד': allFeedback.filter(f => f.priority === 'נחמד'),
    },
    scenarioResults: scenarios,
  }
}
