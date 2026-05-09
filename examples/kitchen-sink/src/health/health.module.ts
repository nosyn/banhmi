import {
  HealthModule as BanhmiHealthModule,
  memoryIndicator,
} from '@banhmi/health'

/**
 * Wires the `/api/health` endpoint with a memory indicator.
 *
 * Alerts if heap usage exceeds 512 MB.
 */
export const HealthModule = BanhmiHealthModule.forRoot({
  path: '/api/health',
  indicators: {
    memory: memoryIndicator({ heapUsedThresholdMb: 512 }),
  },
})
