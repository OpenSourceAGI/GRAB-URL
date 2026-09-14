/**
 * @file hero-section.tsx
 * @description Hero section component for the documentation landing page.
 */
"use client"

import KineticGrid from "@/components/ui/kinetic-grid"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, Github, BookOpen, Check } from "lucide-react"
import { useState } from "react"
import Image from "next/image"

/** Every badge from the repo README, shown under the hero tagline. */
const BADGES: { alt: string; src: string; href?: string }[] = [
  {
    alt: "Ask DeepWiki",
    src: "https://deepwiki.com/badge.svg",
    href: "https://deepwiki.com/vtempest/GRAB-URL",
  },
  {
    alt: "Documentation",
    src: "https://img.shields.io/badge/Docs-blue?logo=ReadTheDocs&logoColor=white",
    href: "https://grab.js.org",
  },
  {
    alt: "GitHub Stars",
    src: "https://img.shields.io/github/stars/vtempest/GRAB-URL",
    href: "https://github.com/vtempest/GRAB-URL",
  },
  {
    alt: "Activity",
    src: "https://img.shields.io/github/commit-activity/m/vtempest/GRAB-URL",
    href: "https://github.com/vtempest/GRAB-URL/pulse",
  },
  {
    alt: "GitHub last commit",
    src: "https://img.shields.io/github/last-commit/vtempest/GRAB-URL.svg",
    href: "https://github.com/vtempest/GRAB-URL/commits/master/",
  },
  {
    alt: "Test grab-url status for master",
    src: "https://github.com/OpenSourceAGI/GRAB-URL/actions/workflows/tests.yml/badge.svg",
    href: "https://github.com/OpenSourceAGI/GRAB-URL/actions/workflows/tests.yml",
  },
  {
    alt: "Coverage",
    src: "https://codecov.io/gh/OpenSourceAGI/GRAB-URL/branch/master/graph/badge.svg",
    href: "https://app.codecov.io/gh/OpenSourceAGI/GRAB-URL",
  },
  {
    alt: "Join Discord",
    src: "https://img.shields.io/discord/1110227955554209923.svg?label=Chat&logo=Discord&colorB=7289da&style=flat",
    href: "https://discord.gg/SJdBqBz3tV",
  },
  {
    alt: "PRs Welcome",
    src: "https://img.shields.io/badge/PRs-welcome-brightgreen.svg",
    href: "https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request",
  },
  {
    alt: "Claude AI",
    src: "https://img.shields.io/badge/Claude-D97757?logo=claude&logoColor=fff",
  },
  {
    alt: "TypeScript",
    src: "https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white",
  },
  {
    alt: "NPM Downloads",
    src: "https://img.shields.io/npm/dm/grab-url",
    href: "https://npmjs.org/package/grab-url",
  },
  {
    alt: "NPM Version",
    src: "https://img.shields.io/npm/v/grab-url",
    href: "https://npmjs.org/package/grab-url",
  },
  {
    alt: "GitHub Discussions",
    src: "https://img.shields.io/github/discussions/vtempest/GRAB-URL",
    href: "https://github.com/vtempest/GRAB-URL/discussions",
  },
  {
    alt: "GitHub Codespaces",
    src: "https://github.com/codespaces/badge.svg",
    href: "https://codespaces.new/vtempest/GRAB-URL",
  },
]

export function HeroSection() {
  const [copied, setCopied] = useState(false)

  const copyCommand = () => {
    navigator.clipboard.writeText("npm i grab-url")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Kinetic grid backdrop: warps toward the cursor, ripples on click.
          `fill={false}` keeps the site background, `auto` follows the theme. */}
      <KineticGrid variant="section" globalColor="auto" fill={false}>
        <div className="absolute inset-0 grid-glow pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background pointer-events-none" />

        <div className="container mx-auto px-4 py-12 md:py-20 relative">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto w-full">
            {/* <div className="mb-8 relative" style={{ animation: "float 6s ease-in-out infinite" }}>
              <Image
                src="https://i.imgur.com/RH80JGZ.png"
                alt="GRAB - Generate Request to API from Browser"
                width={200}
                height={200}
                className="drop-shadow-2xl"
              />
            </div> */}

            <Badge variant="outline" className="mb-6 px-4 py-1.5 border-primary/30 text-primary">
              v1.0 — Zero Dependencies, 4KB
            </Badge>

            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-balance mb-4 break-words">
              Why <span className="line-through text-muted-foreground">fetch</span> when you can just
            </h1>
            <h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 break-words">
              <span className="shimmer-text">GRAB</span>
              <span className="text-primary">?</span>
            </h2>

            <p className="text-lg md:text-xl text-muted-foreground mb-2 font-mono">
              Generate Request {"{"}to: <span className="text-primary">API</span> from:{" "}
              <span className="text-foreground">Browser</span>
              {"}"}
            </p>

            <p className="text-xl text-muted-foreground mb-8">
              Debugging fetch requests is a bitch. Make the switch!
            </p>

            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mb-6 text-pretty">
              Functionally Brilliant, Elegantly Simple. One function, no dependencies, minimalist syntax with more
              features than alternatives.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
              {BADGES.map(({ alt, src, href }) =>
                href ? (
                  <a key={alt} href={href} target="_blank" rel="noreferrer">
                    <img alt={alt} src={src} className="h-5 w-auto" />
                  </a>
                ) : (
                  <img key={alt} alt={alt} src={src} className="h-5 w-auto" />
                ),
              )}
            </div>


            <div className="flex flex-col sm:flex-row items-center gap-4 mb-12">
              <Button onClick={() => window.location.href = "/docs"} size="lg" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                <BookOpen className="h-4 w-4" />
                Documentation
              </Button>

              <div
                onClick={copyCommand}
                className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-2.5 cursor-pointer hover:border-primary/50 transition-colors group"
              >
                <code className="font-mono text-sm text-foreground">npm i grab-url</code>
                {copied ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>

              <Button onClick={() => window.location.href = "https://github.com/vtempest/grab-url"} variant="outline" size="lg" className="gap-2 bg-transparent">
                <Github className="h-4 w-4" />
                GitHub
              </Button>
            </div>
          </div>
        </div>
      </KineticGrid>
    </section>
  )
}
