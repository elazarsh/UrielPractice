/**
 * בוט #9 – מחלקת שכר של משרד רואה החשבון
 * שם: שירה ברק (PAYROLL role)
 * תפקיד: מעבדת שכר ללקוחות, מגישה ניכויים, מנהלת תלושים
 *         + מחשבת פרמיות לעובדי המשרד עצמו לפי ביצועים
 */

import { ApiClient, runScenario, fb } from '../api-client.js'
import { BotConfig, BotReport, FeedbackItem, ScenarioResult } from '../types.js'

const CONFIG: BotConfig = {
  id: 'payroll',
  personaName: 'שירה ברק',
  personaRole: 'מנהלת שכר',
  personaDescription:
    'אני מנהלת מחלקת שכר. מעבדת שכר ללקוחות המשרד ומטפלת גם בשכר עובדי המשרד עצמו. ' +
    'צריכה לראות כמה תהליכים כל עובד סגר החודש כדי לחשב פרמיות. ' +
    'הכי חשוב לי: דיוק בנתוני שכר, עמידה ב-15 לחודש (הגשת ניכויים), ' +
    'ונראות על ביצועי כל עובד לצורך חישוב פרמיה.',
  credentials: { email: 'shira@uriel-practice.co.il', password: 'Demo1234!' },
  baseUrl: 'http://localhost:3001',
}

export async function runPayrollBot(): Promise<BotReport> {
  const api = new ApiClient(CONFIG.baseUrl, CONFIG.credentials!.email, CONFIG.credentials!.password)
  const scenarios: ScenarioResult[] = []
  const globalFeedback: FeedbackItem[] = []

  const loginOk = await api.login()
  if (!loginOk) {
    globalFeedback.push(fb('חובה', 'כניסה', 'מחלקת שכר לא הצליחה להתחבר', 'כניסה מוצלחת', 'נכשל'))
    return buildReport(CONFIG, scenarios, globalFeedback)
  }

  // ─── תרחיש 1: תהליכי שכר / ניכויים ──────────
  scenarios.push(await runScenario('עיבוד שכר – תהליכי PAYROLL_MONTHLY', async () => {
    const feedback: FeedbackItem[] = []

    const procRes = await api.get<any>('/api/process-instances?limit=20')
    if (!procRes.ok) {
      feedback.push(fb('חובה', 'תהליכי שכר', 'לא ניתן לטעון תהליכים', 'תהליכי שכר', `שגיאה ${procRes.status}`))
      return { status: procRes.status, data: null, feedback }
    }

    const processes = procRes.data?.data ?? []
    const payrollProcs = processes.filter((p: any) =>
      p.template?.processCode === 'PAYROLL_MONTHLY'
    )

    if (payrollProcs.length === 0) {
      feedback.push(fb('חשוב', 'תהליכי שכר', 'לא נמצאו תהליכי PAYROLL_MONTHLY', 'תהליכי שכר לחודש הנוכחי', '0'))
    }

    feedback.push(fb('חובה', 'עיבוד שכר', 'חסרת מסך ייעודי לעיבוד שכר עם ריכוז כל הלקוחות לפי חודש', 'דשבורד שכר חודשי', 'פזור בין תהליכים כלליים'))
    feedback.push(fb('חובה', 'שכר', 'חסרת ייבוא נתוני שכר מ-Excel (כרגע רק מסמכים ידניים)', 'Import Excel עם נתוני שכר לכל עובד', 'אין'))
    feedback.push(fb('חובה', 'תלושי שכר', 'חסרת הפקת תלושי שכר PDF מהמערכת', 'הפקת תלוש + שליחה לעובד', 'אין'))
    feedback.push(fb('חשוב', 'שכר', 'חסרת תצוגת "מי לא שלח נתוני שכר עדיין" לכל החודש', 'רשימת לקוחות שלא שלחו נתונים', 'אין'))
    feedback.push(fb('נחמד', 'שכר', 'חסרת אינטגרציה לחברות ביטוח/קרנות פנסיה לדיווח אוטומטי', 'אינטגרציה מגדל/כלל', 'אין'))

    return { status: 200, data: procRes.data, feedback }
  }))

  // ─── תרחיש 2: פרמיות עובדי המשרד ────────────
  scenarios.push(await runScenario('ביצועי עובדים – חישוב פרמיות', async () => {
    const feedback: FeedbackItem[] = []

    // ניסיון לראות עומס לפי עובד
    const workloadRes = await api.get<any>('/api/tasks/workload')
    if (!workloadRes.ok) {
      feedback.push(fb('חשוב', 'ביצועי עובדים', 'לא ניתן לטעון נתוני עומס', 'עומס לפי עובד', `שגיאה ${workloadRes.status}`))
    } else {
      const wl = workloadRes.data
      const employees = Array.isArray(wl) ? wl : (wl?.workload ?? [])

      if (employees.length === 0) {
        feedback.push(fb('חשוב', 'ביצועי עובדים', 'אין נתוני עומס לפי עובד', 'נתוני workload', '0 עובדים'))
      }

      // בדיקה: האם יש מדד "תהליכים שנסגרו"?
      const hasClosedProcesses = employees.some((e: any) => e.closedThisMonth !== undefined || e.completedTasks !== undefined)
      if (!hasClosedProcesses) {
        feedback.push(fb('חובה', 'פרמיות', 'אין נתון "כמה תהליכים כל עובד סגר החודש" – חיוני לחישוב פרמיה', 'closedProcessesThisMonth לכל עובד', 'אין'))
      }
    }

    feedback.push(fb('חובה', 'פרמיות', 'אין מסך "ביצועי עובדים" שמרכז: משימות שנסגרו, תהליכים שהושלמו, ציון איכות', 'דשבורד KPI לכל עובד', 'אין'))
    feedback.push(fb('חובה', 'פרמיות', 'אין אפשרות לייצא דוח ביצועים חודשי לעובד', 'ייצוא PDF/Excel', 'אין'))
    feedback.push(fb('חשוב', 'פרמיות', 'אין שדה "זמן עבודה" – לא ניתן לחשב יעילות לעומת עומס', 'מעקב שעות / time tracking', 'אין'))
    feedback.push(fb('חשוב', 'פרמיות', 'חסרת היסטוריית ביצועים חודשית לכל עובד לניתוח טרנדים', 'גרף ביצועים לאורך זמן', 'אין'))
    feedback.push(fb('נחמד', 'פרמיות', 'היה נחמד שהמערכת תציע חישוב פרמיה אוטומטי לפי KPI מוגדרים', 'מחשבון פרמיות אוטומטי', 'אין'))

    return { status: 200, data: {}, feedback }
  }))

  // ─── תרחיש 3: הגשת ניכויים לרשויות ─────────
  scenarios.push(await runScenario('הגשת ניכויים – תהליך ויעדים', async () => {
    const feedback: FeedbackItem[] = []

    const tasksRes = await api.get<any>('/api/tasks?myTasks=true&status=OPEN')
    if (tasksRes.ok) {
      const tasks = tasksRes.data?.data ?? []
      const payrollTasks = tasks.filter((t: any) =>
        t.taskType === 'SUBMISSION' || t.title?.includes('ניכוי') || t.title?.includes('שכר')
      )

      if (payrollTasks.length === 0) {
        feedback.push(fb('חשוב', 'משימות שכר', 'אין משימות הגשת ניכויים פתוחות לשירה', 'משימות הגשה חודשיות', '0'))
      }
    }

    feedback.push(fb('חשוב', 'הגשת ניכויים', 'חסרת בקרה "כמה לקוחות עם שכר טופלו מתוך הנדרש" לחודש זה', 'Progress bar: X/Y לקוחות', 'אין'))
    feedback.push(fb('נחמד', 'שכר', 'היה מועיל לקבל אוטומטית סיכום חישוב ביטוח לאומי לכל עובד', 'חישוב ביטוח לאומי אוטומטי', 'ידני'))

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
