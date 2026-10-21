package com.nextflow.entrega;
import java.math.BigDecimal;
import java.time.LocalDate;
import jakarta.validation.constraints.*;
public record PagamentoEntrada(@NotNull LocalDate data,
        @NotNull @DecimalMin("0.01") @Digits(integer=12, fraction=2) BigDecimal valor) { }
