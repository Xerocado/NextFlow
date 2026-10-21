ALTER TABLE estabelecimentos
    ADD COLUMN atividade varchar(30),
    ADD COLUMN telefone varchar(30),
    ADD COLUMN cep varchar(9),
    ADD COLUMN logradouro varchar(150),
    ADD COLUMN numero varchar(20),
    ADD COLUMN complemento varchar(100),
    ADD COLUMN bairro varchar(100),
    ADD COLUMN cidade varchar(100),
    ADD COLUMN uf varchar(2),
    ADD COLUMN sem_numero boolean NOT NULL DEFAULT false;
