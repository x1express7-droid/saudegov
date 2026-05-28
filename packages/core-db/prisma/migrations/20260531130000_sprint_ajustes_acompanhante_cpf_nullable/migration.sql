-- Sprint ajustes — CPF do acompanhante opcional (UI não coleta mais o campo)
ALTER TABLE saude_tfd.acompanhantes
  ALTER COLUMN cpf DROP NOT NULL;
