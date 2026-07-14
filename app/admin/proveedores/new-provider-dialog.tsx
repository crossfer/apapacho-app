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
import { Modal } from '@/components/ui/modal'
import { createProviderAction } from './actions'
import { SERVICE_TYPES } from '@/lib/constants'
import type { ServiceType } from '@/types/database.types'

const schema = z.object({
  fullName: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().optional(),
  specialty: z.enum(SERVICE_TYPES as [ServiceType, ...ServiceType[]]),
})
type FormValues = z.infer<typeof schema>

export function NewProviderDialog() {
  const t = useTranslations('admin.providers')
  const tServiceTypes = useTranslations('serviceTypes')
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
    defaultValues: { specialty: SERVICE_TYPES[0] },
  })

  return (
    <Modal title={t('newProvider')} triggerLabel={t('newProvider')}>
      {(close) => {
        async function onSubmit(values: FormValues) {
          setServerError(null)
          const result = await createProviderAction(values)
          if (result?.error) {
            setServerError(result.error)
            return
          }
          setSuccess(true)
          reset()
          router.refresh()
          setTimeout(() => {
            setSuccess(false)
            close()
          }, 1200)
        }

        return (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#6B4A34]">
                {t('form.fullName')}
              </label>
              <Input autoComplete="name" {...register('fullName')} />
              {errors.fullName && (
                <span className="text-xs text-red-600">{errors.fullName.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#6B4A34]">
                {t('form.email')}
              </label>
              <Input type="email" autoComplete="email" {...register('email')} />
              {errors.email && (
                <span className="text-xs text-red-600">{errors.email.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#6B4A34]">
                {t('form.phone')}
              </label>
              <Input type="tel" autoComplete="tel" {...register('phone')} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#6B4A34]">
                {t('form.specialty')}
              </label>
              <Select required {...register('specialty')}>
                {SERVICE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {tServiceTypes(type)}
                  </option>
                ))}
              </Select>
            </div>

            {serverError && <p className="text-sm text-red-600">{serverError}</p>}
            {success && <p className="text-sm text-[#4F6D5A]">{t('form.success')}</p>}

            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                {t('form.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#B83E7A] text-white hover:bg-[#B83E7A]/90"
              >
                {isSubmitting ? t('form.submitting') : t('form.submit')}
              </Button>
            </div>
          </form>
        )
      }}
    </Modal>
  )
}
