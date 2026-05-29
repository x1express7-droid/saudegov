import { abrirSolicitacaoSchema } from '../modules/saude/tfd/src/validators/solicitacao.schema.ts'

const base = {
  pacienteId: '00000000-0000-4000-8000-000000000001',
  prestadorId: '00000000-0000-4000-8000-000000000002',
  tipoAtendimento: 'CONSULTA',
  urgencia: 'BAIXA',
  acompanhanteNecessario: false,
}

const tests = [
  ['Consulta sem esp', () => !abrirSolicitacaoSchema.safeParse(base).success],
  ['Exame sem proc', () => !abrirSolicitacaoSchema.safeParse({ ...base, tipoAtendimento: 'EXAME', procedimentos: [] }).success],
  ['Cirurgia sem esp', () => abrirSolicitacaoSchema.safeParse({ ...base, tipoAtendimento: 'CIRURGIA' }).success],
  ['Retorno sem origem', () => !abrirSolicitacaoSchema.safeParse({ ...base, tipoAtendimento: 'RETORNO', especialidadeId: '00000000-0000-4000-8000-000000000003' }).success],
  ['Multi laudos', () => abrirSolicitacaoSchema.safeParse({ ...base, especialidadeId: '00000000-0000-4000-8000-000000000003', laudoAnexoIds: ['00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000011'] }).success],
  ['Acomp sem cpf', () => abrirSolicitacaoSchema.safeParse({ ...base, especialidadeId: '00000000-0000-4000-8000-000000000003', acompanhanteNecessario: true, acompanhante: { nome: 'Maria', telefone: '67999999999' } }).success],
]

for (const [name, fn] of tests) {
  console.log(fn() ? 'PASS' : 'FAIL', name)
}
