import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({ component: Home })

function Home() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Banhmi</h1>
      <p className="mt-2 text-muted-foreground">
        A Bun-first, NestJS-inspired TypeScript web framework.
      </p>
    </main>
  )
}
