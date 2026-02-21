/**
 * בוט #12 – עורך דין שמפנה לקוחות
 * שם: עו"ד מאיר לוי (ADMIN credentials)
 * תפקיד: עורך דין שמפנה לקוחות למשרד ורוצה לעקוב אחרי הסטטוס שלהם
 * מסכים: לקוחות, תהליכים, מסמכים
 */

import { ApiClient, runScenario, fb } from '../api-client.js'
import { BotConfig, BotReport, FeedbackItem, ScenarioResult } from '../types.js'

const CONFIG: BotConfig = {
  id: 'lawyer',
  personaName: 'מאיר לוי',
  personaRole: 'עורך דין – שותף מפנה לקוחות',
  personaDescription:
    'אני עורך דין ומפנה לקוחות למשרד ראיית החשבון. ' +
    'אני רוצה לוודא שהלקוחות שאני מפנה מקבלים שירות מצוין, ולעתים צריך לראות מסמכים משותפים. ' +
    'הכי חשוב לי: שקיפות בסטטוס תהליכים, גישה מהירה לפרטי לקוח ומסמכים רלוונטיים.',
  credentials: { email: 'admin@uriel-practice.co.il', password: 'Demo1234!' },
  baseUrl: 'http://localhost:3001',
}

export async function runLawyerBot(): Promise<BotReport> {
  const api = new ApiClient(CONFIG.baseUrl, CONFIG.credentials!.email, CONFIG.credentials!.password)
  const scenarios: ScenarioResult[] = []
  const globalFeedback: FeedbackItem[] = []

  const loginOk = await api.login()
  if (!loginOk) {
    globalFeedback.push(fb('חובה', 'כניסה', 'עורך הדין לא הצליח להתחבר', 'כניסה מוצלחת', 'נכשל'))
    return buildReport(CONFIG, scenarios, globalFeedback)
  }

  // ─── תרחיש 1: רשימת לקוחות מהירה ────────────
  scenarios.push(await runScenario('לקוחות – מצא לקוחות שהפניתי', async () => {
    const feedback: FeedbackItem[] = []

    const clientsRes = await api.get<any>('/api/clients?limit=20')
    if (!clientsRes.ok) {
      feedback.push(fb('חובה', 'רשימת לקוחות', 'לא ניתן לטעון לקוחות', 'רשימת לקוחות', `שגיאה ${clientsRes.status}`))
      return { status: clientsRes.status, data: null, feedback }
    }

    const clients = clientsRes.data?.data ?? []
    if (clients.length === 0) {
      feedback.push(fb('חשוב', 'רשימת לקוחות', 'אין לקוחות בדמו', 'לפחות 5 לקוחות', '0'))
    } else {
      const hasReferralSource = clients.some((c: any) => c.referralSource || c.referredBy)
      if (!hasReferralSource) {
        feedback.push(fb('חובה', 'רשימת לקוחות', 'חסר שדה "מקור הפניה" – לא ניתן לדעת אילו לקוחות הגיעו דרכי', 'שדה referralSource/referredBy', 'שדה חסר'))
      }

      const hasStatus = clients.some((c: any) => c.status || c.clientStatus)
      if (!hasStatus) {
        feedback.push(fb('חשוב', 'רשימת לקוחות', 'חסר סטטוס לקוח ברשימה (פעיל/מושהה/סגור)', 'שדה status', 'שדה חסר'))
      }
    }

    feedback.push(fb('חובה', 'רשימת לקוחות', 'אין אפשרות לסנן לקוחות לפי מקור הפניה – לא ניתן לראות "הלקוחות שלי"', 'פילטר: לקוחות מופנים על ידי X', 'אין'))
    feedback.push(fb('נחמד', 'רשימת לקוחות', 'הייתה שימושית גישת "שותף קריאה בלבד" לעו"ד המפנה', 'role: REFERRAL_PARTNER עם גישה מוגבלת', 'אין'))

    return { status: 200, data: { clientCount: clients.length }, feedback }
  }))

  // ─── תרחיש 2: שקיפות תהליכים ─────────────────
  scenarios.push(await runScenario('תהליכים – בדיקת שקיפות לעו"ד', async () => {
    const feedback: FeedbackItem[] = []

    const procRes = await api.get<any>('/api/processes?limit=10')
    if (!procRes.ok) {
      feedback.push(fb('חובה', 'תהליכים', 'לא ניתן לטעון תהליכים', 'רשימת תהליכים', `שגיאה ${procRes.status}`))
      return { status: procRes.status, data: null, feedback }
    }

    const processes = procRes.data?.data ?? procRes.data ?? []
    const processList = Array.isArray(processes) ? processes : []

    if (processList.length === 0) {
      feedback.push(fb('חשוב', 'תהליכים', 'אין תהליכים בדמו', 'תהליכים לבדיקה', '0'))
    } else {
      const proc = processList[0]
      if (!proc.clientName && !proc.client?.name) {
        feedback.push(fb('חשוב', 'תהליכים', 'שם הלקוח לא מוצג ברשימת התהליכים', 'clientName ברשימה', 'שדה חסר'))
      }
      if (!proc.status) {
        feedback.push(fb('חשוב', 'תהליכים', 'סטטוס תהליך חסר ברשימה', 'שדה status', 'שדה חסר'))
      }
      if (!proc.dueDate && !proc.deadline) {
        feedback.push(fb('חשוב', 'תהליכים', 'תאריך יעד חסר ברשימת התהליכים', 'שדה dueDate/deadline', 'שדה חסר'))
      }
    }

    feedback.push(fb('חובה', 'תהליכים', 'עורך דין מפנה לא יכול לראות מה קורה עם לקוח שהפנה – אין גישת "שקיפות לשותפים"', 'דוח שבועי אוטומטי לשותף מפנה', 'אין'))
    feedback.push(fb('חשוב', 'תהליכים', 'חסרת אפשרות לקישור ישיר לתהליך ספציפי לשיתוף עם עו"ד', 'קישור שיתופי (share link) לתהליך', 'אין'))

    return { status: 200, data: { processCount: processList.length }, feedback }
  }))

  // ─── תרחיש 3: מצב מסמכים ─────────────────────
  scenarios.push(await runScenario('מסמכים – גישה למסמכים רלוונטיים', async () => {
    const feedback: FeedbackItem[] = []

    const docsRes = await api.get<any>('/api/documents?limit=10')
    if (!docsRes.ok) {
      feedback.push(fb('חובה', 'מסמכים', 'לא ניתן לטעון מסמכים', 'רשימת מסמכים', `שגיאה ${docsRes.status}`))
      return { status: docsRes.status, data: null, feedback }
    }

    const docs = docsRes.data?.data ?? docsRes.data ?? []
    const docList = Array.isArray(docs) ? docs : []

    if (docList.length === 0) {
      feedback.push(fb('חשוב', 'מסמכים', 'אין מסמכים בדמו', 'מסמכים לצפייה', '0'))
    } else {
      const doc = docList[0]
      if (!doc.type && !doc.documentType) {
        feedback.push(fb('חשוב', 'מסמכים', 'חסר סוג מסמך בתצוגת הרשימה', 'documentType', 'שדה חסר'))
      }
      if (!doc.status) {
        feedback.push(fb('חשוב', 'מסמכים', 'חסר סטטוס מסמך (ממתין/נחתם/הוגש)', 'שדה status', 'שדה חסר'))
      }
    }

    feedback.push(fb('חובה', 'מסמכים', 'לא ניתן לשתף מסמך ספציפי עם עו"ד חיצוני בצורה מאובטחת', 'שיתוף מסמך עם גישה מוגבלת לפי זמן', 'אין'))
    feedback.push(fb('חשוב', 'מסמכים', 'חסרת חתימה דיגיטלית על מסמכים משפטיים', 'e-signature integration', 'אין'))
    feedback.push(fb('נחמד', 'מסמכים', 'הייתה שימושית הוספת תגובה/הערה על מסמך לשיתוף פעולה עם עו"ד', 'תגובות על מסמך', 'אין'))

    return { status: 200, data: { docCount: docList.length }, feedback }
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
