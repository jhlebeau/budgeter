-- AlterTable
ALTER TABLE "RecurringTransaction" ADD COLUMN "endDate" DATETIME;

-- CreateTable
CREATE TABLE "RecurringTransactionSkipDate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recurringSeriesId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringTransactionSkipDate_recurringSeriesId_fkey" FOREIGN KEY ("recurringSeriesId") REFERENCES "RecurringTransaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RecurringTransactionSkipDate_recurringSeriesId_date_key" ON "RecurringTransactionSkipDate"("recurringSeriesId", "date");
