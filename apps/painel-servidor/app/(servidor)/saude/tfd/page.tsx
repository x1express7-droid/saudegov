import { redirect } from 'next/navigation'

/** Raiz do módulo TFD: middleware envia para processos; fallback server-side. */
export default function TfdModuleIndexPage() {
  redirect('/saude/tfd/processos')
}
