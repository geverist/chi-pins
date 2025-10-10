#!/usr/bin/env node
// scripts/predictive-analyzer.js
// Predictive error pattern detection for autonomous healer
//
// Features:
// - Analyzes historical error patterns from error_log
// - Detects recurring error patterns
// - Predicts which errors are likely to occur
// - Identifies high-risk code patterns
// - Generates proactive fix suggestions
// - Integrates with autonomous healer for prevention
//
// Usage:
//   node scripts/predictive-analyzer.js analyze
//   node scripts/predictive-analyzer.js predict
//   node scripts/predictive-analyzer.js high-risk-files

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function getSupabaseClient() {
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
  );
}

/**
 * Extract error pattern from error message
 */
function extractErrorPattern(message) {
  if (!message) return 'unknown';

  // Remove dynamic parts (numbers, IDs, timestamps, etc.)
  let pattern = message
    .replace(/\d+/g, 'N')  // Numbers
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, 'UUID')  // UUIDs
    .replace(/\b[A-Z0-9]{20,}\b/g, 'TOKEN')  // Tokens
    .replace(/'[^']*'/g, "'X'")  // Quoted strings
    .replace(/"[^"]*"/g, '"X"')  // Double quoted strings
    .replace(/\/[^\s]+/g, '/path')  // File paths
    .replace(/at line \d+/g, 'at line N');  // Line numbers

  // Extract error type
  const errorTypeMatch = pattern.match(/^([A-Za-z]+Error|Error):/);
  const errorType = errorTypeMatch ? errorTypeMatch[1] : 'UnknownError';

  return {
    pattern,
    errorType,
    isUndefinedError: /undefined|not defined|cannot read/i.test(message),
    isTypeError: /TypeError/.test(message),
    isReferenceError: /ReferenceError/.test(message),
    isNetworkError: /network|fetch|ajax|http/i.test(message),
    isStateError: /state|hook|render/i.test(message),
  };
}

/**
 * Extract file path from stack trace
 */
function extractFilePath(stack) {
  if (!stack) return null;

  // Match patterns like: at Component (src/App.jsx:123:45)
  const patterns = [
    /at .+ \((.+?):\d+:\d+\)/,
    /(.+?):\d+:\d+/,
    /@(.+?):\d+:\d+/,
  ];

  for (const pattern of patterns) {
    const match = stack.match(pattern);
    if (match) {
      // Extract just the file path, remove src/ prefix for consistency
      return match[1].replace(/^.*\/(src\/.+)$/, '$1');
    }
  }

  return null;
}

/**
 * Analyze historical error patterns
 */
async function analyzeErrorPatterns() {
  log('📊 Analyzing historical error patterns...', 'cyan');

  const supabase = getSupabaseClient();

  // Get errors from last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: errors, error } = await supabase
    .from('error_log')
    .select('*')
    .gte('timestamp', thirtyDaysAgo.toISOString())
    .order('timestamp', { ascending: false })
    .limit(1000);

  if (error) {
    log(`Error fetching error log: ${error.message}`, 'red');
    return null;
  }

  log(`  → Analyzing ${errors.length} errors from last 30 days`, 'blue');

  // Group errors by pattern
  const patterns = {};
  const fileErrors = {};
  const timeDistribution = {};

  for (const err of errors) {
    // Extract pattern
    const errorPattern = extractErrorPattern(err.message);
    const patternKey = errorPattern.pattern;

    if (!patterns[patternKey]) {
      patterns[patternKey] = {
        pattern: patternKey,
        errorType: errorPattern.errorType,
        count: 0,
        severity: {},
        firstSeen: err.timestamp,
        lastSeen: err.timestamp,
        examples: [],
        files: new Set(),
        autoFixSuccess: 0,
        autoFixFailed: 0,
        ...errorPattern,
      };
    }

    patterns[patternKey].count++;
    patterns[patternKey].severity[err.severity] = (patterns[patternKey].severity[err.severity] || 0) + 1;
    patterns[patternKey].lastSeen = err.timestamp;

    if (patterns[patternKey].examples.length < 3) {
      patterns[patternKey].examples.push({
        message: err.message,
        timestamp: err.timestamp,
      });
    }

    // Track auto-fix success
    if (err.auto_fix_attempted) {
      if (err.auto_fix_success) {
        patterns[patternKey].autoFixSuccess++;
      } else {
        patterns[patternKey].autoFixFailed++;
      }
    }

    // Track file errors
    const filePath = extractFilePath(err.stack);
    if (filePath) {
      patterns[patternKey].files.add(filePath);

      if (!fileErrors[filePath]) {
        fileErrors[filePath] = {
          file: filePath,
          totalErrors: 0,
          patterns: new Set(),
          criticalCount: 0,
        };
      }

      fileErrors[filePath].totalErrors++;
      fileErrors[filePath].patterns.add(patternKey);

      if (err.severity === 'CRITICAL') {
        fileErrors[filePath].criticalCount++;
      }
    }

    // Time distribution (by hour of day)
    const hour = new Date(err.timestamp).getHours();
    if (!timeDistribution[hour]) {
      timeDistribution[hour] = 0;
    }
    timeDistribution[hour]++;
  }

  // Convert Sets to Arrays for JSON serialization
  Object.values(patterns).forEach(p => {
    p.files = Array.from(p.files);
  });

  Object.values(fileErrors).forEach(f => {
    f.patterns = Array.from(f.patterns);
    f.errorRate = (f.totalErrors / errors.length * 100).toFixed(2);
  });

  // Sort patterns by frequency
  const sortedPatterns = Object.values(patterns)
    .sort((a, b) => b.count - a.count);

  // Find high-risk files
  const highRiskFiles = Object.values(fileErrors)
    .sort((a, b) => b.totalErrors - a.totalErrors)
    .slice(0, 10);

  // Calculate metrics
  const metrics = {
    totalErrors: errors.length,
    uniquePatterns: sortedPatterns.length,
    mostCommonPattern: sortedPatterns[0],
    highRiskFiles,
    peakErrorHours: Object.entries(timeDistribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: parseInt(hour), count })),
    autoFixSuccessRate: errors.filter(e => e.auto_fix_success).length /
                        Math.max(errors.filter(e => e.auto_fix_attempted).length, 1) * 100,
  };

  log(`\n📈 Analysis Summary:`, 'cyan');
  log(`  Total errors: ${metrics.totalErrors}`, 'blue');
  log(`  Unique patterns: ${metrics.uniquePatterns}`, 'blue');
  log(`  Auto-fix success rate: ${metrics.autoFixSuccessRate.toFixed(1)}%`, 'blue');
  log(`  Most common: "${metrics.mostCommonPattern.pattern.slice(0, 60)}..." (${metrics.mostCommonPattern.count} occurrences)`, 'yellow');

  log(`\n🔥 High-Risk Files:`, 'yellow');
  highRiskFiles.slice(0, 5).forEach((file, i) => {
    log(`  ${i + 1}. ${file.file} - ${file.totalErrors} errors (${file.criticalCount} critical)`, 'red');
  });

  log(`\n⏰ Peak Error Times:`, 'cyan');
  metrics.peakErrorHours.forEach(({ hour, count }) => {
    const time = `${hour.toString().padStart(2, '0')}:00`;
    log(`  ${time} - ${count} errors`, 'blue');
  });

  return {
    patterns: sortedPatterns,
    fileErrors: highRiskFiles,
    metrics,
    timeDistribution,
  };
}

/**
 * Predict likely future errors based on patterns
 */
async function predictFutureErrors(analysis) {
  log('\n🔮 Predicting likely future errors...', 'cyan');

  if (!analysis || !analysis.patterns) {
    log('  No analysis data available', 'yellow');
    return [];
  }

  const predictions = [];

  // Predict based on frequency and recency
  for (const pattern of analysis.patterns.slice(0, 20)) {
    const daysSinceLastSeen = (Date.now() - new Date(pattern.lastSeen).getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceFirstSeen = (Date.now() - new Date(pattern.firstSeen).getTime()) / (1000 * 60 * 60 * 24);

    // Calculate likelihood score
    let likelihood = 0;

    // Frequency factor (more common = more likely)
    likelihood += Math.min(pattern.count / 10, 5);

    // Recency factor (recent = more likely)
    if (daysSinceLastSeen < 7) {
      likelihood += 5;
    } else if (daysSinceLastSeen < 14) {
      likelihood += 3;
    } else if (daysSinceLastSeen < 30) {
      likelihood += 1;
    }

    // Persistence factor (long-standing issues are likely to continue)
    if (daysSinceFirstSeen > 14 && pattern.count > 5) {
      likelihood += 3;
    }

    // Auto-fix failure factor (hard to fix = likely to recur)
    if (pattern.autoFixFailed > pattern.autoFixSuccess) {
      likelihood += 2;
    }

    // Severity factor
    if (pattern.severity.CRITICAL > 0) {
      likelihood += 2;
    }

    const prediction = {
      pattern: pattern.pattern.slice(0, 100),
      errorType: pattern.errorType,
      likelihood: Math.min(likelihood, 10),
      frequency: pattern.count,
      lastSeen: pattern.lastSeen,
      affectedFiles: pattern.files,
      severity: Object.keys(pattern.severity).sort((a, b) =>
        pattern.severity[b] - pattern.severity[a]
      )[0],
      autoFixDifficulty: pattern.autoFixFailed > pattern.autoFixSuccess ? 'hard' : 'easy',
      recommendation: generateRecommendation(pattern),
    };

    predictions.push(prediction);
  }

  // Sort by likelihood
  predictions.sort((a, b) => b.likelihood - a.likelihood);

  log(`  Generated ${predictions.length} predictions`, 'green');

  // Display top predictions
  log(`\n🎯 Top 5 Predicted Errors:`, 'cyan');
  predictions.slice(0, 5).forEach((pred, i) => {
    const bar = '█'.repeat(pred.likelihood) + '░'.repeat(10 - pred.likelihood);
    log(`\n  ${i + 1}. ${pred.errorType} (${pred.severity})`, 'yellow');
    log(`     Likelihood: [${bar}] ${pred.likelihood}/10`, 'blue');
    log(`     Pattern: "${pred.pattern}"`, 'cyan');
    log(`     Frequency: ${pred.frequency} times`, 'blue');
    log(`     Files: ${pred.affectedFiles.slice(0, 2).join(', ')}`, 'blue');
    log(`     💡 ${pred.recommendation}`, 'green');
  });

  return predictions;
}

/**
 * Generate recommendation for error pattern
 */
function generateRecommendation(pattern) {
  if (pattern.isUndefinedError) {
    return 'Add null/undefined checks and default values';
  } else if (pattern.isTypeError) {
    return 'Add type validation and error boundaries';
  } else if (pattern.isReferenceError) {
    return 'Ensure all variables are defined before use';
  } else if (pattern.isNetworkError) {
    return 'Add retry logic and offline fallbacks';
  } else if (pattern.isStateError) {
    return 'Review state management and React hooks usage';
  } else if (pattern.autoFixFailed > pattern.autoFixSuccess) {
    return 'Manual review needed - auto-fix has failed before';
  } else {
    return 'Monitor pattern and consider proactive fix';
  }
}

/**
 * Save predictions to database
 */
async function savePredictions(predictions) {
  log('\n💾 Saving predictions to database...', 'cyan');

  const supabase = getSupabaseClient();

  // Clear old predictions
  await supabase
    .from('error_predictions')
    .delete()
    .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

  // Insert new predictions
  const { error } = await supabase
    .from('error_predictions')
    .insert(
      predictions.slice(0, 20).map(pred => ({
        pattern: pred.pattern,
        error_type: pred.errorType,
        likelihood_score: pred.likelihood,
        frequency: pred.frequency,
        last_seen: pred.lastSeen,
        affected_files: pred.affectedFiles,
        severity: pred.severity,
        auto_fix_difficulty: pred.autoFixDifficulty,
        recommendation: pred.recommendation,
        created_at: new Date().toISOString(),
      }))
    );

  if (error) {
    log(`  Warning: Could not save to database: ${error.message}`, 'yellow');
  } else {
    log(`  ✓ Saved ${predictions.slice(0, 20).length} predictions`, 'green');
  }
}

/**
 * Generate proactive fix suggestions
 */
async function generateProactiveSuggestions(predictions) {
  log('\n🛠️  Generating proactive fix suggestions...', 'cyan');

  const suggestions = [];

  for (const pred of predictions.slice(0, 5)) {
    if (pred.likelihood >= 7 && pred.affectedFiles.length > 0) {
      suggestions.push({
        priority: pred.likelihood >= 9 ? 'high' : 'medium',
        title: `Prevent ${pred.errorType} in ${pred.affectedFiles[0]}`,
        description: `This error has occurred ${pred.frequency} times. ${pred.recommendation}`,
        affectedFiles: pred.affectedFiles,
        pattern: pred.pattern,
        recommendation: pred.recommendation,
      });
    }
  }

  log(`  Generated ${suggestions.length} proactive suggestions`, 'green');

  if (suggestions.length > 0) {
    log(`\n💡 Proactive Suggestions:`, 'cyan');
    suggestions.forEach((sug, i) => {
      const priority = sug.priority === 'high' ? '🔴' : '🟡';
      log(`\n  ${i + 1}. ${priority} ${sug.title}`, 'yellow');
      log(`     ${sug.description}`, 'cyan');
      log(`     Files: ${sug.affectedFiles.join(', ')}`, 'blue');
    });
  }

  return suggestions;
}

/**
 * Main CLI
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'analyze': {
        const analysis = await analyzeErrorPatterns();
        if (analysis) {
          // Save analysis to file
          const outputPath = path.join(process.cwd(), '.error-analysis.json');
          await fs.writeFile(outputPath, JSON.stringify(analysis, null, 2), 'utf8');
          log(`\n✓ Analysis saved to ${outputPath}`, 'green');
        }
        break;
      }

      case 'predict': {
        // Load or generate analysis
        let analysis;
        try {
          const analysisPath = path.join(process.cwd(), '.error-analysis.json');
          const data = await fs.readFile(analysisPath, 'utf8');
          analysis = JSON.parse(data);
          log('Loaded existing analysis', 'green');
        } catch {
          log('No existing analysis found, generating new one...', 'yellow');
          analysis = await analyzeErrorPatterns();
        }

        const predictions = await predictFutureErrors(analysis);

        // Save predictions
        await savePredictions(predictions);

        // Generate suggestions
        await generateProactiveSuggestions(predictions);

        break;
      }

      case 'high-risk-files': {
        const analysis = await analyzeErrorPatterns();
        if (analysis) {
          log(`\n📁 High-Risk Files (need attention):`, 'cyan');
          analysis.fileErrors.forEach((file, i) => {
            log(`\n${i + 1}. ${file.file}`, 'yellow');
            log(`   Total errors: ${file.totalErrors}`, 'red');
            log(`   Critical: ${file.criticalCount}`, 'red');
            log(`   Error rate: ${file.errorRate}%`, 'blue');
            log(`   Unique patterns: ${file.patterns.length}`, 'blue');
          });
        }
        break;
      }

      default:
        console.log(`
Predictive Error Analyzer for Autonomous Healer

Usage:
  node scripts/predictive-analyzer.js analyze         # Analyze historical patterns
  node scripts/predictive-analyzer.js predict         # Predict future errors
  node scripts/predictive-analyzer.js high-risk-files # Show high-risk files

Features:
  - Analyzes error patterns from last 30 days
  - Groups similar errors into patterns
  - Predicts likelihood of future errors
  - Identifies high-risk files
  - Generates proactive fix suggestions
  - Tracks auto-fix success rates
        `);
        process.exit(0);
    }
  } catch (err) {
    log(`Error: ${err.message}`, 'red');
    console.error(err);
    process.exit(1);
  }
}

// Run
main();
