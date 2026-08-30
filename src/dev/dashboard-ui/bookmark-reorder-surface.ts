export function bookmarkReorderSurfaceClassName(
  isDragging: boolean
): string | undefined {
  return isDragging
    ? "z-10 bg-background shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_2px_4px_rgb(0_0_0/0.06),0_8px_20px_rgb(0_0_0/0.08)] min-[800px]:bg-card dark:shadow-[0_0_0_1px_rgb(255_255_255/0.1)]"
    : undefined
}
