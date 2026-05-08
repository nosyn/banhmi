# @banhmi/scheduling

Part of the [Banhmi](https://banhmi.dev) framework.

## Perf budget

Targets are aspirational for Wave 10. Wave 11 will measure and adjust based on
real benchmark data. All measurements are taken on a modern laptop (M-series or
equivalent) with Bun 1.x unless noted.

| Metric | Target |
|---|---|
| Cold start (first request after process boot) | <50 ms |
| RSS at idle (after warm-up, no active requests) | <80 MB |
| p99 latency (representative endpoint) | <5 ms |

> These numbers represent the ceiling, not the floor. Contributions that
> regress any metric by more than 10% require a justification comment in the PR.
