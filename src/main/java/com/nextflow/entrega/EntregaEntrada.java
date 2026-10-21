package com.nextflow.entrega;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import jakarta.validation.constraints.*;
public record EntregaEntrada(@NotNull LocalDate data, UUID clienteId,
        @Size(max=120) String identificacaoAvulso,
        @NotNull @Positive @DecimalMax("2147483647") @Digits(integer=10, fraction=0) BigDecimal litros,
        @NotNull @DecimalMin("0.00") @Digits(integer=12, fraction=2) BigDecimal valorTotal,
        boolean semCobranca, @Size(max=500) String motivo) { }
