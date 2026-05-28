-- Sprint 2.4 — suporte a retry de e-mail (notificacoes)

ALTER TABLE "public"."notificacoes"
  ADD COLUMN "evento" VARCHAR(80),
  ADD COLUMN "proxima_tentativa_at" TIMESTAMPTZ;

CREATE INDEX "idx_notif_email_retry"
  ON "public"."notificacoes" ("tenant_id", "canal", "status")
  WHERE "canal" = 'EMAIL'::"notificacao_canal"
    AND "status" IN ('PENDENTE'::"notificacao_status", 'FALHOU'::"notificacao_status");
