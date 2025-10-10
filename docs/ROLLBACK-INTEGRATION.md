# Rollback Mechanism Integration Guide

## Overview

The rollback mechanism provides safety for autonomous fixes by creating git snapshots before changes and automatically reverting if fixes make things worse.

## Components Created

1. **scripts/rollback-manager.js** - Core rollback functionality
2. **database/migrations/rollback_tables.sql** - Database schema for tracking snapshots and rollbacks

## Integration Points in Autonomous Healer

### 1. Before Applying Fix (processError function, line ~397)

```javascript
// After AI analysis succeeds and before applyFix()

// Import rollback manager at top of file
import { createSnapshot, verifyFix, autoRollbackIfNeeded } from './rollback-manager.js';

// Create snapshot before applying fix
let snapshot = null;
try {
  // Collect current metrics before fix
  const beforeMetrics = {
    lint_errors: (await execAsync('npm run lint 2>&1 || true')).stdout.match(/error/gi)?.length || 0,
    build_succeeded: await canBuild(),
  };

  snapshot = await createSnapshot(
    `Before fix: ${error.message.slice(0, 60)}`,
    {
      error_id: error.id,
      fix_id: fixRecord?.id,
      ...beforeMetrics
    }
  );

  // Update fix record with snapshot ID
  if (fixRecord && snapshot) {
    await updateFixRecord(supabase, fixRecord.id, {
      snapshot_id: snapshot.id
    });
  }
} catch (err) {
  log(`Warning: Could not create snapshot: ${err.message}`, 'yellow');
  // Continue anyway - snapshot is optional safety feature
}

// Proceed with applying fix
const applied = await applyFix(fixPlan);
```

###  2. After Deployment (line ~485, after deployment completes)

```javascript
// After deployment, verify fix effectiveness
if (merged && deploySuccess && snapshot) {
  log('Verifying fix effectiveness...', 'cyan');

  // Wait a moment for app to stabilize
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Check if automatic rollback is needed
  const rolledBack = await autoRollbackIfNeeded(fixRecord.id, snapshot.id);

  if (rolledBack) {
    log('⚠️  Fix was automatically rolled back', 'yellow');

    // Update fix record
    await updateFixRecord(supabase, fixRecord.id, {
      status: 'rolled_back',
      rollback_reason: 'Automatic rollback - fix verification failed'
    });

    // Update error as not successfully fixed
    await markProcessed(supabase, error.id, false, {
      reason: 'Fix was rolled back',
      rollback_snapshot: snapshot.id
    });

    // Re-deploy original code
    await deployToKiosk();
  }
}
```

### 3. Manual Rollback Command

```bash
# List recent snapshots
node scripts/rollback-manager.js

# Rollback to specific snapshot
node scripts/rollback-manager.js rollback snapshot-1728567890123

# Verify a fix
node scripts/rollback-manager.js verify-fix fix-uuid-here
```

## Database Setup

Run the SQL migration to create required tables:

```bash
# Copy the SQL from database/migrations/rollback_tables.sql
# and run it in your Supabase SQL editor
```

Or execute via psql:

```bash
psql $DATABASE_URL < database/migrations/rollback_tables.sql
```

## Key Features

### Automatic Rollback Triggers

The system automatically rolls back when:
- ESLint errors increase after fix
- Build breaks when it was working before
- New runtime errors are introduced

### Rollback Verification Metrics

Each fix verification checks:
- **Lint errors before/after**: Count of ESLint errors
- **Build status before/after**: Whether build succeeds
- **New errors introduced**: Any new error types detected

### Rollback History Tracking

All rollbacks are tracked in `rollback_history` table with:
- Snapshot ID restored to
- Reason for rollback
- Trigger type (automatic vs manual)
- Associated fix ID
- Commit hash before rollback

## Testing Rollback Mechanism

### Test 1: Create and Restore Snapshot

```bash
# Create a snapshot
node scripts/rollback-manager.js create-snapshot "Test snapshot"

# Make some changes
echo "// test" >> src/App.jsx

# Rollback to snapshot
node scripts/rollback-manager.js rollback <snapshot-id>
```

### Test 2: Automatic Rollback on Bad Fix

```bash
# This requires integration with autonomous healer
# The system should automatically rollback if:
# 1. A fix introduces more errors than it fixes
# 2. A fix breaks the build
# 3. A fix introduces new critical errors
```

## Safety Features

1. **Git-based snapshots**: Uses git commits and stashes, no custom file management
2. **Stash preservation**: Uncommitted changes are stashed and can be restored
3. **Verification before rollback**: Checks current state before triggering rollback
4. **SMS notifications**: Alerts user when automatic rollbacks occur
5. **Rollback history**: Complete audit trail of all rollbacks

## Monitoring

View rollback statistics:

```sql
-- Recent rollbacks
SELECT * FROM recent_rollbacks
ORDER BY rolled_back_at DESC
LIMIT 10;

-- Rollback success rate by date
SELECT * FROM snapshot_success_rate
ORDER BY date DESC;

-- Fixes that were rolled back
SELECT
  af.id,
  af.error_id,
  af.ai_confidence,
  af.rollback_reason,
  rs.git_commit
FROM autonomous_fixes af
JOIN rollback_snapshots rs ON af.rollback_snapshot_id = rs.snapshot_id
WHERE af.status = 'rolled_back';
```

## Future Enhancements

1. **Predictive rollback**: Use ML to predict which fixes are likely to need rollback
2. **Partial rollback**: Roll back only specific files, not entire commit
3. **A/B testing**: Deploy fixes to subset of traffic before full rollback
4. **Performance regression detection**: Roll back on performance degradation
5. **User impact analysis**: Roll back if user error rates increase
