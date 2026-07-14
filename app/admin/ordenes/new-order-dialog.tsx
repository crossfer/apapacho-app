'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { createOrderAction } from './actions'
import { SERVICE_TYPES } from '@/lib/constants'
import type { ServiceType } from '@/types/database.types'

export interface ClientOption {
  id: string
  full_name: string | null
  email: string | null
}

export interface PropertyOption {
  id: string
  name: string | null
  client_id: string | null
}

export interface StaffOption {
  id: string
  full_name: string | null
}

const schema = z.object({
  clientId: z.string().uuid({ message: 'Selecciona un cliente.' }),
  propertyId: z.string().uuid({ message: 'Selecciona una propiedad.' }),
  serviceType: z.enum(SERVICE_TYPES as [ServiceType, ...ServiceType[]]),
  scheduledAt: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  staffId: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function NewOrderDialog({
  clients,
  properties,
  staff,
  defaultClientId,
  defaultPropertyId,
}: {
  clients: ClientOption[]
  properties: PropertyOption[]
  staff: StaffOption[]
  /** Pre-fills the client/property selects — used from the property detail page. */
  defaultClientId?: string
  defaultPropertyId?: string
}) {
  const t = useTranslations('admin.orders')
  const tForm = useTranslations('admin.orders.form')
  const tServiceTypes = useTranslations('serviceTypes')
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      serviceType: SERVICE_TYPES[0],
      clientId: defaultClientId,
      propertyId: defaultPropertyId,
    },
  })

  const selectedClientId = watch('clientId')
  const availableProperties = useMemo(
    () => properties.filter((p) => p.client_id === selectedClientId),
    [properties, selectedClientId],
  )

  return (
    <Modal title={t('newOrder')} triggerLabel={t('newOrder')}>
      {(close) => {
        async function onSubmit(values: FormValues) {
          setServerError(null)
          const result = await createOrderAction({
            propertyId: values.propertyId,
            serviceType: values.serviceType,
            scheduledAt: values.scheduledAt,
            notes: values.notes,
            staffId: values.staffId || undefined,
          })
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
                {tForm('client')}
              </label>
              <Select
                {...register('clientId', {
                  onChange: () => setValue('propertyId', ''),
                })}
              >
                <option value="">{tForm('selectClient')}</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.full_name ?? client.email ?? client.id}
                  </option>
                ))}
              </Select>
              {errors.clientId && (
                <span className="text-xs text-red-600">{errors.clientId.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#6B4A34]">
                {tForm('property')}
              </label>
              <Select {...register('propertyId')} disabled={!selectedClientId}>
                <option value="">{tForm('selectProperty')}</option>
                {availableProperties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name ?? property.id}
                  </option>
                ))}
              </Select>
              {errors.propertyId && (
                <span className="text-xs text-red-600">
                  {errors.propertyId.message}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#6B4A34]">
                {tForm('serviceType')}
              </label>
              <Select {...register('serviceType')}>
                {SERVICE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {tServiceTypes(type)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#6B4A34]">
                {tForm('scheduledDate')}
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-md border border-[#B68A4C]/40 px-3 py-2 text-sm text-[#6B4A34] outline-none focus:border-[#B83E7A]"
                {...register('scheduledAt')}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#6B4A34]">
                {tForm('notes')}
              </label>
              <Textarea rows={3} {...register('notes')} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#6B4A34]">
                {tForm('assignedStaff')}
              </label>
              <Select {...register('staffId')}>
                <option value="">{tForm('unassigned')}</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name ?? member.id}
                  </option>
                ))}
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
