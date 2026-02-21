/**
 * בוט #13 – מתמחה חדש במשרד
 * שם: גל שמש (BOOKKEEPER role – moshe@)
 * תפקיד: מתמחה בהנהלת חשבונות, יום ראשון בעבודה
 * מסכים: כל הסקציות הראשיות – האם קל ללמוד?
 */

import { ApiClient, runScenario, fb } from '../api-client.js'
import { BotConfig, BotReport, FeedbackItem, ScenarioResult } from '../types.js'

const CONFIG: BotConfig = {
  id: 'intern',
  personaName: 'גל שמש',
  personaRole: 'מתמחה – הנהלת חשבונות',
  personaDescription:
    'אני מתמחה חדש שהגיע אתמול. אין לי ניסיון במערכות CRM. ' +
    'קיבלתי שם משתמש וסיסמה וניסיתי להבין בעצמי מה עושים. ' +
    'הכי חשוב לי: שהמערכת תהיה אינטואיטיבית, שיהיו הסברים ותיעוד, ' +
    'ושלא אצור בעיות בגלל שאני לא מכיר.',
  credentials: { email: 'moshe@uriel-practice.co.il', password: 'Demo1234!' },
  baseUrl: 'http://localhost:3001',
}

export async function runInternBot(): Promise<BotReport> {
  const api = new ApiClient(CONFIG.baseUrl, CONFIG.credentials!.email, CONFIG.credentials!.password)
  const scenarios: ScenarioResult[] = []
  const globalFeedback: FeedbackItem[] = []

  const loginOk = await api.login()
  if (!loginOk) {
    globalFeedback.push(fb('חובה', 'כניסה', 'מתמחה לא הצליח להתחבר', 'כניסה מוצלחת', 'נכשל'))
    return buildReport(CONFIG, scenarios, globalFeedback)
  }

  // ─── תרחיש 1: ניווט ראשוני – דשבורד ────────
  scenarios.push(await runScenario('דשבורד – הרושם הראשוני', async () => {
    const feedback: FeedbackItem[] = []

    const statsRes = await api.get<any>('/api/dashboard/stats')
    if (!statsRes.ok) {
      feedback.push(fb('חובה', 'דשבורד', 'הדשבורד לא נטען עבור הרול BOOKKEEPER', 'דשבורד מותאם לתפקיד', `שגיאה ${statsRes.status}`))
      return { status: statsRes.status, data: null, feedback }
    }

    const stats = statsRes.data
    if (!stats || Object.keys(stats).length === 0) {
      feedback.push(fb('חשוב', 'דשבורד', 'הדשבורד ריק לחלוטין – מבלבל למתחיל', 'לפחות כמה מדדים', 'ריק'))
    }

    feedback.push(fb('חובה', 'דשבורד', 'חסרת מדריך "התחל כאן" לעובד חדש – אין onboarding flow', 'Wizard/Checklist לעובד חדש', 'אין'))
    feedback.push(fb('חובה', 'דשבורד', 'לא ברור מה המשימות שלי כ-BOOKKEEPER – אין הפרדה לפי תפקיד', 'דשבורד מותאם לתפקיד', 'דשבורד גנרי'))
    feedback.push(fb('חשוב', 'דשבורד', 'חסר tooltip/הסבר על כל מדד בדשבורד', 'Tooltips הסבריים', 'אין'))
    feedback.push(fb('נחמד', 'דשבורד', 'הייתה שימושית רשימת "הכי דחוף עכשיו" לעובד שהיה ניתן להתחיל ממנה', 'Top 3 urgent items', 'אין'))

    return { status: 200, data: stats, feedback }
  }))

  // ─── תרחיש 2: ניסיון לעבוד עם לקוחות ───────
  scenarios.push(await runScenario('לקוחות – ניווט ראשוני ברשימה', async () => {
    const feedback: FeedbackItem[] = []

    const clientsRes = await api.get<any>('/api/clients?limit=10')
    if (!clientsRes.ok) {
      feedback.push(fb('חובה', 'לקוחות', 'BOOKKEEPER לא מצליח לטעון לקוחות', 'רשימת לקוחות', `שגיאה ${clientsRes.status}`))
      return { status: clientsRes.status, data: null, feedback }
    }

    const clients = clientsRes.data?.data ?? []
    if (clients.length === 0) {
      feedback.push(fb('חשוב', 'לקוחות', 'רשימת לקוחות ריקה', 'לקוחות לעבוד איתם', '0'))
      return { status: 200, data: null, feedback }
    }

    // ניסיון לראות פרטי לקוח
    const clientId = clients[0].id
    const detailRes = await api.get<any>(`/api/clients/${clientId}`)
    if (!detailRes.ok) {
      feedback.push(fb('חובה', 'פרטי לקוח', 'BOOKKEEPER לא יכול לראות פרטי לקוח', 'גישה לפרטי לקוח', `שגיאה ${detailRes.status}`))
    } else {
      const c = detailRes.data
      if (!c.businessNumber && !c.taxId) {
        feedback.push(fb('חשוב', 'פרטי לקוח', 'מספר עוסק/תאגיד חסר בפרטי לקוח – מתמחה לא יודע עם מי מדובר', 'businessNumber/taxId', 'שדה חסר'))
      }
    }

    feedback.push(fb('חשוב', 'לקוחות', 'חסרת הסבר מה כל סוג לקוח (עוסק פטור / מורשה / חברה בע"מ) וההשלכות', 'Tooltip עם הסבר לכל סוג', 'אין'))
    feedback.push(fb('נחמד', 'לקוחות', 'הייתה שימושית תצוגת "לקוחות שמוקצים לי" כברירת מחדל', 'פילטר "הלקוחות שלי"', 'רשימה כללית'))

    return { status: 200, data: { clientCount: clients.length }, feedback }
  }))

  // ─── תרחיש 3: ניסיון לבצע משימה בסיסית ─────
  scenarios.push(await runScenario('משימות – ביצוע משימה ראשונה', async () => {
    const feedback: FeedbackItem[] = []

    const tasksRes = await api.get<any>('/api/tasks?limit=10')
    if (!tasksRes.ok) {
      feedback.push(fb('חובה', 'משימות', 'לא ניתן לטעון משימות', 'רשימת משימות', `שגיאה ${tasksRes.status}`))
      return { status: tasksRes.status, data: null, feedback }
    }

    const tasks = tasksRes.data?.data ?? []
    if (tasks.length === 0) {
      feedback.push(fb('חשוב', 'משימות', 'אין משימות במערכת לדמו', 'לפחות 3 משימות', '0'))
    } else {
      const task = tasks[0]
      if (!task.description && !task.details) {
        feedback.push(fb('חשוב', 'משימות', 'למשימות אין תיאור – מתמחה לא יודע מה לעשות', 'שדה description/details', 'שדה חסר'))
      }
      if (!task.assignedTo && !task.assignee) {
        feedback.push(fb('חשוב', 'משימות', 'משימות לא מוקצות לאיש – לא ברור מי אחראי', 'שדה assignedTo', 'שדה חסר'))
      }
    }

    feedback.push(fb('חובה', 'משימות', 'חסרת הנחיות SOP מובנות בכל משימה – מתמחה לא יודע כיצד לבצע', 'מדריך ביצוע מובנה לכל סוג משימה', 'אין'))
    feedback.push(fb('חשוב', 'משימות', 'אין אפשרות לשאול שאלה / לבקש עזרה ממנהל ישירות מהמשימה', 'כפתור "בקש עזרה" ישיר', 'אין'))
    feedback.push(fb('נחמד', 'משימות', 'הייתה שימושית הדרכה צעד-אחר-צעד בהשלמת משימה ראשונה', 'Tutorial mode', 'אין'))

    return { status: 200, data: { taskCount: tasks.length }, feedback }
  }))

  // ─── תרחיש 4: ניסיון לגשת לתהליכים ─────────
  scenarios.push(await runScenario('תהליכים – הבנת תהליך ראשוני', async () => {
    const feedback: FeedbackItem[] = []

    const procRes = await api.get<any>('/api/processes?limit=5')
    if (!procRes.ok) {
      feedback.push(fb('חובה', 'תהליכים', 'BOOKKEEPER לא יכול לראות תהליכים', 'גישה לתהליכים', `שגיאה ${procRes.status}`))
      return { status: procRes.status, data: null, feedback }
    }

    const processes = procRes.data?.data ?? procRes.data ?? []
    const processList = Array.isArray(processes) ? processes : []

    feedback.push(fb('חובה', 'תהליכים', 'מתמחה לא מבין מה הבדל בין תבנית תהליך לאינסטנס – אין הסבר', 'הסבר ויזואלי: Template vs Instance', 'אין'))
    feedback.push(fb('חשוב', 'תהליכים', 'לא ניתן לראות "מה התפקיד שלי" בתהליך – אין הדגשת השלבים של ה-BOOKKEEPER', 'שלבי "הבא שלי" מסומנים', 'צריך לקרוא הכל'))
    feedback.push(fb('נחמד', 'תהליכים', 'סרטון הדרכה קצר (2 דקות) לכל סוג תהליך יעזור מאוד', 'Video tutorial לכל תהליך', 'אין'))

    return { status: 200, data: { processCount: processList.length }, feedback }
  }))

  // ─── תרחיש 5: גישה לתבניות ───────────────────
  scenarios.push(await runScenario('תבניות – הבנת תבניות תהליך', async () => {
    const feedback: FeedbackItem[] = []

    const templatesRes = await api.get<any>('/api/process-templates')
    if (!templatesRes.ok) {
      feedback.push(fb('חשוב', 'תבניות', 'BOOKKEEPER לא יכול לראות תבניות תהליך', 'גישה לתבניות', `שגיאה ${templatesRes.status}`))
      return { status: templatesRes.status, data: null, feedback }
    }

    const templates = templatesRes.data?.data ?? templatesRes.data ?? []
    const templateList = Array.isArray(templates) ? templates : []

    if (templateList.length === 0) {
      feedback.push(fb('חשוב', 'תבניות', 'אין תבניות בדמו', 'לפחות 3 תבניות', '0'))
    } else {
      const tmpl = templateList[0]
      if (!tmpl.description) {
        feedback.push(fb('חשוב', 'תבניות', 'תבניות ללא תיאור – מתמחה לא יודע מתי להשתמש בכל תבנית', 'שדה description', 'שדה חסר'))
      }
    }

    feedback.push(fb('חשוב', 'תבניות', 'חסרת "מדריך שימוש" לכל תבנית – מתי להשתמש בה ומה זה כולל', 'תיאור + מדריך לכל תבנית', 'אין'))

    return { status: 200, data: { templateCount: templateList.length }, feedback }
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
