import { addDays, format } from 'date-fns'

/** Período padrão da listagem: hoje até +90 dias (cobre consultas com antecedência mínima de 72h). */
export function getDefaultAgendamentosPeriodo(): { dataInicio: string; dataFim: string } {
  const hoje = new Date()
  return {
    dataInicio: format(hoje, 'yyyy-MM-dd'),
    dataFim: format(addDays(hoje, 90), 'yyyy-MM-dd'),
  }
}
