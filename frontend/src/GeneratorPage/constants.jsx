// ── Icons ──────────────────────────────────────────────────────────────────────
const SparkleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 1.5a.75.75 0 0 1 .75.75V4.5a.75.75 0 0 1-1.5 0V2.25A.75.75 0 0 1 12 1.5ZM12 19.5a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V20.25a.75.75 0 0 1 .75-.75ZM2.25 12a.75.75 0 0 1 .75-.75H5.25a.75.75 0 0 1 0 1.5H3A.75.75 0 0 1 2.25 12ZM19.5 12a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5H20.25a.75.75 0 0 1-.75-.75ZM6.166 5.106a.75.75 0 0 1 1.06 0l1.591 1.591a.75.75 0 0 1-1.06 1.06L6.166 6.167a.75.75 0 0 1 0-1.06ZM15.182 15.183a.75.75 0 0 1 1.06 0l1.591 1.59a.75.75 0 1 1-1.06 1.061l-1.591-1.59a.75.75 0 0 1 0-1.061ZM5.106 17.835a.75.75 0 0 1 0-1.061l1.591-1.59a.75.75 0 1 1 1.06 1.06l-1.59 1.591a.75.75 0 0 1-1.061 0ZM15.183 8.818a.75.75 0 0 1 0-1.06l1.59-1.591a.75.75 0 1 1 1.061 1.06l-1.59 1.591a.75.75 0 0 1-1.061 0Z" />
  </svg>
)

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M7.5 3.375c0-1.036.84-1.875 1.875-1.875h.375a3.75 3.75 0 0 1 3.75 3.75v1.875C13.5 8.161 14.34 9 15.375 9h1.875A3.75 3.75 0 0 1 21 12.75v3.375C21 17.16 20.16 18 19.125 18h-9.75A1.875 1.875 0 0 1 7.5 16.125V3.375Z" />
    <path d="M15 5.25a5.23 5.23 0 0 0-1.279-3.434 9.768 9.768 0 0 1 6.963 6.963A5.23 5.23 0 0 0 17.25 7.5h-1.875A.375.375 0 0 1 15 7.125V5.25ZM4.875 6H6v10.125A3.375 3.375 0 0 0 9.375 19.5H16.5v1.125c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 0 1 3 20.625V7.875C3 6.839 3.84 6 4.875 6Z" />
  </svg>
)

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 0 1 1.04-.208Z" clipRule="evenodd" />
  </svg>
)

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M3.478 2.405a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.405Z" />
  </svg>
)

const EXAMPLE_PROMPTS = [
  "A dark mode navigation bar with a logo on the left and 4 nav buttons on the right",
  "A login form card with email input, password input, and a submit button",
  "A dashboard stat card showing '1,284' users with a blue accent and subtle icon",
  "A mobile-style bottom tab bar with 5 icons: Home, Search, Create, Alerts, Profile",
  "A hero banner with a large headline, subtitle text, and a CTA button",
]

export { SparkleIcon, CopyIcon, CheckIcon, SendIcon, EXAMPLE_PROMPTS }