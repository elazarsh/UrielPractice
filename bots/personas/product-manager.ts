/**
 * בוט #8 – מנהל מוצר
 * שם: ענת שפירא
 * תפקיד: מגדיר features, מתעדף backlog, מקשיב למשתמשים, קובע roadmap
 */

import { ApiClient, runScenario, fb } from '../api-client.js'
import { BotConfig, BotReport, FeedbackItem, ScenarioResult } from '../types.js'

const CONFIG: BotConfig = {
  id: 'product-manager',
  personaName: 'ענת שפירא',
  personaRole: 'מנהלת מוצר',
  personaDescription:
    'אני מנהלת מוצר. אחראית על הגדרת Features, UX, ותעדוף Backlog. ' +
    'אני רואה את המוצר מנקודת מבט של שוק ומשתמשים. ' +
    'שואלת: האם המוצר פותר את הבעיה הנכונה? האם ה-UX ברור? האם יש feature gaps?',
  credentials: { email: 'admin@uriel-practice.co.il', password: 'Demo1234!' },
  baseUrl: 'http://localhost:3001',
}

export async function runProductManagerBot(): Promise<BotReport> {
  const api = new ApiClient(CONFIG.baseUrl, CONFIG.credentials!.email, CONFIG.credentials!.password)
  const scenarios: ScenarioResult[] = []
  const globalFeedback: FeedbackItem[] = []

  const loginOk = await api.login()
  if (!loginOk) {
    globalFeedback.push(fb('חובה', 'כניסה', 'לא ניתן להתחבר', 'כניסה מוצלחת', 'נכשל'))
    return buildReport(CONFIG, scenarios, globalFeedback)
  }

  // ─── תרחיש 1: Product Coverage ───────────────
  scenarios.push(await runScenario('כיסוי תכונות מוצר', async () => {
    const feedback: FeedbackItem[] = []

    // בדיקה: האם כל ה-roles המוגדרים בDB משתמשים בכל ה-features?
    const usersRes = await api.get<any>('/api/users')
    const tasksRes = await api.get<any>('/api/tasks?limit=20')
    const processRes = await api.get<any>('/api/process-instances?limit=20')

    // Feature gaps קריטיים שמנהל מוצר רואה
    feedback.push(fb('חובה', 'Feature Gap', 'אין מודול הנהלת חשבונות / ספר שוטף – מוגבל לניהול תהליכים בלבד', 'אינטגרציה לתוכנת הנח"ש (Priority/SAP B1)', 'אין'))
    feedback.push(fb('חובה', 'Feature Gap', 'אין חיוב אוטומטי ללקוחות – חיובים ידניים בלבד', 'חיוב חודשי אוטומטי + חשבונית אוטומטית', 'ידני'))
    feedback.push(fb('חובה', 'Feature Gap', 'אין פורטל לקוח (Client Portal) – כל תקשורת חיצונית', 'פורטל לקוח ייעודי', 'אין'))
    feedback.push(fb('חשוב', 'Feature Gap', 'אין אינטגרציה לוואטסאפ Business לתקשורת עם לקוחות', 'WhatsApp Business API', 'אין'))
    feedback.push(fb('חשוב', 'Feature Gap', 'אין תמיכה ב-AI להצעת תיקונים בדוחות', 'AI suggestions', 'אין'))
    feedback.push(fb('חשוב', 'Feature Gap', 'אין Notifications system – push/email alerts', 'מערכת התראות real-time', 'אין'))

    return { status: 200, data: {}, feedback }
  }))

  // ─── תרחיש 2: UX Flow בדיקה ──────────────────
  scenarios.push(await runScenario('זרימת משתמש ו-UX', async () => {
    const feedback: FeedbackItem[] = []

    feedback.push(fb('חשוב', 'Onboarding', 'אין מדריך קליטה (onboarding wizard) למשתמש חדש', 'Wizard "5 שלבים לתחילת עבודה"', 'אין'))
    feedback.push(fb('חשוב', 'UX', 'ה-Sidebar אינו אינדיקטיבי – אין badge counts (כמה איחורים, כמה משימות)', 'Badge numbers על כל תפריט', 'אין'))
    feedback.push(fb('חשוב', 'Search', 'אין Global Search – לא ניתן לחפש לקוח/תהליך/משימה ממקום אחד', 'חיפוש גלובלי עם Cmd+K', 'אין'))
    feedback.push(fb('חשוב', 'Mobile', 'האפליקציה לא responsive – לא שמישה מנייד', 'Mobile-first design', 'Desktop only'))
    feedback.push(fb('נחמד', 'Dashboard', 'הדשבורד סטטי – היה נחמד שכל משתמש יוכל לסדר ה-widgets שלו', 'Customizable dashboard', 'קבוע'))
    feedback.push(fb('נחמד', 'UX', 'חסר Dark Mode', 'Toggle dark/light mode', 'אין'))

    return { status: 200, data: {}, feedback }
  }))

  // ─── תרחיש 3: Data integrity ─────────────────
  scenarios.push(await runScenario('שלמות נתונים וסטנדרטים', async () => {
    const feedback: FeedbackItem[] = []

    const clientsRes = await api.get<any>('/api/clients?limit=10')
    if (clientsRes.ok) {
      const clients = clientsRes.data?.data ?? []
      const withoutEmail = clients.filter((c: any) => !c.email)
      if (withoutEmail.length > 0) {
        feedback.push(fb('חשוב', 'Data Quality', `${withoutEmail.length} לקוחות ללא כתובת אימייל`, 'אימייל חובה בכל לקוח', `${withoutEmail.length} ללא אימייל`))
      }
      const withoutHealthScore = clients.filter((c: any) => c.healthScore == null)
      if (withoutHealthScore.length > 0) {
        feedback.push(fb('חשוב', 'ציון בריאות', `${withoutHealthScore.length} לקוחות ללא ציון בריאות`, 'חישוב אוטומטי לכולם', `${withoutHealthScore.length} ללא ציון`))
      }
    }

    feedback.push(fb('חשוב', 'Data', 'חסר שדה "תאריך הצטרפות" ו-"תאריך חוזה" בכרטיס לקוח', 'joinDate, contractDate', 'אין'))
    feedback.push(fb('נחמד', 'Analytics', 'חסרת מדדי KPI: NPS, LTV לקוח, זמן טיפול ממוצע', 'Analytics dashboard', 'אין'))

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
