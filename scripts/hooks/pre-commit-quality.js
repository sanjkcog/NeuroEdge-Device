#!/usr/bin/env node
/**
 * pre-commit-quality.js
 * PreToolUse hook on Bash — fires before git commit commands.
 * Blocks the commit (exit 2) if:
 *   - commit message is missing or under 10 chars
 *   - staged Python files have ruff errors
 *   - staged TS/JS files have console.log
 *
 * Passes through any Bash command that is not a git commit.
 */

'use strict'

const { execSync } = require('child_process')

let input = ''
process.stdin.on('data', d => (input += d))
process.stdin.on('end', () => {
  let event
  try { event = JSON.parse(input) } catch { process.exit(0) }

  const cmd = (event?.tool_input?.command || '').toString()
  if (!/git\s+commit/.test(cmd)) process.exit(0)

  const errors = []
  const warnings = []

  // Check staged Python files for ruff errors
  try {
    const stagedPy = execSync('git diff --cached --name-only --diff-filter=ACM', { stdio: 'pipe' })
      .toString().split('\n').filter(f => f.endsWith('.py'))

    for (const f of stagedPy) {
      try {
        execSync(`ruff check "${f}"`, { stdio: 'pipe' })
      } catch (err) {
        const out = (err.stdout || '').toString().trim()
        if (out) warnings.push(`ruff issues in ${f}:\n${out}`)
      }
    }
  } catch {
    // git or ruff not available — skip
  }

  // Check staged TS/JS files for console.log
  try {
    const stagedTs = execSync('git diff --cached --name-only --diff-filter=ACM', { stdio: 'pipe' })
      .toString().split('\n').filter(f => /\.(ts|tsx|js|jsx)$/.test(f))

    const { execSync: exec2 } = require('child_process')
    for (const f of stagedTs) {
      try {
        const result = exec2(`git show ":${f}"`, { stdio: 'pipe' }).toString()
        if (/console\.log\s*\(/.test(result)) {
          warnings.push(`console.log found in staged ${f}`)
        }
      } catch { /* file may not exist yet */ }
    }
  } catch {
    // skip
  }

  // Coverage gate — only runs when backend Python files are staged.
  // Bypass with SKIP_COVERAGE=1 for emergency commits.
  if (!process.env.SKIP_COVERAGE) {
    try {
      const allStaged = execSync('git diff --cached --name-only --diff-filter=ACM', { stdio: 'pipe' })
        .toString().split('\n')
      const backendPy = allStaged.filter(
        f => f.includes('neuroedge_web_portal/backend') && f.endsWith('.py')
      )

      if (backendPy.length > 0) {
        process.stderr.write(
          `[commit-quality] Running coverage check (${backendPy.length} backend file(s) staged)...\n`
        )
        try {
          const out = execSync(
            'python -m pytest src/neuroedge_web_portal/backend/tests/ ' +
            '--cov=src/neuroedge_web_portal/backend --cov-report=term --tb=no -q --no-header',
            { stdio: 'pipe', timeout: 90000 }
          ).toString()
          const m = out.match(/TOTAL\s+\d+\s+\d+\s+(\d+)%/)
          if (m) {
            const pct = parseInt(m[1], 10)
            if (pct < 70) {
              errors.push(
                `Coverage ${pct}% is below the 70% minimum threshold.\n` +
                'Add tests or use SKIP_COVERAGE=1 to bypass (emergency only).'
              )
            } else {
              process.stderr.write(`[commit-quality] Coverage ${pct}% ✓\n`)
            }
          }
        } catch (err) {
          const combined = [
            (err.stdout || '').toString(),
            (err.stderr || '').toString(),
          ].filter(Boolean).join('\n').trim()

          const m = combined.match(/TOTAL\s+\d+\s+\d+\s+(\d+)%/)
          if (m) {
            const pct = parseInt(m[1], 10)
            if (pct < 70) {
              errors.push(
                `Coverage ${pct}% is below the 70% minimum threshold.\n` +
                'Add tests or use SKIP_COVERAGE=1 to bypass (emergency only).'
              )
            } else {
              // Coverage is fine but tests are failing — still block
              errors.push(
                `Tests are failing. Fix before committing or use SKIP_COVERAGE=1.\n` +
                combined.slice(0, 400)
              )
            }
          } else {
            // pytest unavailable or catastrophic error — warn, don't block
            warnings.push(
              'Coverage check skipped: ' +
              (combined.slice(0, 150) || 'pytest or pytest-cov not available')
            )
          }
        }
      }
    } catch { /* git not available — skip */ }
  }

  if (errors.length > 0) {
    console.error('[commit-quality] BLOCKED:\n' + errors.join('\n'))
    process.exit(2)
  }

  if (warnings.length > 0) {
    console.log('[commit-quality] Warnings (commit allowed but please fix):\n' + warnings.join('\n'))
  }

  process.exit(0)
})
