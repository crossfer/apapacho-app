'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { createClientAction, updateClientAction } from './actions'
import type { City } from '@/types/database.types'

const schema = z.object({
  fullName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().optional(),
  city: z.enum(['San Diego', 'Los Angeles']),
})

type FormValues = z.infer<typeof schema>

type ClientFormProps = {
  mode: 'create' | 'edit'
  clientId?: string
  propertyId?: string | null
  initialValues?: {
    fullName: string | null
    email: string | null
    phone: string | null
    city: City | null
  }
  onClose: () => void
}

export function ClientForm({
  mode,
  clientId,
  propertyId,
  initialValues,
  onClose,
}: ClientFormProps) {
  const t = useTranslations('admin.clients.form')
  const tCities = useTranslations('cities')
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: initialValues?.fullName ?? '',
      email: initialValues?.email ?? '',
      phone: initialValues?.phone ?? '',
      city: initialValues?.city ?? 'San Diego',
    },
  })

  async function onSubmit(values: FormValues) {
    setServerError(null)
    setSuccess(false)

    const result =
      mode === 'edit'
        ? await updateClientAction({
            clientId: clientId ?? '',
            propertyId,
            ...values,
          })
        : await createClientAction(values)

    if (result?.error) {
      setServerError(result.error)
      return
    }

    setSuccess(true)
    reset(mode === 'edit' ? values : { city: 'San Diego' })
    router.refresh()
    setTimeout(() => {
      setSuccess(false)
      onClose()
    }, 1200)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-[#6B4A34]">
          {t('fullName')}
        </label>
        <Input autoComplete="name" {...register('fullName')} />
        {errors.fullName && (
          <span className="text-xs text-red-600">{errors.fullName.message}</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-[#6B4A34]">
          {t('email')}
        </label>
        <Input type="email" autoComplete="email" {...register('email')} />
        {errors.email && (
          <span className="text-xs text-red-600">{errors.email.message}</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-[#6B4A34]">
          {t('phone')}
        </label>
        <Input type="tel" autoComplete="tel" {...register('phone')} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-[#6B4A34]">
          {t('city')}
        </label>
        <Select required {...register('city')}>
          <option value="San Diego">{tCities('San Diego')}</option>
          <option value="Los Angeles">{tCities('Los Angeles')}</option>
        </Select>
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      {success && (
        <p className="text-sm text-[#4F6D5A]">
          {mode === 'edit' ? t('editSuccess') : t('success')}
        </p>
      )}

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          {t('cancel')}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#B83E7A] text-white hover:bg-[#B83E7A]/90"
        >
          {isSubmitting
            ? t(mode === 'edit' ? 'saving' : 'submitting')
            : t(mode === 'edit' ? 'saveChanges' : 'submit')}
        </Button>
      </div>
    </form>
  )
}
