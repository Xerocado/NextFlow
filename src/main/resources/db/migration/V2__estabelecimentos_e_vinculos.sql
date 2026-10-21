CREATE TABLE estabelecimentos (
    id UUID PRIMARY KEY,
    nome VARCHAR(120) NOT NULL CHECK (length(trim(nome)) > 0),
    ativo BOOLEAN NOT NULL,
    moeda VARCHAR(3) NOT NULL CHECK (moeda = 'BRL'),
    fuso VARCHAR(60) NOT NULL CHECK (fuso = 'America/Sao_Paulo'),
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE vinculos_estabelecimento (
    id UUID PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id),
    papel VARCHAR(30) NOT NULL CHECK (papel = 'PROPRIETARIO'),
    criado_em TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE (usuario_id, estabelecimento_id)
);

-- Neste MVP cada negocio tem um proprietario; novos papeis exigirao nova migracao.
CREATE UNIQUE INDEX uk_estabelecimento_proprietario
    ON vinculos_estabelecimento (estabelecimento_id) WHERE papel = 'PROPRIETARIO';
