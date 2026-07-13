'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ROLE_HOME } from '@/lib/constants'
import type { UserRole } from '@/types/database.types'

export default function UpdatePasswordPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const schema = z
    .object({
      password: z.string().min(6),
      confirmPassword: z.string().min(6),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('passwordsDontMatch'),
      path: ['confirmPassword'],
    })
  type FormValues = z.infer<typeof schema>

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setError(null)
    const supabase = createClient()

    const { error: updateError } = await supabase.auth.updateUser({
      password: values.password,
    })
    if (updateError) {
      setError(updateError.message)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role as UserRole | undefined
    router.push(role ? ROLE_HOME[role] : '/login')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <h1 className="text-center text-sm font-medium text-[#6B4A34]">
        {t('updatePasswordTitle')}
      </h1>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-[#6B4A34]">
          {t('newPassword')}
        </label>
        <input
          type="password"
          autoComplete="new-password"
          className="rounded-md border border-[#B68A4C]/40 px-3 py-2 text-sm outline-none focus:border-[#B83E7A]"
          {...register('password')}
        />
        {errors.password && (
          <span className="text-xs text-red-600">{errors.password.message}</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-[#6B4A34]">
          {t('confirmPassword')}
        </label>
        <input
          type="password"
          autoComplete="new-password"
          className="rounded-md border border-[#B68A4C]/40 px-3 py-2 text-sm outline-none focus:border-[#B83E7A]"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <span className="text-xs text-red-600">
            {errors.confirmPassword.message}
          </span>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="bg-[#B83E7A] text-white hover:bg-[#B83E7A]/90"
      >
        {isSubmitting ? t('updatingPassword') : t('updatePassword')}
      </Button>
    </form>
  )
}
