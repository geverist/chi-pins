// vite-plugin-strip-console.js
// Strips console.log statements from production builds for better performance
// Keeps console.error and console.warn for debugging critical issues

export default function stripConsolePlugin() {
  return {
    name: 'strip-console',
    enforce: 'post',
    apply: 'build', // Only apply during build, not dev

    transform(code, id) {
      // Only process JS/JSX files
      if (!/\.[jt]sx?$/.test(id)) return null;

      // Don't process node_modules
      if (id.includes('node_modules')) return null;

      // Strip console.log and console.info, keep error/warn for debugging
      const strippedCode = code
        .replace(/console\.log\([^)]*\);?/g, '/* console.log removed */;')
        .replace(/console\.info\([^)]*\);?/g, '/* console.info removed */;');

      // Only return if changes were made
      if (strippedCode !== code) {
        return {
          code: strippedCode,
          map: null // Could generate source maps if needed
        };
      }

      return null;
    }
  };
}
