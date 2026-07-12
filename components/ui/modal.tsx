'use client'

import { useRef } from 'react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Native <dialog>-backed modal: free focus trap, Escape-to-close and
 * top-layer stacking from the browser, no extra dependency.
 */
export function Modal({
  triggerLabel,
  triggerVariant,
  triggerClassName,
  title,
  children,
}: {
  triggerLabel: string
  triggerVariant?: ButtonProps['variant']
  triggerClassName?: string
  title: string
  children: (close: () => void) => React.ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const close = () => ref.current?.close()

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        className={cn('bg-[#B83E7A] text-white hover:bg-[#B83E7A]/90', triggerClassName)}
        onClick={() => ref.current?.showModal()}
      >
        {triggerLabel}
      </Button>
      <dialog
        ref={ref}
        onClick={(e) => {
          if (e.target === ref.current) close()
        }}
        className="w-[calc(100%-2rem)] max-w-md rounded-2xl border-0 p-0 shadow-2xl backdrop:bg-[#6B4A34]/40 backdrop:backdrop-blur-sm"
      >
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#6B4A34]">{title}</h2>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="text-[#6B4A34]/50 transition-colors hover:text-[#B83E7A]"
            >
              ✕
            </button>
          </div>
          {children(close)}
        </div>
      </dialog>
    </>
  )
}
