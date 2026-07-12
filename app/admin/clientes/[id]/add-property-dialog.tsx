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
import { createPropertyAction } from './actions'

const schema = z.object({
  name: z.string().trim().min(1),
  address: z.string().trim().optional(),
  city: z.enum(['San Diego', 'Los Angeles']),
})
type FormValues = z.infer<typeof schema>

export function AddPropertyDialog({ clientId }: { clientId: string }) {
  const t = useTranslations('admin.clients.detail')
  const tForm = useTranslations('admin.clients.detail.propertyForm')
  const tCities = useTranslations('cities')
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { city: 'San Diego' },
  })

  return (
    <Modal
      title={t('addProperty')}
      triggerLabel={t('addProperty')}
      triggerClassName="h-auto px-3 py-1.5 text-sm"
    >
      {(close) => {
        async function onSubmit(values: FormValues) {
          setServerError(null)
          const result = await createPropertyAction({ clientId, ...values })
          if (result?.error) {
            setServerError(result.error)
            return
          }
          reset()
          router.refresh()
          close()
        }

        return (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#6B4A34]">
                {tForm('name')}
              </label>
              <Input {...register('name')} />
              {errors.name && (
                <span className="text-xs text-red-600">{errors.name.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#6B4A34]">
                {tForm('address')}
              </label>
              <Input {...register('address')} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#6B4A34]">
                {tForm('city')}
              </label>
              <Select {...register('city')}>
                <option value="San Diego">{tCities('San Diego')}</option>
                <option value="Los Angeles">{tCities('Los Angeles')}</option>
              </Select>
            </div>

            {serverError && <p className="text-sm text-red-600">{serverError}</p>}

            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                {tForm('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#B83E7A] text-white hover:bg-[#B83E7A]/90"
              >
                {isSubmitting ? tForm('submitting') : tForm('submit')}
              </Button>
            </div>
          </form>
        )
      }}
    </Modal>
  )
}
