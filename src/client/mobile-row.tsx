/**
 * The General-settings row: "移动端适配".
 *
 * The switch owns the narrow-screen drawer as a whole: the header button, the
 * overlay geometry, the backdrop and the right-swipe gesture. It is separate
 * from the motion switch and the PWA install action so a reader can turn off
 * exactly the part that misbehaves on their device.
 *
 * The control is a real `role="switch"` with `aria-checked`, matching the
 * motion row and the host's own switches.
 */
import { useEffect, useState } from 'react'
import type { MobileController, MobileSnapshot } from './mobile.ts'
import type { SlotProps } from './host-types.ts'

/** Props injected into the row. */
export interface MobileRowInjected {
  /** Preference owner shared with the drawer wiring. */
  mobile: MobileController
}

/**
 * Render the mobile-adaptation row.
 * @param props - locale plus the injected controller.
 * @returns the settings row.
 */
export function MobileRow({ t, mobile }: SlotProps<MobileRowInjected>): React.ReactElement {
  const [snapshot, setSnapshot] = useState<MobileSnapshot>(() => mobile.snapshot())

  useEffect(() => mobile.subscribe(setSnapshot), [mobile])

  const enabled = snapshot.enabled

  return (
    <div data-dsh-ms="setting-row" data-dsh-ms-setting="mobile">
      <div data-dsh-ms="setting-row-text">
        <div data-dsh-ms="setting-row-title">{t('mobileTitle')}</div>
        <div data-dsh-ms="setting-row-desc">{t('mobileDesc')}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={t('mobileTitle')}
        data-dsh-ms="switch"
        onClick={() => mobile.setEnabled(!enabled)}
      >
        <span data-dsh-ms="switch-thumb" aria-hidden="true" />
      </button>
    </div>
  )
}
