-- Gastos efetivamente pagos, em BRL. Sem recorrencia ou agendamento.
CREATE TABLE gastos (
    id UUID PRIMARY KEY,
    estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id),
    descricao VARCHAR(120) NOT NULL CHECK (length(trim(descricao)) > 0),
    valor NUMERIC(14, 2) NOT NULL CHECK (valor > 0),
    data DATE NOT NULL,
    categoria VARCHAR(60),
    observacao VARCHAR(500),
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX idx_gastos_empresa_data ON gastos(estabelecimento_id, data, criado_em DESC, id DESC);
