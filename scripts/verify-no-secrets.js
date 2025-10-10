#!/usr/bin/env node

/**
 * Verification script to ensure no secrets are committed to git
 * Run before committing: node scripts/verify-no-secrets.js
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const DANGEROUS_PATTERNS = [
  /sk-proj-[a-zA-Z0-9]{20,}/,  // OpenAI keys
  /sk-ant-api\d+-[a-zA-Z0-9_-]{20,}/, // Anthropic keys
  /sk_[a-f0-9]{32,}/, // ElevenLabs keys
  /ghp_[a-zA-Z0-9]{36}/, // GitHub personal access tokens
  /eyJhbGciOi[a-zA-Z0-9_-]+/, // JWT tokens (Supabase service role)
];

function checkFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const issues = [];

    DANGEROUS_PATTERNS.forEach((pattern, index) => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          pattern: pattern.toString(),
          match: matches[0].substring(0, 20) + '...',
          file: filePath
        });
      }
    });

    return issues;
  } catch (e) {
    // File doesn't exist or can't be read
    return [];
  }
}

function main() {
  console.log('🔍 Checking for exposed secrets...\n');

  // Get list of files staged for commit
  let stagedFiles;
  try {
    stagedFiles = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch (e) {
    // No staged files
    stagedFiles = [];
  }

  // Also check .env files (even if not staged)
  const filesToCheck = [
    ...stagedFiles,
    '.env',
    '.env.local',
    '.env.production',
    '.env.demo'
  ];

  let foundIssues = false;

  filesToCheck.forEach(file => {
    const issues = checkFile(file);
    if (issues.length > 0) {
      foundIssues = true;
      console.error(`❌ SECURITY ISSUE in ${file}:`);
      issues.forEach(issue => {
        console.error(`   - Found secret pattern: ${issue.match}`);
      });
      console.error('');
    }
  });

  if (foundIssues) {
    console.error('🚨 SECRETS DETECTED! DO NOT COMMIT!');
    console.error('');
    console.error('Action required:');
    console.error('1. Remove secrets from files');
    console.error('2. Add secrets to Vercel Environment Variables');
    console.error('3. Use .env.template as reference');
    console.error('');
    process.exit(1);
  }

  console.log('✅ No secrets detected in staged files');
  console.log('');
}

main();
