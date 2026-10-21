package com.nextflow.gasto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record GastoResposta(UUID id, String descricao, BigDecimal valor, LocalDate data,
        String categoria, String observacao) { }
