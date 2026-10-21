package com.nextflow;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import com.nextflow.entrega.*;
import com.nextflow.estabelecimento.*;
import com.nextflow.gasto.*;
import com.nextflow.movimento.MovimentoService;
import com.nextflow.usuario.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@Testcontainers
class EntregaIT {
    @Container @ServiceConnection
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine");
    @Autowired EntregaService entregas;
    @Autowired EstabelecimentoService empresas;
    @Autowired UsuarioRepository usuarios;
    @Autowired GastoService gastos;
    @Autowired MovimentoService movimento;

    Usuario usuario() {
        return usuarios.saveAndFlush(new Usuario("Teste", UUID.randomUUID()+"@example.test", "hash-ficticio", Instant.EPOCH));
    }
    EntregaEntrada entrada(LocalDate data, boolean gratis) {
        return new EntregaEntrada(data, null, null, BigDecimal.valueOf(1000), new BigDecimal("150"), gratis, null);
    }

    @Test void dataEfetivaMantemEntregaHistoricaEIsolaEmpresas() {
        var dono = usuario();
        var empresa = empresas.criar(dono.getId(), "A");
        var outra = empresas.criar(dono.getId(), "B");
        var dia = LocalDate.now(ZoneId.of("America/Sao_Paulo"));
        var entrega = entregas.criar(dono.getId(), empresa.id(), entrada(dia.minusDays(13), false));
        entregas.receber(dono.getId(), empresa.id(), entrega.id(), new PagamentoEntrada(dia, new BigDecimal("100")));
        entregas.criar(dono.getId(), empresa.id(), entrada(dia, true));
        gastos.criar(dono.getId(), empresa.id(), new GastoEntrada("Diesel", new BigDecimal("25.10"), dia, null, null));
        var resumo = movimento.consultar(dono.getId(), empresa.id(), dia, 0, 1);
        assertThat(resumo.totalRecebido()).isEqualByComparingTo("100");
        assertThat(resumo.totalEntregas()).isZero();
        assertThat(resumo.quantidadeEntregas()).isEqualTo(1);
        assertThat(resumo.totalLitros()).isEqualTo(1000);
        assertThat(resumo.saldoDoDia()).isEqualByComparingTo("74.90");
        assertThat(resumo.recebimentos().itens().getFirst().entregaId()).isEqualTo(entrega.id());
        assertThat(entregas.consultar(dono.getId(), empresa.id(), entrega.id()).entrega().saldoPendente()).isEqualByComparingTo("50");
        assertThat(entregas.listar(dono.getId(), empresa.id(), dia.minusDays(13), dia, true, 0, 20).total()).isEqualTo(1);
        assertThatThrownBy(() -> entregas.receber(dono.getId(), outra.id(), entrega.id(), new PagamentoEntrada(dia, BigDecimal.ONE)))
                .isInstanceOf(EntregaNaoEncontradaException.class);
        assertThat(movimento.consultar(dono.getId(), outra.id(), dia, 0, 20).totalRecebido()).isZero();
        assertThatThrownBy(() -> movimento.consultar(usuario().getId(), empresa.id(), dia, 0, 20))
                .isInstanceOf(EstabelecimentoNaoEncontradoException.class);
    }

    @Test void pagamentosConcorrentesNaoUltrapassamSaldo() throws Exception {
        var dono = usuario();
        var empresa = empresas.criar(dono.getId(), "Concorrencia");
        var dia = LocalDate.now(ZoneId.of("America/Sao_Paulo"));
        var entrega = entregas.criar(dono.getId(), empresa.id(), entrada(dia, false));
        var inicio = new CountDownLatch(1);
        Callable<Boolean> pagar = () -> {
            inicio.await();
            try {
                entregas.receber(dono.getId(), empresa.id(), entrega.id(), new PagamentoEntrada(dia, new BigDecimal("100")));
                return true;
            } catch (IllegalArgumentException excedente) { return false; }
        };
        try (var executor = Executors.newFixedThreadPool(2)) {
            var primeiro = executor.submit(pagar);
            var segundo = executor.submit(pagar);
            inicio.countDown();
            assertThat(List.of(primeiro.get(20, TimeUnit.SECONDS), segundo.get(20, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(true, false);
        }
        var detalhe = entregas.consultar(dono.getId(), empresa.id(), entrega.id());
        assertThat(detalhe.pagamentos()).hasSize(1);
        assertThat(detalhe.entrega().saldoPendente()).isEqualByComparingTo("50");
    }
}
