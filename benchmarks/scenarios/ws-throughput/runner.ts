/**
 * Scenario: ws-throughput
 *
 * Open 1 000 concurrent WebSocket clients, send 100 msg/s each, measure
 * total messages/s throughput and drop rate.
 *
 * NOTE: Results for this scenario are PENDING — requires each competitor to
 * expose a /ws endpoint, which is not yet part of the base competitor harness.
 * Scaffolded here for Wave 12 implementation.
 */

export type WsThroughputResult = {
  /** Total messages received across all clients. */
  totalReceived: number
  /** Total messages sent across all clients. */
  totalSent: number
  /** Messages per second received. */
  messagesPerSec: number
  /** Percentage of messages dropped (sent - received) / sent * 100. */
  dropRatePct: number
  /** Duration of the test in seconds. */
  durationSeconds: number
  /** Note when scenario is pending. */
  note?: string
}

/** Scenario metadata for the orchestrator. */
export const scenario = {
  method: 'GET' as const,
  path: '/ws',
  special: 'websocket' as const,
}

/**
 * Run the WS throughput scenario against a single competitor.
 *
 * @param baseUrl - Base URL of the competitor (e.g. http://localhost:3001)
 * @param clients - Number of concurrent WS clients (default 1000)
 * @param msgsPerSecPerClient - Messages per second per client (default 100)
 * @param durationSeconds - Test duration (default 10)
 */
export async function runWsThroughput(
  _baseUrl: string,
  _clients = 1000,
  _msgsPerSecPerClient = 100,
  _durationSeconds = 10,
): Promise<WsThroughputResult> {
  // TODO(Wave 12): implement full WS throughput runner
  return {
    dropRatePct: 0,
    durationSeconds: 0,
    messagesPerSec: 0,
    note: 'scaffolded — results pending Wave 12',
    totalReceived: 0,
    totalSent: 0,
  }
}
