// -----------------------------------------------------------------------------
// next-intl request config (no locale URL prefix).
//
// The active locale is resolved from the NEXT_LOCALE cookie, falling back to the
// browser's Accept-Language header, then DEFAULT_LOCALE. The cookie is written
// when the user changes language (persisted to profiles.language server-side).
// -----------------------------------------------------------------------------

import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  SUPPORTED_LOCALES,
} from '@/lib/constants'

type Locale = (typeof SUPPORTED_LOCALES)[number]

function isSupported(value: string | undefined | null): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

function detectFromHeader(acceptLanguage: string | null): Locale | null {
  if (!acceptLanguage) return null
  for (const part of acceptLanguage.split(',')) {
    const code = part.trim().split(';')[0]?.split('-')[0]
    if (isSupported(code)) return code
  }
  return null
}

export default getRequestConfig(async () => {
  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value
  const headerLocale = detectFromHeader(headers().get('accept-language'))

  const locale: Locale = isSupported(cookieLocale)
    ? cookieLocale
    : (headerLocale ?? DEFAULT_LOCALE)

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  }
})
