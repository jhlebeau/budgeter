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
    "startMonth" TEXT NOT NULL DEFAULT '1970-01',
    "endMonth" TEXT,
    "taxRate" REAL,
    "taxState" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IncomeSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_IncomeSource" ("amount", "createdAt", "frequency", "id", "isPreTax", "name", "taxRate", "taxState", "updatedAt", "userId") SELECT "amount", "createdAt", "frequency", "id", "isPreTax", "name", "taxRate", "taxState", "updatedAt", "userId" FROM "IncomeSource";
DROP TABLE "IncomeSource";
ALTER TABLE "new_IncomeSource" RENAME TO "IncomeSource";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
