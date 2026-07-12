import * as React from 'react'
import { cn } from '@/lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-md border border-[#B68A4C]/40 px-3 py-2 text-sm text-[#6B4A34] outline-none transition-colors placeholder:text-[#6B4A34]/40 focus:border-[#B83E7A]',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input }
