/**
 * UrielPractice – מנהל הבוטים
 * מריץ את כל הפרסונות ומייצר דוח משולב
 *
 * שימוש:
 *   cd bots && npx tsx runner.ts
 *   cd bots && npx tsx runner.ts --bot cpa          (הרץ בוט ספציפי)
 *   cd bots && npx tsx runner.ts --parallel         (הרץ במקביל)
 *   cd bots && npx tsx runner.ts --output ./reports (תיקיית פלט)
 */

import { RunnerSummary, BotReport, FeedbackItem } from './types.js'
import { exportJson, exportMarkdown, printSummaryToConsole } from './report.js'
import { runCpaBot } from './personas/cpa.js'
import { runAdminBot } from './personas/admin.js'
import { runOfficeStaffBot } from './personas/office-staff.js'
import { runBusinessOwnerBot } from './personas/business-owner.js'
import { runTaxAuthorityBot } from './personas/tax-authority.js'
import { runVatAuthorityBot } from './personas/vat-authority.js'
import { runQaTesterBot } from './personas/qa-tester.js'
import { runProductManagerBot } from './personas/product-manager.js'
import { runPayrollBot } from './personas/payroll.js'

// ─────────────────────────────────────────────
// רשימת כל הבוטים
// ─────────────────────────────────────────────
const ALL_BOTS: { id: string; run: () => Promise<BotReport> }[] = [
  { id: 'cpa',              run: runCpaBot },
  { id: 'admin',            run: runAdminBot },
  { id: 'office-staff',     run: runOfficeStaffBot },
  { id: 'business-owner',   run: runBusinessOwnerBot },
  { id: 'tax-authority',    run: runTaxAuthorityBot },
  { id: 'vat-authority',    run: runVatAuthorityBot },
  { id: 'qa-tester',        run: runQaTesterBot },
  { id: 'product-manager',  run: runProductManagerBot },
  { id: 'payroll',          run: runPayrollBot },
]

// ─────────────────────────────────────────────
// פרסר ארגומנטים
// ─────────────────────────────────────────────
function parseArgs(): { botId?: string; parallel: boolean; outputDir: string } {
  const args = process.argv.slice(2)
  const botIdx = args.indexOf('--bot')
  const parallelIdx = args.indexOf('--parallel')
  const outputIdx = args.indexOf('--output')

  return {
    botId: botIdx !== -1 ? args[botIdx + 1] : undefined,
    parallel: parallelIdx !== -1,
    outputDir: outputIdx !== -1 ? args[outputIdx + 1] : './reports',
  }
}

// ─────────────────────────────────────────────
// הרצה סדרתית
// ─────────────────────────────────────────────
async function runSequential(bots: typeof ALL_BOTS): Promise<BotReport[]> {
  const reports: BotReport[] = []
  for (const bot of bots) {
    console.log(`\n▶  מריץ: ${bot.id}...`)
    const start = Date.now()
    try {
      const report = await bot.run()
      console.log(`✅ ${bot.id} הושלם ב-${Date.now() - start}ms | חובה: ${report.feedbackByPriority['חובה'].length} | חשוב: ${report.feedbackByPriority['חשוב'].length}`)
      reports.push(report)
    } catch (e) {
      console.error(`❌ ${bot.id} נכשל:`, e)
    }
  }
  return reports
}

// ─────────────────────────────────────────────
// הרצה מקבילה
// ─────────────────────────────────────────────
async function runParallel(bots: typeof ALL_BOTS): Promise<BotReport[]> {
  console.log(`\n🚀 מריץ ${bots.length} בוטים במקביל...`)
  const results = await Promise.allSettled(bots.map(b => b.run()))
  return results
    .map((r, i) => {
      if (r.status === 'fulfilled') {
        console.log(`✅ ${bots[i].id} הושלם`)
        return r.value
      } else {
        console.error(`❌ ${bots[i].id} נכשל:`, r.reason)
        return null
      }
    })
    .filter(Boolean) as BotReport[]
}

// ─────────────────────────────────────────────
// בניית סיכום משולב
// ─────────────────────────────────────────────
function buildConsolidatedSummary(runAt: string, botReports: BotReport[]): RunnerSummary {
  const allCritical: (FeedbackItem & { bot: string })[] = []
  const allImportant: (FeedbackItem & { bot: string })[] = []
  const allNiceToHave: (FeedbackItem & { bot: string })[] = []

  for (const report of botReports) {
    const withBot = (items: FeedbackItem[]) =>
      items.map(f => ({ ...f, bot: `${report.personaName} (${report.personaRole})` }))

    allCritical.push(...withBot(report.feedbackByPriority['חובה']))
    allImportant.push(...withBot(report.feedbackByPriority['חשוב']))
    allNiceToHave.push(...withBot(report.feedbackByPriority['נחמד']))
  }

  // מיין לפי מסך לקריאות טובה יותר
  const sortByScreen = (items: typeof allCritical) =>
    [...items].sort((a, b) => a.screen.localeCompare(b.screen, 'he'))

  return {
    runAt,
    totalBots: botReports.length,
    botReports,
    consolidatedFeedback: {
      'חובה': sortByScreen(allCritical),
      'חשוב': sortByScreen(allImportant),
      'נחמד': sortByScreen(allNiceToHave),
    },
  }
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
async function main(): Promise<void> {
  const { botId, parallel, outputDir } = parseArgs()

  console.log('═'.repeat(60))
  console.log('🤖 UrielPractice Bot Runner')
  console.log('═'.repeat(60))

  // בחירת בוטים
  const botsToRun = botId
    ? ALL_BOTS.filter(b => b.id === botId)
    : ALL_BOTS

  if (botsToRun.length === 0) {
    console.error(`❌ לא נמצא בוט עם id: "${botId}"`)
    console.log('בוטים זמינים:', ALL_BOTS.map(b => b.id).join(', '))
    process.exit(1)
  }

  console.log(`\nמריץ ${botsToRun.length} בוטים ${parallel ? 'במקביל' : 'בסדרה'}...`)
  if (botId) console.log(`(בוט בלבד: ${botId})`)

  const runAt = new Date().toISOString()

  // הרצה
  const botReports = parallel
    ? await runParallel(botsToRun)
    : await runSequential(botsToRun)

  // בניית סיכום
  const summary = buildConsolidatedSummary(runAt, botReports)

  // הדפסה לconsole
  printSummaryToConsole(summary)

  // שמירת דוחות
  const jsonPath = exportJson(summary, outputDir)
  const mdPath = exportMarkdown(summary, outputDir)

  console.log(`\n📁 דוחות נשמרו:`)
  console.log(`  JSON: ${jsonPath}`)
  console.log(`  Markdown: ${mdPath}`)
  console.log('')
}

main().catch(e => {
  console.error('❌ שגיאה קריטית:', e)
  process.exit(1)
})
