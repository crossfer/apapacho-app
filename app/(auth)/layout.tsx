import { APP_NAME } from '@/lib/constants'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#4F6D5A] p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center text-xl font-semibold text-[#6B4A34]">
          {APP_NAME}
        </div>
        {children}
      </div>
    </div>
  )
}
