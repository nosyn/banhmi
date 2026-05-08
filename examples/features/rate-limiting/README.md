# @banhmi/throttler — rate limiting example

Demonstrates `GET /` rate-limited at 5 requests per 10-second window. The
test fires 6 requests in sequence and expects the 6th to return 429.

## Run

```bash
bun test examples/features/rate-limiting
```
