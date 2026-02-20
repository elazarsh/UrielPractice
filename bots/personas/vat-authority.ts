/**
 * בוט #6 – עובד מע"מ
 * שם: גלית שמיר – פקידת מע"מ
 * תפקיד: מקבלת דוחות מע"מ (תדפיס 52, 79), בודקת אמינות
 */

import { ApiClient, runScenario, fb } from '../api-client.js'
import { BotConfig, BotReport, FeedbackItem, ScenarioResult } from '../types.js'

const CONFIG: BotConfig = {
  id: 'vat-authority',
  personaName: 'גלית שמיר',
  personaRole: 'פקידת מע"מ',
  personaDescription:
    'אני פקידת מע"מ. מקבלת דוחות מע"מ חודשיים ודו-חודשיים ובודקת אמינות הנתונים. ' +
    'מצפה לדיוק בסכומים, עמידה בדדליינים, ורשומת תיעוד הגשות. ' +
    'הכי מטריד אותי: הגשות מאוחרות ושגיאות בסכומי מס תשומות.',
  baseUrl: 'http://localhost:3001',
}

export async function runVatAuthorityBot(): Promise<BotReport> {
  const scenarios: ScenarioResult[] = []
  const globalFeedback: FeedbackItem[] = []

  const adminApi = new ApiClient(CONFIG.baseUrl, 'admin@uriel-practice.co.il', 'Demo1234!')
  await adminApi.login()

  // ─── תרחיש 1: דוחות מע"מ ─────────────────────
  scenarios.push(await runScenario('דוחות מע"מ – פלטים וסטטוס הגשה', async () => {
    const feedback: FeedbackItem[] = []

    const procRes = await adminApi.get<any>('/api/process-instances?limit=30')
    if (!procRes.ok) {
      feedback.push(fb('חשוב', 'תהליכי מע"מ', 'לא ניתן לשלוף תהליכים', 'רשימת תהליכים', `שגיאה ${procRes.status}`))
      return { status: procRes.status, data: null, feedback }
    }

    const processes = procRes.data?.data ?? []
    const vatProcs = processes.filter((p: any) =>
      p.template?.processCode?.includes('VAT')
    )

    if (vatProcs.length === 0) {
      feedback.push(fb('חשוב', 'תהליכי מע"מ', 'לא מוצאים תהליכי מע"מ פעילים', 'תהליכי VAT_MONTHLY/BIMONTHLY', '0'))
    }

    const overdueVat = vatProcs.filter((p: any) => p.isOverdue)
    if (overdueVat.length > 0) {
      feedback.push(fb('חשוב', 'איחורי מע"מ', `יש ${overdueVat.length} דוחות מע"מ באיחור – מצב רציני`, 'כל הדוחות בזמן', `${overdueVat.length} באיחור`))
    }

    feedback.push(fb('חובה', 'פורמט הגשה', 'חסרת ייצוא דוח מע"מ לפורמט רשמי (תדפיס 52/79 לרשות המסים)', 'ייצוא לפורמט שע"מ/רשות המסים', 'אין'))
    feedback.push(fb('חובה', 'אסמכתא הגשה', 'חסר שמירת מספר אסמכתא הגשה שנתקבל מרשות המסים', 'שדה submissionConfirmationNumber', 'אין שדה'))
    feedback.push(fb('חשוב', 'בקרת נתונים', 'חסרת בקרה אוטומטית: סיכום חשבוניות קניה + מכירה vs. הדוח המוגש', 'Reconciliation אוטומטי', 'אין'))
    feedback.push(fb('חשוב', 'תדירות', 'חסרת התראה כשלקוח עם מע"מ חודשי לא הגיש עד ה-14 לחודש', 'אזהרה "עומד לפגוע במועד"', 'אין'))
    feedback.push(fb('נחמד', 'היסטוריה', 'חסרת תצוגת היסטוריית הגשות מע"מ לפי שנה (timeline)', 'טיימליין הגשות שנתי', 'אין'))

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
