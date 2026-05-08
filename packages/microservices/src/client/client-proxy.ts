import { Module } from '@banhmi/common'
import type { ClientOptions, MicroserviceResponse, Transport } from '../types'

/**
 * Proxy that forwards outgoing requests and events through a configured
 * {@link Transport}.
 *
 * Obtain an instance by injecting the token registered via
 * `ClientsModule.register()`.
 *
 * @example
 * // Register in a module:
 * \@Module({ imports: [ClientsModule.register([{ name: 'CATS', transport: tcpTransport({ port: 3001 }) }])] })
 * class AppModule {}
 *
 * // Inject and use:
 * \@Injectable()
 * class AppService {
 *   static inject = [CATS_TOKEN] as const
 *   constructor(private cats: ClientProxy) {}
 *
 *   getCat(id: string) {
 *     return this.cats.send<{ id: string; name: string }>('cats.findOne', id)
 *   }
 * }
 */
export class ClientProxy {
  constructor(private readonly transport: Transport) {}

  /**
   * Send a request message and return the handler's response.
   *
   * Rejects if the response contains an `error` field or if the transport
   * throws.
   *
   * @param pattern - The message pattern.
   * @param data - The payload.
   * @param timeoutMs - Optional timeout in milliseconds (default: 30 000).
   * @returns The `data` field from the response envelope.
   *
   * @example
   * const cat = await client.send<Cat>('cats.findOne', '1')
   */
  async send<TResult = unknown>(
    pattern: string,
    data: unknown,
    timeoutMs = 30_000,
  ): Promise<TResult> {
    const racePromise: Promise<MicroserviceResponse<TResult>> =
      this.transport.send<TResult>(pattern, data)

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeoutHandle = setTimeout(
        () =>
          reject(
            new Error(
              `ClientProxy.send timed out after ${timeoutMs}ms for pattern "${pattern}"`,
            ),
          ),
        timeoutMs,
      )
    })

    try {
      const response = await Promise.race([racePromise, timeoutPromise])
      if (response.error) {
        throw Object.assign(new Error(response.error.message), {
          status: response.error.status,
          code: response.error.code,
        })
      }
      return response.data as TResult
    } finally {
      clearTimeout(timeoutHandle)
    }
  }

  /**
   * Emit a fire-and-forget event with no response expected.
   *
   * @param pattern - The event pattern.
   * @param data - The payload.
   *
   * @example
   * await client.emit('user.created', { id: '1', email: 'a@b.com' })
   */
  async emit(pattern: string, data: unknown): Promise<void> {
    await this.transport.emit(pattern, data)
  }

  /**
   * Close the underlying transport connection.
   *
   * @example
   * await client.close()
   */
  async close(): Promise<void> {
    await this.transport.close()
  }
}

/**
 * Dynamic module that registers one or more named `ClientProxy` instances in
 * the DI container.
 *
 * @example
 * \@Module({
 *   imports: [
 *     ClientsModule.register([
 *       { name: 'CATS_SERVICE', transport: tcpTransport({ host: 'localhost', port: 3001 }) },
 *     ]),
 *   ],
 * })
 * class AppModule {}
 */
// biome-ignore lint/complexity/noStaticOnlyClass: intentional NestJS-style dynamic module
export class ClientsModule {
  /**
   * Register named `ClientProxy` providers.
   *
   * Each entry produces a provider whose token is a `Symbol` keyed by the
   * supplied `name`.  Retrieve it by storing the token in a constant and
   * using `static inject`.
   *
   * @param clients - Array of {@link ClientOptions} descriptors.
   *
   * @example
   * export const CATS_TOKEN = Symbol('CATS_SERVICE')
   *
   * ClientsModule.register([{ name: 'CATS_SERVICE', transport: tcpTransport({ port: 3001 }) }])
   */
  static register(clients: ClientOptions[]) {
    const tokens = clients.map((c) => ({
      token: Symbol(c.name),
      transport: c.transport,
      name: c.name,
    }))

    @Module({
      providers: tokens.map(({ token, transport }) => ({
        provide: token,
        useFactory: () => new ClientProxy(transport),
      })),
      exports: tokens.map(({ token }) => token),
    })
    class ClientsRootModule {}

    return {
      module: ClientsRootModule,
      tokens: Object.fromEntries(
        tokens.map(({ name, token }) => [name, token]),
      ),
    }
  }
}
