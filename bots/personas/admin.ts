/**
 * בוט #2 – מנהל המערכת
 * שם: אוריאל כהן (ADMIN)
 * תפקיד: ניהול משתמשים, הרשאות, ביקורת, הגדרות מערכת
 */

import { ApiClient, runScenario, fb } from '../api-client.js'
import { BotConfig, BotReport, FeedbackItem, ScenarioResult } from '../types.js'

const CONFIG: BotConfig = {
  id: 'admin',
  personaName: 'אוריאל כהן',
  personaRole: 'מנהל מערכת',
  personaDescription:
    'אני מנהל המשרד ומנהל המערכת. אחראי על הגדרת משתמשים, הרשאות, תבניות תהליך, וראיית תמונה כוללת. ' +
    'מצפה לנראות מלאה על כל הפעילות, ביקורת, ותמיכה בניהול צוות גדול. ' +
    'רגיש במיוחד לאבטחה, לניהול גישות ולדוחות ניהוליים.',
  credentials: { email: 'admin@uriel-practice.co.il', password: 'Demo1234!' },
  baseUrl: 'http://localhost:3001',
}

export async function runAdminBot(): Promise<BotReport> {
  const api = new ApiClient(CONFIG.baseUrl, CONFIG.credentials!.email, CONFIG.credentials!.password)
  const scenarios: ScenarioResult[] = []
  const globalFeedback: FeedbackItem[] = []

  const loginOk = await api.login()
  if (!loginOk) {
    globalFeedback.push(fb('חובה', 'כניסה', 'מנהל לא הצליח להתחבר', 'כניסה מוצלחת', 'נכשל'))
    return buildReport(CONFIG, scenarios, globalFeedback)
  }

  // ─── תרחיש 1: ניהול משתמשים ─────────────────
  scenarios.push(await runScenario('ניהול משתמשים', async () => {
    const feedback: FeedbackItem[] = []

    const res = await api.get<any>('/api/users')
    if (!res.ok) {
      feedback.push(fb('חובה', 'ניהול משתמשים', 'רשימת משתמשים לא נטענת', 'רשימת כל המשתמשים', `שגיאה ${res.status}`))
      return { status: res.status, data: null, feedback }
    }

    const users = res.data?.data ?? res.data
    if (!Array.isArray(users)) {
      feedback.push(fb('חובה', 'ניהול משתמשים', 'תגובה לא תקינה', 'מערך משתמשים', typeof users))
      return { status: 200, data: res.data, feedback }
    }

    if (users.length < 4) {
      feedback.push(fb('חשוב', 'ניהול משתמשים', 'מספר משתמשים נמוך מהצפוי', '6+ משתמשי demo', `${users.length} משתמשים`))
    }

    // בדיקת שדות
    const u = users[0]
    if (u) {
      if (!u.role) feedback.push(fb('חובה', 'ניהול משתמשים', 'חסר שדה role במשתמש', 'role בכל משתמש', 'שדה חסר'))
      if (u.passwordHash) feedback.push(fb('חובה', 'אבטחה', 'passwordHash נחשף ב-API!', 'שדה passwordHash מוסתר', 'passwordHash גלוי'))
    }

    feedback.push(fb('חשוב', 'ניהול משתמשים', 'חסרת אפשרות לבלוק/השהות משתמש מבלי למחוק אותו', 'כפתור Suspend/Block', 'מחיקה בלבד'))
    feedback.push(fb('נחמד', 'ניהול משתמשים', 'חסרת תצוגת "מתי כל משתמש נכנס לאחרונה"', 'lastLoginAt לכל משתמש', 'שדה חסר'))
    feedback.push(fb('חשוב', 'אבטחה', 'חסרת אימות דו-שלבי (MFA) אמיתי – השדה mfaEnabled קיים אך אין ממשק', 'הגדרת MFA בממשק', 'שדה DB בלבד'))

    return { status: 200, data: res.data, feedback }
  }))

  // ─── תרחיש 2: תבניות תהליך ───────────────────
  scenarios.push(await runScenario('ניהול תבניות תהליך', async () => {
    const feedback: FeedbackItem[] = []

    const res = await api.get<any>('/api/process-templates')
    if (!res.ok) {
      feedback.push(fb('חובה', 'תבניות תהליך', 'רשימת תבניות לא נטענת', 'כל התבניות', `שגיאה ${res.status}`))
      return { status: res.status, data: null, feedback }
    }

    const templates = Array.isArray(res.data) ? res.data : res.data?.data
    if (!Array.isArray(templates)) {
      feedback.push(fb('חשוב', 'תבניות תהליך', 'מבנה תגובה לא ברור', 'מערך templates', typeof templates))
      return { status: 200, data: res.data, feedback }
    }

    if (templates.length < 4) {
      feedback.push(fb('חשוב', 'תבניות תהליך', 'פחות תבניות מהצפוי', '5+ תבניות', `${templates.length} תבניות`))
    }

    // בדיקת תבנית ספציפית
    if (templates.length > 0) {
      const tpl = templates[0]
      const detailRes = await api.get<any>(`/api/process-templates/${tpl.id}`)
      if (!detailRes.ok) {
        feedback.push(fb('חשוב', 'תבנית – פרטים', 'לא ניתן לפתוח פרטי תבנית', 'פרטי תבנית', `שגיאה ${detailRes.status}`))
      } else {
        if (!detailRes.data?.steps?.length) {
          feedback.push(fb('חשוב', 'תבנית – שלבים', 'תבנית ללא שלבים', 'לפחות 2 שלבים', '0 שלבים'))
        }
      }
    }

    feedback.push(fb('חשוב', 'תבניות תהליך', 'חסרת אפשרות לשכפל תבנית קיימת בממשק (יש API אבל לא ברור שיש UI)', 'כפתור "שכפל תבנית" ברשימה', 'לא ברור'))
    feedback.push(fb('נחמד', 'תבניות תהליך', 'חסרת גרסאות (versioning) לתבניות – אם משנים תבנית, מה קורה לתהליכים פעילים?', 'גרסאות תבנית', 'אין'))

    return { status: 200, data: res.data, feedback }
  }))

  // ─── תרחיש 3: דוח משימות עומס ───────────────
  scenarios.push(await runScenario('עומס צוות ודוחות ניהוליים', async () => {
    const feedback: FeedbackItem[] = []

    const workloadRes = await api.get<any>('/api/tasks/workload')
    if (!workloadRes.ok) {
      feedback.push(fb('חשוב', 'עומס צוות', 'דוח עומס הצוות לא נטען', 'עומס לפי עובד', `שגיאה ${workloadRes.status}`))
    } else {
      const wl = workloadRes.data
      if (!Array.isArray(wl) && typeof wl !== 'object') {
        feedback.push(fb('חשוב', 'עומס צוות', 'תגובת עומס לא תקינה', 'מבנה נתונים ברור', typeof wl))
      }
    }

    // דוח איחורים
    const overdueRes = await api.get<any>('/api/dashboard/reports/overdue')
    if (!overdueRes.ok) {
      feedback.push(fb('חשוב', 'דוח איחורים', 'דוח איחורים לא נטען', 'כל התהליכים באיחור', `שגיאה ${overdueRes.status}`))
    }

    feedback.push(fb('חובה', 'דוחות ניהוליים', 'חסרים דוחות ניהוליים: הכנסות לפי חודש, לקוחות חדשים, שביעות רצון', 'מסך דוחות מנהל', 'אין'))
    feedback.push(fb('חשוב', 'ביקורת', 'לוג ביקורת (audit log) קיים ב-DB אך אין ממשק צפייה', 'דף audit log לאדמין', 'אין ממשק'))
    feedback.push(fb('חשוב', 'ניהול', 'חסרת ניהול הגדרות כלל-מערכת (שם משרד, לוגו, נתוני קשר)', 'דף Settings/הגדרות', 'אין'))

    return { status: 200, data: {}, feedback }
  }))

  // ─── תרחיש 4: אבטחה ─────────────────────────
  scenarios.push(await runScenario('אבטחה ובדיקות הרשאות', async () => {
    const feedback: FeedbackItem[] = []

    // בדיקה: האם endpoint של admin נגיש ל-ACCOUNTANT?
    // (נדמה כניסה של accountant)
    const accountantApi = new ApiClient(CONFIG.baseUrl, 'rivka@uriel-practice.co.il', 'Demo1234!')
    const accLogin = await accountantApi.login()
    if (accLogin) {
      const usersAsAcc = await accountantApi.get<any>('/api/users')
      if (usersAsAcc.ok) {
        feedback.push(fb('חובה', 'אבטחה – הרשאות', 'רואת חשבון רגילה יכולה לגשת לרשימת כל המשתמשים!', 'שגיאת 403 Forbidden', `קוד ${usersAsAcc.status} OK`))
      }
    }

    feedback.push(fb('חשוב', 'אבטחה', 'חסרת rate limiting ברשום/התחברות נגד brute-force', 'חסימה אחרי 5 ניסיונות כושלים', 'לא בדקתי – לבדוק'))
    feedback.push(fb('נחמד', 'אבטחה', 'חסרת התראה ב-email על כניסהממכשיר חדש', 'מייל "כניסה חדשה זוהתה"', 'אין'))

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
