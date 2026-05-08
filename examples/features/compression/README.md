# compression example

Demonstrates `@banhmi/compression`: registers `CompressionModule.forRoot()` and a controller returning a 2 KB JSON payload. Clients that send `Accept-Encoding: gzip` receive a gzip-compressed response.

## Run

```bash
bun run index.ts   # (or bun test feature.test.ts)
```
