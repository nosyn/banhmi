# @banhmi/security — CsrfModule example

Demonstrates the double-submit cookie CSRF protection pattern. A `GET /`
issues the token cookie, and `POST /form` validates the cookie against the
`x-csrf-token` request header.

## Run

```bash
bun test examples/features/csrf
```
