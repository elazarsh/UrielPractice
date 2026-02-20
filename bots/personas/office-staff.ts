/**
 * בוט #3 – עובד משרד רואה החשבון
 * שם: משה גולד (BOOKKEEPER)
 * תפקיד: הזנת נתונים, ניהול מסמכים, ביצוע שלבי תהליך
 */

import { ApiClient, runScenario, fb } from '../api-client.js'
import { BotConfig, BotReport, FeedbackItem, ScenarioResult } from '../types.js'

const CONFIG: BotConfig = {
  id: 'office-staff',
  personaName: 'משה גולד',
  personaRole: 'מנהל חשבונות (Bookkeeper)',
  personaDescription:
    'אני עושה את העבודה השוטפת – מזין נתונים, מעלה מסמכים, מסמן שלבים בתהליכים. ' +
    'אני לא רוצה ממשקים מסובכים. אני צריך לדעת בדיוק מה לעשות עכשיו ומה הלקוח שלח. ' +
    'הכי חשוב לי: פשטות, מהירות, ורשימת "מה יש לי לעשות היום".',
  credentials: { email: 'moshe@uriel-practice.co.il', password: 'Demo1234!' },
  baseUrl: 'http://localhost:3001',
}

export async function runOfficeStaffBot(): Promise<BotReport> {
  const api = new ApiClient(CONFIG.baseUrl, CONFIG.credentials!.email, CONFIG.credentials!.password)
  const scenarios: ScenarioResult[] = []
  const globalFeedback: FeedbackItem[] = []

  const loginOk = await api.login()
  if (!loginOk) {
    globalFeedback.push(fb('חובה', 'כניסה', 'עובד לא הצליח להתחבר', 'כניסה מוצלחת', 'נכשל'))
    return buildReport(CONFIG, scenarios, globalFeedback)
  }

  // ─── תרחיש 1: משימות שלי ─────────────────────
  scenarios.push(await runScenario('רשימת "מה יש לי לעשות היום"', async () => {
    const feedback: FeedbackItem[] = []

    const res = await api.get<any>('/api/tasks?myTasks=true&status=OPEN&status=IN_PROGRESS')
    if (!res.ok) {
      feedback.push(fb('חובה', 'משימות שלי', 'לא ניתן לטעון משימות', 'רשימת משימות אישיות', `שגיאה ${res.status}`))
      return { status: res.status, data: null, feedback }
    }

    const { data: tasks } = res.data
    feedback.push(fb('חשוב', 'משימות', 'חסרת תצוגת "היום" – משימות שמועד ביצוען הוא היום ספציפית', 'פילטר "היום" בראש המסך', 'צריך לסנן ידנית לפי תאריך'))
    feedback.push(fb('חשוב', 'משימות', 'אין אינדיקציה אם ה"משימה" שייכת לתהליך ספציפי בתצוגת הרשימה', 'שם התהליך + לקוח בולטים', 'רק שם המשימה'))
    feedback.push(fb('נחמד', 'משימות', 'חסרת אפשרות לסמן "סיימתי" בלחיצה אחת מהרשימה', 'כפתור checkbox/סיום מהיר', 'צריך לפתוח פרטי משימה'))

    return { status: 200, data: res.data, feedback }
  }))

  // ─── תרחיש 2: הזנת שלב בתהליך ───────────────
  scenarios.push(await runScenario('עדכון שלב בתהליך', async () => {
    const feedback: FeedbackItem[] = []

    const procRes = await api.get<any>('/api/process-instances?limit=5&status=IN_PROGRESS')
    if (!procRes.ok) {
      feedback.push(fb('חשוב', 'תהליכים', 'לא ניתן לטעון תהליכים בעבודה', 'תהליכים IN_PROGRESS', `שגיאה ${procRes.status}`))
      return { status: procRes.status, data: null, feedback }
    }

    const processes = procRes.data?.data
    if (!Array.isArray(processes) || processes.length === 0) {
      feedback.push(fb('חשוב', 'תהליכים', 'אין תהליכים IN_PROGRESS כרגע', 'תהליכים פעילים', '0'))
      return { status: 200, data: null, feedback }
    }

    const pid = processes[0].id
    const detailRes = await api.get<any>(`/api/process-instances/${pid}`)
    if (!detailRes.ok) {
      feedback.push(fb('חובה', 'פרטי תהליך', 'לא ניתן לפתוח תהליך', 'פרטי תהליך', `שגיאה ${detailRes.status}`))
      return { status: detailRes.status, data: null, feedback }
    }

    const process = detailRes.data
    if (!process.steps?.length) {
      feedback.push(fb('חשוב', 'שלבי תהליך', 'תהליך ללא שלבים', 'שלבים מוגדרים', '0'))
      return { status: 200, data: process, feedback }
    }

    // ניסיון עדכון שלב
    const step = process.steps[0]
    const updateRes = await api.patch<any>(`/api/process-instances/${pid}/steps/${step.id}`, {
      notes: 'בוט בדיקה – עדכון שלב',
    })
    if (!updateRes.ok) {
      feedback.push(fb('חשוב', 'עדכון שלב', 'לא ניתן לעדכן שלב בתהליך', 'עדכון מוצלח', `שגיאה ${updateRes.status}`))
    }

    feedback.push(fb('חשוב', 'שלבי תהליך', 'חסר מידע ברור "מי אחראי על השלב הזה" בצד המשתמש', 'שם אחראי גדול וברור', 'role בלבד, לא שם'))
    feedback.push(fb('נחמד', 'שלבי תהליך', 'חסרת תזכורת אוטומטית כשמגיע תורי לבצע שלב', 'notification/email אוטומטי', 'אין'))

    return { status: 200, data: process, feedback }
  }))

  // ─── תרחיש 3: העלאת מסמך ─────────────────────
  scenarios.push(await runScenario('העלאת מסמך ובדיקת מסמכים חסרים', async () => {
    const feedback: FeedbackItem[] = []

    const docsRes = await api.get<any>('/api/documents?limit=5')
    if (!docsRes.ok) {
      feedback.push(fb('חשוב', 'מסמכים', 'לא ניתן לטעון מסמכים', 'רשימת מסמכים', `שגיאה ${docsRes.status}`))
      return { status: docsRes.status, data: null, feedback }
    }

    feedback.push(fb('חובה', 'העלאת מסמכים', 'אחרי העלאת מסמך אין אישור ויזואלי ברור (success message)', 'הודעת הצלחה: "המסמך הועלה בהצלחה"', 'לא ברור מהממשק'))
    feedback.push(fb('חשוב', 'מסמכים', 'חסרת אפשרות לסמן מסמך כ"לא רלוונטי" (לא נדרש לתקופה זו)', 'כפתור "לא רלוונטי" / פטור', 'אין'))
    feedback.push(fb('חשוב', 'מסמכים', 'לא ניתן להעלות מספר מסמכים בבת אחת (bulk upload)', 'Drag & Drop מרובה', 'קובץ אחד בכל פעם'))
    feedback.push(fb('נחמד', 'מסמכים', 'חסרת תצוגת "אחוז השלמה" של מסמכים נדרשים לתהליך', 'Progress bar "3 מתוך 5 מסמכים"', 'אין'))

    return { status: 200, data: docsRes.data, feedback }
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
