-- Codigos anteriores pertencem ao contrato antigo e deixam de ser aceitos.
UPDATE tokens_recuperacao_senha SET expira_em = LEAST(expira_em, CURRENT_TIMESTAMP);
ALTER TABLE tokens_recuperacao_senha
    ADD COLUMN tentativas_invalidas INTEGER NOT NULL DEFAULT 0
        CHECK (tentativas_invalidas BETWEEN 0 AND 5);
-- O service ja substitui os codigos anteriores antes de criar um novo.
ALTER TABLE tokens_recuperacao_senha ADD CONSTRAINT uk_codigo_recuperacao_usuario UNIQUE (usuario_id);
