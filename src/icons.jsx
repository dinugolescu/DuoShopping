const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

export const IconCheck = (p) => <svg {...base} {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
export const IconX = (p) => <svg {...base} {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>
export const IconPlus = (p) => <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
export const IconChevron = (p) => <svg {...base} {...p}><path d="M6 9l6 6 6-6" /></svg>
export const IconUp = (p) => <svg {...base} {...p}><path d="M6 15l6-6 6 6" /></svg>
export const IconUsers = (p) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
    <path d="M16 4.8a3.3 3.3 0 010 6.4M18.5 14.8c1.7.7 2.7 2.4 3 5.2" />
  </svg>
)
export const IconChat = (p) => (
  <svg {...base} {...p}><path d="M4 5.5h16v10.5H9.5L5 20v-4H4z" /></svg>
)
export const IconCamera = (p) => (
  <svg {...base} {...p}>
    <path d="M3 8h4l2-2.5h6L17 8h4v11H3z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </svg>
)
export const IconSend = (p) => <svg {...base} {...p}><path d="M4 12l16-8-6 16-2.5-6.5z" /></svg>
