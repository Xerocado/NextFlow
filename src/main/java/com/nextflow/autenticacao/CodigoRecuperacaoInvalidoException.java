package com.nextflow.autenticacao;

public class CodigoRecuperacaoInvalidoException extends IllegalArgumentException {
    public CodigoRecuperacaoInvalidoException() {
        super("Codigo invalido, expirado ou limite de tentativas atingido. Solicite um novo codigo.");
    }
}
