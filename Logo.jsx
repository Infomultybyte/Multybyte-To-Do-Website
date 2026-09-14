import multybyteLogo from '../assets/multybyte-logo.png'

// Existing call sites like <Logo variant="light" /> still work fine — the
// prop is simply ignored now that we render the real logo artwork, which
// already reads cleanly on both light and dark surfaces.
export default function Logo({ className = '' }) {
  return (
    <img
      src={multybyteLogo}
      alt="Multybyte"
      className={`h-9 w-auto object-contain ${className}`}
    />
  )
}
