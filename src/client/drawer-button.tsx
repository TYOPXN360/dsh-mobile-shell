/**
 * The drawer button — the control that sits immediately BEFORE the session
 * title in the conversation header.
 *
 * It registers into the shell's `conversation.header.leading` seat, which is
 * the first grid cell of the header row and therefore renders to the left of
 * the session breadcrumb. (The `conversation.session.header.actions` seat is
 * the opposite side: those controls render AFTER the title, which would put the
 * button on the wrong side of the name.)
 *
 * The button exists at every width but is `display: none` unless the narrow +
 * touch media query matches, so a desktop window never gains a control it did
 * not have.
 */
import { useEffect, useState } from 'react'
import type { DrawerController } from './drawer.ts'
import type { SlotProps } from './host-types.ts'

/** Props injected into the occupant by its registration. */
export interface DrawerButtonInjected {
  /** The drawer state machine, shared with the backdrop and the gesture. */
  drawer: DrawerController
}

/** Full component props: inject share plus the locale seat. */
export type DrawerButtonProps = SlotProps<DrawerButtonInjected>

/** The panel-outline glyph: the same shape the shell uses for its own toggle. */
function PanelIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="1.6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6.25 2.9v10.2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

/**
 * Render the header drawer button.
 * @param props - locale plus the injected drawer controller.
 * @returns the button element.
 */
export function DrawerButton({ t, drawer }: DrawerButtonProps): React.ReactElement {
  const [open, setOpen] = useState<boolean>(() => drawer.isOpen)

  useEffect(() => drawer.subscribe((change) => setOpen(change.open)), [drawer])

  return (
    <button
      type="button"
      data-dsh-ms="drawer-button"
      aria-label={open ? t('closeSidebar') : t('openSidebar')}
      aria-expanded={open}
      title={open ? t('closeSidebar') : t('openSidebar')}
      onClick={() => {
        drawer.toggle('button')
      }}
    >
      <PanelIcon />
    </button>
  )
}
