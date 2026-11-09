/**
 * The General-settings row: "添加为 PWA 应用".
 *
 * Registered into `settings.general.item` with the highest order in the
 * composition, which is the documented way to land at the BOTTOM of the General
 * section — the section stacks its items by `order` and this plugin must not
 * sit between the shipped preferences.
 *
 * The row is a control with four honest states, never a button that pretends to
 * work:
 * - ready     → button says 安装 and calls the browser's prompt;
 * - installed → button is disabled and says 已安装;
 * - ios/manual→ the hint replaces the button, because on those platforms there
 *               is no programmatic install path at all;
 * - pending   → the button is disabled with a short explanation, which is what
 *               a Chromium page sees before it fires `beforeinstallprompt`.
 */
import { useEffect, useState } from 'react'
import type { PwaInstaller, PwaSnapshot } from './pwa-installer.ts'
import type { SlotProps } from './host-types.ts'

/** Props injected into the row. */
export interface PwaRowInjected {
  /** The install controller owned by the plugin fiber. */
  installer: PwaInstaller
}

/**
 * Render the PWA row.
 * @param props - locale plus the injected installer.
 * @returns the settings row.
 */
export function PwaRow({ t, installer }: SlotProps<PwaRowInjected>): React.ReactElement {
  const [snapshot, setSnapshot] = useState<PwaSnapshot>(() => installer.snapshot())

  useEffect(() => installer.subscribe(setSnapshot), [installer])

  const { state, busy } = snapshot

  /** Button label for the current state. */
  const label = ((): string => {
    if (state === 'installed') return t('pwaInstalled')
    if (busy) return t('pwaInstalling')
    if (state === 'ready') return t('pwaInstall')
    if (state === 'insecure') return t('pwaUnavailable')
    return t('pwaNotReady')
  })()

  /**
   * Hint text shown in place of (or beside) the button. The insecure-context
   * case is the only one that needs the ORIGIN substituted: the fix is a browser
   * flag that takes this exact address, so showing it removes the guesswork.
   */
  const hint = ((): string | undefined => {
    if (state === 'ios') return t('pwaIosHint')
    if (state === 'manual') return t('pwaManualHint')
    if (state === 'insecure') return t('pwaInsecureHint').replaceAll('{origin}', snapshot.origin)
    return undefined
  })()

  const disabled = state !== 'ready' || busy

  return (
    <div data-dsh-ms="pwa-row">
      <div data-dsh-ms="pwa-row-text">
        <div data-dsh-ms="pwa-row-title">{t('pwaTitle')}</div>
        <div data-dsh-ms="pwa-row-desc">{hint ?? t('pwaDesc')}</div>
      </div>
      <button
        type="button"
        data-dsh-ms="pwa-button"
        disabled={disabled}
        onClick={() => {
          void installer.install()
        }}
      >
        {label}
      </button>
    </div>
  )
}
