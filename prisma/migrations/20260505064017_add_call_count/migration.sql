-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Queue" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "number" INTEGER NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT '',
    "queueType" TEXT NOT NULL DEFAULT 'single',
    "counterId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "visitorName" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "callCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calledAt" DATETIME,
    "servedAt" DATETIME,
    "doneAt" DATETIME,
    CONSTRAINT "Queue_counterId_fkey" FOREIGN KEY ("counterId") REFERENCES "Counter" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Queue_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Queue" ("calledAt", "counterId", "createdAt", "date", "doneAt", "id", "nik", "number", "phone", "prefix", "queueType", "servedAt", "serviceId", "status", "visitorName") SELECT "calledAt", "counterId", "createdAt", "date", "doneAt", "id", "nik", "number", "phone", "prefix", "queueType", "servedAt", "serviceId", "status", "visitorName" FROM "Queue";
DROP TABLE "Queue";
ALTER TABLE "new_Queue" RENAME TO "Queue";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
