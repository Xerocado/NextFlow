package com.nextflow.compartilhado.idempotencia;

public class ConflitoIdempotenciaException extends RuntimeException {
    public ConflitoIdempotenciaException() {
        super("A chave de repeticao ja foi usada com outros dados.");
    }
}
