// Seed data – UrielPractice Israeli CPA Management System
// Run: npm run db:seed (from backend directory)

import { PrismaClient, UserRole, ClientType, ReportFrequency } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 מתחיל seed...')

  // ──────────────────────────────────────────────
  // 1. משתמשי demo
  // ──────────────────────────────────────────────
  const hash = await bcrypt.hash('Demo1234!', 10)

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@uriel-practice.co.il' },
      update: {},
      create: {
        email: 'admin@uriel-practice.co.il',
        passwordHash: hash,
        firstName: 'אוריאל',
        lastName: 'כהן',
        role: UserRole.ADMIN,
        phone: '052-1234567',
      },
    }),
    prisma.user.upsert({
      where: { email: 'rivka@uriel-practice.co.il' },
      update: {},
      create: {
        email: 'rivka@uriel-practice.co.il',
        passwordHash: hash,
        firstName: 'רבקה',
        lastName: 'לוי',
        role: UserRole.ACCOUNTANT,
        phone: '052-2345678',
      },
    }),
    prisma.user.upsert({
      where: { email: 'moshe@uriel-practice.co.il' },
      update: {},
      create: {
        email: 'moshe@uriel-practice.co.il',
        passwordHash: hash,
        firstName: 'משה',
        lastName: 'גולד',
        role: UserRole.BOOKKEEPER,
        phone: '052-3456789',
      },
    }),
    prisma.user.upsert({
      where: { email: 'shira@uriel-practice.co.il' },
      update: {},
      create: {
        email: 'shira@uriel-practice.co.il',
        passwordHash: hash,
        firstName: 'שירה',
        lastName: 'ברק',
        role: UserRole.PAYROLL,
        phone: '052-4567890',
      },
    }),
    prisma.user.upsert({
      where: { email: 'yossi@uriel-practice.co.il' },
      update: {},
      create: {
        email: 'yossi@uriel-practice.co.il',
        passwordHash: hash,
        firstName: 'יוסי',
        lastName: 'אמיר',
        role: UserRole.REVIEWER,
        phone: '052-5678901',
      },
    }),
    prisma.user.upsert({
      where: { email: 'dana@uriel-practice.co.il' },
      update: {},
      create: {
        email: 'dana@uriel-practice.co.il',
        passwordHash: hash,
        firstName: 'דנה',
        lastName: 'רוז',
        role: UserRole.OFFICE_MANAGER,
        phone: '052-6789012',
      },
    }),
  ])
  console.log(`✅ ${users.length} משתמשים נוצרו`)

  // ──────────────────────────────────────────────
  // 2. חבילות שירות
  // ──────────────────────────────────────────────
  const planOsek = await prisma.servicePlan.upsert({
    where: { id: 'plan-osek-patur' },
    update: {},
    create: {
      id: 'plan-osek-patur',
      name: 'חבילה בסיסית – עוסק פטור',
      description: 'מע"מ שנתי + הכנסה שנתית',
      monthlyFee: 350,
      includesVat: false,
      includesPayroll: false,
      includesAnnual: true,
    },
  })

  const planMurshe = await prisma.servicePlan.upsert({
    where: { id: 'plan-osek-murshe' },
    update: {},
    create: {
      id: 'plan-osek-murshe',
      name: 'חבילה מורחבת – עוסק מורשה',
      description: 'מע"מ דו-חודשי + ניכויים + דוח שנתי',
      monthlyFee: 750,
      includesVat: true,
      includesPayroll: false,
      includesAnnual: true,
    },
  })

  const planChevra = await prisma.servicePlan.upsert({
    where: { id: 'plan-chevra' },
    update: {},
    create: {
      id: 'plan-chevra',
      name: 'חבילה מלאה – חברה בע"מ',
      description: 'מע"מ + ניכויים + שכר + דוח שנתי',
      monthlyFee: 2500,
      includesVat: true,
      includesPayroll: true,
      includesAnnual: true,
    },
  })
  console.log('✅ חבילות שירות נוצרו')

  // ──────────────────────────────────────────────
  // 3. לקוחות demo
  // ──────────────────────────────────────────────
  const clients = await Promise.all([
    prisma.client.upsert({
      where: { taxId: '300123456' },
      update: {},
      create: {
        name: 'ברק תוכנה בע"מ',
        legalName: 'ברק תוכנה בע"מ',
        taxId: '300123456',
        companyNumber: '515123456',
        clientType: ClientType.CHEVRA_BVM,
        industry: 'הייטק / תוכנה',
        email: 'barak@barak-software.co.il',
        phone: '03-1234567',
        city: 'תל אביב',
        vatFrequency: ReportFrequency.MONTHLY,
        hasPayroll: true,
        hasAnnualReport: true,
        powerOfAttorneyActive: true,
        healthScore: 88,
        servicePlanId: planChevra.id,
        tags: { create: [{ tag: 'הייטק' }, { tag: 'VIP' }] },
        contacts: {
          create: [{
            name: 'דוד ברק',
            role: 'מנכ"ל',
            email: 'david@barak-software.co.il',
            phone: '052-7777777',
            isPrimary: true,
          }],
        },
      },
    }),
    prisma.client.upsert({
      where: { taxId: '200456789' },
      update: {},
      create: {
        name: 'מסעדת הים הכחול',
        taxId: '200456789',
        vatNumber: '200456789',
        clientType: ClientType.OSEK_MURSHE,
        industry: 'מסעדנות',
        email: 'hayam@blue-sea.co.il',
        phone: '04-5678901',
        city: 'חיפה',
        vatFrequency: ReportFrequency.BIMONTHLY,
        hasPayroll: true,
        healthScore: 72,
        servicePlanId: planMurshe.id,
        tags: { create: [{ tag: 'מסעדה' }] },
        contacts: {
          create: [{
            name: 'שמואל כץ',
            role: 'בעלים',
            phone: '050-8888888',
            isPrimary: true,
          }],
        },
      },
    }),
    prisma.client.upsert({
      where: { taxId: '100789012' },
      update: {},
      create: {
        name: 'ירין ייעוץ עצמאי',
        taxId: '100789012',
        vatNumber: '100789012',
        clientType: ClientType.OSEK_MURSHE,
        industry: 'ייעוץ עסקי',
        email: 'yarin@consulting.co.il',
        city: 'ירושלים',
        vatFrequency: ReportFrequency.BIMONTHLY,
        hasPayroll: false,
        healthScore: 95,
        servicePlanId: planMurshe.id,
        contacts: {
          create: [{
            name: 'ירין מלכה',
            role: 'עצמאי',
            email: 'yarin@consulting.co.il',
            phone: '054-9999999',
            isPrimary: true,
          }],
        },
      },
    }),
    prisma.client.upsert({
      where: { taxId: '050111222' },
      update: {},
      create: {
        name: 'אפרת עיצוב פנים',
        taxId: '050111222',
        clientType: ClientType.OSEK_PATUR,
        industry: 'עיצוב',
        email: 'efrat@design.co.il',
        city: 'רמת גן',
        vatFrequency: ReportFrequency.ANNUAL,
        hasPayroll: false,
        healthScore: 60,
        servicePlanId: planOsek.id,
        contacts: {
          create: [{
            name: 'אפרת שמיר',
            isPrimary: true,
            phone: '053-1112222',
          }],
        },
      },
    }),
    prisma.client.upsert({
      where: { taxId: '400333444' },
      update: {},
      create: {
        name: 'קבוצת ניאון שיווק',
        legalName: 'ניאון שיווק ופרסום בע"מ',
        taxId: '400333444',
        companyNumber: '516333444',
        clientType: ClientType.CHEVRA_BVM,
        industry: 'שיווק ופרסום',
        email: 'info@neon-marketing.co.il',
        phone: '03-9876543',
        city: 'פתח תקווה',
        vatFrequency: ReportFrequency.MONTHLY,
        hasPayroll: true,
        healthScore: 78,
        servicePlanId: planChevra.id,
        tags: { create: [{ tag: 'שיווק' }, { tag: 'לקוח חדש' }] },
        contacts: {
          create: [{
            name: 'נועם ליבר',
            role: 'CFO',
            email: 'noam@neon-marketing.co.il',
            phone: '052-3334444',
            isPrimary: true,
          }],
        },
      },
    }),
  ])
  console.log(`✅ ${clients.length} לקוחות נוצרו`)

  // ──────────────────────────────────────────────
  // 4. תבניות תהליך ישראליות
  // ──────────────────────────────────────────────

  // תבנית מע"מ דו-חודשי
  const vatBimonthly = await prisma.processTemplate.upsert({
    where: { processCode: 'VAT_BIMONTHLY' },
    update: {},
    create: {
      name: 'מע"מ דו-חודשי',
      description: 'דיווח מע"מ כל חודשיים לעוסקים מורשים',
      processCode: 'VAT_BIMONTHLY',
      frequency: ReportFrequency.BIMONTHLY,
      applicableTo: [ClientType.OSEK_MURSHE, ClientType.CHEVRA_BVM, ClientType.SHUTAFUT],
      slaBusinessDays: 5,
      notes: 'הגשה עד ה-15 לחודש שאחרי סוף התקופה',
      steps: {
        create: [
          { order: 1, name: 'איסוף חשבוניות וקבלות', roleRequired: UserRole.BOOKKEEPER, defaultDuration: 3, isClientStep: false, checklistItems: ['חשבוניות קניה', 'חשבוניות מכירה', 'הוצאות רכב', 'הוצאות משרד'] },
          { order: 2, name: 'הזנת נתונים למערכת', roleRequired: UserRole.BOOKKEEPER, defaultDuration: 2 },
          { order: 3, name: 'בדיקת ואישור', roleRequired: UserRole.ACCOUNTANT, defaultDuration: 1 },
          { order: 4, name: 'הגשה לרשויות המס', roleRequired: UserRole.ACCOUNTANT, defaultDuration: 1 },
        ],
      },
      requiredDocs: {
        create: [
          { documentType: 'חשבוניות מכירה', isRequired: true, applicableTo: [ClientType.OSEK_MURSHE, ClientType.CHEVRA_BVM] },
          { documentType: 'חשבוניות קניה', isRequired: true, applicableTo: [ClientType.OSEK_MURSHE, ClientType.CHEVRA_BVM] },
          { documentType: 'דף חשבון בנק', isRequired: false, applicableTo: [ClientType.OSEK_MURSHE, ClientType.CHEVRA_BVM] },
        ],
      },
      dueRules: {
        create: [{ name: 'הגשת מע"מ דו-חודשי', dayOfMonth: 15, offsetDaysFromPeriodEnd: null, adjustForHolidays: true, adjustForWeekends: true }],
      },
    },
  })

  // תבנית מע"מ חודשי
  const vatMonthly = await prisma.processTemplate.upsert({
    where: { processCode: 'VAT_MONTHLY' },
    update: {},
    create: {
      name: 'מע"מ חודשי',
      description: 'דיווח מע"מ חודשי לעוסקים גדולים / חברות',
      processCode: 'VAT_MONTHLY',
      frequency: ReportFrequency.MONTHLY,
      applicableTo: [ClientType.CHEVRA_BVM, ClientType.OSEK_MURSHE],
      slaBusinessDays: 5,
      steps: {
        create: [
          { order: 1, name: 'ריכוז תנועות חשבון', roleRequired: UserRole.BOOKKEEPER, defaultDuration: 2 },
          { order: 2, name: 'התאמת בנק', roleRequired: UserRole.BOOKKEEPER, defaultDuration: 1 },
          { order: 3, name: 'הגשה לרשויות', roleRequired: UserRole.ACCOUNTANT, defaultDuration: 1 },
        ],
      },
      dueRules: {
        create: [{ name: 'הגשת מע"מ חודשי', dayOfMonth: 15, adjustForHolidays: true, adjustForWeekends: true }],
      },
    },
  })

  // תבנית ניכויים חודשיים (106)
  const payrollMonthly = await prisma.processTemplate.upsert({
    where: { processCode: 'PAYROLL_MONTHLY' },
    update: {},
    create: {
      name: 'ניכויים חודשיים (106)',
      description: 'הגשת ניכויים במקור ודיווח שכר חודשי',
      processCode: 'PAYROLL_MONTHLY',
      frequency: ReportFrequency.MONTHLY,
      applicableTo: [ClientType.CHEVRA_BVM, ClientType.OSEK_MURSHE, ClientType.SHUTAFUT],
      slaBusinessDays: 3,
      steps: {
        create: [
          { order: 1, name: 'קבלת נתוני שכר', roleRequired: UserRole.PAYROLL, defaultDuration: 1, isClientStep: false },
          { order: 2, name: 'עיבוד שכר ותלושים', roleRequired: UserRole.PAYROLL, defaultDuration: 2 },
          { order: 3, name: 'הגשת 102 ו-106', roleRequired: UserRole.PAYROLL, defaultDuration: 1 },
          { order: 4, name: 'העברת תשלומים', roleRequired: UserRole.ACCOUNTANT, defaultDuration: 1, checklistItems: ['מס הכנסה', 'ביטוח לאומי', 'קרן פנסיה'] },
        ],
      },
      requiredDocs: {
        create: [
          { documentType: 'נתוני שכר (אקסל)', isRequired: true, applicableTo: [ClientType.CHEVRA_BVM, ClientType.OSEK_MURSHE] },
          { documentType: 'כרטיסי עובדים', isRequired: false, applicableTo: [ClientType.CHEVRA_BVM] },
        ],
      },
      dueRules: {
        create: [{ name: 'הגשת ניכויים', dayOfMonth: 15, adjustForHolidays: true, adjustForWeekends: true }],
      },
    },
  })

  // תבנית דוח שנתי
  const annualReport = await prisma.processTemplate.upsert({
    where: { processCode: 'ANNUAL_TAX_REPORT' },
    update: {},
    create: {
      name: 'דוח שנתי למס הכנסה',
      description: 'הגשת דוח שנתי ליחידים ועוסקים',
      processCode: 'ANNUAL_TAX_REPORT',
      frequency: ReportFrequency.ANNUAL,
      applicableTo: [ClientType.OSEK_MURSHE, ClientType.OSEK_PATUR, ClientType.INDIVIDUAL, ClientType.SHUTAFUT],
      slaBusinessDays: 15,
      steps: {
        create: [
          { order: 1, name: 'ריכוז נתוני הכנסות', roleRequired: UserRole.ACCOUNTANT, defaultDuration: 5 },
          { order: 2, name: 'ריכוז הוצאות ופחת', roleRequired: UserRole.BOOKKEEPER, defaultDuration: 3 },
          { order: 3, name: 'הכנת טופס 1301', roleRequired: UserRole.ACCOUNTANT, defaultDuration: 5 },
          { order: 4, name: 'בדיקה ואישור', roleRequired: UserRole.REVIEWER, defaultDuration: 2 },
          { order: 5, name: 'אישור לקוח', roleRequired: UserRole.ACCOUNTANT, defaultDuration: 1, isClientStep: true },
          { order: 6, name: 'הגשה ל-שע"מ', roleRequired: UserRole.ACCOUNTANT, defaultDuration: 1 },
        ],
      },
      requiredDocs: {
        create: [
          { documentType: 'טפסי 106', isRequired: true, description: 'אישור שכר מכל מעסיק', applicableTo: [ClientType.INDIVIDUAL, ClientType.OSEK_MURSHE] },
          { documentType: 'ריכוז הכנסות', isRequired: true, applicableTo: [ClientType.OSEK_MURSHE, ClientType.OSEK_PATUR] },
          { documentType: 'דפי חשבון שנתיים', isRequired: true, applicableTo: [ClientType.OSEK_MURSHE, ClientType.CHEVRA_BVM] },
          { documentType: 'קבלות הוצאות', isRequired: false, applicableTo: [ClientType.OSEK_MURSHE, ClientType.OSEK_PATUR] },
        ],
      },
      dueRules: {
        create: [{ name: 'הגשת דוח שנתי', dayOfMonth: 30, offsetDaysFromPeriodEnd: 120, adjustForHolidays: true, adjustForWeekends: true, notes: 'בדרך כלל עד 30 באפריל; עם ארכה עד 31 מאי' }],
      },
    },
  })

  // תבנית דוח שנתי לחברה
  await prisma.processTemplate.upsert({
    where: { processCode: 'CORPORATE_ANNUAL' },
    update: {},
    create: {
      name: 'דוח שנתי לחברה',
      description: 'הגשת דוח מס חברות ודוחות כספיים',
      processCode: 'CORPORATE_ANNUAL',
      frequency: ReportFrequency.ANNUAL,
      applicableTo: [ClientType.CHEVRA_BVM, ClientType.AMUTA],
      slaBusinessDays: 20,
      steps: {
        create: [
          { order: 1, name: 'סגירת ספרים לשנה', roleRequired: UserRole.BOOKKEEPER, defaultDuration: 5 },
          { order: 2, name: 'התאמות ופחת', roleRequired: UserRole.BOOKKEEPER, defaultDuration: 3 },
          { order: 3, name: 'הכנת דוחות כספיים', roleRequired: UserRole.ACCOUNTANT, defaultDuration: 7 },
          { order: 4, name: 'חישוב מס חברות', roleRequired: UserRole.ACCOUNTANT, defaultDuration: 3 },
          { order: 5, name: 'ביקורת / סקירה', roleRequired: UserRole.REVIEWER, defaultDuration: 5 },
          { order: 6, name: 'אישור דירקטוריון', roleRequired: UserRole.ACCOUNTANT, defaultDuration: 2, isClientStep: true },
          { order: 7, name: 'הגשה לרשם החברות ומס הכנסה', roleRequired: UserRole.ACCOUNTANT, defaultDuration: 2 },
        ],
      },
      dueRules: {
        create: [{ name: 'הגשת דוח מס חברות', offsetDaysFromPeriodEnd: 150, adjustForHolidays: true, adjustForWeekends: true }],
      },
    },
  })

  console.log('✅ תבניות תהליך ישראליות נוצרו')

  // ──────────────────────────────────────────────
  // 5. מופעי תהליך לדמו (פרוסים בזמן)
  // ──────────────────────────────────────────────
  const now = new Date()
  const barakClient = clients[0] // ברק תוכנה
  const yamClient   = clients[1] // מסעדת הים

  // מע"מ חודשי לברק תוכנה – ינואר 2026 – בביקורת
  await prisma.processInstance.upsert({
    where: { clientId_templateId_periodYear_periodMonth: { clientId: barakClient.id, templateId: vatMonthly.id, periodYear: 2026, periodMonth: 1 } },
    update: {},
    create: {
      clientId: barakClient.id,
      templateId: vatMonthly.id,
      periodYear: 2026,
      periodMonth: 1,
      periodLabel: 'ינואר 2026',
      dueDate: new Date('2026-02-15'),
      internalDueDate: new Date('2026-02-10'),
      status: 'UNDER_REVIEW',
      isOverdue: false,
    },
  })

  // ניכויים ינואר – ברק תוכנה – בעבודה
  await prisma.processInstance.upsert({
    where: { clientId_templateId_periodYear_periodMonth: { clientId: barakClient.id, templateId: payrollMonthly.id, periodYear: 2026, periodMonth: 1 } },
    update: {},
    create: {
      clientId: barakClient.id,
      templateId: payrollMonthly.id,
      periodYear: 2026,
      periodMonth: 1,
      periodLabel: 'ינואר 2026',
      dueDate: new Date('2026-02-15'),
      internalDueDate: new Date('2026-02-12'),
      status: 'IN_PROGRESS',
      isOverdue: false,
    },
  })

  // מע"מ דו-חודשי לים הכחול – נובמבר-דצמבר 2025 – פג תאריך
  await prisma.processInstance.upsert({
    where: { clientId_templateId_periodYear_periodMonth: { clientId: yamClient.id, templateId: vatBimonthly.id, periodYear: 2025, periodMonth: 11 } },
    update: {},
    create: {
      clientId: yamClient.id,
      templateId: vatBimonthly.id,
      periodYear: 2025,
      periodMonth: 11,
      periodLabel: 'נובמבר-דצמבר 2025',
      dueDate: new Date('2026-01-15'),
      internalDueDate: new Date('2026-01-10'),
      status: 'WAITING_CLIENT',
      isOverdue: true,
      overdueDays: 36,
    },
  })

  // דוח שנתי 2024 לירין ייעוץ – ממתין
  await prisma.processInstance.upsert({
    where: { clientId_templateId_periodYear_periodMonth: { clientId: clients[2].id, templateId: annualReport.id, periodYear: 2024, periodMonth: null } },
    update: {},
    create: {
      clientId: clients[2].id,
      templateId: annualReport.id,
      periodYear: 2024,
      periodMonth: null,
      periodLabel: 'שנת 2024',
      dueDate: new Date('2026-04-30'),
      internalDueDate: new Date('2026-04-15'),
      status: 'OPEN',
      isOverdue: false,
    },
  })

  console.log('✅ מופעי תהליך לדמו נוצרו')

  // ──────────────────────────────────────────────
  // 6. משימות demo
  // ──────────────────────────────────────────────
  const admin = users[0]
  const bookkeeper = users[2]

  await prisma.task.createMany({
    skipDuplicates: true,
    data: [
      {
        title: 'לקבל חשבוניות ינואר מברק תוכנה',
        taskType: 'DOCUMENT_REQUEST',
        status: 'OPEN',
        priority: 'HIGH',
        clientId: barakClient.id,
        assigneeId: bookkeeper.id,
        createdById: admin.id,
        dueDate: new Date('2026-02-08'),
      },
      {
        title: 'לבדוק ולאשר מע"מ ינואר ברק',
        taskType: 'REVIEW',
        status: 'OPEN',
        priority: 'URGENT',
        clientId: barakClient.id,
        assigneeId: users[1].id, // רבקה רו"ח
        createdById: admin.id,
        dueDate: new Date('2026-02-12'),
      },
      {
        title: 'להתקשר ליוסי ים לגבי מסמכים חסרים',
        taskType: 'CLIENT_CALL',
        status: 'OPEN',
        priority: 'URGENT',
        clientId: yamClient.id,
        assigneeId: users[1].id,
        createdById: admin.id,
        dueDate: new Date('2026-02-05'),
      },
      {
        title: 'עדכון כרטיסי עובדים – ניאון שיווק',
        taskType: 'DATA_ENTRY',
        status: 'IN_PROGRESS',
        priority: 'MEDIUM',
        clientId: clients[4].id,
        assigneeId: users[3].id, // שירה שכר
        createdById: admin.id,
        dueDate: new Date('2026-02-20'),
      },
      {
        title: 'הכנת טיוטת דוח שנתי – ירין מלכה',
        taskType: 'DATA_ENTRY',
        status: 'OPEN',
        priority: 'LOW',
        clientId: clients[2].id,
        assigneeId: users[1].id,
        createdById: admin.id,
        dueDate: new Date('2026-03-15'),
      },
    ],
  })

  console.log('✅ משימות demo נוצרו')
  console.log('')
  console.log('🎉 Seed הושלם בהצלחה!')
  console.log('   כניסה: admin@uriel-practice.co.il | סיסמה: Demo1234!')
  console.log('   כניסה: rivka@uriel-practice.co.il | סיסמה: Demo1234!')
}

main()
  .catch(e => { console.error('❌ שגיאה ב-seed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
