package com.nextflow.autenticacao;

public class SenhaIgualAtualException extends RuntimeException {
    public SenhaIgualAtualException() {
        super("A nova senha deve ser diferente da senha atual.");
    }
}
