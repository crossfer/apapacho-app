import { cn } from '@/lib/utils'

export function StatCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'positive' | 'negative'
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-[#6B4A34]/50">{label}</p>
      <p
        className={cn(
          'mt-1 text-2xl font-semibold',
          tone === 'default' && 'text-[#6B4A34]',
          tone === 'positive' && 'text-green-700',
          tone === 'negative' && 'text-red-600',
        )}
      >
        {value}
      </p>
    </div>
  )
}
