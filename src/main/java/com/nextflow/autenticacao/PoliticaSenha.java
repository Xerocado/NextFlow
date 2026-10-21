package com.nextflow.autenticacao;

import java.nio.charset.StandardCharsets;

public final class PoliticaSenha {
    private PoliticaSenha() { }

    public static void validar(String senha) {
        // BCrypt aceita no maximo 72 bytes, inclusive para caracteres acentuados.
        if (senha == null || senha.codePointCount(0, senha.length()) < 12
                || senha.getBytes(StandardCharsets.UTF_8).length > 72 || senha.isBlank()) {
            throw new IllegalArgumentException("A senha deve ter ao menos 12 caracteres e no maximo 72 bytes UTF-8.");
        }
    }
}
