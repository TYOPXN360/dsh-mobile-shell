/**
 * The divider that starts this plugin's settings group.
 *
 * The General section stacks its rows with a single hairline between them and
 * no headings, so an extra slot entry is the least intrusive way to give the
 * plugin's rows their own region: one official-token divider, then the rows.
 * The line uses the same `.5px`/`--dsw-alias-border-l2` pair the shipped rows
 * use, so it reads as part of the settings surface rather than a custom card.
 */
export function SectionDivider(): React.ReactElement {
  return <div data-dsh-ms="section-divider" role="separator" aria-hidden="true" />
}
