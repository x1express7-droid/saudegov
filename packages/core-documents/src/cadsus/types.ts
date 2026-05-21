export interface CadsusResult {
  encontrado: boolean
  nome?: string
  dataNascimento?: string
  nomeMae?: string
  municipioNascimento?: string
  sexo?: 'MASCULINO' | 'FEMININO' | 'NAO_INFORMADO'
}

export interface CadsusService {
  buscarPorCns(cns: string): Promise<CadsusResult>
}
