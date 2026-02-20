/**
 * בוט #4 – בעל עסק / לקוח
 * שם: דוד ברק (בעלים של ברק תוכנה בע"מ)
 * תפקיד: מגיש נתונים ומסמכים, מצפה לשקיפות על מצב הדוחות שלו
 * הערה: אין לו חשבון עם role=CLIENT_USER בבסיס הנתונים הנוכחי
 *        הבוט מדמה את חוויה שלו וממליץ מה צריך לבנות
 */

import { ApiClient, runScenario, fb } from '../api-client.js'
import { BotConfig, BotReport, FeedbackItem, ScenarioResult } from '../types.js'

const CONFIG: BotConfig = {
  id: 'business-owner',
  personaName: 'דוד ברק',
  personaRole: 'בעל עסק / לקוח רואה החשבון',
  personaDescription:
    'אני מנכ"ל ברק תוכנה. שולח מסמכים לרואה החשבון ומצפה לקבל עדכונים על מצב הדוחות שלי. ' +
    'אין לי זמן לטלפונים – אני רוצה לראות בדשבורד פשוט: מה נשלח, מה מחכה, מה הוגש. ' +
    'לא מבין בחשבונאות – אני צריך שפה פשוטה ובינה ברורה.',
  // אין credentials כי CLIENT_USER לא מוגדר בseed
  baseUrl: 'http://localhost:3001',
}

export async function runBusinessOwnerBot(): Promise<BotReport> {
  const scenarios: ScenarioResult[] = []
  const globalFeedback: FeedbackItem[] = []

  // בוט זה אינו נכנס ישירות – מדמה מה שהוא היה מצפה לראות
  // ומשתמש בפרספקטיבת ה-API כדי לבדוק שהנתונים הנכונים קיימים

  const adminApi = new ApiClient(CONFIG.baseUrl, 'admin@uriel-practice.co.il', 'Demo1234!')
  await adminApi.login()

  // ─── תרחיש 1: פורטל לקוח – האם קיים? ─────────
  scenarios.push(await runScenario('פורטל לקוח – קיום ונגישות', async () => {
    const feedback: FeedbackItem[] = []

    // ניסיון כניסה עם אימייל לקוח (שאין לו חשבון)
    const clientApi = new ApiClient(CONFIG.baseUrl, 'david@barak-software.co.il', 'Demo1234!')
    const loginOk = await clientApi.login()

    if (!loginOk) {
      feedback.push(fb('חובה', 'פורטל לקוח', 'אין פורטל לקוח – לקוח לא יכול להתחבר למערכת', 'כניסה לפורטל ייעודי ללקוח', 'אין פורטל לקוח כלל'))
      feedback.push(fb('חובה', 'פורטל לקוח', 'כל תקשורת עם הלקוח היא טלפון/אימייל – אין דיגיטל', 'ממשק לקוח עם דשבורד מצב', 'לא קיים'))
    }

    feedback.push(fb('חובה', 'פורטל לקוח', 'חסר מסך ייעודי ללקוח שיראה: "מה הוגש, מה ממתין, מה חסר"', 'דשבורד לקוח עם סטטוס דוחות', 'אין'))
    feedback.push(fb('חובה', 'פורטל לקוח', 'חסרת אפשרות להעלאת מסמכים על ידי הלקוח ישירות', 'Drag & Drop להעלאה מהלקוח', 'אין'))
    feedback.push(fb('חובה', 'פורטל לקוח', 'חסרת אפשרות לאישור מסמכים על ידי הלקוח (חתימה דיגיטלית)', 'חתימה דיגיטלית / אישור', 'אין'))
    feedback.push(fb('חשוב', 'פורטל לקוח', 'חסרת גישה להיסטוריית הדוחות שהוגשו בשמי', 'רשימת כל הדוחות שהוגשו עם תאריך ואישור', 'אין'))
    feedback.push(fb('חשוב', 'פורטל לקוח', 'חסרת תצוגת חיובים ותשלומים – כמה אני חייב ומה שילמתי', 'דף חשבוני', 'אין'))
    feedback.push(fb('נחמד', 'פורטל לקוח', 'היה נחמד לקבל סיכום שנתי ב-PDF של כל מה שנעשה', 'דוח שנתי ללקוח', 'אין'))

    return { status: 0, data: null, feedback }
  }))

  // ─── תרחיש 2: בדיקת הנתונים שיש עלי ─────────
  scenarios.push(await runScenario('נתוני לקוח ובעל עסק מנקודת מבטו', async () => {
    const feedback: FeedbackItem[] = []

    // חפש את ברק תוכנה
    const searchRes = await adminApi.get<any>('/api/clients?search=ברק')
    if (!searchRes.ok || !searchRes.data?.data?.length) {
      feedback.push(fb('חשוב', 'נתוני לקוח', 'לא נמצא לקוח ברק בחיפוש', 'ברק תוכנה בתוצאות', 'לא נמצא'))
      return { status: 0, data: null, feedback }
    }

    const client = searchRes.data.data[0]
    const detailRes = await adminApi.get<any>(`/api/clients/${client.id}`)
    if (!detailRes.ok) {
      feedback.push(fb('חשוב', 'פרטי לקוח', 'לא ניתן לשלוף נתוני לקוח', 'נתונים מלאים', `שגיאה ${detailRes.status}`))
      return { status: detailRes.status, data: null, feedback }
    }

    const c = detailRes.data
    feedback.push(fb('חשוב', 'שקיפות מידע', `ציון הבריאות שלי הוא ${c.healthScore ?? 'לא ידוע'} – הלקוח לא יודע על זה כלל`, 'שקיפות: הלקוח יכול לראות ציון עם הסבר', 'ציון פנימי בלבד'))
    feedback.push(fb('נחמד', 'תקשורת', 'חסרת SMS/WhatsApp אוטומטי כשדרוש ממני מסמך', 'הודעת WhatsApp עם בקשת מסמך ספציפי', 'אין'))

    return { status: 200, data: c, feedback }
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
