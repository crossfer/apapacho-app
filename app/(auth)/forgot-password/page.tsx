'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

const schema = z.object({ email: z.string().email() })
type FormValues = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const t = useTranslations('auth')
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit({ email }: FormValues) {
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/`,
    })
    setSent(true)
  }

  if (sent) {
    return (
      <p className="text-center text-sm text-[#6B4A34]">
        {t('sendResetLink')} ✓
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <h1 className="text-center text-sm font-medium text-[#6B4A34]">
        {t('resetPassword')}
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
      <Button
        type="submit"
        disabled={isSubmitting}
        className="bg-[#B83E7A] text-white hover:bg-[#B83E7A]/90"
      >
        {t('sendResetLink')}
      </Button>
      <Link
        href="/login"
        className="text-center text-xs text-[#6B4A34]/60 hover:text-[#B83E7A]"
      >
        {t('login')}
      </Link>
    </form>
  )
}
