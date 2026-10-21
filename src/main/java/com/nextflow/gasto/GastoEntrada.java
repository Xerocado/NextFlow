package com.nextflow.gasto;

import java.math.BigDecimal;
import java.time.LocalDate;
import jakarta.validation.constraints.*;

public record GastoEntrada(
        @NotBlank @Size(max = 120) String descricao,
        @NotNull @DecimalMin("0.01") @Digits(integer = 12, fraction = 2) BigDecimal valor,
        @NotNull LocalDate data,
        @Size(max = 60) String categoria,
        @Size(max = 500) String observacao) { }
