/**
 * בוט #16 – נציגת בנק
 * שם: לאה דוד (ADMIN credentials)
 * תפקיד: נציגת בנק שמבקשת דוחות פיננסיים של לקוחות לצורך אשראי
 * מסכים: חיובים, תהליכים, מסמכים, ייצוא
 */

import { ApiClient, runScenario, fb } from '../api-client.js'
import { BotConfig, BotReport, FeedbackItem, ScenarioResult } from '../types.js'

const CONFIG: BotConfig = {
  id: 'bank-rep',
  personaName: 'לאה דוד',
  personaRole: 'נציגת בנק – אנליסטית אשראי',
  personaDescription:
    'אני נציגת בנק שבודקת בקשות אשראי לעסקים. ' +
    'צריכה לראות דוחות פיננסיים, היסטוריית תשלומים, מאזנים ודוחות שנתיים. ' +
    'הכי חשוב לי: נגישות מהירה לדוחות מוסמכים, אפשרות הורדת PDF ומסמכים חתומים.',
  credentials: { email: 'admin@uriel-practice.co.il', password: 'Demo1234!' },
  baseUrl: 'http://localhost:3001',
}

export async function runBankRepBot(): Promise<BotReport> {
  const api = new ApiClient(CONFIG.baseUrl, CONFIG.credentials!.email, CONFIG.credentials!.password)
  const scenarios: ScenarioResult[] = []
  const globalFeedback: FeedbackItem[] = []

  const loginOk = await api.login()
  if (!loginOk) {
    globalFeedback.push(fb('חובה', 'כניסה', 'נציגת הבנק לא הצליחה להתחבר', 'כניסה מוצלחת', 'נכשל'))
    return buildReport(CONFIG, scenarios, globalFeedback)
  }

  // ─── תרחיש 1: בדיקת חיובים והיסטוריה ────────
  scenarios.push(await runScenario('חיובים – היסטוריה פיננסית', async () => {
    const feedback: FeedbackItem[] = []

    const billingRes = await api.get<any>('/api/billing?limit=20')
    if (!billingRes.ok) {
      feedback.push(fb('חובה', 'חיובים', 'לא ניתן לטעון חיובים', 'היסטוריית חיובים', `שגיאה ${billingRes.status}`))
      return { status: billingRes.status, data: null, feedback }
    }

    const charges = billingRes.data?.data ?? billingRes.data ?? []
    const chargeList = Array.isArray(charges) ? charges : []

    if (chargeList.length === 0) {
      feedback.push(fb('חשוב', 'חיובים', 'אין חיובים בדמו', 'היסטוריית חיובים', '0 רשומות'))
    } else {
      const hasDate = chargeList.some((c: any) => c.date || c.createdAt || c.billingDate)
      if (!hasDate) {
        feedback.push(fb('חובה', 'חיובים', 'חסר תאריך חיוב – לא ניתן לאמת תקופת הפעילות', 'שדה date/billingDate', 'שדה חסר'))
      }
      const hasAmount = chargeList.some((c: any) => c.amount !== undefined)
      if (!hasAmount) {
        feedback.push(fb('חובה', 'חיובים', 'חסר סכום חיוב – לא ניתן לנתח הוצאות', 'שדה amount', 'שדה חסר'))
      }
      const hasPaid = chargeList.some((c: any) => c.paid !== undefined || c.paymentStatus)
      if (!hasPaid) {
        feedback.push(fb('חשוב', 'חיובים', 'חסר סטטוס תשלום לכל חיוב', 'שדה paid/paymentStatus', 'שדה חסר'))
      }
    }

    feedback.push(fb('חובה', 'חיובים', 'לא ניתן לייצא דוח חיובים ל-PDF/Excel לצורך בנקאי', 'ייצוא PDF/Excel עם חתימה', 'אין'))
    feedback.push(fb('חובה', 'חיובים', 'חסרת סיכום שנתי מוסמך על ידי רואה חשבון', 'דוח שנתי מוסמך', 'אין'))
    feedback.push(fb('נחמד', 'חיובים', 'הייתה שימושית אפשרות לקבל דוח ישירות לאימייל המוסד הפיננסי', 'שליחה ישירה לבנק', 'אין'))

    return { status: 200, data: { chargesFound: chargeList.length }, feedback }
  }))

  // ─── תרחיש 2: סטטוס תהליכים – מיסוי ─────────
  scenarios.push(await runScenario('תהליכים – מצב הגשות מיסוי', async () => {
    const feedback: FeedbackItem[] = []

    const procRes = await api.get<any>('/api/processes?limit=20')
    if (!procRes.ok) {
      feedback.push(fb('חובה', 'תהליכים', 'לא ניתן לטעון תהליכים', 'סטטוס תהליכים', `שגיאה ${procRes.status}`))
      return { status: procRes.status, data: null, feedback }
    }

    const processes = procRes.data?.data ?? procRes.data ?? []
    const processList = Array.isArray(processes) ? processes : []

    if (processList.length === 0) {
      feedback.push(fb('חשוב', 'תהליכים', 'אין תהליכים בדמו', 'תהליכי מס לאימות', '0'))
    } else {
      const hasSubmissionDate = processList.some((p: any) => p.submittedAt || p.completedAt || p.submissionDate)
      if (!hasSubmissionDate) {
        feedback.push(fb('חובה', 'תהליכים', 'חסר תאריך הגשה בתהליכים – לא ניתן לאמת ציות', 'שדה submittedAt/completedAt', 'שדה חסר'))
      }

      const completedProcs = processList.filter((p: any) => p.status === 'COMPLETED' || p.status === 'DONE')
      if (completedProcs.length === 0) {
        feedback.push(fb('חשוב', 'תהליכים', 'אין תהליכים מושלמים בדמו לצורך אימות', 'לפחות 3 תהליכים מושלמים', '0'))
      }
    }

    feedback.push(fb('חובה', 'תהליכים', 'חסר דוח "ציות מיסויי" שמראה אם הגשות בוצעו בזמן לכל שנה', 'Compliance report שנתי', 'אין'))
    feedback.push(fb('חשוב', 'תהליכים', 'חסרת תיעוד אישורי הגשה מהרשויות (אישור קבלה)', 'אישורי submission מהרשויות', 'אין'))

    return { status: 200, data: { processCount: processList.length }, feedback }
  }))

  // ─── תרחיש 3: חיפוש אפשרויות ייצוא ─────────
  scenarios.push(await runScenario('ייצוא – בדיקת אפשרויות דוחות', async () => {
    const feedback: FeedbackItem[] = []

    // בדיקת endpoint ייצוא אפשרי
    const exportRes = await api.get<any>('/api/billing/export')
    const exportJson = await api.get<any>('/api/reports/export')
    const reportsRes = await api.get<any>('/api/reports')

    const anyExportWorks = exportRes.ok || exportJson.ok || reportsRes.ok
    if (!anyExportWorks) {
      feedback.push(fb('חובה', 'ייצוא', 'אין endpoints לייצוא דוחות (בדקתי /billing/export, /reports/export, /reports)', 'API ייצוא דוחות', `שגיאות: ${exportRes.status}, ${exportJson.status}, ${reportsRes.status}`))
    }

    feedback.push(fb('חובה', 'ייצוא', 'המערכת לא מאפשרת ייצוא דוחות פיננסיים בפורמט בנקאי מקובל', 'ייצוא PDF/Excel/CSV מוסמך', 'אין'))
    feedback.push(fb('חובה', 'ייצוא', 'חסרת API public לשליפת נתוני לקוח עבור גורם מוסמך (בנק/ביטוח)', 'Verified data API', 'אין'))
    feedback.push(fb('חשוב', 'ייצוא', 'לא ניתן לצרף מסמכים מהמערכת ישירות לבקשת אשראי', 'Share pack לבנק', 'אין'))
    feedback.push(fb('נחמד', 'ייצוא', 'אפשרות גישת "קריאה בלבד" לגוף פיננסי מוסמך תחסוך עבודה', 'Read-only access token לבנק', 'אין'))

    return { status: 0, data: {}, feedback }
  }))

  // ─── תרחיש 4: סיכום פיננסי ───────────────────
  scenarios.push(await runScenario('סיכום חיוב – תמונה פיננסית', async () => {
    const feedback: FeedbackItem[] = []

    const summaryRes = await api.get<any>('/api/billing/summary')
    if (!summaryRes.ok) {
      feedback.push(fb('חובה', 'סיכום', 'לא ניתן לטעון סיכום חיוב', 'סיכום פיננסי', `שגיאה ${summaryRes.status}`))
      return { status: summaryRes.status, data: null, feedback }
    }

    const summary = summaryRes.data
    feedback.push(fb('חובה', 'סיכום', 'הסיכום הפיננסי אינו כולל נתוני P&L – בנק צריך רווח והפסד', 'P&L summary', 'נתוני חיוב בסיסיים'))
    feedback.push(fb('חובה', 'סיכום', 'חסרת מאזן (Balance Sheet) ולא ניתן לאמת יציבות פיננסית', 'Balance Sheet', 'אין'))
    feedback.push(fb('חשוב', 'סיכום', 'חסרת נתוני תזרים מזומנים (Cash Flow) לניתוח אשראי', 'Cash Flow statement', 'אין'))

    return { status: 200, data: summary, feedback }
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
