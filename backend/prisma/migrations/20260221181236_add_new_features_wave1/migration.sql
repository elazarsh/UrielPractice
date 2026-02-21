-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING_CONFIRMATION', 'ACCEPTED', 'REJECTED', 'PENDING_CORRECTION');

-- CreateEnum
CREATE TYPE "TaxPaymentType" AS ENUM ('VAT', 'INCOME_TAX_WITHHOLDING', 'NATIONAL_INSURANCE', 'ADVANCE_PAYMENT', 'CORPORATE_TAX');

-- CreateEnum
CREATE TYPE "IsraeliFormType" AS ENUM ('FORM_1301', 'FORM_1214', 'FORM_102', 'FORM_106', 'FORM_856', 'FORM_50', 'FORM_1220', 'FORM_134', 'FORM_101', 'OTHER');

-- CreateEnum
CREATE TYPE "FormStatus" AS ENUM ('NOT_STARTED', 'IN_PREPARATION', 'PENDING_SIGNATURE', 'SUBMITTED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReminderTriggerType" AS ENUM ('PROCESS_DUE_SOON', 'DOCUMENT_MISSING', 'PAYMENT_OVERDUE', 'PROCESS_OVERDUE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ReminderStatus" AS ENUM ('PENDING', 'SENT', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "submission_records" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "submissionType" "IsraeliFormType" NOT NULL,
    "referenceNumber" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "submittedBy" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "rejectionReason" TEXT,
    "correctionDeadline" TIMESTAMP(3),
    "rawResponse" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_payments" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "processId" TEXT,
    "paymentType" "TaxPaymentType" NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER,
    "amount" DOUBLE PRECISION NOT NULL,
    "vatAmount" DOUBLE PRECISION,
    "referenceNumber" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "paidById" TEXT,
    "bankBranch" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "idNumber" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "monthlySalary" DOUBLE PRECISION,
    "hourlyRate" DOUBLE PRECISION,
    "pensionFund" TEXT,
    "pensionPercent" DOUBLE PRECISION DEFAULT 6,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "bankAccount" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_records" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "periodMonth" INTEGER NOT NULL,
    "grossSalary" DOUBLE PRECISION NOT NULL,
    "incomeTaxWithheld" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nationalInsuranceEmp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nationalInsuranceEmpl" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pensionEmployee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pensionEmployer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netSalary" DOUBLE PRECISION NOT NULL,
    "workDays" INTEGER,
    "absenceDays" INTEGER,
    "notes" TEXT,
    "processId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "israeli_form_submissions" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "formType" "IsraeliFormType" NOT NULL,
    "taxYear" INTEGER NOT NULL,
    "periodMonth" INTEGER,
    "status" "FormStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "dueDate" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "referenceNumber" TEXT,
    "preparedById" TEXT,
    "approvedById" TEXT,
    "notes" TEXT,
    "relatedProcessId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "israeli_form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "israeli_holidays" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "hebrewYear" INTEGER,
    "isWorkingDay" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "israeli_holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminder_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerType" "ReminderTriggerType" NOT NULL,
    "daysBeforeDue" INTEGER NOT NULL DEFAULT 7,
    "channel" "MessageChannel" NOT NULL,
    "subjectTemplate" TEXT,
    "bodyTemplate" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "applicableTo" "ClientType"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminder_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_reminders" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "processId" TEXT,
    "targetEmail" TEXT,
    "targetPhone" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "renderedBody" TEXT NOT NULL,
    "renderedSubject" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_onboarding" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "assignedToId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_onboarding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tax_payments_clientId_periodYear_periodMonth_idx" ON "tax_payments"("clientId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "tax_payments_isPaid_dueDate_idx" ON "tax_payments"("isPaid", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "employees_clientId_idNumber_key" ON "employees"("clientId", "idNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_records_employeeId_periodYear_periodMonth_key" ON "payroll_records"("employeeId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "israeli_form_submissions_clientId_taxYear_idx" ON "israeli_form_submissions"("clientId", "taxYear");

-- CreateIndex
CREATE INDEX "israeli_form_submissions_status_dueDate_idx" ON "israeli_form_submissions"("status", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "israeli_form_submissions_clientId_formType_taxYear_periodMo_key" ON "israeli_form_submissions"("clientId", "formType", "taxYear", "periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "israeli_holidays_date_key" ON "israeli_holidays"("date");

-- CreateIndex
CREATE INDEX "israeli_holidays_date_idx" ON "israeli_holidays"("date");

-- CreateIndex
CREATE INDEX "scheduled_reminders_status_scheduledFor_idx" ON "scheduled_reminders"("status", "scheduledFor");

-- CreateIndex
CREATE UNIQUE INDEX "client_onboarding_clientId_key" ON "client_onboarding"("clientId");

-- AddForeignKey
ALTER TABLE "submission_records" ADD CONSTRAINT "submission_records_processId_fkey" FOREIGN KEY ("processId") REFERENCES "process_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_payments" ADD CONSTRAINT "tax_payments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "israeli_form_submissions" ADD CONSTRAINT "israeli_form_submissions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_reminders" ADD CONSTRAINT "scheduled_reminders_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "reminder_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_reminders" ADD CONSTRAINT "scheduled_reminders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_onboarding" ADD CONSTRAINT "client_onboarding_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
