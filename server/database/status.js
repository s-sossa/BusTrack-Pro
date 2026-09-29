/* ==============================================================================
   BusTrack Pro — Database Diagnostics & Inspection CLI
   Run with: npm run db:status OR node server/database/status.js
   ============================================================================== */

import { db } from './db.js';

console.log('============================================================');
console.log('   🚍 BusTrack Pro — Live Database Diagnostics');
console.log('============================================================');

const status = db.getDbStatus();

console.log(`  Engine:           ${status.engine}`);
console.log(`  SQLite Version:   ${status.version}`);
console.log(`  Dialect:          ${status.dialect}`);
console.log(`  Connected:        ${status.connected ? '✅ YES' : '❌ NO'}`);
console.log(`  Storage Mode:     ${status.storage}`);
console.log(`  Physical File:    ${status.filePath}`);
console.log(`  File Size on Disk: ${status.fileSizeFormatted} (${status.fileSizeBytes} bytes)`);
console.log(`  Total DB Records: ${status.totalRows}`);
console.log('------------------------------------------------------------');
console.log('  Relational Tables & Row Counts:');
for (const table of status.tables) {
  const bar = '█'.repeat(Math.min(30, Math.max(1, table.count * 2)));
  console.log(`   - ${table.name.padEnd(16)} : ${String(table.count).padStart(3)} rows  ${bar}`);
}
console.log('------------------------------------------------------------');
console.log('  Engine Features & Guardrails:');
console.log(`   - Foreign Keys Enforcement:  ${status.features.foreignKeys ? '✅ Enabled (ACID relational integrity)' : '❌ Disabled'}`);
console.log(`   - WAL Journal Mode:          ${status.features.walJournalMode ? '✅ Enabled (Write-Ahead Logging)' : '❌ Off'}`);
console.log(`   - ACID Transactions:         ${status.features.acidTransactions ? '✅ Supported' : '❌ No'}`);
console.log(`   - PostgreSQL Compatible:     ${status.features.postgresCompatible ? '✅ Yes (schema.sql available)' : '❌ No'}`);
console.log('============================================================\n');

db.close();
process.exit(0);
