import { maskCPF, maskCNS } from '@saude/core-auth/server'
import { getPrismaForTenant } from '@saude/core-db'

export const MUNICIPIO_EXPORT_MAX_REGISTROS = 50_000

export class MunicipioExportError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MunicipioExportError'
  }
}

export interface MunicipioExportTfdSolicitacao {
  protocolo: string
  status: string
  urgencia: string
  especialidade: string
  prestador: string
  tipoAtendimento: string
  criadoEm: string
  decididoEm: string | null
  canceladoEm: string | null
  atualizadoEm: string
}

export interface MunicipioExportTfdViagem {
  protocolo: string
  sequencia: number
  dataViagem: string
  horaSaida: string | null
  status: string
  motorista: string
  veiculo: string
  destino: string
}

export interface MunicipioExportTfdPrestacao {
  protocolo: string
  status: string
  valorTotal: number
  enviadoEm: string | null
  aprovadoEm: string | null
}

export interface MunicipioExportTfdSaldo {
  descricao: string
  fonte: string
  competenciaInicio: string
  competenciaFim: string
  valorTotal: number
  valorReservado: number
  valorConsumido: number
  valorDisponivel: number
  ativo: boolean
}

export interface MunicipioExportTfdPaciente {
  nome: string
  cpfMascarado: string | null
  cnsMascarado: string | null
  dataNascimento: string | null
  sexo: string | null
  municipio: string | null
  uf: string | null
  ativo: boolean
}

export interface MunicipioExportModuloVazio {
  modulo: string
  mensagem: string
}

export interface MunicipioExportDados {
  tfd?: {
    solicitacoes: MunicipioExportTfdSolicitacao[]
    viagens: MunicipioExportTfdViagem[]
    prestacoes: MunicipioExportTfdPrestacao[]
    saldos: MunicipioExportTfdSaldo[]
    pacientes: MunicipioExportTfdPaciente[]
  }
  modulosSemDados: MunicipioExportModuloVazio[]
}

export interface ColetarDadosMunicipioResult {
  dados: MunicipioExportDados
  modulosExportados: string[]
  totalRegistros: number
}

function parseDataInicioUtc(data: string): Date {
  const [year, month, day] = data.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(year, month - 1, day))
}

function parseDataFimUtc(data: string): Date {
  const [year, month, day] = data.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
}

function buildCreatedAtFilter(dataInicio?: string, dataFim?: string) {
  if (!dataInicio && !dataFim) {
    return undefined
  }
  return {
    ...(dataInicio ? { gte: parseDataInicioUtc(dataInicio) } : {}),
    ...(dataFim ? { lte: parseDataFimUtc(dataFim) } : {}),
  }
}

function formatHoraSaida(hora: Date | null): string | null {
  if (!hora) {
    return null
  }
  const horas = hora.getUTCHours().toString().padStart(2, '0')
  const minutos = hora.getUTCMinutes().toString().padStart(2, '0')
  return `${horas}:${minutos}`
}

function assertWithinExportLimit(total: number): void {
  if (total > MUNICIPIO_EXPORT_MAX_REGISTROS) {
    throw new MunicipioExportError(
      `A exportação ultrapassa ${MUNICIPIO_EXPORT_MAX_REGISTROS.toLocaleString('pt-BR')} registros. Refine o período ou os módulos selecionados.`
    )
  }
}

/** Módulos com implementação de coleta nesta sprint. */
const MODULOS_COM_COLETA = new Set<string>(['tfd'])

export async function coletarDadosMunicipioExport(input: {
  tenantId: string
  modulos: string[]
  dataInicio?: string
  dataFim?: string
}): Promise<ColetarDadosMunicipioResult> {
  const { tenantId, modulos, dataInicio, dataFim } = input
  const db = await getPrismaForTenant(tenantId)
  const createdAtFilter = buildCreatedAtFilter(dataInicio, dataFim)

  const dados: MunicipioExportDados = { modulosSemDados: [] }
  const modulosExportados: string[] = []
  let totalRegistros = 0

  for (const modulo of modulos) {
    if (!MODULOS_COM_COLETA.has(modulo)) {
      dados.modulosSemDados.push({
        modulo,
        mensagem: 'Módulo sem exportação de dados implementada nesta versão.',
      })
      modulosExportados.push(modulo)
      continue
    }

    if (modulo === 'tfd') {
      const solicitacaoWhere = {
        tenant_id: tenantId,
        ...(createdAtFilter ? { created_at: createdAtFilter } : {}),
      }

      const viagemWhere = {
        tenant_id: tenantId,
        ...(createdAtFilter ? { created_at: createdAtFilter } : {}),
      }

      const prestacaoWhere = {
        tenant_id: tenantId,
        viagem_id: { not: null },
        ...(createdAtFilter ? { created_at: createdAtFilter } : {}),
      }

      const pacienteWhere = {
        tenant_id: tenantId,
        ...(createdAtFilter ? { created_at: createdAtFilter } : {}),
      }

      const [
        solicitacaoCount,
        viagemCount,
        prestacaoCount,
        saldoCount,
        pacienteCount,
      ] = await Promise.all([
        db.tfdSolicitacao.count({ where: solicitacaoWhere }),
        db.tfdViagem.count({ where: viagemWhere }),
        db.tfdPrestacaoConta.count({ where: prestacaoWhere }),
        db.tfdSaldo.count({ where: { tenant_id: tenantId } }),
        db.paciente.count({ where: pacienteWhere }),
      ])

      const preTotal =
        solicitacaoCount + viagemCount + prestacaoCount + saldoCount + pacienteCount
      assertWithinExportLimit(preTotal)

      const [solicitacoesRows, viagensRows, prestacoesRows, saldosRows, pacientesRows] =
        await Promise.all([
          db.tfdSolicitacao.findMany({
            where: solicitacaoWhere,
            select: {
              status: true,
              urgencia: true,
              tipo_atendimento: true,
              created_at: true,
              decidido_at: true,
              cancelado_at: true,
              updated_at: true,
              especialidade: { select: { nome: true } },
              prestador: { select: { nome: true, cidade: true, estado: true } },
              processo: { select: { protocolo: true } },
            },
            orderBy: { created_at: 'desc' },
          }),
          db.tfdViagem.findMany({
            where: viagemWhere,
            select: {
              sequencia: true,
              data_viagem: true,
              hora_saida: true,
              status: true,
              motorista: { select: { user: { select: { name: true } } } },
              veiculo: { select: { placa: true, modelo: true } },
              solicitacao: {
                select: {
                  processo: { select: { protocolo: true } },
                  prestador: { select: { cidade: true, estado: true } },
                },
              },
            },
            orderBy: [{ data_viagem: 'asc' }, { sequencia: 'asc' }],
          }),
          db.tfdPrestacaoConta.findMany({
            where: prestacaoWhere,
            select: {
              status: true,
              updated_at: true,
              aprovado_at: true,
              viagem: {
                select: {
                  itens_despesa: { select: { valor: true } },
                  solicitacao: {
                    select: { processo: { select: { protocolo: true } } },
                  },
                },
              },
            },
            orderBy: { created_at: 'desc' },
          }),
          db.tfdSaldo.findMany({
            where: { tenant_id: tenantId },
            select: {
              id: true,
              descricao: true,
              fonte: true,
              valor_total: true,
              competencia_inicio: true,
              competencia_fim: true,
              ativo: true,
            },
            orderBy: [{ ativo: 'desc' }, { created_at: 'desc' }],
          }),
          db.paciente.findMany({
            where: pacienteWhere,
            select: {
              nome: true,
              cpf: true,
              cns: true,
              data_nascimento: true,
              sexo: true,
              municipio: true,
              uf: true,
              ativo: true,
            },
            orderBy: { nome: 'asc' },
          }),
        ])

      const saldoIds = saldosRows.map((row) => row.id)
      const reservasAgg =
        saldoIds.length > 0
          ? await db.tfdReservaSaldo.groupBy({
              by: ['saldo_id'],
              where: {
                tenant_id: tenantId,
                saldo_id: { in: saldoIds },
                status: 'ATIVA',
              },
              _sum: { valor_estimado: true },
            })
          : []
      const consumosAgg =
        saldoIds.length > 0
          ? await db.tfdMovimentacaoSaldo.groupBy({
              by: ['saldo_id'],
              where: {
                tenant_id: tenantId,
                saldo_id: { in: saldoIds },
                tipo: 'CONSUMO',
              },
              _sum: { valor: true },
            })
          : []

      const reservadoPorSaldo = new Map(
        reservasAgg.map((item) => [item.saldo_id, Number(item._sum.valor_estimado ?? 0)])
      )
      const consumidoPorSaldo = new Map(
        consumosAgg.map((item) => [item.saldo_id, Number(item._sum.valor ?? 0)])
      )

      const solicitacoes: MunicipioExportTfdSolicitacao[] = solicitacoesRows.map((row) => ({
        protocolo: row.processo.protocolo,
        status: row.status,
        urgencia: row.urgencia,
        especialidade: row.especialidade?.nome ?? '—',
        prestador:
          row.prestador?.nome != null
            ? `${row.prestador.nome} (${row.prestador.cidade}/${row.prestador.estado})`
            : '—',
        tipoAtendimento: row.tipo_atendimento,
        criadoEm: row.created_at.toISOString(),
        decididoEm: row.decidido_at?.toISOString() ?? null,
        canceladoEm: row.cancelado_at?.toISOString() ?? null,
        atualizadoEm: row.updated_at.toISOString(),
      }))

      const viagens: MunicipioExportTfdViagem[] = viagensRows.map((row) => {
        const prestador = row.solicitacao.prestador
        const destino =
          prestador?.cidade && prestador?.estado
            ? `${prestador.cidade}/${prestador.estado}`
            : prestador?.cidade ?? prestador?.estado ?? '—'

        return {
          protocolo: row.solicitacao.processo.protocolo,
          sequencia: row.sequencia,
          dataViagem: row.data_viagem.toISOString().slice(0, 10),
          horaSaida: formatHoraSaida(row.hora_saida),
          status: row.status,
          motorista: row.motorista?.user.name ?? '—',
          veiculo: row.veiculo ? `${row.veiculo.placa} — ${row.veiculo.modelo}` : '—',
          destino,
        }
      })

      const prestacoes: MunicipioExportTfdPrestacao[] = prestacoesRows.flatMap((row) => {
        if (!row.viagem) {
          return []
        }
        const valorTotal = row.viagem.itens_despesa.reduce(
          (acc, item) => acc + Number(item.valor),
          0
        )
        const enviadoEm =
          row.status === 'PENDENTE' ? null : row.updated_at.toISOString()

        return [
          {
            protocolo: row.viagem.solicitacao.processo.protocolo,
            status: row.status,
            valorTotal,
            enviadoEm,
            aprovadoEm: row.aprovado_at?.toISOString() ?? null,
          },
        ]
      })

      const saldos: MunicipioExportTfdSaldo[] = saldosRows.map((row) => {
        const valorTotal = Number(row.valor_total)
        const valorReservado = reservadoPorSaldo.get(row.id) ?? 0
        const valorConsumido = consumidoPorSaldo.get(row.id) ?? 0
        const valorDisponivel = valorTotal - valorReservado - valorConsumido

        return {
          descricao: row.descricao,
          fonte: row.fonte,
          competenciaInicio: row.competencia_inicio.toISOString().slice(0, 10),
          competenciaFim: row.competencia_fim.toISOString().slice(0, 10),
          valorTotal,
          valorReservado,
          valorConsumido,
          valorDisponivel,
          ativo: row.ativo,
        }
      })

      const pacientes: MunicipioExportTfdPaciente[] = pacientesRows.map((row) => ({
        nome: row.nome,
        cpfMascarado: row.cpf ? maskCPF(row.cpf) : null,
        cnsMascarado: row.cns ? maskCNS(row.cns) : null,
        dataNascimento: row.data_nascimento?.toISOString().slice(0, 10) ?? null,
        sexo: row.sexo,
        municipio: row.municipio,
        uf: row.uf,
        ativo: row.ativo,
      }))

      dados.tfd = { solicitacoes, viagens, prestacoes, saldos, pacientes }
      modulosExportados.push('tfd')
      totalRegistros +=
        solicitacoes.length +
        viagens.length +
        prestacoes.length +
        saldos.length +
        pacientes.length
    }
  }

  return { dados, modulosExportados, totalRegistros }
}
