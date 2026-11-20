/**
 * The General-settings row: "平滑滚动与淡入".
 *
 * Registered immediately below the PWA row (`settings.general.item`, order
 * 1001). The control is a real switch with `role="switch"` and
 * `aria-checked`, not a button that merely looks toggled, so assistive tech can
 * read the current state. The actual work lives in {@link SmoothScrollController},
 * which owns both the tail glide and the new-content fade; this component only
 * renders and forwards the flip.
 */
import { useEffect, useState } from 'react'
import type { SmoothScrollController, SmoothScrollSnapshot } from './smooth-scroll.ts'
import type { SlotProps } from './host-types.ts'

/** Props injected into the row. */
export interface SmoothScrollRowInjected {
  /** Preference owner and live document observer. */
  smoothScroll: SmoothScrollController
}

/**
 * Render the smooth-scroll row.
 * @param props - locale plus the injected controller.
 * @returns the settings row.
 */
export function SmoothScrollRow({ t, smoothScroll }: SlotProps<SmoothScrollRowInjected>): React.ReactElement {
  const [snapshot, setSnapshot] = useState<SmoothScrollSnapshot>(() => smoothScroll.snapshot())

  useEffect(() => smoothScroll.subscribe(setSnapshot), [smoothScroll])

  const enabled = snapshot.enabled

  return (
    <div data-dsh-ms="setting-row" data-dsh-ms-setting="smooth-scroll">
      <div data-dsh-ms="setting-row-text">
        <div data-dsh-ms="setting-row-title">{t('smoothTitle')}</div>
        <div data-dsh-ms="setting-row-desc">{t('smoothDesc')}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={t('smoothTitle')}
        data-dsh-ms="switch"
        onClick={() => smoothScroll.setEnabled(!enabled)}
      >
        <span data-dsh-ms="switch-thumb" aria-hidden="true" />
      </button>
    </div>
  )
}
