'use server'

import { signIn } from '@saude/core-auth/auth-node-painel-dev'
import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'

export async function loginWithCredentials(formData: FormData) {
  try {
    await signIn('credentials', formData)
  } catch (error) {
    if (error instanceof AuthError && error.type === 'CredentialsSignin') {
      redirect('/login?error=credentials')
    }
    throw error
  }
}
