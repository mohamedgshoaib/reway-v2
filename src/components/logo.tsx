"use client"

import type React from "react"

export function Logo(props: React.SVGProps<SVGSVGElement>): React.ReactElement {
  return (
    <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" {...props}>
      <g fill="currentColor">
        <path
          d="M0 122.542v-109c0-10 7-17 17-17h219c47 0 84 38 84 92v150H214c-14-2-39-11-71-26-15-7-22-14-18-22 4-9 20-14 46-18 27-4 45-8 45-23v-30c0-7-6-13-13-13H26c-10 0-19 6-26 16"
          transform="translate(65.672 4.113)scale(1.18955)"
        />
        <path
          d="M31 140.542h81c13 0 24 2 25 6s-3 7-8 9l-36 10c-17 5-27 16-27 29 0 12 9 20 23 26l216 98q.105.056.206.122c1.03.661 1.794 2.001 1.794 3.878v103c0 1-1 2-3 1l-216-108c-1-1-2-1-3 0l-85 53v-203c0-16 13-28 31-28"
          transform="translate(65.672 4.113)scale(1.18955)"
        />
      </g>
    </svg>
  )
}
