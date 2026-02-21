/**
 * בוט #11 – לקוחה VIP (חברה גדולה)
 * שם: אביגיל כהן (ADMIN credentials – בודקת מה פורטל לקוח אמור להציע)
 * תפקיד: בעלת חברה גדולה שהיא לקוחת המשרד
 * מסכים: פורטל לקוח, חשבוניות, סטטוס תהליכים, מסמכים
 */

import { ApiClient, runScenario, fb } from '../api-client.js'
import { BotConfig, BotReport, FeedbackItem, ScenarioResult } from '../types.js'

const CONFIG: BotConfig = {
  id: 'vip-client',
  personaName: 'אביגיל כהן',
  personaRole: 'לקוחה VIP – מנכ"לית חברה גדולה',
  personaDescription:
    'אני מנכ"לית של חברה עם 80 עובדים. אני לקוחה של משרד ראיית החשבון ומשלמת עמלות גבוהות. ' +
    'אני מצפה לפורטל לקוח מסודר שיאפשר לי לראות את מצב הגשותיי, חשבוניות, ומסמכים. ' +
    'לא מקובל עליי להרים טלפון כל פעם שאני רוצה לדעת מה קורה עם הדוח השנתי שלי.',
  credentials: { email: 'admin@uriel-practice.co.il', password: 'Demo1234!' },
  baseUrl: 'http://localhost:3001',
}

export async function runVipClientBot(): Promise<BotReport> {
  const api = new ApiClient(CONFIG.baseUrl, CONFIG.credentials!.email, CONFIG.credentials!.password)
  const scenarios: ScenarioResult[] = []
  const globalFeedback: FeedbackItem[] = []

  const loginOk = await api.login()
  if (!loginOk) {
    globalFeedback.push(fb('חובה', 'כניסה', 'לא ניתן להתחבר', 'כניסה מוצלחת', 'נכשל'))
    return buildReport(CONFIG, scenarios, globalFeedback)
  }

  // ─── תרחיש 1: מציאת נתוני החברה שלי ─────────
  scenarios.push(await runScenario('פורטל לקוח – מציאת נתוני החברה', async () => {
    const feedback: FeedbackItem[] = []

    const clientsRes = await api.get<any>('/api/clients?search=כהן&limit=10')
    if (!clientsRes.ok) {
      feedback.push(fb('חובה', 'פורטל לקוח', 'לא ניתן לחפש את החברה שלי', 'חיפוש לפי שם', `שגיאה ${clientsRes.status}`))
      return { status: clientsRes.status, data: null, feedback }
    }

    const clients = clientsRes.data?.data ?? []
    feedback.push(fb('חובה', 'פורטל לקוח', 'אין פורטל לקוח ייעודי – הלקוחה לא יכולה להתחבר לראות את הנתונים שלה', 'פורטל לקוח נפרד עם login ייעודי', 'אין פורטל לקוח'))
    feedback.push(fb('חובה', 'פורטל לקוח', 'לקוחה VIP לא יכולה לראות את פרטי החברה שלה באופן עצמאי', 'מסך "החשבון שלי" ללקוח', 'אין גישה ישירה'))

    if (clients.length > 0) {
      const client = clients[0]
      const detailRes = await api.get<any>(`/api/clients/${client.id}`)
      if (detailRes.ok) {
        const c = detailRes.data
        if (!c.servicePlan && !c.servicePlanId) {
          feedback.push(fb('חשוב', 'פרטי לקוח', 'חסר פירוט חבילת השירות שהלקוחה מקבלת', 'חבילת שירות + מחיר + שירותים כלולים', 'שדה חסר'))
        }
      }
    }

    feedback.push(fb('נחמד', 'פורטל לקוח', 'לקוחה VIP ציפתה לראות "מנהל תיק" – שם ואיש קשר ישיר', 'שם + טלפון + אימייל של מנהל התיק', 'לא זמין'))

    return { status: 200, data: { clientsFound: clients.length }, feedback }
  }))

  // ─── תרחיש 2: היסטוריית חשבוניות ────────────
  scenarios.push(await runScenario('חיובים – היסטוריית חשבוניות', async () => {
    const feedback: FeedbackItem[] = []

    const billingRes = await api.get<any>('/api/billing')
    if (!billingRes.ok) {
      feedback.push(fb('חובה', 'חיובים', 'לא ניתן לטעון חיובים', 'היסטוריית חיובים', `שגיאה ${billingRes.status}`))
      return { status: billingRes.status, data: null, feedback }
    }

    const charges = billingRes.data?.data ?? billingRes.data ?? []
    const chargeList = Array.isArray(charges) ? charges : []

    if (chargeList.length === 0) {
      feedback.push(fb('חשוב', 'חיובים', 'אין חיובים בדמו לצפייה', 'לפחות 3 חיובים לדמו', '0 חיובים'))
    } else {
      const hasInvoiceNumber = chargeList.some((c: any) => c.invoiceNumber || c.invoice)
      if (!hasInvoiceNumber) {
        feedback.push(fb('חשוב', 'חיובים', 'חסר מספר חשבונית בתצוגת החיובים', 'מספר חשבונית לכל חיוב', 'שדה חסר'))
      }
      const hasPdfDownload = chargeList.some((c: any) => c.pdfUrl || c.downloadUrl)
      if (!hasPdfDownload) {
        feedback.push(fb('חשוב', 'חיובים', 'חסרת אפשרות הורדת חשבונית PDF', 'כפתור הורדת PDF', 'אין'))
      }
    }

    feedback.push(fb('חובה', 'חיובים', 'לקוחה לא יכולה לראות את החיובים שלה בלי גישת מנהל', 'גישת לקוח לחיובים שלו בלבד', 'גישה admin בלבד'))
    feedback.push(fb('חשוב', 'חיובים', 'חסרת אפשרות לסנן חיובים לפי תאריך/שנה', 'פילטר תאריכים', 'אין פילטר'))
    feedback.push(fb('נחמד', 'חיובים', 'הייתה שימושית גרף חודשי של הוצאות לרואה חשבון לאורך השנה', 'גרף עמודות חודשי', 'אין'))

    return { status: 200, data: { chargesFound: chargeList.length }, feedback }
  }))

  // ─── תרחיש 3: סטטוס תהליכים ─────────────────
  scenarios.push(await runScenario('תהליכים – מצב הגשות עבור הלקוחה', async () => {
    const feedback: FeedbackItem[] = []

    const procRes = await api.get<any>('/api/processes?limit=20')
    if (!procRes.ok) {
      feedback.push(fb('חובה', 'תהליכים', 'לא ניתן לטעון תהליכים', 'תהליכים ללקוחה', `שגיאה ${procRes.status}`))
      return { status: procRes.status, data: null, feedback }
    }

    feedback.push(fb('חובה', 'תהליכים', 'לקוחה לא יכולה לראות מה קורה עם ההגשות שלה (דוח שנתי, מע"מ) מבלי לפנות למשרד', 'מסך סטטוס הגשות ללקוח', 'אין גישת לקוח'))
    feedback.push(fb('חובה', 'תהליכים', 'אין קבלת אישור אוטומטית בסיום תהליך (למשל: "הדוח השנתי שלך הוגש בהצלחה")', 'הודעת אימייל/SMS בסיום תהליך', 'אין'))
    feedback.push(fb('חשוב', 'תהליכים', 'לקוחה לא יודעת אם הדוח שלה תקוע בגלל מסמך חסר ממנה', 'הודעה ישירה: "נדרשת פעולתך – שלח מסמך X"', 'שקיפות אפסית'))
    feedback.push(fb('נחמד', 'תהליכים', 'הייתה שימושית ציר זמן ויזואלי של שלבי התהליך', 'Progress timeline חזותי', 'אין'))

    return { status: 200, data: procRes.data, feedback }
  }))

  // ─── תרחיש 4: סיכום חיוב ─────────────────────
  scenarios.push(await runScenario('סיכום חיוב – תמונה פיננסית כוללת', async () => {
    const feedback: FeedbackItem[] = []

    const summaryRes = await api.get<any>('/api/billing/summary')
    if (!summaryRes.ok) {
      feedback.push(fb('חובה', 'סיכום חיוב', 'לא ניתן לטעון סיכום חיוב', 'סיכום פיננסי', `שגיאה ${summaryRes.status}`))
      return { status: summaryRes.status, data: null, feedback }
    }

    const summary = summaryRes.data
    if (!summary.totalBilled && summary.totalBilled !== 0) {
      feedback.push(fb('חשוב', 'סיכום חיוב', 'חסר סכום חיוב כולל בסיכום', 'totalBilled', 'שדה חסר'))
    }
    if (!summary.totalPaid && summary.totalPaid !== 0) {
      feedback.push(fb('חשוב', 'סיכום חיוב', 'חסר סכום ששולם בסיכום', 'totalPaid', 'שדה חסר'))
    }
    if (summary.balance === undefined) {
      feedback.push(fb('חשוב', 'סיכום חיוב', 'חסר יתרה לתשלום', 'שדה balance', 'שדה חסר'))
    }

    feedback.push(fb('חובה', 'סיכום חיוב', 'לקוחה VIP ציפתה לדעת כמה היא חייבת ומה כלול בחבילה – אין מסך לקוח לזה', 'מסך "החשבון שלי" עם יתרה וחשבוניות', 'אין פורטל'))
    feedback.push(fb('נחמד', 'סיכום חיוב', 'הייתה שימושית אפשרות תשלום online ישירות מהפורטל', 'כפתור "שלם עכשיו" עם סליקה', 'אין'))

    return { status: 200, data: summary, feedback }
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
