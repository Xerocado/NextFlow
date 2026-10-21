package com.nextflow.cliente;

import jakarta.validation.constraints.*;

public record ClienteEntrada(
        @NotBlank @Size(max = 120) String nome,
        @Size(max = 30) @Pattern(regexp = "[0-9+() .-]*") String telefone,
        @Size(max = 500) String observacao) { }
