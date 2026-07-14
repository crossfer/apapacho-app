'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { captureLocation } from '@/lib/geolocation'
import { PHOTOS_BUCKET } from '@/lib/constants'
import { createUpdateAction } from '../actions'

type NewStatus = 'in_progress' | 'completed'
type Step = 'idle' | 'location' | 'uploading' | 'saving'

export function UpdateStatusDialog({ orderId }: { orderId: string }) {
  const t = useTranslations('staff.detail')
  const tStatus = useTranslations('serviceStatus')
  const router = useRouter()
  const [status, setStatus] = useState<NewStatus>('in_progress')
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState<string | null>(null)

  return (
    <Modal
      title={t('updateStatus')}
      triggerLabel={t('updateStatus')}
      triggerClassName="h-12 w-full text-base"
    >
      {(close) => {
        async function onSubmit(e: React.FormEvent) {
          e.preventDefault()
          setError(null)

          // GPS + photo upload happen client-side; the server action only
          // persists coordinates and storage paths that already exist.
          setStep('location')
          const location = await captureLocation()

          setStep('uploading')
          const supabase = createClient()
          const photoStoragePaths: string[] = []
          for (const file of files) {
            const path = `${orderId}/${crypto.randomUUID()}-${file.name}`
            const { error: uploadError } = await supabase.storage
              .from(PHOTOS_BUCKET)
              .upload(path, file)
            if (uploadError) {
              setError(uploadError.message)
              setStep('idle')
              return
            }
            photoStoragePaths.push(path)
          }

          setStep('saving')
          const result = await createUpdateAction({
            orderId,
            status,
            notes,
            latitude: location.latitude,
            longitude: location.longitude,
            locationAccuracy: location.accuracy,
            locationDenied: location.denied,
            photoStoragePaths,
          })

          if (result?.error) {
            setError(result.error)
            setStep('idle')
            return
          }

          setNotes('')
          setFiles([])
          setStep('idle')
          router.refresh()
          close()
        }

        const isBusy = step !== 'idle'

        return (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#6B4A34]">
                {t('newStatus')}
              </label>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as NewStatus)}
              >
                <option value="in_progress">{tStatus('in_progress')}</option>
                <option value="completed">{tStatus('completed')}</option>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#6B4A34]">
                {t('notes')}
              </label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-[#6B4A34]">
                {t('photos')}
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                className="text-sm text-[#6B4A34]"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close} disabled={isBusy}>
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isBusy}
                className="bg-[#B83E7A] text-white hover:bg-[#B83E7A]/90"
              >
                {step === 'location'
                  ? t('capturingLocation')
                  : step === 'uploading'
                    ? t('uploadingPhotos')
                    : step === 'saving'
                      ? t('submitting')
                      : t('submit')}
              </Button>
            </div>
          </form>
        )
      }}
    </Modal>
  )
}
