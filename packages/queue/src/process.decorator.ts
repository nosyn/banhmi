import type { ProcessHandlerEntry } from './metadata'
import { PROCESS_METADATA } from './metadata'

/**
 * Method decorator that registers the decorated method as a handler for jobs
 * with the given name. When called without arguments (or with `undefined`),
 * the method acts as a catch-all for any job not matched by a named handler.
 *
 * Must be used inside a `@Processor`-decorated class.
 *
 * @param jobName - The job name to handle, or `undefined` for a catch-all.
 *
 * @example
 * \@Processor('emails')
 * class EmailProcessor {
 *   // handles 'send' jobs
 *   \@Process('send')
 *   async send(ctx: ProcessorContext<{ to: string }>) {}
 *
 *   // catch-all for any other job name
 *   \@Process()
 *   async fallback(ctx: ProcessorContext) {}
 * }
 */
export function Process(jobName?: string) {
  return (_target: unknown, context: ClassMethodDecoratorContext): void => {
    const methodName = context.name as string
    const existing =
      (context.metadata[PROCESS_METADATA] as
        | ProcessHandlerEntry[]
        | undefined) ?? []
    context.metadata[PROCESS_METADATA] = [...existing, { methodName, jobName }]
  }
}
