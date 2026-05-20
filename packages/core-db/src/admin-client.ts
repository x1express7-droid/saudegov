// USO RESTRITO: apenas para apps/painel-dev e packages do core.
// Nunca usar em apps/painel-servidor ou modules/*.
// Não aplica RLS — acessa dados globais da plataforma.

import type { PrismaClient } from '@prisma/client'
import { prisma } from './prisma'

export function getPrismaAdmin(): PrismaClient {
  return prisma
}
