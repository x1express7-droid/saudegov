import 'server-only'

export { createAuditLog, type CreateAuditLogInput } from './audit'

export { gerarProtocolo, type PrismaTransactionClient } from './protocol'

export { registrarTramitacao, type RegistrarTramitacaoInput } from './tramitacao'

export {
  solicitarUrlUpload,
  confirmarUpload,
  gerarUrlDownloadAnexo,
  validarUrlAssinada,
  resolveLocalAnexoPath,
  StorageValidationError,
  StorageConfigError,
  StorageNotFoundError,
  type StorageDbClient,
  type SolicitarUrlUploadInput,
  type SolicitarUrlUploadOutput,
  type ConfirmarUploadInput,
  type ConfirmarUploadOutput,
  type GerarUrlDownloadAnexoInput,
  type GerarUrlDownloadAnexoOutput,
} from './storage'

export type { StorageMimeType, StorageProvider } from './storage.types'

export {
  getCadsusService,
  CadsusStub,
  CadsusRnds,
} from './cadsus'

export type { CadsusResult, CadsusService } from './cadsus'

export {
  gerarPdfRelatorio,
  type GerarPdfRelatorioInput,
  type PdfRelatorioRodape,
  type PdfTabelaColuna,
} from './pdf/gerador-pdf-relatorio'

export {
  formatDataHoraBr,
  formatDateBr,
  formatDateBrFromDate,
  DEFAULT_EXPORT_TIMEZONE,
} from './utils/format-data-hora'

export {
  formatRodapeExport,
  type ExportRelatorioRodape,
} from './utils/export-rodape'

export {
  gerarCsvRelatorio,
  type GerarCsvRelatorioInput,
} from './csv/gerador-csv-relatorio'

export {
  salvarExportTemporarioPdf,
  salvarExportTemporarioCsv,
  salvarExportTemporarioJson,
  gerarUrlDownloadExportTemporario,
  validarUrlAssinadaExport,
  resolveLocalExportPath,
  EXPORT_URL_EXPIRES_MINUTES,
  ExportStorageConfigError,
  type ExportArquivoFormato,
  type SalvarExportTemporarioOutput,
  type GerarUrlDownloadExportOutput,
} from './export-storage'

export {
  assertTenantExportRateLimit,
  EXPORT_RATE_LIMIT_PER_TENANT_HOUR,
  ExportRateLimitError,
} from './export-rate-limit'
