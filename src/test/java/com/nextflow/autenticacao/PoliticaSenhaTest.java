package com.nextflow.autenticacao;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class PoliticaSenhaTest {
    @Test
    void aceitaFraseESenhaNoLimite() {
        assertThatCode(() -> PoliticaSenha.validar("uma frase de teste longa")).doesNotThrowAnyException();
        assertThatCode(() -> PoliticaSenha.validar("a".repeat(72))).doesNotThrowAnyException();
    }

    @Test
    void rejeitaSenhasCurtasVaziasELimiteEmBytes() {
        for (String senha : new String[]{null, "curta", " ".repeat(12), "a".repeat(73), "á".repeat(37)}) {
            assertThatIllegalArgumentException().isThrownBy(() -> PoliticaSenha.validar(senha));
        }
    }
}
