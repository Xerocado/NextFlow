ALTER TABLE clientes ADD CONSTRAINT uq_clientes_empresa UNIQUE (id, estabelecimento_id);
CREATE TABLE entregas (
 id UUID PRIMARY KEY,
 estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id),
 cliente_id UUID,
 identificacao VARCHAR(120),
 data DATE NOT NULL,
 litros INTEGER NOT NULL CHECK (litros > 0),
 valor_total NUMERIC(14,2) NOT NULL CHECK (valor_total >= 0),
 valor_pago NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (valor_pago >= 0),
 sem_cobranca BOOLEAN NOT NULL,
 motivo VARCHAR(500),
 criado_em TIMESTAMP WITH TIME ZONE NOT NULL,
 UNIQUE (id, estabelecimento_id),
 FOREIGN KEY (cliente_id, estabelecimento_id) REFERENCES clientes(id, estabelecimento_id),
 CHECK ((sem_cobranca AND valor_pago = 0) OR (NOT sem_cobranca AND valor_total > 0 AND valor_pago <= valor_total))
);
CREATE INDEX idx_entregas_empresa_data ON entregas(estabelecimento_id, data, criado_em, id);
CREATE TABLE pagamentos_entrega (
 id UUID PRIMARY KEY,
 estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id),
 entrega_id UUID NOT NULL,
 data DATE NOT NULL,
 valor NUMERIC(14,2) NOT NULL CHECK (valor > 0),
 criado_em TIMESTAMP WITH TIME ZONE NOT NULL,
 FOREIGN KEY (entrega_id, estabelecimento_id) REFERENCES entregas(id, estabelecimento_id)
);
CREATE INDEX idx_pagamentos_empresa_entrega ON pagamentos_entrega(estabelecimento_id, entrega_id, data);
CREATE INDEX idx_pagamentos_empresa_data ON pagamentos_entrega(estabelecimento_id, data);
