/**
 * בוט #5 – עובד מס הכנסה
 * שם: ניצן כהן – פקיד שומה
 * תפקיד: מקבל דוחות שנתיים ותיקים, בודק תאימות, מצפה לפורמטים סטנדרטיים
 */

import { ApiClient, runScenario, fb } from '../api-client.js'
import { BotConfig, BotReport, FeedbackItem, ScenarioResult } from '../types.js'

const CONFIG: BotConfig = {
  id: 'tax-authority',
  personaName: 'ניצן כהן',
  personaRole: 'פקיד שומה – מס הכנסה',
  personaDescription:
    'אני פקיד שומה במס הכנסה. אני מקבל דוחות שנתיים, מגישות ניכויים, ודוחות מס חברות. ' +
    'אני לא מכיר את המערכת הפנימית – אני רואה רק את הפלטים שמגיעים אלי. ' +
    'הכי חשוב לי: דוחות מדויקים, בפורמט הנכון, בזמן.',
  baseUrl: 'http://localhost:3001',
}

export async function runTaxAuthorityBot(): Promise<BotReport> {
  const scenarios: ScenarioResult[] = []
  const globalFeedback: FeedbackItem[] = []

  const adminApi = new ApiClient(CONFIG.baseUrl, 'admin@uriel-practice.co.il', 'Demo1234!')
  await adminApi.login()

  // ─── תרחיש 1: דוחות שנתיים – מבנה ותוכן ─────
  scenarios.push(await runScenario('תוצרי מס הכנסה – דוחות שנתיים', async () => {
    const feedback: FeedbackItem[] = []

    // בדיקת תהליכי ANNUAL_TAX_REPORT
    const procRes = await adminApi.get<any>('/api/process-instances?limit=20')
    if (!procRes.ok) {
      feedback.push(fb('חובה', 'דוחות שנתיים', 'לא ניתן לשלוף תהליכי דיווח', 'רשימת דוחות', `שגיאה ${procRes.status}`))
      return { status: procRes.status, data: null, feedback }
    }

    const processes = procRes.data?.data ?? []
    const annualProcs = processes.filter((p: any) =>
      p.template?.processCode === 'ANNUAL_TAX_REPORT' || p.template?.processCode === 'CORPORATE_ANNUAL'
    )

    if (annualProcs.length === 0) {
      feedback.push(fb('חשוב', 'דוחות שנתיים', 'אין תהליכי דוח שנתי פעילים לבדיקה', 'לפחות 2 דוחות שנתיים', '0'))
    }

    // בדיקת מסמכים
    const docsRes = await adminApi.get<any>('/api/documents?limit=10')
    if (!docsRes.ok) {
      feedback.push(fb('חשוב', 'מסמכי הגשה', 'לא ניתן לשלוף מסמכים', 'מסמכי הגשה', `שגיאה ${docsRes.status}`))
    }

    // דרישות פקיד שומה
    feedback.push(fb('חובה', 'פורמט הגשה', 'חסרת ייצוא מסמכי הגשה לפורמט שע"מ (מנגנון הגשה ישירה)', 'ייצוא XML/JSON בפורמט שע"מ', 'אין'))
    feedback.push(fb('חובה', 'תיעוד הגשה', 'חסר מספר אסמכתא (confirmation number) מהגשה לרשויות', 'שמירת מספר אסמכתא', 'אין שדה לאסמכתא'))
    feedback.push(fb('חשוב', 'עמידה בדדליינים', 'חסרת התראה אוטומטית 30/14/7 ימים לפני מועד הגשת דוח שנתי', 'התראות email/SMS', 'אין'))
    feedback.push(fb('חשוב', 'תיעוד', 'חסרת שמירת אישור הגשה (PDF אסמכתא) כמסמך מצורף לתהליך', 'אוטומטית – שמור אישור הגשה', 'ידנית בלבד'))
    feedback.push(fb('נחמד', 'ביקורת', 'היה טוב לכלול בדוח שנתי breakdown של הכנסות לפי סוג (שכר, עסקי, פסיבי)', 'פירוט מחולק לקטגוריות', 'לא ברור'))

    return { status: 200, data: {}, feedback }
  }))

  // ─── תרחיש 2: ניכויים ─────────────────────────
  scenarios.push(await runScenario('ניכויים חודשיים – טפסי 102/106', async () => {
    const feedback: FeedbackItem[] = []

    feedback.push(fb('חובה', 'טפסי 102', 'חסרת ייצוא אוטומטי של טופס 102 (ניכויים) לרשות המס', 'ייצוא טופס 102 ישיר', 'אין'))
    feedback.push(fb('חובה', 'טפסי 106', 'חסרת הפקת טופס 106 לעובדים (אישור שכר שנתי)', 'הפקת 106 לכל עובד', 'אין ממשק'))
    feedback.push(fb('חשוב', 'בקרת תשלומים', 'חסרת בדיקה אוטומטית שהתשלום למס הכנסה בוצע בפועל', 'hook לאחר תשלום', 'אין'))

    return { status: 200, data: {}, feedback }
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
