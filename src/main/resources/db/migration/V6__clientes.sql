-- Cadastro separado por estabelecimento, sem saldos ou exclusao em cascata.
CREATE TABLE clientes (
    id UUID PRIMARY KEY,
    estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id),
    nome VARCHAR(120) NOT NULL CHECK (length(trim(nome)) > 0),
    telefone VARCHAR(30),
    observacao VARCHAR(500),
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX idx_clientes_empresa_nome ON clientes(estabelecimento_id, nome, id);
