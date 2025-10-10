#!/usr/bin/env node
// scripts/generate-codebase-context.js
// Automatically generates comprehensive codebase context for autonomous healer AI
//
// Features:
// - Scans project directory structure
// - Extracts component dependencies and relationships
// - Analyzes state management patterns
// - Detects frequently modified files
// - Generates dependency graphs
// - Creates AI-friendly context map
//
// Usage:
//   node scripts/generate-codebase-context.js
//   (outputs to .codebase-map.json)

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Configuration
const PROJECT_ROOT = process.cwd();
const OUTPUT_FILE = path.join(PROJECT_ROOT, '.codebase-map.json');

// Directories to scan
const SCAN_DIRS = ['src', 'api'];

// File extensions to analyze
const CODE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];

/**
 * Recursively scan directory for code files
 */
async function scanDirectory(dir, baseDir = dir) {
  const files = [];

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);

      if (entry.isDirectory()) {
        // Skip common directories
        if (!['node_modules', 'dist', 'build', '.git', 'android', 'ios'].includes(entry.name)) {
          const subFiles = await scanDirectory(fullPath, baseDir);
          files.push(...subFiles);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (CODE_EXTENSIONS.includes(ext)) {
          files.push({
            path: relativePath,
            fullPath,
            name: entry.name,
            ext,
            dir: path.dirname(relativePath),
          });
        }
      }
    }
  } catch (err) {
    log(`Error scanning ${dir}: ${err.message}`, 'yellow');
  }

  return files;
}

/**
 * Extract imports from a file
 */
function extractImports(content) {
  const imports = [];

  // Match ES6 imports
  const importRegex = /import\s+(?:(?:\{[^}]*\}|[^{}\s,]+)\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    imports.push({
      source: match[1],
      isLocal: match[1].startsWith('.') || match[1].startsWith('/'),
    });
  }

  return imports;
}

/**
 * Extract exports from a file
 */
function extractExports(content) {
  const exports = [];

  // Match default exports
  const defaultExportRegex = /export\s+default\s+(function|class|const)?\s*(\w+)?/g;
  let match;

  while ((match = defaultExportRegex.exec(content)) !== null) {
    exports.push({
      name: match[2] || 'default',
      isDefault: true,
    });
  }

  // Match named exports
  const namedExportRegex = /export\s+(?:const|let|var|function|class)\s+(\w+)/g;
  while ((match = namedExportRegex.exec(content)) !== null) {
    exports.push({
      name: match[1],
      isDefault: false,
    });
  }

  // Match export { ... }
  const exportBlockRegex = /export\s+\{([^}]+)\}/g;
  while ((match = exportBlockRegex.exec(content)) !== null) {
    const names = match[1].split(',').map(s => s.trim()).filter(Boolean);
    names.forEach(name => {
      // Handle "as" renames
      const parts = name.split(/\s+as\s+/);
      exports.push({
        name: parts[parts.length - 1],
        isDefault: false,
      });
    });
  }

  return exports;
}

/**
 * Extract React hooks usage from a file
 */
function extractHooks(content) {
  const hooks = new Set();

  // Match hook calls (use* pattern)
  const hookRegex = /\b(use[A-Z][a-zA-Z0-9]*)\s*\(/g;
  let match;

  while ((match = hookRegex.exec(content)) !== null) {
    hooks.add(match[1]);
  }

  return Array.from(hooks);
}

/**
 * Extract component name from file
 */
function extractComponentName(content, fileName) {
  // Try to find export default function ComponentName
  let match = content.match(/export\s+default\s+function\s+(\w+)/);
  if (match) return match[1];

  // Try to find const ComponentName = () =>
  match = content.match(/(?:export\s+)?(?:default\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=]+)\s*=>/);
  if (match) return match[1];

  // Fallback to file name
  return path.basename(fileName, path.extname(fileName));
}

/**
 * Analyze a code file
 */
async function analyzeFile(file) {
  try {
    const content = await fs.readFile(file.fullPath, 'utf8');

    const imports = extractImports(content);
    const exports = extractExports(content);
    const hooks = extractHooks(content);
    const componentName = extractComponentName(content, file.name);

    // Detect if it's a component (has JSX)
    const isComponent = /import.*React/.test(content) || /<[A-Z]/.test(content);

    // Detect if it's a hook
    const isHook = file.name.startsWith('use') && hooks.length > 0;

    // Detect state management
    const hasState = hooks.includes('useState') || hooks.includes('useReducer');
    const hasContext = hooks.includes('useContext');
    const hasEffect = hooks.includes('useEffect');

    return {
      file: file.path,
      componentName,
      isComponent,
      isHook,
      imports,
      exports,
      hooks,
      state: {
        hasState,
        hasContext,
        hasEffect,
      },
      lines: content.split('\n').length,
    };
  } catch (err) {
    log(`Error analyzing ${file.path}: ${err.message}`, 'yellow');
    return null;
  }
}

/**
 * Build dependency graph from analyzed files
 */
function buildDependencyGraph(analyzedFiles) {
  const graph = {};

  for (const file of analyzedFiles) {
    if (!file) continue;

    const dependencies = file.imports
      .filter(imp => imp.isLocal)
      .map(imp => {
        // Resolve relative import to actual path
        const dir = path.dirname(file.file);
        let resolved = path.join(dir, imp.source);

        // Add extension if missing
        if (!CODE_EXTENSIONS.includes(path.extname(resolved))) {
          // Try .jsx first, then .js
          for (const ext of ['.jsx', '.js', '.tsx', '.ts']) {
            const testPath = `${resolved}${ext}`;
            const match = analyzedFiles.find(f => f.file === testPath);
            if (match) {
              resolved = testPath;
              break;
            }
          }
        }

        return path.normalize(resolved);
      });

    graph[file.file] = {
      component: file.componentName,
      dependencies,
      type: file.isComponent ? 'component' : file.isHook ? 'hook' : 'utility',
      hooks: file.hooks,
      hasState: file.state.hasState,
    };
  }

  return graph;
}

/**
 * Get frequently modified files from git history
 */
async function getFrequentlyModifiedFiles() {
  try {
    // Get files modified in last 30 days, sorted by modification count
    const { stdout } = await execAsync(
      `git log --since="30 days ago" --name-only --pretty=format: | grep -v '^$' | sort | uniq -c | sort -rn | head -20`
    );

    const files = stdout
      .split('\n')
      .map(line => {
        const match = line.trim().match(/^\s*(\d+)\s+(.+)$/);
        if (match) {
          return {
            path: match[2],
            modifications: parseInt(match[1]),
          };
        }
        return null;
      })
      .filter(Boolean)
      .filter(f => CODE_EXTENSIONS.includes(path.extname(f.path)));

    return files;
  } catch (err) {
    log(`Warning: Could not get git history: ${err.message}`, 'yellow');
    return [];
  }
}

/**
 * Categorize files by purpose
 */
function categorizeFiles(analyzedFiles) {
  const categories = {
    components: [],
    hooks: [],
    state: [],
    utilities: [],
    api: [],
  };

  for (const file of analyzedFiles) {
    if (!file) continue;

    if (file.file.startsWith('api/')) {
      categories.api.push(file.file);
    } else if (file.isComponent) {
      categories.components.push({
        path: file.file,
        name: file.componentName,
        hasState: file.state.hasState,
        hooks: file.hooks.length,
      });
    } else if (file.isHook) {
      categories.hooks.push({
        path: file.file,
        name: file.componentName,
        provides: file.exports.map(e => e.name),
      });
    } else if (file.file.includes('state/')) {
      categories.state.push({
        path: file.file,
        name: file.componentName,
      });
    } else {
      categories.utilities.push(file.file);
    }
  }

  return categories;
}

/**
 * Find commonly used patterns in code
 */
async function detectPatterns() {
  const patterns = {
    settingsAccess: [],
    modalState: [],
    adminSave: [],
  };

  try {
    // Search for useAdminSettings pattern
    const { stdout: settingsFiles } = await execAsync(
      `grep -r "useAdminSettings" src --include="*.js" --include="*.jsx" -l || true`
    );
    patterns.settingsAccess = settingsFiles.trim().split('\n').filter(Boolean);

    // Search for modal state patterns
    const { stdout: modalFiles } = await execAsync(
      `grep -r "Modal.*Open.*useState" src --include="*.js" --include="*.jsx" -l || true`
    );
    patterns.modalState = modalFiles.trim().split('\n').filter(Boolean);

  } catch (err) {
    log(`Warning: Pattern detection failed: ${err.message}`, 'yellow');
  }

  return patterns;
}

/**
 * Generate comprehensive codebase context
 */
async function generateCodebaseContext() {
  log('\n🔍 Scanning codebase...', 'cyan');

  // Scan all code files
  const allFiles = [];
  for (const dir of SCAN_DIRS) {
    const dirPath = path.join(PROJECT_ROOT, dir);
    log(`  Scanning ${dir}/...`, 'blue');
    const files = await scanDirectory(dirPath, PROJECT_ROOT);
    allFiles.push(...files);
  }

  log(`  Found ${allFiles.length} code files`, 'green');

  // Analyze files
  log('\n📊 Analyzing files...', 'cyan');
  const analyzedFiles = [];
  for (const file of allFiles) {
    const analysis = await analyzeFile(file);
    if (analysis) {
      analyzedFiles.push(analysis);
    }
  }

  log(`  Analyzed ${analyzedFiles.length} files`, 'green');

  // Build dependency graph
  log('\n🔗 Building dependency graph...', 'cyan');
  const dependencyGraph = buildDependencyGraph(analyzedFiles);
  log(`  Generated graph with ${Object.keys(dependencyGraph).length} nodes`, 'green');

  // Categorize files
  log('\n📁 Categorizing files...', 'cyan');
  const categories = categorizeFiles(analyzedFiles);
  log(`  Components: ${categories.components.length}`, 'blue');
  log(`  Hooks: ${categories.hooks.length}`, 'blue');
  log(`  State: ${categories.state.length}`, 'blue');
  log(`  Utilities: ${categories.utilities.length}`, 'blue');
  log(`  API: ${categories.api.length}`, 'blue');

  // Get frequently modified files
  log('\n📈 Analyzing git history...', 'cyan');
  const frequentFiles = await getFrequentlyModifiedFiles();
  log(`  Found ${frequentFiles.length} frequently modified files`, 'green');

  // Detect patterns
  log('\n🔍 Detecting code patterns...', 'cyan');
  const patterns = await detectPatterns();
  log(`  Settings access: ${patterns.settingsAccess.length} files`, 'blue');
  log(`  Modal patterns: ${patterns.modalState.length} files`, 'blue');

  // Read existing manual context for project overview
  let manualContext = {};
  try {
    const existing = await fs.readFile(OUTPUT_FILE, 'utf8');
    manualContext = JSON.parse(existing);
    log('\n✓ Loaded existing project overview', 'green');
  } catch (err) {
    log('\n⚠️  No existing context found, using defaults', 'yellow');
  }

  // Build comprehensive context
  const context = {
    project: manualContext.project || 'chi-pins',
    description: manualContext.description || 'Interactive kiosk application',
    architecture: manualContext.architecture || 'React SPA',

    // Preserve manual project overview
    project_overview: manualContext.project_overview || {
      purpose: "Digital interactive kiosk application",
      deployment: "Physical touchscreen kiosk",
      target_users: "Walk-up customers",
      key_features: [],
      business_context: "",
      technical_context: "",
    },

    // Auto-generated structure
    generated_at: new Date().toISOString(),
    total_files: analyzedFiles.length,
    total_components: categories.components.length,
    total_hooks: categories.hooks.length,

    // Key directories (auto-detected)
    key_directories: {
      'src/': 'Main application source code',
      'src/components/': `React components (${categories.components.length} components)`,
      'src/hooks/': `Custom React hooks (${categories.hooks.length} hooks)`,
      'src/state/': `Global state management (${categories.state.length} modules)`,
      'src/lib/': 'Utility libraries and helpers',
      'src/utils/': 'Helper functions and utilities',
      'api/': `Serverless API endpoints (${categories.api.length} endpoints)`,
      'scripts/': 'Build scripts and automation tools',
    },

    // State management (auto-detected)
    state_management: categories.state.reduce((acc, s) => {
      acc[s.path] = `State module: ${s.name}`;
      return acc;
    }, {}),

    // Core components (top 10 by dependencies)
    core_components: categories.components
      .slice(0, 10)
      .reduce((acc, c) => {
        acc[c.path] = `${c.name} (${c.hooks} hooks, ${c.hasState ? 'stateful' : 'stateless'})`;
        return acc;
      }, {}),

    // All components organized by directory
    components_by_directory: categories.components.reduce((acc, c) => {
      const dir = path.dirname(c.path);
      if (!acc[dir]) acc[dir] = [];
      acc[dir].push({
        name: c.name,
        path: c.path,
        hasState: c.hasState,
      });
      return acc;
    }, {}),

    // Hooks inventory
    custom_hooks: categories.hooks.map(h => ({
      name: h.name,
      path: h.path,
      exports: h.provides,
    })),

    // Dependency graph (top-level only, to keep file size reasonable)
    dependency_graph: Object.entries(dependencyGraph)
      .filter(([path]) => !path.includes('node_modules'))
      .reduce((acc, [path, data]) => {
        acc[path] = {
          component: data.component,
          type: data.type,
          dependencies: data.dependencies.length,
          has_state: data.hasState,
          uses_hooks: data.hooks,
        };
        return acc;
      }, {}),

    // Frequently modified files
    frequently_modified: frequentFiles.slice(0, 15).reduce((acc, f) => {
      acc[f.path] = `Modified ${f.modifications} times in last 30 days`;
      return acc;
    }, {}),

    // Preserve manual styling approach
    styling_approach: manualContext.styling_approach || {
      method: 'Inline styles (React style objects)',
      no_css_files: true,
      note: 'DO NOT create .css files - modify JSX components directly with style={{ }} attributes',
    },

    // Common patterns (detected + manual)
    common_patterns: {
      settings_access: 'const { settings: adminSettings } = useAdminSettings()',
      settings_files: patterns.settingsAccess.length,
      modal_state: 'useState hooks in App.jsx, passed as props',
      modal_files: patterns.modalState.length,
      admin_save: 'await saveAdminSettings(updatedSettings)',
    },

    // File path rules
    file_path_rules: manualContext.file_path_rules || {
      use_relative_paths: 'Always use paths relative to project root, never absolute system paths',
      component_paths: 'src/components/ComponentName.jsx',
      hook_paths: 'src/hooks/useHookName.js',
      state_paths: 'src/state/useStateName.js',
      lib_paths: 'src/lib/libraryName.js',
    },

    // Statistics for AI context
    statistics: {
      total_lines: analyzedFiles.reduce((sum, f) => sum + (f?.lines || 0), 0),
      avg_component_size: Math.round(
        categories.components.reduce((sum, c) => {
          const file = analyzedFiles.find(f => f.file === c.path);
          return sum + (file?.lines || 0);
        }, 0) / categories.components.length
      ),
      components_with_state: categories.components.filter(c => c.hasState).length,
      most_used_hooks: Object.entries(
        analyzedFiles
          .flatMap(f => f?.hooks || [])
          .reduce((acc, hook) => {
            acc[hook] = (acc[hook] || 0) + 1;
            return acc;
          }, {})
      )
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .reduce((acc, [hook, count]) => {
          acc[hook] = count;
          return acc;
        }, {}),
    },
  };

  return context;
}

/**
 * Main execution
 */
async function main() {
  try {
    log('╔═══════════════════════════════════════════════════════════╗', 'cyan');
    log('║         Codebase Context Generator for AI Healer         ║', 'cyan');
    log('╚═══════════════════════════════════════════════════════════╝', 'cyan');

    const context = await generateCodebaseContext();

    // Write to file
    log('\n💾 Writing context to file...', 'cyan');
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(context, null, 2), 'utf8');
    log(`  ✓ Saved to ${path.relative(PROJECT_ROOT, OUTPUT_FILE)}`, 'green');

    // Display summary
    log('\n📊 Generation Summary:', 'cyan');
    log(`  Total files analyzed: ${context.total_files}`, 'blue');
    log(`  Total components: ${context.total_components}`, 'blue');
    log(`  Total hooks: ${context.total_hooks}`, 'blue');
    log(`  Total lines of code: ${context.statistics.total_lines.toLocaleString()}`, 'blue');
    log(`  Average component size: ${context.statistics.avg_component_size} lines`, 'blue');
    log(`  Components with state: ${context.statistics.components_with_state}`, 'blue');

    log('\n✅ Codebase context generated successfully!', 'green');
    log('   The autonomous healer will use this for better code understanding.\n', 'green');

  } catch (err) {
    log(`\n❌ Error: ${err.message}`, 'red');
    console.error(err);
    process.exit(1);
  }
}

// Run
main();
