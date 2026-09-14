/**
 * @file openapi-section.tsx
 * @description Section showcasing OpenAPI-driven codegen: the typed client SDK and the MCP server generator.
 */
"use client"

import { useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FileCode, Bot, ArrowRight, Database, Repeat as RepeatIcon, Gauge, Shield, Search, Lock } from "lucide-react"
import hljs from "highlight.js/lib/core"
import bash from "highlight.js/lib/languages/bash"
import "highlight.js/styles/github-dark.css"

hljs.registerLanguage("bash", bash)

const cards = [
  {
    icon: FileCode,
    eyebrow: "For your app",
    title: "Typed Client SDK",
    pkg: "api2client",
    description:
      "Generate a fully typed TypeScript SDK from an OpenAPI spec with Hey API, wired to send every request through grab instead of axios or fetch.",
    code: "npx api2client ./openapi.yaml ./src/client",
    bullets: [
      { icon: Database, label: "Caching & mocks" },
      { icon: RepeatIcon, label: "Automatic retries" },
      { icon: Gauge, label: "Rate limiting" },
    ],
    href: "/docs/openapi-services",
    cta: "View SDK docs",
  },
  {
    icon: Bot,
    eyebrow: "For AI agents",
    title: "MCP Server",
    pkg: "api2ai",
    description:
      "Generate a production-ready MCP server from the same spec with the mcp-use framework, so Claude, ChatGPT and other agents can call your API as a tool.",
    code: "npx api2ai ./openapi.yaml ./my-mcp-server",
    bullets: [
      { icon: Search, label: "Built-in inspector" },
      { icon: Lock, label: "Auth & approvals" },
      { icon: Shield, label: "Risk classification" },
    ],
    href: "/docs/openapi-services/api2ai-mcp-server",
    cta: "View MCP docs",
  },
]

function CodeLine({ code }: { code: string }) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (ref.current) {
      delete ref.current.dataset.highlighted
      hljs.highlightElement(ref.current)
    }
  }, [code])

  return (
    <pre className="rounded-lg border border-border bg-background/60 px-4 py-3 overflow-x-auto text-sm">
      <code ref={ref} className="font-mono language-bash">
        {code}
      </code>
    </pre>
  )
}

export function OpenApiSection() {
  return (
    <section className="relative py-20 md:py-32 border-b border-border">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            One Spec, <span className="text-primary">Two Ways to Ship</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Point either generator at any OpenAPI spec. Both send requests through grab, so every endpoint gets
            caching, retries, rate limiting, dedupe and mocks for free.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {cards.map((card) => (
            <div key={card.pkg} className="animated-border-card group p-6 flex flex-col">
              <div className="relative z-10 flex flex-col flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <card.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.eyebrow}</p>
                    <h3 className="font-semibold text-foreground">{card.title}</h3>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{card.description}</p>

                <div className="mb-4">
                  <CodeLine code={card.code} />
                </div>

                <div className="flex flex-wrap gap-3 mb-6">
                  {card.bullets.map((b) => (
                    <span
                      key={b.label}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/50 rounded-full px-3 py-1"
                    >
                      <b.icon className="h-3.5 w-3.5 text-primary" />
                      {b.label}
                    </span>
                  ))}
                </div>

                <div className="mt-auto">
                  <Button
                    onClick={() => (window.location.href = card.href)}
                    variant="outline"
                    size="sm"
                    className="gap-2 bg-transparent"
                  >
                    {card.cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Button onClick={() => (window.location.href = "/docs/openapi-services")} className="gap-2">
            Read the OpenAPI SDKs guide
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}
