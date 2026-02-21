/**
 * בוט #15 – מנהל פרויקטים בצד הלקוח
 * שם: אלי גרין (ADMIN credentials – בודק מה PM ירצה לראות)
 * תפקיד: מנהל פרויקטים בחברת לקוח שצריך לנהל אינטרפייס עם המשרד
 * מסכים: משימות, תהליכים, מסמכים
 */

import { ApiClient, runScenario, fb } from '../api-client.js'
import { BotConfig, BotReport, FeedbackItem, ScenarioResult } from '../types.js'

const CONFIG: BotConfig = {
  id: 'project-manager',
  personaName: 'אלי גרין',
  personaRole: 'מנהל פרויקטים – צד הלקוח',
  personaDescription:
    'אני מנהל פרויקטים בחברת לקוח. עובד עם המשרד על הגשת דוחות ותהליכי מס. ' +
    'צריך לראות מה נדרש ממני, מה התקדמות התהליכים ואיפה צריך לספק מסמכים. ' +
    'הכי חשוב לי: ראיית כל המשימות והמסמכים שנדרשים ממני בצורה ברורה ומסודרת.',
  credentials: { email: 'admin@uriel-practice.co.il', password: 'Demo1234!' },
  baseUrl: 'http://localhost:3001',
}

export async function runProjectManagerBot(): Promise<BotReport> {
  const api = new ApiClient(CONFIG.baseUrl, CONFIG.credentials!.email, CONFIG.credentials!.password)
  const scenarios: ScenarioResult[] = []
  const globalFeedback: FeedbackItem[] = []

  const loginOk = await api.login()
  if (!loginOk) {
    globalFeedback.push(fb('חובה', 'כניסה', 'מנהל הפרויקטים לא הצליח להתחבר', 'כניסה מוצלחת', 'נכשל'))
    return buildReport(CONFIG, scenarios, globalFeedback)
  }

  // ─── תרחיש 1: ראיית כל המשימות ───────────────
  scenarios.push(await runScenario('משימות – תמונת מצב כוללת של כל המשימות', async () => {
    const feedback: FeedbackItem[] = []

    const tasksRes = await api.get<any>('/api/tasks?limit=30')
    if (!tasksRes.ok) {
      feedback.push(fb('חובה', 'משימות', 'לא ניתן לטעון משימות', 'רשימת משימות', `שגיאה ${tasksRes.status}`))
      return { status: tasksRes.status, data: null, feedback }
    }

    const tasks = tasksRes.data?.data ?? []
    if (tasks.length === 0) {
      feedback.push(fb('חשוב', 'משימות', 'אין משימות בדמו', 'לפחות 5 משימות', '0'))
    } else {
      // בדוק שדות PM-related
      const task = tasks[0]
      if (!task.dueDate && !task.deadline) {
        feedback.push(fb('חובה', 'משימות', 'תאריך יעד חסר במשימות – PM לא יכול לתכנן', 'שדה dueDate/deadline', 'שדה חסר'))
      }
      if (!task.status) {
        feedback.push(fb('חובה', 'משימות', 'סטטוס משימה חסר', 'שדה status', 'שדה חסר'))
      }
      if (!task.priority) {
        feedback.push(fb('חשוב', 'משימות', 'עדיפות משימה חסרה – לא ניתן לתעדף', 'שדה priority', 'שדה חסר'))
      }

      const openTasks = tasks.filter((t: any) => t.status === 'OPEN' || t.status === 'IN_PROGRESS')
      const overdueTasks = tasks.filter((t: any) => {
        const due = t.dueDate || t.deadline
        return due && new Date(due) < new Date()
      })
      if (overdueTasks.length > 0) {
        feedback.push(fb('חשוב', 'משימות', `${overdueTasks.length} משימות עברו את המועד ללא התראה`, 'התראה אוטומטית על חריגה', 'ללא התראה'))
      }
    }

    feedback.push(fb('חובה', 'משימות', 'אין תצוגת Gantt chart למשימות – PM לא יכול לתכנן ציר זמן', 'Gantt view של משימות', 'רשימה בלבד'))
    feedback.push(fb('חשוב', 'משימות', 'חסרת הגדרת תלויות בין משימות (Task A תלוי ב-Task B)', 'dependencies field', 'אין'))
    feedback.push(fb('נחמד', 'משימות', 'הייתה שימושית אינטגרציה עם Jira / Monday לסנכרון משימות', 'Integration API', 'אין'))

    return { status: 200, data: { taskCount: tasks.length }, feedback }
  }))

  // ─── תרחיש 2: שקיפות תהליכים ─────────────────
  scenarios.push(await runScenario('תהליכים – מצב כל התהליכים', async () => {
    const feedback: FeedbackItem[] = []

    const procRes = await api.get<any>('/api/processes?limit=20')
    if (!procRes.ok) {
      feedback.push(fb('חובה', 'תהליכים', 'לא ניתן לטעון תהליכים', 'רשימת תהליכים', `שגיאה ${procRes.status}`))
      return { status: procRes.status, data: null, feedback }
    }

    const processes = procRes.data?.data ?? procRes.data ?? []
    const processList = Array.isArray(processes) ? processes : []

    if (processList.length === 0) {
      feedback.push(fb('חשוב', 'תהליכים', 'אין תהליכים בדמו', 'תהליכים לבדיקה', '0'))
    } else {
      const hasProgress = processList.some((p: any) => p.completionPercentage !== undefined || p.progress !== undefined)
      if (!hasProgress) {
        feedback.push(fb('חובה', 'תהליכים', 'חסר אחוז התקדמות לכל תהליך – PM לא יכול לדווח ללקוח', 'שדה completionPercentage/progress', 'שדה חסר'))
      }

      const hasOwner = processList.some((p: any) => p.owner || p.assignedTo || p.responsibleUser)
      if (!hasOwner) {
        feedback.push(fb('חשוב', 'תהליכים', 'חסר בעל תהליך (owner) – לא ברור מי אחראי', 'שדה owner/responsibleUser', 'שדה חסר'))
      }
    }

    feedback.push(fb('חובה', 'תהליכים', 'חסרת תצוגת "מצב פרויקט" מרוכזת לכל הלקוח עם כל תהליכיו', 'Project Overview per client', 'אין'))
    feedback.push(fb('חשוב', 'תהליכים', 'חסרת דוח סטטוס שבועי אוטומטי לשליחה ללקוח', 'Weekly status report', 'אין'))
    feedback.push(fb('נחמד', 'תהליכים', 'הייתה שימושית הגדרת אבני דרך (milestones) בתהליך', 'milestones support', 'אין'))

    return { status: 200, data: { processCount: processList.length }, feedback }
  }))

  // ─── תרחיש 3: מסמכים ─────────────────────────
  scenarios.push(await runScenario('מסמכים – מעקב מסמכים נדרשים', async () => {
    const feedback: FeedbackItem[] = []

    const docsRes = await api.get<any>('/api/documents?limit=20')
    if (!docsRes.ok) {
      feedback.push(fb('חובה', 'מסמכים', 'לא ניתן לטעון מסמכים', 'רשימת מסמכים', `שגיאה ${docsRes.status}`))
      return { status: docsRes.status, data: null, feedback }
    }

    const docs = docsRes.data?.data ?? docsRes.data ?? []
    const docList = Array.isArray(docs) ? docs : []

    if (docList.length === 0) {
      feedback.push(fb('חשוב', 'מסמכים', 'אין מסמכים בדמו', 'מסמכים לבדיקה', '0'))
    } else {
      const hasStatus = docList.some((d: any) => d.status || d.documentStatus)
      if (!hasStatus) {
        feedback.push(fb('חשוב', 'מסמכים', 'חסר סטטוס מסמך – לא ניתן לעקוב אחרי מה הוגש', 'שדה status', 'שדה חסר'))
      }
      const hasUploadDate = docList.some((d: any) => d.uploadedAt || d.createdAt)
      if (!hasUploadDate) {
        feedback.push(fb('חשוב', 'מסמכים', 'חסר תאריך העלאת מסמך – לא ניתן לדעת מתי הוגש', 'שדה uploadedAt', 'שדה חסר'))
      }
    }

    feedback.push(fb('חובה', 'מסמכים', 'אין checklist מסמכים נדרשים – PM לא יודע מה עוד צריך לספק', 'Checklist מסמכים נדרשים ממולא', 'אין'))
    feedback.push(fb('חשוב', 'מסמכים', 'חסרת אפשרות העלאת מסמך ישירות ממסך תהליך ספציפי', 'Upload in-context', 'מסך מסמכים נפרד'))
    feedback.push(fb('נחמד', 'מסמכים', 'הייתה שימושית גרירת קבצים לאזור העלאה (drag & drop)', 'Drag & drop upload', 'אין'))

    return { status: 200, data: { docCount: docList.length }, feedback }
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
