/**
 * Shared build script for all @banhmi/* packages.
 *
 * Reads the target package's package.json, collects all dependency and
 * peerDependency names, then runs `Bun.build` with every dep externalised so
 * optional-peer try/catch blocks (mongodb, postgres, etc.) do not cause
 * resolution errors at bundle time.
 *
 * Usage:
 *   bun run ../../scripts/build-package.ts .
 *   bun run ../../scripts/build-package.ts /absolute/path/to/package
 */

import { resolve } from 'node:path'

const pkgDir = resolve(process.argv[2] ?? '.')
const pkg = await Bun.file(`${pkgDir}/package.json`).json()

// Collect all declared deps + peer deps from this package's package.json
const declaredExternals: string[] = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
]

// Well-known optional peers used across the monorepo that may not appear in
// every package.json but can still be require()'d inside lazy-load blocks.
const commonOptionalPeers: string[] = [
  // databases / ORMs
  'mongodb',
  'postgres',
  'drizzle-orm',
  'drizzle-kit',
  // redis / messaging
  'ioredis',
  'nats',
  'mqtt',
  'amqplib',
  'kafkajs',
  // gRPC
  '@grpc/grpc-js',
  // observability
  '@sentry/node',
  '@opentelemetry/sdk-node',
  '@opentelemetry/api',
  // email / templating
  'nodemailer',
  'eta',
  'edge.js',
  // GraphQL
  'graphql',
  'graphql-yoga',
  '@apollo/subgraph',
  // Bun built-ins (never bundle these)
  'bun',
  'bun:test',
  'bun:sqlite',
  'bun:ffi',
  'bun:dns',
  // Node built-ins (pass through)
  'node:path',
  'node:fs',
  'node:os',
  'node:stream',
  'node:crypto',
  'node:http',
  'node:https',
  'node:net',
  'node:tls',
  'node:events',
  'node:util',
  'node:buffer',
  'node:url',
  'node:querystring',
  'node:zlib',
  'node:child_process',
  'node:worker_threads',
  'node:perf_hooks',
  'node:async_hooks',
  'node:assert',
  'node:string_decoder',
  'node:timers',
  'node:vm',
]

// Deduplicate
const externals = [...new Set([...declaredExternals, ...commonOptionalPeers])]

const result = await Bun.build({
  entrypoints: [`${pkgDir}/src/index.ts`],
  outdir: `${pkgDir}/dist`,
  target: 'bun',
  external: externals,
  splitting: false,
})

if (!result.success) {
  for (const log of result.logs) console.error(log)
  process.exit(1)
}

console.log(
  `built ${pkg.name} → ${pkgDir}/dist (${result.outputs.length} file(s))`,
)
