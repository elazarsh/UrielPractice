/**
 * מחולל דוחות
 * מייצר דוח Markdown מפורט מתוצאות ריצת הבוטים
 */

import { RunnerSummary, FeedbackItem } from './types.js'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

// ─────────────────────────────────────────────
// ייצוא JSON גולמי
// ─────────────────────────────────────────────
export function exportJson(summary: RunnerSummary, outputDir: string): string {
  mkdirSync(outputDir, { recursive: true })
  const filePath = join(outputDir, `bot-report-${formatDateForFile(summary.runAt)}.json`)
  writeFileSync(filePath, JSON.stringify(summary, null, 2), 'utf8')
  return filePath
}

// ─────────────────────────────────────────────
// ייצוא Markdown
// ─────────────────────────────────────────────
export function exportMarkdown(summary: RunnerSummary, outputDir: string): string {
  mkdirSync(outputDir, { recursive: true })
  const filePath = join(outputDir, `bot-report-${formatDateForFile(summary.runAt)}.md`)
  writeFileSync(filePath, buildMarkdown(summary), 'utf8')
  return filePath
}

function buildMarkdown(summary: RunnerSummary): string {
  const { runAt, totalBots, botReports, consolidatedFeedback } = summary

  const totalIssues = consolidatedFeedback['חובה'].length + consolidatedFeedback['חשוב'].length + consolidatedFeedback['נחמד'].length

  const lines: string[] = [
    `# 🤖 דוח בוטים – UrielPractice`,
    `> תאריך: ${new Date(runAt).toLocaleString('he-IL')} | בוטים: ${totalBots} | סה"כ ממצאים: ${totalIssues}`,
    '',
    '---',
    '',
    '## 📊 סיכום מנהלים',
    '',
    `| עדיפות | כמות ממצאים |`,
    `|--------|------------|`,
    `| 🔴 חובה (Critical) | **${consolidatedFeedback['חובה'].length}** |`,
    `| 🟡 חשוב (Important) | **${consolidatedFeedback['חשוב'].length}** |`,
    `| 🟢 נחמד (Nice to Have) | **${consolidatedFeedback['נחמד'].length}** |`,
    '',
    '---',
    '',
    '## 🔴 ממצאי חובה – חייבים תיקון',
    '',
  ]

  if (consolidatedFeedback['חובה'].length === 0) {
    lines.push('_אין ממצאי חובה._', '')
  } else {
    consolidatedFeedback['חובה'].forEach((item, i) => {
      lines.push(
        `### ${i + 1}. ${item.issue}`,
        `- **מסך:** ${item.screen}`,
        `- **מדווח על ידי:** ${item.bot}`,
        `- **צפוי:** ${item.expected}`,
        `- **בפועל:** ${item.actual}`,
        item.suggestion ? `- **הצעה:** ${item.suggestion}` : '',
        '',
      )
    })
  }

  lines.push('---', '', '## 🟡 ממצאים חשובים', '')
  if (consolidatedFeedback['חשוב'].length === 0) {
    lines.push('_אין ממצאים חשובים._', '')
  } else {
    consolidatedFeedback['חשוב'].forEach((item, i) => {
      lines.push(
        `### ${i + 1}. ${item.issue}`,
        `- **מסך:** ${item.screen} | **מדווח על ידי:** ${item.bot}`,
        `- **צפוי:** ${item.expected} | **בפועל:** ${item.actual}`,
        item.suggestion ? `- **הצעה:** ${item.suggestion}` : '',
        '',
      )
    })
  }

  lines.push('---', '', '## 🟢 ממצאים נחמדים (Nice to Have)', '')
  if (consolidatedFeedback['נחמד'].length === 0) {
    lines.push('_אין ממצאים._', '')
  } else {
    consolidatedFeedback['נחמד'].forEach((item, i) => {
      lines.push(
        `${i + 1}. **${item.issue}** _(${item.screen} / ${item.bot})_`,
      )
    })
    lines.push('')
  }

  lines.push('---', '', '## 👥 פירוט לפי בוט', '')

  for (const report of botReports) {
    lines.push(
      `### ${report.personaName} – ${report.personaRole}`,
      `> ${report.personaDescription}`,
      '',
      `- תרחישים שהורצו: ${report.totalScenarios}`,
      `- הצליחו: ${report.successfulScenarios} | נכשלו: ${report.failedScenarios}`,
      `- ממצאי חובה: ${report.feedbackByPriority['חובה'].length} | חשוב: ${report.feedbackByPriority['חשוב'].length} | נחמד: ${report.feedbackByPriority['נחמד'].length}`,
      '',
    )

    if (report.feedbackByPriority['חובה'].length > 0) {
      lines.push('**ממצאי חובה:**')
      report.feedbackByPriority['חובה'].forEach(f => {
        lines.push(`- 🔴 [${f.screen}] ${f.issue}`)
      })
      lines.push('')
    }

    if (report.scenarioResults.some(s => !s.success)) {
      lines.push('**תרחישים שנכשלו:**')
      report.scenarioResults.filter(s => !s.success).forEach(s => {
        lines.push(`- ❌ ${s.scenarioName}: ${s.error}`)
      })
      lines.push('')
    }

    lines.push('---', '')
  }

  lines.push(
    '## 🗺️ המלצות לרודמפ',
    '',
    '### Sprint 1 (Critical – חובה)',
    '',
    ...consolidatedFeedback['חובה'].slice(0, 5).map((f, i) => `${i + 1}. ${f.issue} _(${f.screen})_`),
    '',
    '### Sprint 2 (Important – חשוב)',
    '',
    ...consolidatedFeedback['חשוב'].slice(0, 5).map((f, i) => `${i + 1}. ${f.issue} _(${f.screen})_`),
    '',
    '### Future (Nice to Have)',
    '',
    ...consolidatedFeedback['נחמד'].slice(0, 5).map((f, i) => `${i + 1}. ${f.issue}`),
    '',
    '---',
    `_דוח זה נוצר אוטומטית על ידי מערכת בוטים – UrielPractice_`,
  )

  return lines.filter(l => l !== undefined).join('\n')
}

// ─────────────────────────────────────────────
// הדפסה לConsole
// ─────────────────────────────────────────────
export function printSummaryToConsole(summary: RunnerSummary): void {
  const { consolidatedFeedback, totalBots, botReports } = summary

  console.log('\n' + '═'.repeat(60))
  console.log('🤖 UrielPractice – דוח בוטים')
  console.log('═'.repeat(60))
  console.log(`בוטים שהורצו: ${totalBots}`)
  console.log(`🔴 חובה:  ${consolidatedFeedback['חובה'].length}`)
  console.log(`🟡 חשוב:  ${consolidatedFeedback['חשוב'].length}`)
  console.log(`🟢 נחמד:  ${consolidatedFeedback['נחמד'].length}`)
  console.log('')

  console.log('📋 TOP 5 חובה:')
  consolidatedFeedback['חובה'].slice(0, 5).forEach((f, i) => {
    console.log(`  ${i + 1}. [${f.screen}] ${f.issue}`)
    console.log(`     ↳ ${f.bot}`)
  })

  console.log('\n📋 לפי בוט:')
  botReports.forEach(r => {
    const status = r.failedScenarios > 0 ? '⚠️' : '✅'
    console.log(`  ${status} ${r.personaName} (${r.personaRole}): ${r.feedbackByPriority['חובה'].length}🔴 ${r.feedbackByPriority['חשוב'].length}🟡 ${r.feedbackByPriority['נחמד'].length}🟢`)
  })
  console.log('')
}

function formatDateForFile(isoDate: string): string {
  return isoDate.replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
}
