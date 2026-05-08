# serve-static

Demonstrates `@banhmi/static`: a Bun-native zero-copy static file server for Banhmi. Import `StaticModule.forRoot({ root, prefix })` into any `@Module` to serve an entire directory at a URL prefix — no controllers, no `app.use()` wiring required.
