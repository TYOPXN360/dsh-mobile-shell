/**
 * The backdrop — "tap outside the drawer to close it".
 *
 * It registers into the shell's `shell.overlay` seat (a frame-wide floating
 * layer above every column, click-through unless an entry opts in) so it
 * stacks above the conversation and below the drawer without either of them
 * needing to know about it.
 *
 * Two details are load-bearing:
 *
 * - The element is a `<button>` rather than a `<div>`: a tap that dismisses a
 *   layer is an action, and a button gives keyboard users the same affordance
 *   plus the correct focus semantics. It stays `pointer-events: none` while
 *   closed, so it never intercepts a tap meant for the conversation.
 * - It renders its sibling `data-dsh-drawer-surface` marker: the gesture
 *   handler uses that marker to tell "stroke started inside the drawer" from
 *   "stroke started on the conversation", which is what keeps a drag on a
 *   session row from re-triggering the opener.
 */
import { useEffect, useState } from 'react'
import type { DrawerController } from './drawer.ts'
import type { SlotProps } from './host-types.ts'

/** Props injected into the occupant. */
export interface BackdropInjected {
  /** The shared drawer state machine. */
  drawer: DrawerController
}

/**
 * Render the drawer backdrop.
 * @param props - the injected drawer controller.
 * @returns the dismiss surface, or null while the drawer is closed.
 */
export function DrawerBackdrop({ drawer }: SlotProps<BackdropInjected>): React.ReactElement | null {
  const [open, setOpen] = useState<boolean>(() => drawer.isOpen)

  useEffect(() => drawer.subscribe((change) => setOpen(change.open)), [drawer])

  return (
    <button
      type="button"
      data-dsh-ms="backdrop"
      tabIndex={open ? 0 : -1}
      aria-hidden={open ? undefined : true}
      aria-label="关闭侧边栏"
      onClick={() => {
        drawer.closeDrawer('backdrop')
      }}
    />
  )
}
