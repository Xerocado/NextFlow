package com.nextflow.autenticacao;

import java.time.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class LimiteTentativasTest {
    @Test
    void limitaPorChaveELiberaAoExpirar() {
        Clock clock = mock(Clock.class);
        Instant inicio = Instant.parse("2026-01-01T00:00:00Z");
        when(clock.instant()).thenReturn(inicio);
        var limite = new LimiteTentativas(clock);
        assertThat(limite.permitir("a", 2)).isTrue();
        assertThat(limite.permitir("a", 2)).isTrue();
        assertThat(limite.permitir("a", 2)).isFalse();
        assertThat(limite.permitir("b", 2)).isTrue();
        when(clock.instant()).thenReturn(inicio.plusSeconds(900));
        assertThat(limite.permitir("a", 2)).isTrue();
    }

    @Test
    void limitaQuantidadeDeChavesNaMemoria() {
        var limite = new LimiteTentativas(Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));
        for (int i = 0; i < 5000; i++) {
            assertThat(limite.permitir("chave-" + i, 1)).isTrue();
        }
        assertThat(limite.permitir("nova-chave", 1)).isFalse();
    }
}
