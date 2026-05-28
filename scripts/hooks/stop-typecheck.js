#!/usr/bin/env node
/**
 * stop-typecheck.js
 * Stop hook — runs tsc --noEmit on frontend if any .ts/.tsx files were edited,
 * then clears the accumulation list.
 *
 * Non-blocking: outputs findings but exits 0 so the Stop event is not blocked.
 * Outputs [REQUIRED ACTION] when errors are found so Claude invokes typescript-reviewer.
 */

'use strict'

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ACCUM_FILE = path.join(process.cwd(), '.claude', '.ts-edited-files')
const FRONTEND_DIR = path.join(process.cwd(), 'src', 'neuroedge_web_portal', 'frontend')

let input = ''
process.stdin.on('data', d => (input += d))
process.stdin.on('end', () => {
  // Pass through the stop event unchanged
  process.stdout.write(input)

  if (!fs.existsSync(ACCUM_FILE)) process.exit(0)

  const edited = fs.readFileSync(ACCUM_FILE, 'utf8').split('\n').filter(Boolean)
  fs.writeFileSync(ACCUM_FILE, '') // clear for next session

  if (edited.length === 0) process.exit(0)

  const tsconfig = path.join(FRONTEND_DIR, 'tsconfig.json')
  if (!fs.existsSync(tsconfig)) {
    process.stderr.write(`[typecheck] No tsconfig at ${tsconfig} — skipping\n`)
    process.exit(0)
  }

  process.stderr.write(`[typecheck] Running tsc --noEmit on frontend (${edited.length} files edited)...\n`)

  // Use the project-local tsc binary — only runs after npm install
  const localTsc = path.join(FRONTEND_DIR, 'node_modules', '.bin', 'tsc')
  if (!fs.existsSync(localTsc)) {
    process.stderr.write('[typecheck] TypeScript not installed yet — run: cd src/neuroedge_web_portal/frontend && npm install\n')
    process.exit(0)
  }

  try {
    execSync(`"${localTsc}" --noEmit -p "${tsconfig}"`, {
      cwd: FRONTEND_DIR,
      stdio: 'pipe',
      timeout: 60000,
    })
    process.stderr.write('[typecheck] TypeScript: no errors\n')
  } catch (err) {
    const out = (err.stdout || '').toString().trim()
    const errout = (err.stderr || '').toString().trim()
    const combined = [out, errout].filter(Boolean).join('\n')
    if (combined) {
      process.stderr.write(`[typecheck] TypeScript errors found:\n${combined}\n`)
      process.stderr.write('[REQUIRED ACTION] TypeScript errors were found in files you edited this session. You MUST now use the typescript-reviewer agent to fix them before this response ends. This is mandatory, not optional.\n')
    }
  }

  process.exit(0)
})
