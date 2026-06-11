import { ProductLogo } from '@/components/ui/Logo'

/** Centered dark card frame shared by all auth screens. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <ProductLogo className="mb-6" />
          <h1 className="text-display-xs text-text-primary">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-text-secondary">{subtitle}</p>}
        </div>
        <div className="card-base p-6">{children}</div>
        <p className="mt-6 text-center text-xs text-text-muted">
          Crescent Car Reports by Crescent Car Check
        </p>
      </div>
    </main>
  )
}
