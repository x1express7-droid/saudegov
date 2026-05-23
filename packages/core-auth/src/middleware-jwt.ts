import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

import { authSecret, authUsesSecureCookies } from './auth-env'

export async function getAuthJwtFromRequest(req: NextRequest) {
  return getToken({
    req,
    secret: authSecret(),
    secureCookie: authUsesSecureCookies(),
  })
}
