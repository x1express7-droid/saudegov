export interface TfdPacienteAtendimentoBuscaItem {
  id: string
  nome: string
  cpf: string | null
  cns: string | null
}

export interface TfdPacienteAtendimentoDetalhe {
  id: string
  nome: string
  cpf: string | null
  cns: string | null
  dataNascimento: string | null
  sexo: 'MASCULINO' | 'FEMININO' | 'NAO_INFORMADO' | null
  nomeMae: string | null
  municipioNascimento: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  municipio: string | null
  uf: string | null
  telefone: string | null
  telefoneAlternativo: string | null
}
