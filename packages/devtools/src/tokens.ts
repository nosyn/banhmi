import { Token } from '@banhmi/common'
import type { ProfileRecorder } from './profile/recorder'
import type { DevtoolsOptions } from './types'

/**
 * DI token for the resolved {@link DevtoolsOptions}.
 *
 * @example
 * static inject = [DEVTOOLS_OPTIONS] as const
 */
export const DEVTOOLS_OPTIONS = Token<DevtoolsOptions>('DEVTOOLS_OPTIONS')

/**
 * DI token for the shared {@link ProfileRecorder} ring-buffer.
 *
 * @example
 * static inject = [PROFILE_RECORDER] as const
 */
export const PROFILE_RECORDER = Token<ProfileRecorder>('PROFILE_RECORDER')
