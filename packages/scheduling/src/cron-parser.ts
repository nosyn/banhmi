import type { ParsedCron } from './types'

/**
 * Expand a single cron field token into a `Set<number>`.
 *
 * Supports:
 * - `*`               → all values in [min, max]
 * - `* /n`            → every nth value starting from min (step over full range)
 * - `a-b`             → range [a, b] inclusive
 * - `a-b/n`           → range [a, b] step n
 * - `a`               → single value
 * - Comma-separated combinations of the above
 */
function expandField(
  token: string,
  min: number,
  max: number,
  name: string,
): Set<number> {
  const result = new Set<number>()

  for (const part of token.split(',')) {
    if (part.includes('/')) {
      const [rangeStr, stepStr] = part.split('/', 2) as [string, string]
      const step = Number.parseInt(stepStr, 10)
      if (Number.isNaN(step) || step < 1) {
        throw new Error(`Invalid step in ${name}: '${part}'`)
      }
      if (rangeStr === '*') {
        for (let v = min; v <= max; v += step) result.add(v)
      } else if (rangeStr.includes('-')) {
        const [aStr, bStr] = rangeStr.split('-', 2) as [string, string]
        const a = Number.parseInt(aStr, 10)
        const b = Number.parseInt(bStr, 10)
        if (Number.isNaN(a) || Number.isNaN(b) || a < min || b > max || a > b) {
          throw new Error(`Invalid range in ${name}: '${part}'`)
        }
        for (let v = a; v <= b; v += step) result.add(v)
      } else {
        const a = Number.parseInt(rangeStr, 10)
        if (Number.isNaN(a) || a < min || a > max) {
          throw new Error(`Invalid value in ${name}: '${part}'`)
        }
        for (let v = a; v <= max; v += step) result.add(v)
      }
    } else if (part === '*') {
      for (let v = min; v <= max; v++) result.add(v)
    } else if (part.includes('-')) {
      const [aStr, bStr] = part.split('-', 2) as [string, string]
      const a = Number.parseInt(aStr, 10)
      const b = Number.parseInt(bStr, 10)
      if (Number.isNaN(a) || Number.isNaN(b) || a < min || b > max || a > b) {
        throw new Error(`Invalid range in ${name}: '${part}'`)
      }
      for (let v = a; v <= b; v++) result.add(v)
    } else {
      const v = Number.parseInt(part, 10)
      if (Number.isNaN(v) || v < min || v > max) {
        throw new Error(
          `Value ${part} out of range [${min}-${max}] for ${name}`,
        )
      }
      result.add(v)
    }
  }

  return result
}

/**
 * Parse a standard 5-field cron expression into a {@link ParsedCron} object.
 *
 * Fields (left to right): `minute hour day-of-month month day-of-week`.
 *
 * Supported syntax per field:
 * - `*` — every value
 * - `n` — single value
 * - `a-b` — inclusive range
 * - `* /n` or `a-b/n` — step (spaces removed in comment for formatting)
 * - Comma-separated combinations
 *
 * **Note on day-of-month vs day-of-week:** when both `dom` and `dow` are
 * explicit (not `*`), this implementation uses the _intersection_ semantics
 * (a job fires only when both match). Standard cron uses OR semantics for
 * this case. OR semantics are deferred to a future release.
 *
 * @param expression - A 5-field cron string (e.g. `'0 12 * * *'`).
 * @returns A {@link ParsedCron} with one `Set<number>` per field.
 * @throws If the expression is malformed or any value is out of range.
 *
 * @example
 * const p = parseCron('* /15 * * * *')
 * p.minute // Set { 0, 15, 30, 45 }
 *
 * @example
 * const p = parseCron('0 0 * * *')
 * p.minute  // Set { 0 }
 * p.hour    // Set { 0 }
 */
export function parseCron(expression: string): ParsedCron {
  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 5) {
    throw new Error(
      `Invalid cron expression: expected 5 fields, got ${parts.length} — '${expression}'`,
    )
  }

  const [minuteStr, hourStr, domStr, monthStr, dowStr] = parts as [
    string,
    string,
    string,
    string,
    string,
  ]

  return {
    minute: expandField(minuteStr, 0, 59, 'minute'),
    hour: expandField(hourStr, 0, 23, 'hour'),
    dom: expandField(domStr, 1, 31, 'day-of-month'),
    month: expandField(monthStr, 1, 12, 'month'),
    dow: expandField(dowStr, 0, 6, 'day-of-week'),
  }
}

/**
 * Compute the next firing time for a parsed cron expression.
 *
 * Advances from `after` minute-by-minute (up to 366 days) and returns the
 * first `Date` at which all five fields match.
 *
 * Month values in {@link ParsedCron} use the range 1–12 (human-friendly),
 * whereas JavaScript's `Date.getMonth()` returns 0–11. This function
 * handles the conversion internally.
 *
 * @param parsed - The result of {@link parseCron}.
 * @param after - Start searching strictly after this moment.
 * @returns The next `Date` matching the expression.
 * @throws If no matching time is found within 366 days (should not happen for
 *   a valid expression).
 *
 * @example
 * const midnight = nextCronTime(parseCron('0 0 * * *'), new Date())
 */
export function nextCronTime(parsed: ParsedCron, after: Date): Date {
  // Start from the next minute after `after`
  const candidate = new Date(after)
  candidate.setSeconds(0, 0)
  candidate.setMinutes(candidate.getMinutes() + 1)

  const limit = new Date(after.getTime() + 366 * 24 * 60 * 60 * 1000)

  while (candidate < limit) {
    const min = candidate.getMinutes()
    const hour = candidate.getHours()
    const dom = candidate.getDate()
    const month = candidate.getMonth() + 1 // convert 0-indexed → 1-indexed
    const dow = candidate.getDay()

    if (
      parsed.minute.has(min) &&
      parsed.hour.has(hour) &&
      parsed.dom.has(dom) &&
      parsed.month.has(month) &&
      parsed.dow.has(dow)
    ) {
      return new Date(candidate)
    }

    candidate.setMinutes(candidate.getMinutes() + 1)
  }

  throw new Error(`No next cron time found within 366 days for expression`)
}
