-- Migration: sprint_4_4_campos_veiculo_motorista
-- Sprint 4.4 — campos opcionais de identificação em veículos e CNS em motoristas

ALTER TABLE saude_tfd.veiculos
  ADD COLUMN fabricante VARCHAR(100),
  ADD COLUMN ano INTEGER,
  ADD COLUMN cor VARCHAR(50),
  ADD COLUMN renavam VARCHAR(20),
  ADD COLUMN chassi VARCHAR(30);

ALTER TABLE saude_tfd.motoristas
  ADD COLUMN cns VARCHAR(20);
