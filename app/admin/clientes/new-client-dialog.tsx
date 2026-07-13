'use client'

import { useTranslations } from 'next-intl'
import { Modal } from '@/components/ui/modal'
import { ClientForm } from './client-form'

export function NewClientDialog() {
  const t = useTranslations('admin.clients')

  return (
    <Modal title={t('newClient')} triggerLabel={t('newClient')}>
      {(close) => <ClientForm mode="create" onClose={close} />}
    </Modal>
  )
}
