'use client'

import { atualizarLogo, atualizarTema } from '../../../../../lib/actions/tema'
import {
  mergeThemeCores,
  mergeThemeLogo,
  type TemaFormValues,
} from '../../../../../lib/utils/parse-theme'
import {
  themeToCssVarsStyle,
  type TenantTheme,
} from '../../../../../lib/theme-to-css-vars'
import { Alert, Button, Card, FileUpload, Input, Spinner } from '@saude/ui'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'

interface TemaViewProps {
  initialTheme: TenantTheme
  initialValores: TemaFormValues
}

const LOGO_ACCEPT = ['image/png', 'image/jpeg', 'image/svg+xml']

function buildPreviewTheme(
  base: TenantTheme,
  cores: Pick<TemaFormValues, 'primaryColor' | 'secondaryColor' | 'accentColor'>,
  logoUrl: string
): TenantTheme {
  return mergeThemeLogo(mergeThemeCores(base, cores), logoUrl)
}

export function TemaView({ initialTheme, initialValores }: TemaViewProps) {
  const savedSnapshot = useRef(initialValores)

  const [cores, setCores] = useState({
    primaryColor: initialValores.primaryColor,
    secondaryColor: initialValores.secondaryColor,
    accentColor: initialValores.accentColor,
  })
  const [logoUrl, setLogoUrl] = useState(initialValores.logoUrl)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)

  const [coresError, setCoresError] = useState<string | null>(null)
  const [coresSuccess, setCoresSuccess] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [logoSuccess, setLogoSuccess] = useState(false)

  const [isCoresPending, startCoresTransition] = useTransition()
  const [isLogoPending, startLogoTransition] = useTransition()

  const applyPreviewToDocument = useCallback(
    (draft: Pick<TemaFormValues, 'primaryColor' | 'secondaryColor' | 'accentColor'>, logo: string) => {
      const previewTheme = buildPreviewTheme(initialTheme, draft, logo)
      const vars = themeToCssVarsStyle(previewTheme)
      const root = document.documentElement
      for (const [name, value] of Object.entries(vars)) {
        if (typeof value === 'string') {
          root.style.setProperty(name, value)
        }
      }
    },
    [initialTheme]
  )

  const revertDocumentTheme = useCallback(() => {
    const snapshot = savedSnapshot.current
    applyPreviewToDocument(
      {
        primaryColor: snapshot.primaryColor,
        secondaryColor: snapshot.secondaryColor,
        accentColor: snapshot.accentColor,
      },
      snapshot.logoUrl
    )
  }, [applyPreviewToDocument])

  useEffect(() => {
    const root = document.documentElement
    const names = [
      '--color-primary',
      '--color-primary-hover',
      '--color-primary-light',
      '--color-header-bg',
      '--color-header-text',
      '--color-secondary',
      '--color-accent',
    ] as const
    applyPreviewToDocument(
      {
        primaryColor: initialValores.primaryColor,
        secondaryColor: initialValores.secondaryColor,
        accentColor: initialValores.accentColor,
      },
      initialValores.logoUrl
    )

    return () => {
      for (const name of names) {
        root.style.removeProperty(name)
      }
    }
  }, [applyPreviewToDocument, initialValores])

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl)
      }
    }
  }, [localPreviewUrl])

  function handleCorChange(field: keyof typeof cores, value: string) {
    setCoresSuccess(false)
    const next = { ...cores, [field]: value }
    setCores(next)
    applyPreviewToDocument(next, logoUrl)
  }

  function handleCancelCores() {
    setCores({
      primaryColor: savedSnapshot.current.primaryColor,
      secondaryColor: savedSnapshot.current.secondaryColor,
      accentColor: savedSnapshot.current.accentColor,
    })
    setCoresError(null)
    setCoresSuccess(false)
    revertDocumentTheme()
  }

  function handleSaveCores(event: React.FormEvent) {
    event.preventDefault()
    setCoresError(null)
    setCoresSuccess(false)

    startCoresTransition(async () => {
      const res = await atualizarTema(cores)
      if (!res.success) {
        setCoresError(res.error)
        return
      }
      savedSnapshot.current = {
        ...savedSnapshot.current,
        ...cores,
      }
      setCoresSuccess(true)
    })
  }

  function handleCancelLogo() {
    setLogoUrl(savedSnapshot.current.logoUrl)
    setLogoError(null)
    setLogoSuccess(false)
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl)
      setLocalPreviewUrl(null)
    }
    revertDocumentTheme()
  }

  function handleSaveLogo(event: React.FormEvent) {
    event.preventDefault()
    setLogoError(null)
    setLogoSuccess(false)

    startLogoTransition(async () => {
      const res = await atualizarLogo({ logoUrl })
      if (!res.success) {
        setLogoError(res.error)
        return
      }
      savedSnapshot.current = { ...savedSnapshot.current, logoUrl }
      setLogoSuccess(true)
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl)
        setLocalPreviewUrl(null)
      }
    })
  }

  const displayLogo = localPreviewUrl || logoUrl || null

  return (
    <div className="flex flex-col gap-[var(--space-8)] lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-[var(--space-6)]">
        <Card className="flex flex-col gap-[var(--space-4)] p-[var(--space-4)]">
          <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
            Cores do município
          </h2>
          <form onSubmit={handleSaveCores} className="flex flex-col gap-[var(--space-4)]">
            <ColorField
              label="Cor primária"
              value={cores.primaryColor}
              onChange={(v) => handleCorChange('primaryColor', v)}
              disabled={isCoresPending}
            />
            <ColorField
              label="Cor secundária"
              value={cores.secondaryColor}
              onChange={(v) => handleCorChange('secondaryColor', v)}
              disabled={isCoresPending}
            />
            <ColorField
              label="Cor de acento"
              value={cores.accentColor}
              onChange={(v) => handleCorChange('accentColor', v)}
              disabled={isCoresPending}
            />
            {coresError ? (
              <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
                {coresError}
              </p>
            ) : null}
            {coresSuccess ? (
              <p className="text-[length:var(--text-sm)] text-[var(--color-success)]">
                Cores salvas. A página será atualizada no próximo carregamento completo.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-[var(--space-3)]">
              <Button type="submit" variant="primary" disabled={isCoresPending}>
                {isCoresPending ? (
                  <>
                    <Spinner className="size-4" />
                    Salvando...
                  </>
                ) : (
                  'Salvar cores'
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancelCores}
                disabled={isCoresPending}
              >
                Cancelar alterações
              </Button>
            </div>
          </form>
        </Card>

        <Card className="flex flex-col gap-[var(--space-4)] p-[var(--space-4)]">
          <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
            Logo do município
          </h2>
          <Alert variant="info" titulo="Upload de arquivo">
            O envio ao storage da plataforma ainda não está disponível nesta sprint. Informe a
            URL pública da imagem (PNG, JPG ou SVG, até 2 MB quando o upload estiver ativo).
          </Alert>
          <form onSubmit={handleSaveLogo} className="flex flex-col gap-[var(--space-4)]">
            <FileUpload
              label="Pré-visualizar arquivo local"
              accept={LOGO_ACCEPT}
              maxSizeMB={2}
              disabled={isLogoPending}
              onUpload={(file) => {
                if (localPreviewUrl) {
                  URL.revokeObjectURL(localPreviewUrl)
                }
                setLocalPreviewUrl(URL.createObjectURL(file))
                setLogoSuccess(false)
              }}
            />
            <Input
              label="URL da logo"
              type="url"
              value={logoUrl}
              onChange={(e) => {
                setLogoUrl(e.target.value)
                setLogoSuccess(false)
                applyPreviewToDocument(cores, e.target.value)
              }}
              placeholder="https://..."
              hint="URL HTTPS acessível pelo navegador dos servidores."
              disabled={isLogoPending}
            />
            {logoError ? (
              <p role="alert" className="text-[length:var(--text-sm)] text-[var(--color-error)]">
                {logoError}
              </p>
            ) : null}
            {logoSuccess ? (
              <p className="text-[length:var(--text-sm)] text-[var(--color-success)]">
                Logo salva.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-[var(--space-3)]">
              <Button type="submit" variant="primary" disabled={isLogoPending || !logoUrl.trim()}>
                {isLogoPending ? (
                  <>
                    <Spinner className="size-4" />
                    Salvando...
                  </>
                ) : (
                  'Salvar logo'
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancelLogo}
                disabled={isLogoPending}
              >
                Cancelar alterações
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <aside className="w-full shrink-0 lg:w-80">
        <Card className="sticky top-[var(--space-4)] flex flex-col gap-[var(--space-4)] p-[var(--space-4)]">
          <h2 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text)]">
            Pré-visualização ao vivo
          </h2>
          <div
            className="overflow-hidden rounded-[var(--radius)] border border-[var(--color-border)]"
            style={{
              background: 'var(--color-header-bg)',
              color: 'var(--color-header-text)',
            }}
          >
            <div className="flex items-center gap-[var(--space-3)] px-[var(--space-4)] py-[var(--space-3)]">
              {displayLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={displayLogo}
                  alt=""
                  className="h-10 w-10 rounded-[var(--radius-sm)] object-contain bg-white/10"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-white/20 text-[length:var(--text-xs)]">
                  Logo
                </div>
              )}
              <span className="text-[length:var(--text-sm)] font-semibold">
                {initialValores.municipalityName || 'Município'}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-[var(--space-2)]">
            <Button type="button" variant="primary" className="pointer-events-none w-full">
              Botão primário
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="pointer-events-none w-full"
              style={{
                background: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
              }}
            >
              Botão secundário
            </Button>
            <p
              className="text-[length:var(--text-sm)]"
              style={{ color: 'var(--color-secondary)' }}
            >
              Texto com cor secundária
            </p>
            <span
              className="inline-flex w-fit rounded-[var(--radius-sm)] px-[var(--space-2)] py-[var(--space-1)] text-[length:var(--text-xs)] font-medium"
              style={{
                background: 'color-mix(in srgb, var(--color-accent) 18%, white)',
                color: 'var(--color-accent)',
              }}
            >
              Destaque (acento)
            </span>
          </div>
          <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
            Alterações na pré-visualização são temporárias até salvar ou cancelar.
          </p>
        </Card>
      </aside>
    </div>
  )
}

interface ColorFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

function ColorField({ label, value, onChange, disabled }: ColorFieldProps) {
  return (
    <div className="flex flex-wrap items-center gap-[var(--space-3)]">
      <label className="min-w-[8rem] text-[length:var(--text-sm)] font-medium text-[var(--color-text)]">
        {label}
      </label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-11 w-14 cursor-pointer rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-transparent p-0.5"
        aria-label={label}
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="max-w-[8rem] font-mono text-[length:var(--text-sm)]"
        aria-label={`${label} (hex)`}
      />
    </div>
  )
}
