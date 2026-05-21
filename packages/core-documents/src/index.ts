export { createAuditLog, type CreateAuditLogInput } from './audit'

export { gerarProtocolo, type PrismaTransactionClient } from './protocol'

export { registrarTramitacao, type RegistrarTramitacaoInput } from './tramitacao'

export {
  solicitarUrlUpload,
  confirmarUpload,
  validarUrlAssinada,
  resolveLocalAnexoPath,
  StorageValidationError,
  StorageConfigError,
  StorageNotFoundError,
  type StorageDbClient,
  type StorageMimeType,
  type StorageProvider,
  type SolicitarUrlUploadInput,
  type SolicitarUrlUploadOutput,
  type ConfirmarUploadInput,
  type ConfirmarUploadOutput,
} from './storage'

export {
  getCadsusService,
  CadsusStub,
  CadsusRnds,
} from './cadsus'

export type { CadsusResult, CadsusService } from './cadsus'
