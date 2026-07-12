'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

type FormValues = z.infer<typeof schema>

export default function LoginPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword(values)
    if (error) {
      setError(error.message)
      return
    }
    // Middleware will route to the correct role home on the next request.
    router.push(searchParams.get('redirectedFrom') ?? '/')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <h1 className="text-center text-sm text-[#6B4A34]/70">
        {t('welcomeBack')}
      </h1>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-[#6B4A34]">
          {t('email')}
        </label>
        <input
          type="email"
          autoComplete="email"
          className="rounded-md border border-[#B68A4C]/40 px-3 py-2 text-sm outline-none focus:border-[#B83E7A]"
          {...register('email')}
        />
        {errors.email && (
          <span className="text-xs text-red-600">{errors.email.message}</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-[#6B4A34]">
          {t('password')}
        </label>
        <input
          type="password"
          autoComplete="current-password"
          className="rounded-md border border-[#B68A4C]/40 px-3 py-2 text-sm outline-none focus:border-[#B83E7A]"
          {...register('password')}
        />
        {errors.password && (
          <span className="text-xs text-red-600">
            {errors.password.message}
          </span>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="bg-[#B83E7A] text-white hover:bg-[#B83E7A]/90"
      >
        {t('login')}
      </Button>

      <Link
        href="/forgot-password"
        className="text-center text-xs text-[#6B4A34]/60 hover:text-[#B83E7A]"
      >
        {t('forgotPassword')}
      </Link>
    </form>
  )
}
