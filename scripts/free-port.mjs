#!/usr/bin/env node
/**
 * Frees a TCP port before `next dev` starts, so a leftover dev server never
 * causes EADDRINUSE again. Runs as the `predev` npm hook. Cross-platform and
 * dependency-free; a no-op (exit 0) when nothing is listening on the port.
 *
 *   node scripts/free-port.mjs [port=4000]
 */
import { execSync } from 'node:child_process'

const port = Number(process.argv[2] || 4000)
const isWin = process.platform === 'win32'

/** Collect PIDs listening on `port`, swallowing "nothing found" errors. */
function pidsOnPort() {
  const pids = new Set()
  try {
    if (isWin) {
      // netstat lines: "  TCP    0.0.0.0:4000   0.0.0.0:0   LISTENING   12345"
      const out = execSync(`netstat -ano -p tcp`, { encoding: 'utf8' })
      for (const line of out.split(/\r?\n/)) {
        if (!/LISTENING/i.test(line)) continue
        const parts = line.trim().split(/\s+/) // [TCP, local, remote, LISTENING, PID]
        const local = parts[1] || ''
        if (!new RegExp(`[:.]${port}$`).test(local)) continue
        const pid = parts[parts.length - 1]
        if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid)
      }
    } else {
      const out = execSync(`lsof -ti tcp:${port} -sTCP:LISTEN`, { encoding: 'utf8' })
      for (const pid of out.split(/\s+/)) if (/^\d+$/.test(pid)) pids.add(pid)
    }
  } catch {
    // No matching process / tool returned non-zero — treat as "port is free".
  }
  return [...pids]
}

const pids = pidsOnPort()
if (pids.length === 0) {
  process.exit(0)
}

for (const pid of pids) {
  try {
    if (isWin) execSync(`taskkill /PID ${pid} /F /T`, { stdio: 'ignore' })
    else execSync(`kill -9 ${pid}`, { stdio: 'ignore' })
    console.log(`[free-port] freed port ${port} (killed PID ${pid})`)
  } catch {
    console.warn(`[free-port] could not kill PID ${pid} on port ${port} — continuing`)
  }
}
