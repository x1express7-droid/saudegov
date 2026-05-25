export interface ViaCepResponse {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

export async function buscarEnderecoPorCep(cep: string): Promise<ViaCepResponse | null> {
  const digits = cep.replace(/\D/g, '')
  if (digits.length !== 8) {
    return null
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      return null
    }
    const data = (await response.json()) as ViaCepResponse
    if (data.erro) {
      return null
    }
    return data
  } catch {
    return null
  }
}
