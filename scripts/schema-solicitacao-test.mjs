import { abrirSolicitacaoSchema } from '../modules/saude/tfd/src/validators/solicitacao.schema.ts'

const base = {
  pacienteId: '00000000-0000-4000-8000-000000000001',
  tipoAtendimento: 'CONSULTA',
  urgencia: 'BAIXA',
  cidPrincipal: 'I10',
  diagnostico: 'Paciente com hipertensão arterial necessitando de consulta especializada.',
  tipoTransporteRecomendado: 'TERRESTRE_ONIBUS_LINHA',
  acompanhanteNecessario: false,
}

const tests = [
  ['Consulta sem esp', () => !abrirSolicitacaoSchema.safeParse(base).success],
  [
    'Consulta completa',
    () =>
      abrirSolicitacaoSchema.safeParse({
        ...base,
        especialidadeId: '00000000-0000-4000-8000-000000000003',
      }).success,
  ],
  ['Exame sem proc', () => !abrirSolicitacaoSchema.safeParse({ ...base, tipoAtendimento: 'EXAME', procedimentos: [] }).success],
  ['Cirurgia sem esp', () => abrirSolicitacaoSchema.safeParse({ ...base, tipoAtendimento: 'CIRURGIA' }).success],
  [
    'Consulta sem CID',
    () =>
      abrirSolicitacaoSchema.safeParse({
        ...base,
        cidPrincipal: '',
        especialidadeId: '00000000-0000-4000-8000-000000000003',
      }).success,
  ],
  ['Retorno sem origem', () => !abrirSolicitacaoSchema.safeParse({ ...base, tipoAtendimento: 'RETORNO', especialidadeId: '00000000-0000-4000-8000-000000000003' }).success],
  ['Multi laudos', () => abrirSolicitacaoSchema.safeParse({ ...base, especialidadeId: '00000000-0000-4000-8000-000000000003', laudoAnexoIds: ['00000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000011'] }).success],
  [
    'Acompanhante com paciente',
    () =>
      abrirSolicitacaoSchema.safeParse({
        ...base,
        especialidadeId: '00000000-0000-4000-8000-000000000003',
        acompanhanteNecessario: true,
        acompanhante: {
          pacienteId: '00000000-0000-4000-8000-000000000004',
          relacao: 'PAI_MAE',
        },
      }).success,
  ],
  [
    'Acompanhante igual ao paciente',
    () =>
      !abrirSolicitacaoSchema.safeParse({
        ...base,
        especialidadeId: '00000000-0000-4000-8000-000000000003',
        acompanhanteNecessario: true,
        acompanhante: {
          pacienteId: base.pacienteId,
          relacao: 'PAI_MAE',
        },
      }).success,
  ],
]

for (const [name, fn] of tests) {
  console.log(fn() ? 'PASS' : 'FAIL', name)
}
