import { redirect } from 'next/navigation'

// The middleware normally routes "/" to /dashboard or /login. This is a
// safety net so the root always lands somewhere sensible.
export default function RootPage() {
  redirect('/dashboard')
}
