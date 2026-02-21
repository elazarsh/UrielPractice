/**
 * בוט #14 – יועצת מס בכירה
 * שם: ד"ר רינה אבוד (ACCOUNTANT role – rivka@)
 * תפקיד: יועצת מס בכירה שמתמחה בתכנון מס ודוחות שנתיים
 * מסכים: תהליכים מאוחרים, סוגי לקוחות, סיכום חיוב
 */

import { ApiClient, runScenario, fb } from '../api-client.js'
import { BotConfig, BotReport, FeedbackItem, ScenarioResult } from '../types.js'

const CONFIG: BotConfig = {
  id: 'tax-consultant',
  personaName: 'רינה אבוד',
  personaRole: 'יועצת מס בכירה',
  personaDescription:
    'אני יועצת מס בכירה עם דוקטורט בדיני מסים. עוסקת בתכנון מס, בקרה על דוחות שנתיים ואופטימיזציה מיסויית. ' +
    'צריכה לראות מצב מיסויי של לקוחות, אלו לקוחות בסיכון ואיפה יש חסכוני מס. ' +
    'הכי חשוב לי: מידע מקיף על מועדי הגשה, תהליכים מאוחרים ויכולת לנתח לקוחות לפי פרמטרים.',
  credentials: { email: 'rivka@uriel-practice.co.il', password: 'Demo1234!' },
  baseUrl: 'http://localhost:3001',
}

export async function runTaxConsultantBot(): Promise<BotReport> {
  const api = new ApiClient(CONFIG.baseUrl, CONFIG.credentials!.email, CONFIG.credentials!.password)
  const scenarios: ScenarioResult[] = []
  const globalFeedback: FeedbackItem[] = []

  const loginOk = await api.login()
  if (!loginOk) {
    globalFeedback.push(fb('חובה', 'כניסה', 'יועצת המס לא הצליחה להתחבר', 'כניסה מוצלחת', 'נכשל'))
    return buildReport(CONFIG, scenarios, globalFeedback)
  }

  // ─── תרחיש 1: תהליכים מאוחרים ────────────────
  scenarios.push(await runScenario('תהליכים מאוחרים – לקוחות בסיכון מיסויי', async () => {
    const feedback: FeedbackItem[] = []

    const overdueRes = await api.get<any>('/api/tax-payments/overdue')
    if (!overdueRes.ok) {
      feedback.push(fb('חובה', 'תשלומי מס', 'לא ניתן לטעון תשלומי מס באיחור', 'רשימת תשלומים', `שגיאה ${overdueRes.status}`))
      return { status: overdueRes.status, data: null, feedback }
    }

    const overdue = Array.isArray(overdueRes.data) ? overdueRes.data : (overdueRes.data?.data ?? [])

    if (overdue.length === 0) {
      feedback.push(fb('חשוב', 'תשלומי מס', 'אין תשלומים באיחור בדמו – לא ניתן לבחון תרחיש סיכון', 'נתוני דמו עם איחורים', '0'))
    } else {
      const hasAmount = overdue.some((p: any) => p.amount !== undefined)
      if (!hasAmount) {
        feedback.push(fb('חשוב', 'תשלומי מס', 'חסר סכום התשלום הבאיחור – לא ניתן לקבוע סדר עדיפות', 'שדה amount', 'שדה חסר'))
      }
      const hasPenalty = overdue.some((p: any) => p.penalty !== undefined || p.fine !== undefined)
      if (!hasPenalty) {
        feedback.push(fb('חשוב', 'תשלומי מס', 'חסר חישוב קנס/ריבית על תשלום באיחור', 'שדה penalty/fine', 'שדה חסר'))
      }
    }

    feedback.push(fb('חובה', 'תשלומי מס', 'חסרת מסך "ניתוח סיכון מיסויי" שמדרג לקוחות לפי רמת סיכון', 'ציון סיכון 1-10 עם הסבר', 'אין'))
    feedback.push(fb('חשוב', 'תשלומי מס', 'חסר חישוב פוטנציאל קנסות לכל לקוח בסיכון', 'ממשק ניתוח קנסות', 'אין'))
    feedback.push(fb('נחמד', 'תשלומי מס', 'הייתה שימושית השוואה לתשלומים בשנה קודמת לזיהוי מגמות', 'Y-O-Y comparison', 'אין'))

    return { status: 200, data: { overdueCount: overdue.length }, feedback }
  }))

  // ─── תרחיש 2: ניתוח סוגי לקוחות ─────────────
  scenarios.push(await runScenario('לקוחות – ניתוח לפי סוג עוסק', async () => {
    const feedback: FeedbackItem[] = []

    const clientsRes = await api.get<any>('/api/clients?limit=50')
    if (!clientsRes.ok) {
      feedback.push(fb('חובה', 'לקוחות', 'לא ניתן לטעון לקוחות', 'רשימת לקוחות', `שגיאה ${clientsRes.status}`))
      return { status: clientsRes.status, data: null, feedback }
    }

    const clients = clientsRes.data?.data ?? []
    if (clients.length === 0) {
      feedback.push(fb('חשוב', 'לקוחות', 'אין לקוחות לניתוח', 'לקוחות מגוונים', '0'))
      return { status: 200, data: null, feedback }
    }

    // ניתוח לפי סוג
    const typeCount: Record<string, number> = {}
    for (const c of clients) {
      const type = c.clientType ?? 'unknown'
      typeCount[type] = (typeCount[type] ?? 0) + 1
    }

    if (Object.keys(typeCount).length === 1) {
      feedback.push(fb('חשוב', 'לקוחות', 'כל הלקוחות מאותו סוג – חוסר גיוון בנתוני דמו', 'לקוחות מסוגים שונים', `סוג אחד בלבד: ${Object.keys(typeCount)[0]}`))
    }

    // בדיקת healthScore
    const hasHealthScore = clients.some((c: any) => c.healthScore !== undefined)
    if (!hasHealthScore) {
      feedback.push(fb('חובה', 'ניתוח לקוחות', 'חסר ציון בריאות (healthScore) לניתוח סיכון לקוחות', 'healthScore לכל לקוח', 'שדה חסר'))
    } else {
      const atRisk = clients.filter((c: any) => c.healthScore !== undefined && c.healthScore < 50)
      if (atRisk.length === 0) {
        feedback.push(fb('נחמד', 'ניתוח לקוחות', 'כל הלקוחות עם ציון בריאות גבוה – נתוני דמו אופטימיסטיים מדי', 'גיוון ב-healthScore', 'כולם > 50'))
      }
    }

    feedback.push(fb('חובה', 'ניתוח לקוחות', 'חסרת מסך "ניתוח תיק לקוחות" עם פילוח לפי סוג עוסק, ענף, מחזור', 'Dashboard analytics עם פילוחים', 'אין'))
    feedback.push(fb('חשוב', 'ניתוח לקוחות', 'חסרת אפשרות לייצא רשימת לקוחות עם כל הפרמטרים המיסויים ל-Excel', 'ייצוא Excel מלא', 'אין'))

    return { status: 200, data: { typeBreakdown: typeCount }, feedback }
  }))

  // ─── תרחיש 3: גישה לסיכום חיוב ──────────────
  scenarios.push(await runScenario('סיכום חיוב – ניתוח הכנסות', async () => {
    const feedback: FeedbackItem[] = []

    const summaryRes = await api.get<any>('/api/billing/summary')
    if (!summaryRes.ok) {
      feedback.push(fb('חובה', 'סיכום חיוב', 'לא ניתן לטעון סיכום חיוב', 'סיכום פיננסי', `שגיאה ${summaryRes.status}`))
      return { status: summaryRes.status, data: null, feedback }
    }

    const summary = summaryRes.data
    if (summary.totalBilled === undefined) {
      feedback.push(fb('חובה', 'סיכום חיוב', 'חסר סכום כולל בסיכום חיוב', 'totalBilled', 'שדה חסר'))
    }

    feedback.push(fb('חובה', 'סיכום חיוב', 'חסר ניתוח הכנסות לפי סוג שירות (מע"מ / שכר / ייעוץ / דוח שנתי)', 'breakdown לפי service type', 'סכום גלובלי בלבד'))
    feedback.push(fb('חשוב', 'סיכום חיוב', 'חסרת השוואת הכנסות חודש/שנה קודמת', 'Y-O-Y revenue comparison', 'אין'))
    feedback.push(fb('נחמד', 'סיכום חיוב', 'הייתה שימושית תחזית הכנסות לחודש הבא לפי עונתיות', 'revenue forecast', 'אין'))

    return { status: 200, data: summary, feedback }
  }))

  // ─── תרחיש 4: בדיקת תשלומי מס קרובים ────────
  scenarios.push(await runScenario('תכנון מס – תשלומים קרובים', async () => {
    const feedback: FeedbackItem[] = []

    const upcomingRes = await api.get<any>('/api/tax-payments/upcoming')
    if (!upcomingRes.ok) {
      feedback.push(fb('חובה', 'תכנון מס', 'לא ניתן לטעון תשלומי מס קרובים', 'רשימת תשלומים', `שגיאה ${upcomingRes.status}`))
      return { status: upcomingRes.status, data: null, feedback }
    }

    const upcoming = Array.isArray(upcomingRes.data) ? upcomingRes.data : (upcomingRes.data?.data ?? [])

    if (upcoming.length === 0) {
      feedback.push(fb('חשוב', 'תכנון מס', 'אין תשלומים קרובים בדמו', 'תשלומים לדמו', '0'))
    } else {
      const hasTaxType = upcoming.some((p: any) => p.taxType || p.type)
      if (!hasTaxType) {
        feedback.push(fb('חשוב', 'תכנון מס', 'חסר סוג מס (מע"מ / מקדמות / ניכויים) לכל תשלום', 'שדה taxType', 'שדה חסר'))
      }
    }

    feedback.push(fb('חובה', 'תכנון מס', 'חסרת לוח שנה מס שנתי עם כל המועדים הרגולטוריים', 'Tax calendar שנתי', 'אין'))
    feedback.push(fb('חשוב', 'תכנון מס', 'חסרת המלצות תכנון מס פרואקטיביות על בסיס פרופיל הלקוח', 'Tax planning recommendations', 'אין'))
    feedback.push(fb('נחמד', 'תכנון מס', 'הייתה שימושית אינטגרציה עם מערכת שע"מ לקבלת נתוני מס בזמן אמת', 'API integration עם שע"מ', 'אין'))

    return { status: 200, data: { upcomingCount: upcoming.length }, feedback }
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
