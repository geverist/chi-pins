// src/lib/databaseAudit.js
// Comprehensive database audit and synchronization system

import { supabase } from './supabase';
import { getLocalDatabase } from './localDatabase';

/**
 * Database Audit System
 * Compares local SQLite database with Supabase and identifies discrepancies
 */

// Expected schema for all tables
const EXPECTED_SCHEMA = {
  pins: {
    columns: {
      id: { type: 'TEXT', nullable: false, primaryKey: true },
      lat: { type: 'REAL', nullable: false },
      lng: { type: 'REAL', nullable: false },
      slug: { type: 'TEXT', nullable: true },
      note: { type: 'TEXT', nullable: true },
      hotdog: { type: 'TEXT', nullable: true },
      team: { type: 'TEXT', nullable: true },
      pinStyle: { type: 'TEXT', nullable: true },
      created_at: { type: 'TEXT', nullable: true },
      updated_at: { type: 'TEXT', nullable: true },
    },
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_pins_created_at ON pins(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_pins_lat_lng ON pins(lat, lng)',
    ],
  },
  popular_spots: {
    columns: {
      id: { type: 'TEXT', nullable: false, primaryKey: true },
      name: { type: 'TEXT', nullable: false },
      lat: { type: 'REAL', nullable: false },
      lng: { type: 'REAL', nullable: false },
      category: { type: 'TEXT', nullable: true },
      description: { type: 'TEXT', nullable: true },
      image_url: { type: 'TEXT', nullable: true },
      display_order: { type: 'INTEGER', nullable: true },
      created_at: { type: 'TEXT', nullable: true },
      updated_at: { type: 'TEXT', nullable: true },
    },
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_popular_spots_display_order ON popular_spots(display_order)',
    ],
  },
  comments: {
    columns: {
      id: { type: 'TEXT', nullable: false, primaryKey: true },
      text: { type: 'TEXT', nullable: false },
      created_at: { type: 'TEXT', nullable: true },
    },
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at)',
    ],
  },
  then_and_now: {
    columns: {
      id: { type: 'TEXT', nullable: false, primaryKey: true },
      title: { type: 'TEXT', nullable: false },
      historic_image: { type: 'TEXT', nullable: false },
      modern_image: { type: 'TEXT', nullable: false },
      lat: { type: 'REAL', nullable: false },
      lng: { type: 'REAL', nullable: false },
      historic_year: { type: 'INTEGER', nullable: true },
      description: { type: 'TEXT', nullable: true },
      display_order: { type: 'INTEGER', nullable: true },
      created_at: { type: 'TEXT', nullable: true },
      updated_at: { type: 'TEXT', nullable: true },
    },
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_then_and_now_display_order ON then_and_now(display_order)',
    ],
  },
};

/**
 * Get schema information from local SQLite database
 */
async function getLocalSchema(db, tableName) {
  try {
    const result = await db.query(`PRAGMA table_info(${tableName})`);
    if (!result.values || result.values.length === 0) {
      return null; // Table doesn't exist
    }

    const columns = {};
    for (const row of result.values) {
      columns[row.name] = {
        type: row.type,
        nullable: row.notnull === 0,
        primaryKey: row.pk === 1,
      };
    }

    return { columns };
  } catch (err) {
    console.error(`Failed to get schema for ${tableName}:`, err);
    return null;
  }
}

/**
 * Check if local schema matches expected schema
 */
function compareSchemas(localSchema, expectedSchema) {
  const issues = [];

  if (!localSchema) {
    issues.push({ type: 'MISSING_TABLE', severity: 'critical' });
    return issues;
  }

  // Check for missing columns
  for (const [colName, colDef] of Object.entries(expectedSchema.columns)) {
    if (!localSchema.columns[colName]) {
      issues.push({
        type: 'MISSING_COLUMN',
        column: colName,
        expectedDef: colDef,
        severity: 'high',
      });
    } else {
      // Check type mismatch (SQLite is flexible with types, so only warn)
      const localCol = localSchema.columns[colName];
      if (localCol.type !== colDef.type) {
        issues.push({
          type: 'TYPE_MISMATCH',
          column: colName,
          expected: colDef.type,
          actual: localCol.type,
          severity: 'low',
        });
      }
    }
  }

  // Check for extra columns (not critical, but good to know)
  for (const colName of Object.keys(localSchema.columns)) {
    if (!expectedSchema.columns[colName]) {
      issues.push({
        type: 'EXTRA_COLUMN',
        column: colName,
        severity: 'low',
      });
    }
  }

  return issues;
}

/**
 * Get row counts from both databases
 */
async function getRowCounts(db, tableName) {
  try {
    // Local count
    const localResult = await db.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    const localCount = localResult.values?.[0]?.count || 0;

    // Supabase count
    const { count: supabaseCount, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error(`Supabase count error for ${tableName}:`, error);
      return { localCount, supabaseCount: null, error };
    }

    return { localCount, supabaseCount: supabaseCount || 0, diff: localCount - (supabaseCount || 0) };
  } catch (err) {
    console.error(`Failed to get row counts for ${tableName}:`, err);
    return { localCount: 0, supabaseCount: null, error: err };
  }
}

/**
 * Find records that exist in Supabase but not in local DB
 */
async function findMissingLocalRecords(db, tableName, limit = 100) {
  try {
    // Get all local IDs (or a sample if too many)
    const localResult = await db.query(`SELECT id FROM ${tableName} LIMIT 10000`);
    const localIds = new Set(localResult.values?.map(row => row.id) || []);

    // Get Supabase IDs (sample)
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const missingInLocal = data?.filter(row => !localIds.has(row.id)) || [];
    return missingInLocal.map(row => row.id);
  } catch (err) {
    console.error(`Failed to find missing local records for ${tableName}:`, err);
    return [];
  }
}

/**
 * Run comprehensive database audit
 */
export async function auditDatabase() {
  console.log('========== DATABASE AUDIT START ==========');

  const db = await getLocalDatabase();
  if (!db.isAvailable()) {
    return {
      success: false,
      error: 'Local database not available',
      timestamp: new Date().toISOString(),
    };
  }

  const audit = {
    timestamp: new Date().toISOString(),
    tables: {},
    summary: {
      totalIssues: 0,
      critical: 0,
      high: 0,
      low: 0,
    },
  };

  // Audit each table
  for (const [tableName, expectedSchema] of Object.entries(EXPECTED_SCHEMA)) {
    console.log(`[Audit] Checking table: ${tableName}`);

    const tableAudit = {
      exists: false,
      schemaIssues: [],
      rowCounts: {},
      dataSyncStatus: 'unknown',
    };

    // Check schema
    const localSchema = await getLocalSchema(db, tableName);
    tableAudit.exists = !!localSchema;

    if (localSchema) {
      const schemaIssues = compareSchemas(localSchema, expectedSchema);
      tableAudit.schemaIssues = schemaIssues;

      // Count issues by severity
      for (const issue of schemaIssues) {
        audit.summary.totalIssues++;
        audit.summary[issue.severity]++;
      }

      // Check row counts
      const counts = await getRowCounts(db, tableName);
      tableAudit.rowCounts = counts;

      // Determine sync status
      if (counts.supabaseCount !== null) {
        if (counts.diff === 0) {
          tableAudit.dataSyncStatus = 'synced';
        } else if (counts.diff < 0) {
          tableAudit.dataSyncStatus = 'local_behind';
          tableAudit.missingCount = Math.abs(counts.diff);
        } else {
          tableAudit.dataSyncStatus = 'local_ahead';
          tableAudit.extraCount = counts.diff;
        }
      } else {
        tableAudit.dataSyncStatus = 'supabase_error';
      }

      // Sample missing records if local is behind
      if (tableAudit.dataSyncStatus === 'local_behind') {
        tableAudit.sampleMissingIds = await findMissingLocalRecords(db, tableName, 10);
      }
    } else {
      // Table doesn't exist - critical issue
      tableAudit.schemaIssues.push({
        type: 'MISSING_TABLE',
        severity: 'critical',
      });
      audit.summary.totalIssues++;
      audit.summary.critical++;
    }

    audit.tables[tableName] = tableAudit;
  }

  console.log('========== DATABASE AUDIT COMPLETE ==========');
  console.log('Summary:', JSON.stringify(audit.summary, null, 2));

  return audit;
}

/**
 * Fix schema issues automatically
 */
export async function fixSchemaIssues(audit) {
  console.log('========== SCHEMA FIX START ==========');

  const db = await getLocalDatabase();
  if (!db.isAvailable()) {
    return { success: false, error: 'Local database not available' };
  }

  const fixes = {
    timestamp: new Date().toISOString(),
    appliedFixes: [],
    errors: [],
  };

  for (const [tableName, tableAudit] of Object.entries(audit.tables)) {
    // Create missing table
    if (!tableAudit.exists) {
      try {
        console.log(`[Fix] Creating missing table: ${tableName}`);
        const schema = EXPECTED_SCHEMA[tableName];

        // Build CREATE TABLE statement
        const columns = Object.entries(schema.columns)
          .map(([name, def]) => {
            let colDef = `${name} ${def.type}`;
            if (def.primaryKey) colDef += ' PRIMARY KEY';
            if (!def.nullable) colDef += ' NOT NULL';
            return colDef;
          })
          .join(', ');

        await db.execute(`CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`);

        // Create indexes
        if (schema.indexes) {
          for (const indexSql of schema.indexes) {
            await db.execute(indexSql);
          }
        }

        fixes.appliedFixes.push({
          table: tableName,
          fix: 'CREATE_TABLE',
          success: true,
        });
      } catch (err) {
        console.error(`[Fix] Failed to create table ${tableName}:`, err);
        fixes.errors.push({
          table: tableName,
          fix: 'CREATE_TABLE',
          error: err.message,
        });
      }
      continue;
    }

    // Add missing columns
    for (const issue of tableAudit.schemaIssues) {
      if (issue.type === 'MISSING_COLUMN') {
        try {
          console.log(`[Fix] Adding missing column: ${tableName}.${issue.column}`);
          const colDef = issue.expectedDef;
          let alterSql = `ALTER TABLE ${tableName} ADD COLUMN ${issue.column} ${colDef.type}`;
          if (!colDef.nullable) {
            // For NOT NULL columns, we need to provide a default
            if (colDef.type === 'TEXT') alterSql += " DEFAULT ''";
            else if (colDef.type === 'INTEGER') alterSql += ' DEFAULT 0';
            else if (colDef.type === 'REAL') alterSql += ' DEFAULT 0.0';
          }

          await db.execute(alterSql);

          fixes.appliedFixes.push({
            table: tableName,
            column: issue.column,
            fix: 'ADD_COLUMN',
            success: true,
          });
        } catch (err) {
          console.error(`[Fix] Failed to add column ${tableName}.${issue.column}:`, err);
          fixes.errors.push({
            table: tableName,
            column: issue.column,
            fix: 'ADD_COLUMN',
            error: err.message,
          });
        }
      }
    }
  }

  console.log('========== SCHEMA FIX COMPLETE ==========');
  console.log(`Applied ${fixes.appliedFixes.length} fixes, ${fixes.errors.length} errors`);

  return fixes;
}

/**
 * Sync missing data from Supabase to local DB
 */
export async function syncMissingData(tableName, maxRecords = 1000) {
  console.log(`========== DATA SYNC START: ${tableName} ==========`);

  const db = await getLocalDatabase();
  if (!db.isAvailable()) {
    return { success: false, error: 'Local database not available' };
  }

  try {
    // Get local IDs
    const localResult = await db.query(`SELECT id FROM ${tableName}`);
    const localIds = new Set(localResult.values?.map(row => row.id) || []);

    // Fetch records from Supabase that don't exist locally
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(maxRecords);

    if (error) throw error;

    const toInsert = data?.filter(row => !localIds.has(row.id)) || [];

    if (toInsert.length === 0) {
      console.log(`[Sync] No missing records found for ${tableName}`);
      return {
        success: true,
        synced: 0,
        message: 'Already in sync',
      };
    }

    console.log(`[Sync] Found ${toInsert.length} missing records in ${tableName}`);

    // Insert missing records
    let synced = 0;
    for (const record of toInsert) {
      try {
        await db.insertRecord(tableName, record);
        synced++;
      } catch (err) {
        console.error(`[Sync] Failed to insert record ${record.id}:`, err);
      }
    }

    console.log(`========== DATA SYNC COMPLETE: ${tableName} (${synced}/${toInsert.length}) ==========`);

    return {
      success: true,
      synced,
      total: toInsert.length,
    };
  } catch (err) {
    console.error(`[Sync] Failed to sync ${tableName}:`, err);
    return {
      success: false,
      error: err.message,
    };
  }
}

/**
 * Full auto-fix: schema + data sync
 */
export async function autoFixDatabase() {
  console.log('========== AUTO-FIX DATABASE START ==========');

  // Step 1: Audit
  const audit = await auditDatabase();
  if (!audit.success) {
    return { success: false, error: audit.error };
  }

  // Step 2: Fix schema issues
  const schemaFixes = await fixSchemaIssues(audit);

  // Step 3: Sync missing data for tables that are behind
  const dataSyncs = {};
  for (const [tableName, tableAudit] of Object.entries(audit.tables)) {
    if (tableAudit.dataSyncStatus === 'local_behind') {
      dataSyncs[tableName] = await syncMissingData(tableName);
    }
  }

  // Step 4: Re-audit to verify fixes
  const postAudit = await auditDatabase();

  console.log('========== AUTO-FIX DATABASE COMPLETE ==========');

  return {
    success: true,
    beforeAudit: audit,
    schemaFixes,
    dataSyncs,
    afterAudit: postAudit,
  };
}
