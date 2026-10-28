CREATE TABLE operacoes_idempotentes (
    estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id),
    operacao VARCHAR(20) NOT NULL CHECK (operacao IN ('ENTREGA', 'PAGAMENTO', 'GASTO')),
    chave UUID NOT NULL,
    hash_requisicao CHAR(64) NOT NULL CHECK (hash_requisicao ~ '^[0-9a-f]{64}$'),
    resultado_id UUID NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (estabelecimento_id, operacao, chave)
);
