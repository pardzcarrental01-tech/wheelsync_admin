// Makes a whole table row (or card) open its details, instead of only the name.
// Clicks on the buttons, links and form fields inside the row keep doing their own job.
// The row can also be opened from the keyboard: Tab to it, then Enter or Space.
const INTERACTIVE = 'button, a, input, select, textarea, label, [data-no-row-click]'

export function rowClickProps(open, label) {
  return {
    role: 'button',
    tabIndex: 0,
    'aria-label': label,
    className: 'clickable-row',
    onClick: (event) => {
      if (event.target.closest(INTERACTIVE)) return
      if (window.getSelection()?.toString()) return // the user is selecting text to copy
      open()
    },
    onKeyDown: (event) => {
      if (event.target !== event.currentTarget) return
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        open()
      }
    },
  }
}
