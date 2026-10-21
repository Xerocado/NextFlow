package com.nextflow.autenticacao;

public interface EmailRecuperacao {
    void enviar(String destinatario, String token);
}
