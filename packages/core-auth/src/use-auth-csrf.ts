'use client'

import { useEffect, useState } from 'react'

/** Carrega o token CSRF do Auth.js antes de POST em /api/auth/callback/credentials. */
export function useAuthCsrfToken(): string {
  const [csrfToken, setCsrfToken] = useState('')

  useEffect(() => {
    void fetch('/api/auth/csrf', { credentials: 'include' })
      .then((res) => res.json())
      .then((data: { csrfToken?: string }) => {
        setCsrfToken(data.csrfToken ?? '')
      })
      .catch(() => {
        setCsrfToken('')
      })
  }, [])

  return csrfToken
}
