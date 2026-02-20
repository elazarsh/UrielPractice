/**
 * לקוח HTTP לבוטים
 * מבצע קריאות API ומטפל ב-authentication
 */

import { FeedbackItem, ScenarioResult } from './types.js'

export class ApiClient {
  private baseUrl: string
  private accessToken: string | null = null
  private email: string
  private password: string

  constructor(baseUrl: string, email: string, password: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.email = email
    this.password = password
  }

  // ─────────────────────────────────────────────
  // פנימי: קריאת HTTP גנרית
  // ─────────────────────────────────────────────
  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    withAuth = true,
  ): Promise<{ status: number; data: T; ok: boolean; error?: string }> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (withAuth && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })

      let data: T
      const text = await res.text()
      try {
        data = JSON.parse(text) as T
      } catch {
        data = text as unknown as T
      }

      return { status: res.status, data, ok: res.ok }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return { status: 0, data: undefined as unknown as T, ok: false, error: msg }
    }
  }

  // ─────────────────────────────────────────────
  // התחברות
  // ─────────────────────────────────────────────
  async login(): Promise<boolean> {
    const res = await this.request<{ accessToken: string; user: unknown }>(
      'POST',
      '/api/auth/login',
      { email: this.email, password: this.password },
      false,
    )
    if (res.ok && res.data?.accessToken) {
      this.accessToken = res.data.accessToken
      return true
    }
    return false
  }

  get<T>(path: string) { return this.request<T>('GET', path) }
  post<T>(path: string, body: unknown) { return this.request<T>('POST', path, body) }
  patch<T>(path: string, body: unknown) { return this.request<T>('PATCH', path, body) }

  isLoggedIn() { return !!this.accessToken }
}

// ─────────────────────────────────────────────
// עוזר: הרצת תרחיש ומדידת זמן + משוב
// ─────────────────────────────────────────────
export async function runScenario(
  name: string,
  fn: () => Promise<{ status?: number; data?: unknown; feedback: FeedbackItem[] }>,
): Promise<ScenarioResult> {
  const start = Date.now()
  try {
    const result = await fn()
    return {
      scenarioName: name,
      success: true,
      durationMs: Date.now() - start,
      statusCode: result.status,
      responseData: result.data,
      feedback: result.feedback,
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      scenarioName: name,
      success: false,
      durationMs: Date.now() - start,
      error: msg,
      feedback: [{
        priority: 'חובה',
        screen: name,
        issue: `תרחיש נכשל עם שגיאה: ${msg}`,
        expected: 'התרחיש אמור להסתיים בהצלחה',
        actual: `שגיאה: ${msg}`,
      }],
    }
  }
}

// ─────────────────────────────────────────────
// עוזר: בנה פריט משוב
// ─────────────────────────────────────────────
export function fb(
  priority: FeedbackItem['priority'],
  screen: string,
  issue: string,
  expected: string,
  actual: string,
  suggestion?: string,
): FeedbackItem {
  return { priority, screen, issue, expected, actual, suggestion }
}
