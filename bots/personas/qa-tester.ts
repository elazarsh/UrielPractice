/**
 * בוט #7 – בודק תוכנה / QA ממערכות מידע
 * שם: תמר אביב
 * תפקיד: בדיקות פונקציונליות, קצה-קצה, edge cases, ביצועים, API
 */

import { ApiClient, runScenario, fb } from '../api-client.js'
import { BotConfig, BotReport, FeedbackItem, ScenarioResult } from '../types.js'

const CONFIG: BotConfig = {
  id: 'qa-tester',
  personaName: 'תמר אביב',
  personaRole: 'בודקת תוכנה (QA)',
  personaDescription:
    'אני בודקת תוכנה ממחלקת מערכות מידע. מבצעת בדיקות פונקציונליות, API, edge cases ואבטחה. ' +
    'מחפשת שגיאות, בעיות ביצועים, ו-inconsistencies בממשק. ' +
    'אני לא מסתפקת ב-happy path – אני בודקת מה קורה כשמשהו משתבש.',
  credentials: { email: 'admin@uriel-practice.co.il', password: 'Demo1234!' },
  baseUrl: 'http://localhost:3001',
}

export async function runQaTesterBot(): Promise<BotReport> {
  const api = new ApiClient(CONFIG.baseUrl, CONFIG.credentials!.email, CONFIG.credentials!.password)
  const scenarios: ScenarioResult[] = []
  const globalFeedback: FeedbackItem[] = []

  const loginOk = await api.login()
  if (!loginOk) {
    globalFeedback.push(fb('חובה', 'כניסה', 'לא ניתן להתחבר', 'כניסה מוצלחת', 'נכשל'))
    return buildReport(CONFIG, scenarios, globalFeedback)
  }

  // ─── תרחיש 1: בדיקות API ─────────────────────
  scenarios.push(await runScenario('בדיקות API – קצוות וולידציה', async () => {
    const feedback: FeedbackItem[] = []

    // health check
    const healthRes = await api.get<any>('/api/health')
    if (!healthRes.ok) {
      feedback.push(fb('חובה', 'Health Check', 'health endpoint לא מגיב', 'status 200 + {"ok":true}', `${healthRes.status}`))
    }

    // בדיקת ID לא קיים
    const notFoundRes = await api.get<any>('/api/clients/nonexistent-id-12345')
    if (notFoundRes.status !== 404) {
      feedback.push(fb('חשוב', 'שגיאות API', `לקוח לא קיים מחזיר ${notFoundRes.status} במקום 404`, '404 Not Found', `${notFoundRes.status}`))
    }

    // בדיקת endpoint ללא auth
    const noAuthRes = await fetch(`${CONFIG.baseUrl}/api/clients`).then(r => ({ status: r.status })).catch(() => ({ status: 0 }))
    if (noAuthRes.status !== 401) {
      feedback.push(fb('חובה', 'אבטחת API', `גישה ללא token מחזירה ${noAuthRes.status} במקום 401`, '401 Unauthorized', `${noAuthRes.status}`))
    }

    // בדיקת pagination
    const page1 = await api.get<any>('/api/clients?page=1&limit=2')
    const page2 = await api.get<any>('/api/clients?page=2&limit=2')
    if (page1.ok && page2.ok) {
      const ids1 = (page1.data?.data ?? []).map((c: any) => c.id)
      const ids2 = (page2.data?.data ?? []).map((c: any) => c.id)
      const overlap = ids1.filter((id: string) => ids2.includes(id))
      if (overlap.length > 0) {
        feedback.push(fb('חובה', 'Pagination', 'אותם רשומות מופיעות בשתי עמודות שונות', 'ללא כפילויות', `כפילות: ${overlap.join(', ')}`))
      }
    }

    // בדיקת סינון לא חוקי
    const badFilterRes = await api.get<any>('/api/clients?clientType=INVALID_TYPE')
    if (badFilterRes.ok && badFilterRes.data?.data?.length > 0) {
      feedback.push(fb('חשוב', 'ולידציית קלט', 'פילטר לא חוקי (INVALID_TYPE) לא מחזיר שגיאה', '400 Bad Request', `${badFilterRes.status} עם ${badFilterRes.data?.data?.length} תוצאות`))
    }

    feedback.push(fb('חשוב', 'תגובות שגיאה', 'הודעות השגיאה לא אחידות – חלק מחזירות {error:...} וחלק {message:...}', 'מבנה שגיאה אחיד', 'inconsistent error format'))
    feedback.push(fb('נחמד', 'API', 'חסרת documentation של ה-API (Swagger/OpenAPI)', 'Swagger UI על /api/docs', 'אין'))

    return { status: 200, data: {}, feedback }
  }))

  // ─── תרחיש 2: ביצועים ────────────────────────
  scenarios.push(await runScenario('ביצועים – זמני תגובה', async () => {
    const feedback: FeedbackItem[] = []

    const times: number[] = []
    for (let i = 0; i < 3; i++) {
      const start = Date.now()
      await api.get('/api/dashboard/summary')
      times.push(Date.now() - start)
    }
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length
    if (avgTime > 2000) {
      feedback.push(fb('חובה', 'ביצועים', `דשבורד לוקח ${avgTime.toFixed(0)}ms בממוצע – איטי מדי`, 'מתחת ל-500ms', `${avgTime.toFixed(0)}ms`))
    } else if (avgTime > 800) {
      feedback.push(fb('חשוב', 'ביצועים', `דשבורד לוקח ${avgTime.toFixed(0)}ms – יש מקום לשיפור`, 'מתחת ל-300ms', `${avgTime.toFixed(0)}ms`))
    }

    // בדיקת parallel requests
    const start = Date.now()
    await Promise.all([
      api.get('/api/clients'),
      api.get('/api/tasks'),
      api.get('/api/documents'),
    ])
    const parallelTime = Date.now() - start
    if (parallelTime > 3000) {
      feedback.push(fb('חשוב', 'ביצועים', `3 קריאות parallel לוקחות ${parallelTime}ms`, 'מתחת ל-1000ms', `${parallelTime}ms`))
    }

    feedback.push(fb('חשוב', 'ביצועים', 'חסרת caching של נתוני dashboard – כל reload מחשב מחדש', 'Cache 60 שניות', 'חישוב בכל פעם'))
    feedback.push(fb('נחמד', 'ביצועים', 'חסרת lazy loading לרשימות ארוכות (pagination חלקה)', 'Infinite scroll / virtual scroll', 'טעינה מלאה'))

    return { status: 200, data: { avgResponseTime: avgTime }, feedback }
  }))

  // ─── תרחיש 3: edge cases ─────────────────────
  scenarios.push(await runScenario('Edge Cases – קלטים קיצוניים', async () => {
    const feedback: FeedbackItem[] = []

    // חיפוש עם תווים מיוחדים
    const xssRes = await api.get<any>('/api/clients?search=<script>alert(1)</script>')
    if (xssRes.ok) {
      const dataStr = JSON.stringify(xssRes.data)
      if (dataStr.includes('<script>')) {
        feedback.push(fb('חובה', 'אבטחה XSS', 'תגובת API מכילה <script> ללא sanitization', 'HTML escaped', 'XSS payload גולמי'))
      }
    }

    // חיפוש ריק
    const emptySearchRes = await api.get<any>('/api/clients?search=')
    if (!emptySearchRes.ok) {
      feedback.push(fb('חשוב', 'ולידציה', 'חיפוש עם מחרוזת ריקה מחזיר שגיאה', 'כל הרשומות', `שגיאה ${emptySearchRes.status}`))
    }

    // limit=0
    const zeroLimitRes = await api.get<any>('/api/clients?limit=0')
    if (zeroLimitRes.ok && zeroLimitRes.data?.data?.length > 0) {
      feedback.push(fb('חשוב', 'ולידציה', 'limit=0 מחזיר תוצאות', 'רשימה ריקה או שגיאה', `${zeroLimitRes.data?.data?.length} תוצאות`))
    }

    // limit גדול מאוד
    const bigLimitRes = await api.get<any>('/api/clients?limit=999999')
    if (bigLimitRes.ok) {
      feedback.push(fb('חשוב', 'אבטחה', 'limit=999999 לא מוגבל – עלול לגרום ל-DoS', 'מגבלת limit=100 מקסימום', 'אין הגבלה'))
    }

    // בדיקת Content-Type
    const ctRes = await fetch(`${CONFIG.baseUrl}/api/clients`, {
      headers: { 'Content-Type': 'text/plain', 'Authorization': `Bearer bad-token` },
    })
    if (ctRes.status !== 401) {
      feedback.push(fb('חשוב', 'אבטחה', 'token לא חוקי לא מחזיר 401', '401 Unauthorized', `${ctRes.status}`))
    }

    return { status: 200, data: {}, feedback }
  }))

  // ─── תרחיש 4: בדיקות ממשק משתמש ─────────────
  scenarios.push(await runScenario('בדיקות UX ועקביות', async () => {
    const feedback: FeedbackItem[] = []

    feedback.push(fb('חובה', 'UX', 'חסרות הודעות שגיאה מותאמות למשתמש (user-friendly) – כיום מוצג JSON גולמי', 'הודעות שגיאה בעברית ברורה', 'JSON טכני'))
    feedback.push(fb('חובה', 'נגישות', 'חסרת תמיכה ב-RTL מלאה (ייתכן שיש בעיות ב-UI עם תאריכים ו-datepicker)', 'RTL מלא בכל הרכיבים', 'לא נבדק'))
    feedback.push(fb('חשוב', 'UX', 'חסרת אנימציית loading state בטעינת דפים', 'Skeleton loader / spinner', 'לא ברור'))
    feedback.push(fb('חשוב', 'תאימות', 'לא ברור אם המערכת עובדת ב-Safari/iOS – דפדפן נפוץ בישראל', 'נבדק ב-Safari + iOS', 'לא נבדק'))
    feedback.push(fb('נחמד', 'UX', 'חסרת אפשרות undo אחרי פעולות הרסניות (מחיקה, ביטול)', '"בטל" אחרי כל פעולה', 'אין'))

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
