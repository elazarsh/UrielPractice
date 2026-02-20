/**
 * מערכת בוטים – UrielPractice
 * הגדרת טיפוסים למשתמשים מדומים ומשובים
 */

export type FeedbackPriority = 'חובה' | 'חשוב' | 'נחמד'

export interface FeedbackItem {
  priority: FeedbackPriority
  screen: string          // שם המסך / נקודת גישה
  issue: string           // מה הבעיה
  expected: string        // מה צפיתי לקבל
  actual: string          // מה קיבלתי בפועל
  suggestion?: string     // הצעה לתיקון
}

export interface ScenarioResult {
  scenarioName: string
  success: boolean
  durationMs: number
  statusCode?: number
  responseData?: unknown
  error?: string
  feedback: FeedbackItem[]
}

export interface BotReport {
  botId: string
  personaName: string
  personaRole: string
  personaDescription: string
  runAt: string
  totalScenarios: number
  successfulScenarios: number
  failedScenarios: number
  allFeedback: FeedbackItem[]
  feedbackByPriority: {
    חובה: FeedbackItem[]
    חשוב: FeedbackItem[]
    נחמד: FeedbackItem[]
  }
  scenarioResults: ScenarioResult[]
}

export interface BotConfig {
  id: string
  personaName: string
  personaRole: string
  personaDescription: string
  credentials?: {
    email: string
    password: string
  }
  baseUrl: string
}

export interface RunnerSummary {
  runAt: string
  totalBots: number
  botReports: BotReport[]
  consolidatedFeedback: {
    חובה: (FeedbackItem & { bot: string })[]
    חשוב: (FeedbackItem & { bot: string })[]
    נחמד: (FeedbackItem & { bot: string })[]
  }
}
