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
