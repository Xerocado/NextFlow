package com.nextflow.cliente;

import java.util.UUID;

public record ClienteResposta(UUID id, String nome, String telefone, String observacao) { }
