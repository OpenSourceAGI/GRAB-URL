/**
 * @file hero-video.tsx
 * @description Click-to-play YouTube embed shown alongside the hero copy.
 */
"use client"

import { Play } from "lucide-react"
import { useState } from "react"

/** The demo walkthrough: https://www.youtube.com/watch?v=peAcVLpCxQY */
const VIDEO_ID = "peAcVLpCxQY"
const VIDEO_TITLE = "GRAB URL demo walkthrough"

/**
 * Renders a thumbnail facade first and only mounts the YouTube iframe once the
 * viewer clicks, so the hero does not pay for the player on every page load.
 */
export function HeroVideo() {
  const [playing, setPlaying] = useState(false)

  return (
    <div className="relative w-full aspect-video overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
      {playing ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0`}
          title={VIDEO_TITLE}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play ${VIDEO_TITLE}`}
          className="group absolute inset-0 h-full w-full cursor-pointer"
        >
          <img
            src={`https://i.ytimg.com/vi/${VIDEO_ID}/hqdefault.jpg`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <span className="absolute inset-0 bg-background/30 transition-colors group-hover:bg-background/10" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-300 group-hover:scale-110">
              <Play className="h-7 w-7 translate-x-0.5 fill-current" />
            </span>
          </span>
        </button>
      )}
    </div>
  )
}
