'use client'

import { Pencil } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Modal } from '@/components/ui/modal'
import { ClientForm } from './client-form'
import type { City } from '@/types/database.types'

type EditClientDialogProps = {
  client: {
    id: string
    full_name: string | null
    email: string | null
    phone: string | null
  }
  propertyId?: string | null
  city?: City | null
}

export function EditClientDialog({
  client,
  propertyId,
  city,
}: EditClientDialogProps) {
  const t = useTranslations('admin.clients')

  return (
    <Modal
      title={t('editClient')}
      triggerLabel={t('edit')}
      triggerVariant="outline"
      triggerClassName="h-8 border-[#FFFFFF]/30 px-2 text-white text-white hover:bg-[#000000]/30"
      triggerIcon={<Pencil aria-hidden="true" />}
    >
      {(close) => (
        <ClientForm
          mode="edit"
          clientId={client.id}
          propertyId={propertyId}
          initialValues={{
            fullName: client.full_name,
            email: client.email,
            phone: client.phone,
            city: city ?? null,
          }}
          onClose={close}
        />
      )}
    </Modal>
  )
}
