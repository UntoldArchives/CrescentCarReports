import { requireUser } from '@/lib/auth'
import { TopBar } from '@/components/layout/TopBar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

/**
 * Protected shell for every signed-in route. requireUser() resolves the session
 * server-side (the middleware already guards the cookie) and redirects to /login
 * if there's no profile.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser()

  return (
    <div className="min-h-dvh bg-background">
      <TopBar profile={profile} />
      <div className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 md:pb-10 print:max-w-none print:!p-0">
        {children}
      </div>
      <MobileBottomNav isAdmin={profile.role === 'admin'} />
    </div>
  )
}
