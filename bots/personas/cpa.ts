/**
 * בוט #1 – רואה החשבון הראשי
 * שם: רבקה לוי (ACCOUNTANT)
 * תפקיד: רואת החשבון הראשית במשרד
 * מסכים: דשבורד, לקוחות, תהליכים, משימות, מסמכים
 */

import { ApiClient, runScenario, fb } from '../api-client.js'
import { BotConfig, BotReport, FeedbackItem, ScenarioResult } from '../types.js'

const CONFIG: BotConfig = {
  id: 'cpa',
  personaName: 'רבקה לוי',
  personaRole: 'רואת חשבון ראשית',
  personaDescription:
    'אני רואת חשבון עם 15 שנות ניסיון. אני מנהלת את כל הלקוחות, בודקת ומאשרת תהליכים, ומגישה דוחות לרשויות. ' +
    'אני צריכה לראות בצורה מהירה מה דחוף, מה מחכה לי, ומה מחכה ללקוח. ' +
    'הכי חשוב לי: מידע מדויק ומהיר על מועדי הגשה ועל לקוחות בסיכון.',
  credentials: { email: 'rivka@uriel-practice.co.il', password: 'Demo1234!' },
  baseUrl: 'http://localhost:3001',
}

export async function runCpaBot(): Promise<BotReport> {
  const api = new ApiClient(CONFIG.baseUrl, CONFIG.credentials!.email, CONFIG.credentials!.password)
  const scenarios: ScenarioResult[] = []
  const globalFeedback: FeedbackItem[] = []

  // ─── התחברות ─────────────────────────────────
  const loginOk = await api.login()
  if (!loginOk) {
    globalFeedback.push(fb('חובה', 'מסך כניסה', 'לא הצלחתי להתחבר עם הפרטים הנכונים', 'כניסה מוצלחת', 'כישלון התחברות'))
    return buildReport(CONFIG, scenarios, globalFeedback, false)
  }

  // ─── תרחיש 1: דשבורד ─────────────────────────
  scenarios.push(await runScenario('דשבורד – סקירת מצב כללי', async () => {
    const feedback: FeedbackItem[] = []
    const res = await api.get<any>('/api/dashboard/summary')

    if (!res.ok) {
      feedback.push(fb('חובה', 'דשבורד', 'הדשבורד לא טוען', 'נתוני סיכום', `קוד שגיאה ${res.status}`))
      return { status: res.status, data: res.data, feedback }
    }

    const d = res.data
    // בדיקת שדות חיוניים
    if (d.counts === undefined) {
      feedback.push(fb('חובה', 'דשבורד', 'חסרים נתוני counts בתגובת הדשבורד', 'אובייקט counts עם ספירות', 'undefined'))
    }
    if (!Array.isArray(d.overdueProcesses)) {
      feedback.push(fb('חובה', 'דשבורד', 'חסרת רשימת תהליכים באיחור', 'מערך overdueProcesses', typeof d.overdueProcesses))
    }
    if (!Array.isArray(d.dueSoonProcesses)) {
      feedback.push(fb('חשוב', 'דשבורד', 'חסרת רשימת תהליכים שעומדים לפוג', 'מערך dueSoonProcesses', typeof d.dueSoonProcesses))
    }
    if (!Array.isArray(d.myTasks)) {
      feedback.push(fb('חשוב', 'דשבורד', 'חסרת רשימת המשימות האישיות שלי', 'מערך myTasks', typeof d.myTasks))
    }

    // בדיקה אם יש כלל נתוני עובדים
    if (!Array.isArray(d.teamWorkload) || d.teamWorkload.length === 0) {
      feedback.push(fb('נחמד', 'דשבורד', 'אין נתוני עומס עובדים', 'ויזואליזציה של עומס צוות', 'ריק'))
    }

    // בדיקת חובות
    if (!Array.isArray(d.overdueDebts)) {
      feedback.push(fb('חשוב', 'דשבורד', 'חסרת רשימת לקוחות עם חובות', 'מערך overdueDebts', typeof d.overdueDebts))
    }

    if (feedback.length === 0) {
      feedback.push(fb('נחמד', 'דשבורד', 'הדשבורד מחזיר נתונים אך חסר קיצור דרך לפעולה מהירה', 'כפתור "טפל עכשיו" ליד כל פריט', 'אין אפשרות פעולה ישירה מהדשבורד'))
    }

    return { status: res.status, data: d, feedback }
  }))

  // ─── תרחיש 2: רשימת לקוחות ───────────────────
  scenarios.push(await runScenario('לקוחות – חיפוש וסינון', async () => {
    const feedback: FeedbackItem[] = []

    // רשימה כללית
    const listRes = await api.get<any>('/api/clients?page=1&limit=20')
    if (!listRes.ok) {
      feedback.push(fb('חובה', 'רשימת לקוחות', 'הרשימה לא נטענת', 'רשימת לקוחות', `שגיאה ${listRes.status}`))
      return { status: listRes.status, data: null, feedback }
    }
    const { data: clients, total, page, limit } = listRes.data
    if (!Array.isArray(clients)) {
      feedback.push(fb('חובה', 'רשימת לקוחות', 'תגובת הרשימה אינה מכילה מערך data', 'מערך לקוחות', typeof clients))
      return { status: 200, data: listRes.data, feedback }
    }

    if (clients.length === 0) {
      feedback.push(fb('חשוב', 'רשימת לקוחות', 'הרשימה ריקה – אין לקוחות', 'לפחות 5 לקוחות demo', '0 לקוחות'))
    }

    // בדיקת שדות בכרטיס לקוח
    const c = clients[0]
    if (c) {
      if (!c.healthScore && c.healthScore !== 0) feedback.push(fb('חשוב', 'כרטיס לקוח', 'חסר ציון בריאות (healthScore) בתצוגת הרשימה', 'healthScore כמספר', 'שדה חסר'))
      if (!c.clientType) feedback.push(fb('חשוב', 'כרטיס לקוח', 'חסר סוג עוסק (clientType)', 'סוג עוסק', 'שדה חסר'))
    }

    // חיפוש
    const searchRes = await api.get<any>('/api/clients?search=ברק')
    if (!searchRes.ok) {
      feedback.push(fb('חשוב', 'חיפוש לקוחות', 'החיפוש נכשל', 'תוצאות חיפוש', `שגיאה ${searchRes.status}`))
    } else {
      if (!searchRes.data?.data?.length) {
        feedback.push(fb('חשוב', 'חיפוש לקוחות', 'חיפוש "ברק" לא מחזיר תוצאות למרות שהלקוח קיים', '1+ תוצאות', '0 תוצאות'))
      }
    }

    // סינון לפי סוג
    const filterRes = await api.get<any>('/api/clients?clientType=CHEVRA_BVM')
    if (!filterRes.ok) {
      feedback.push(fb('נחמד', 'סינון לקוחות', 'הסינון לפי סוג עוסק נכשל', 'תוצאות מסוננות', `שגיאה ${filterRes.status}`))
    }

    if (total !== undefined && limit !== undefined && total > limit) {
      if (page === undefined) {
        feedback.push(fb('חשוב', 'רשימת לקוחות', 'חסרים נתוני עמוד (page) בתגובה', 'מספר עמוד נוכחי', 'שדה חסר'))
      }
    }

    return { status: 200, data: listRes.data, feedback }
  }))

  // ─── תרחיש 3: פרטי לקוח ─────────────────────
  scenarios.push(await runScenario('לקוח – מסך 360', async () => {
    const feedback: FeedbackItem[] = []

    // מצא לקוח ראשון
    const listRes = await api.get<any>('/api/clients?limit=1')
    if (!listRes.ok || !listRes.data?.data?.length) {
      feedback.push(fb('חובה', 'פרטי לקוח', 'לא ניתן לקבל לקוח לבדיקה', 'לקוח demo', 'ריק'))
      return { status: 0, data: null, feedback }
    }
    const clientId = listRes.data.data[0].id

    const res = await api.get<any>(`/api/clients/${clientId}`)
    if (!res.ok) {
      feedback.push(fb('חובה', 'פרטי לקוח', 'מסך הלקוח לא נטען', 'נתוני לקוח מלאים', `שגיאה ${res.status}`))
      return { status: res.status, data: null, feedback }
    }

    const c = res.data
    // שדות חיוניים
    if (!c.contacts || c.contacts.length === 0) feedback.push(fb('חשוב', 'פרטי לקוח', 'חסרים אנשי קשר לצפייה', 'רשימת contacts', 'ריק'))
    if (!c.recentProcesses) feedback.push(fb('חשוב', 'פרטי לקוח – תהליכים אחרונים', 'חסרים תהליכים אחרונים', 'recentProcesses', 'שדה חסר'))
    if (!c.openTasks) feedback.push(fb('חשוב', 'פרטי לקוח – משימות', 'חסרות משימות פתוחות', 'openTasks', 'שדה חסר'))
    if (c.healthScore === undefined) feedback.push(fb('חשוב', 'פרטי לקוח', 'חסר ציון בריאות', 'healthScore', 'שדה חסר'))
    if (!c.servicePlan && !c.servicePlanId) feedback.push(fb('חשוב', 'פרטי לקוח', 'חסרת חבילת שירות', 'servicePlan', 'שדה חסר'))

    // ציון בריאות
    const healthRes = await api.get<any>(`/api/clients/${clientId}/health`)
    if (!healthRes.ok) {
      feedback.push(fb('חשוב', 'ציון בריאות לקוח', 'חישוב ציון בריאות נכשל', 'ציון בריאות עדכני', `שגיאה ${healthRes.status}`))
    }

    // חסר: היסטוריית תקשורת ישירה בפרטי לקוח
    feedback.push(fb('נחמד', 'פרטי לקוח', 'חסרת היסטוריית תקשורת (הודעות, שיחות) בתצוגת הלקוח', 'לשונית תקשורת עם היסטוריה', 'אין תצוגת תקשורת'))

    return { status: res.status, data: c, feedback }
  }))

  // ─── תרחיש 4: תהליכים ───────────────────────
  scenarios.push(await runScenario('תהליכים – ניהול ואישור', async () => {
    const feedback: FeedbackItem[] = []

    const res = await api.get<any>('/api/process-instances?limit=20')
    if (!res.ok) {
      feedback.push(fb('חובה', 'רשימת תהליכים', 'רשימת התהליכים לא נטענת', 'רשימת תהליכים', `שגיאה ${res.status}`))
      return { status: res.status, data: null, feedback }
    }

    const { data: processes } = res.data
    if (!Array.isArray(processes)) {
      feedback.push(fb('חובה', 'רשימת תהליכים', 'תגובה לא תקינה – חסר data', 'מערך תהליכים', typeof processes))
      return { status: 200, data: res.data, feedback }
    }

    if (processes.length === 0) {
      feedback.push(fb('חשוב', 'רשימת תהליכים', 'אין תהליכים בדמו', 'תהליכים לפי seed', '0 תהליכים'))
    }

    // בדיקת סינון לפי איחור
    const overdueRes = await api.get<any>('/api/process-instances?isOverdue=true')
    if (!overdueRes.ok) {
      feedback.push(fb('חשוב', 'סינון תהליכים', 'סינון "באיחור" נכשל', 'תהליכים באיחור', `שגיאה ${overdueRes.status}`))
    }

    // פרטי תהליך ספציפי
    if (processes.length > 0) {
      const pid = processes[0].id
      const detailRes = await api.get<any>(`/api/process-instances/${pid}`)
      if (!detailRes.ok) {
        feedback.push(fb('חובה', 'פרטי תהליך', 'מסך פרטי תהליך לא נטען', 'פרטי תהליך מלאים', `שגיאה ${detailRes.status}`))
      } else {
        const p = detailRes.data
        if (!p.steps || p.steps.length === 0) {
          feedback.push(fb('חשוב', 'פרטי תהליך – שלבים', 'חסרים שלבי תהליך', 'רשימת steps', 'ריק'))
        }
        if (!p.requiredDocuments) {
          feedback.push(fb('נחמד', 'פרטי תהליך', 'חסרת רשימת מסמכים נדרשים לתהליך', 'requiredDocuments', 'שדה חסר'))
        }
      }
    }

    // חסר: אין אפשרות לראות תהליכים לפי חודש/שנה בצורה ברורה
    feedback.push(fb('חשוב', 'רשימת תהליכים', 'חסר פילטר תצוגה לפי תקופה (חודש+שנה) בממשק ברור', 'dropdown בחירת תקופה', 'פרמטרי URL בלבד'))
    feedback.push(fb('נחמד', 'תהליכים', 'חסרת אפשרות לייצוא רשימת תהליכים ל-Excel', 'כפתור ייצוא', 'אין'))

    return { status: 200, data: res.data, feedback }
  }))

  // ─── תרחיש 5: מסמכים ─────────────────────────
  scenarios.push(await runScenario('מסמכים – חיפוש ומסמכים חסרים', async () => {
    const feedback: FeedbackItem[] = []

    const res = await api.get<any>('/api/documents?limit=10')
    if (!res.ok) {
      feedback.push(fb('חשוב', 'מסמכים', 'מסך מסמכים לא נטען', 'רשימת מסמכים', `שגיאה ${res.status}`))
      return { status: res.status, data: null, feedback }
    }

    const docs = res.data?.data
    if (!Array.isArray(docs)) {
      feedback.push(fb('חשוב', 'מסמכים', 'תגובת מסמכים לא תקינה', 'מערך מסמכים', typeof docs))
    }

    feedback.push(fb('חשוב', 'מסמכים', 'חסרת תצוגת מסמכים לפי לקוח בדף הלקוח עצמו', 'לשונית מסמכים בפרופיל לקוח', 'מסמכים בדף נפרד בלבד'))
    feedback.push(fb('נחמד', 'מסמכים', 'חסרת תצוגה מקדימה (preview) לקבצי PDF/תמונה', 'Preview מוטמע', 'הורדה בלבד'))
    feedback.push(fb('חובה', 'מסמכים', 'חסרת התראה אוטומטית ללקוח כשמסמך חסר', 'שליחת תזכורת ישירה מהמסך', 'אין מנגנון התראה'))

    return { status: 200, data: res.data, feedback }
  }))

  // ─── תרחיש 6: משימות ────────────────────────
  scenarios.push(await runScenario('משימות – רשימת משימות אישיות', async () => {
    const feedback: FeedbackItem[] = []

    const res = await api.get<any>('/api/tasks?myTasks=true&status=OPEN')
    if (!res.ok) {
      feedback.push(fb('חובה', 'משימות', 'רשימת משימות לא נטענת', 'משימות אישיות פתוחות', `שגיאה ${res.status}`))
      return { status: res.status, data: null, feedback }
    }

    const { data: tasks } = res.data
    if (!Array.isArray(tasks)) {
      feedback.push(fb('חובה', 'משימות', 'תגובה לא תקינה', 'מערך משימות', typeof tasks))
      return { status: 200, data: res.data, feedback }
    }

    if (tasks.length === 0) {
      feedback.push(fb('חשוב', 'משימות', 'אין משימות פתוחות בדמו ל-rivka', 'לפחות 2 משימות', '0 משימות'))
    }

    // בדיקת עדיפות
    const urgentTasks = tasks.filter((t: any) => t.priority === 'URGENT')
    if (urgentTasks.length > 5) {
      feedback.push(fb('חשוב', 'משימות', `${urgentTasks.length} משימות דחופות – קשה לתעדף`, 'עד 3 דחופות', `${urgentTasks.length} דחופות`))
    }

    feedback.push(fb('נחמד', 'משימות', 'חסרת תצוגת לוח (Kanban) לניהול משימות', 'תצוגת Kanban/Board', 'רשימה בלבד'))
    feedback.push(fb('חשוב', 'משימות', 'חסרת סיכום יומי ב-email עם המשימות של היום', 'אימייל בוקר עם רשימת המשימות', 'אין'))

    return { status: 200, data: res.data, feedback }
  }))

  return buildReport(CONFIG, scenarios, globalFeedback, true)
}

function buildReport(config: BotConfig, scenarios: ScenarioResult[], globalFeedback: FeedbackItem[], loginOk: boolean): BotReport {
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
