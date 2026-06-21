import type { ReactNode } from "react"
import { MobileNav } from "@/components/mobile-nav"

export function PageShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <main className="min-h-screen bg-[#F5F4F0] text-[#111] antialiased">
      <MobileNav />
      <section className="px-6 pb-16 pt-32 md:px-12 lg:px-20">
        <div className="mx-auto max-w-6xl">
          <h1 className="max-w-3xl text-5xl font-light leading-[1.02] tracking-tight md:text-6xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-black/45">{description}</p>
        </div>
      </section>
      <section className="px-6 pb-24 md:px-12 lg:px-20">
        <div className="mx-auto max-w-6xl">{children}</div>
      </section>
    </main>
  )
}
