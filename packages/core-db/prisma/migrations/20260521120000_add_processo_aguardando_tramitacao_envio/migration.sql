-- Processo aguardando regulação após envio TFD; tramitação de envio da solicitação.
ALTER TYPE "public"."processo_status" ADD VALUE IF NOT EXISTS 'AGUARDANDO';
ALTER TYPE "public"."tramitacao_tipo" ADD VALUE IF NOT EXISTS 'ENVIO';
