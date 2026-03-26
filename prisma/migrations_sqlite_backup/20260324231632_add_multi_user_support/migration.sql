/*
  Warnings:

  - Added the required column `userId` to the `IncomeSource` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `RecurringTransaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `SavingCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `SpendingCategory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "usernameKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "User" ("id", "username", "usernameKey", "createdAt", "updatedAt")
VALUES ("migrated-default-user", "migratedUser", "migrateduser", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_IncomeSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "frequency" TEXT NOT NULL,
    "isPreTax" BOOLEAN NOT NULL,
    "userId" TEXT NOT NULL,
    "taxRate" REAL,
    "taxState" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IncomeSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_IncomeSource" ("amount", "createdAt", "frequency", "id", "isPreTax", "name", "taxRate", "taxState", "updatedAt", "userId") SELECT "amount", "createdAt", "frequency", "id", "isPreTax", "name", "taxRate", "taxState", "updatedAt", "migrated-default-user" FROM "IncomeSource";
DROP TABLE "IncomeSource";
ALTER TABLE "new_IncomeSource" RENAME TO "IncomeSource";
CREATE TABLE "new_RecurringTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "frequency" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecurringTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SpendingCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_RecurringTransaction" ("amount", "categoryId", "createdAt", "description", "frequency", "id", "startDate", "updatedAt", "userId") SELECT "amount", "categoryId", "createdAt", "description", "frequency", "id", "startDate", "updatedAt", "migrated-default-user" FROM "RecurringTransaction";
DROP TABLE "RecurringTransaction";
ALTER TABLE "new_RecurringTransaction" RENAME TO "RecurringTransaction";
CREATE TABLE "new_SavingCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "limitType" TEXT NOT NULL,
    "limitValue" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SavingCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SavingCategory" ("createdAt", "id", "limitType", "limitValue", "name", "updatedAt", "userId") SELECT "createdAt", "id", "limitType", "limitValue", "name", "updatedAt", "migrated-default-user" FROM "SavingCategory";
DROP TABLE "SavingCategory";
ALTER TABLE "new_SavingCategory" RENAME TO "SavingCategory";
CREATE TABLE "new_SpendingCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "limitType" TEXT NOT NULL,
    "limitValue" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SpendingCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SpendingCategory" ("createdAt", "id", "limitType", "limitValue", "name", "updatedAt", "userId") SELECT "createdAt", "id", "limitType", "limitValue", "name", "updatedAt", "migrated-default-user" FROM "SpendingCategory";
DROP TABLE "SpendingCategory";
ALTER TABLE "new_SpendingCategory" RENAME TO "SpendingCategory";
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "recurringSeriesId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SpendingCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Transaction_recurringSeriesId_fkey" FOREIGN KEY ("recurringSeriesId") REFERENCES "RecurringTransaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amount", "categoryId", "createdAt", "date", "description", "id", "recurringSeriesId", "updatedAt", "userId") SELECT "amount", "categoryId", "createdAt", "date", "description", "id", "recurringSeriesId", "updatedAt", "migrated-default-user" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_usernameKey_key" ON "User"("usernameKey");
