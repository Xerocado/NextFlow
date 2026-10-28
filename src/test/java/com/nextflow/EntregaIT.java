package com.nextflow;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import com.nextflow.entrega.*;
import com.nextflow.cliente.*;
import com.nextflow.autenticacao.UsuarioAutenticado;
import com.nextflow.estabelecimento.*;
import com.nextflow.gasto.*;
import com.nextflow.movimento.MovimentoService;
import com.nextflow.usuario.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import jakarta.persistence.EntityManager;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class EntregaIT {
    @Container @ServiceConnection
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine");
    @Autowired EntregaService entregas;
    @Autowired EstabelecimentoService empresas;
    @Autowired UsuarioRepository usuarios;
    @Autowired GastoService gastos;
    @Autowired MovimentoService movimento;
    @Autowired ClienteService clientes;
    @Autowired MockMvc mvc;
    @Autowired PlatformTransactionManager transacoes;
    @Autowired EntityManager entityManager;
    @Autowired JdbcTemplate jdbc;

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

    @Test void pendenciasComecamEmTodoHistoricoEExibemSaldoCompletoPorEmpresa() throws Exception {
        var dono = usuario();
        var empresa = empresas.criar(dono.getId(), "Pendências antigas");
        var outra = empresas.criar(dono.getId(), "Outra empresa");
        var hoje = LocalDate.now(ZoneId.of("America/Sao_Paulo"));
        var antiga = entregas.criar(dono.getId(), empresa.id(), new EntregaEntrada(
                hoje.minusMonths(5), null, null, BigDecimal.ONE, new BigDecimal("1000.11"), false, null));
        var recente = entregas.criar(dono.getId(), empresa.id(), new EntregaEntrada(
                hoje.minusDays(1), null, null, BigDecimal.ONE, new BigDecimal("200.25"), false, null));
        entregas.receber(dono.getId(), empresa.id(), recente.id(),
                new PagamentoEntrada(hoje, new BigDecimal("50.05")));
        var quitada = entregas.criar(dono.getId(), empresa.id(), new EntregaEntrada(
                hoje, null, null, BigDecimal.ONE, new BigDecimal("30.00"), false, null));
        entregas.receber(dono.getId(), empresa.id(), quitada.id(), new PagamentoEntrada(hoje, new BigDecimal("30.00")));
        entregas.criar(dono.getId(), empresa.id(), new EntregaEntrada(
                hoje, null, null, BigDecimal.ONE, BigDecimal.ZERO, true, null));
        entregas.criar(dono.getId(), outra.id(), new EntregaEntrada(
                hoje.minusMonths(6), null, null, BigDecimal.ONE, new BigDecimal("99.99"), false, null));

        var primeira = entregas.listar(dono.getId(), empresa.id(), null, null, true, 0, 1);
        var segunda = entregas.listar(dono.getId(), empresa.id(), null, null, true, 1, 1);
        assertThat(primeira.total()).isEqualTo(2);
        assertThat(primeira.itens()).hasSize(1);
        assertThat(primeira.totalSaldoPendente()).isEqualTo("1150.31");
        assertThat(segunda.itens()).hasSize(1);
        assertThat(segunda.totalSaldoPendente()).isEqualTo("1150.31");
        mvc.perform(get("/api/estabelecimentos/" + empresa.id() + "/entregas")
                .with(user(new UsuarioAutenticado(dono))).param("pendentes", "true"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.totalSaldoPendente").value("1150.31"));

        var recentes = entregas.listar(dono.getId(), empresa.id(), hoje.minusDays(3), null, true, 0, 20);
        assertThat(recentes.total()).isEqualTo(1);
        assertThat(recentes.totalSaldoPendente()).isEqualTo("150.20");
        var antigas = entregas.listar(dono.getId(), empresa.id(), null, hoje.minusDays(2), true, 0, 20);
        assertThat(antigas.total()).isEqualTo(1);
        assertThat(antigas.itens().getFirst().id()).isEqualTo(antiga.id());
        assertThat(antigas.totalSaldoPendente()).isEqualTo("1000.11");
        assertThatIllegalArgumentException().isThrownBy(() -> entregas.listar(
                dono.getId(), empresa.id(), hoje, hoje.minusDays(1), true, 0, 20));
        assertThatIllegalArgumentException().isThrownBy(() -> entregas.listar(
                dono.getId(), empresa.id(), null, null, false, 0, 20));
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

    @Test void chaveRepetidaReproduzEntregaEPagamentoEConflitaComOutroConteudo() throws Exception {
        var dono = usuario();
        var empresa = empresas.criar(dono.getId(), "Idempotencia");
        var dia = LocalDate.now(ZoneId.of("America/Sao_Paulo"));
        var chaveEntrega = UUID.randomUUID();
        var corpo = "{\"data\":\"" + dia + "\",\"litros\":1000,\"valorTotal\":150,\"semCobranca\":false}";
        var caminho = "/api/estabelecimentos/" + empresa.id() + "/entregas";
        var primeira = mvc.perform(post(caminho).with(user(new UsuarioAutenticado(dono))).with(csrf())
                .header("Idempotency-Key", chaveEntrega).contentType("application/json").content(corpo))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        mvc.perform(post(caminho).with(user(new UsuarioAutenticado(dono))).with(csrf())
                .header("Idempotency-Key", chaveEntrega).contentType("application/json").content(corpo))
                .andExpect(status().isCreated()).andExpect(content().json(primeira));
        mvc.perform(post(caminho).with(user(new UsuarioAutenticado(dono))).with(csrf())
                .header("Idempotency-Key", chaveEntrega).contentType("application/json")
                .content(corpo.replace("150", "151"))).andExpect(status().isConflict());
        assertThat(entregas.listar(dono.getId(), empresa.id(), dia, dia, false, 0, 20).total()).isEqualTo(1);

        var entrega = entregas.criar(dono.getId(), empresa.id(), entrada(dia, false));
        var chavePagamento = UUID.randomUUID();
        var pagamento = new PagamentoEntrada(dia, new BigDecimal("25.10"));
        var primeiroPagamento = entregas.receber(dono.getId(), empresa.id(), entrega.id(), pagamento, chavePagamento);
        var repetido = entregas.receber(dono.getId(), empresa.id(), entrega.id(), pagamento, chavePagamento);
        assertThat(repetido).isEqualTo(primeiroPagamento);
        assertThat(entregas.consultar(dono.getId(), empresa.id(), entrega.id()).pagamentos()).hasSize(1);
        assertThat(entregas.consultar(dono.getId(), empresa.id(), entrega.id()).entrega().valorPago()).isEqualByComparingTo("25.10");
        var outraEntrega = entregas.criar(dono.getId(), empresa.id(), entrada(dia, false));
        assertThatThrownBy(() -> entregas.receber(dono.getId(), empresa.id(), outraEntrega.id(), pagamento, chavePagamento))
                .isInstanceOf(com.nextflow.compartilhado.idempotencia.ConflitoIdempotenciaException.class);
        assertThat(entregas.consultar(dono.getId(), empresa.id(), outraEntrega.id()).pagamentos()).isEmpty();
        assertThat(jdbc.queryForObject("select count(*) from operacoes_idempotentes where estabelecimento_id = ?",
                Integer.class, empresa.id())).isEqualTo(2);
    }

    @Test void pagamentoRepetidoConcorrenteComMesmaChaveCriaUmUnicoRecebimento() throws Exception {
        var dono = usuario();
        var empresa = empresas.criar(dono.getId(), "Reenvio concorrente");
        var dia = LocalDate.now(ZoneId.of("America/Sao_Paulo"));
        var entrega = entregas.criar(dono.getId(), empresa.id(), entrada(dia, false));
        var chave = UUID.randomUUID();
        var pagamento = new PagamentoEntrada(dia, new BigDecimal("50.25"));
        var inicio = new CountDownLatch(1);
        Callable<Pagamento.Resposta> repetir = () -> {
            inicio.await();
            return entregas.receber(dono.getId(), empresa.id(), entrega.id(), pagamento, chave);
        };
        var executor = Executors.newFixedThreadPool(2);
        try {
            var primeiro = executor.submit(repetir);
            var segundo = executor.submit(repetir);
            inicio.countDown();
            assertThat(primeiro.get(20, TimeUnit.SECONDS)).isEqualTo(segundo.get(20, TimeUnit.SECONDS));
        } finally { executor.shutdownNow(); }
        var detalhe = entregas.consultar(dono.getId(), empresa.id(), entrega.id());
        assertThat(detalhe.pagamentos()).hasSize(1);
        assertThat(detalhe.entrega().valorPago()).isEqualByComparingTo("50.25");
        assertThat(jdbc.queryForObject("select count(*) from operacoes_idempotentes where operacao = 'PAGAMENTO'", Integer.class)).isEqualTo(1);
    }

    @Test void rollbackRemoveOperacaoEPermiteRepetirComAChaveOriginal() {
        var dono = usuario();
        var empresa = empresas.criar(dono.getId(), "Rollback idempotente");
        var dia = LocalDate.now(ZoneId.of("America/Sao_Paulo"));
        var chave = UUID.randomUUID();
        var falha = new IllegalStateException("Falha simulada apos gravar a operacao");
        assertThatThrownBy(() -> new TransactionTemplate(transacoes).executeWithoutResult(status -> {
            entregas.criar(dono.getId(), empresa.id(), entrada(dia, false), chave);
            entityManager.flush();
            assertThat(jdbc.queryForObject("select count(*) from operacoes_idempotentes where estabelecimento_id = ?",
                    Integer.class, empresa.id())).isEqualTo(1);
            throw falha;
        })).isSameAs(falha);
        assertThat(jdbc.queryForObject("select count(*) from operacoes_idempotentes where estabelecimento_id = ?",
                Integer.class, empresa.id())).isZero();
        assertThat(entregas.listar(dono.getId(), empresa.id(), dia, dia, false, 0, 20).total()).isZero();
        var criada = entregas.criar(dono.getId(), empresa.id(), entrada(dia, false), chave);
        assertThat(entregas.criar(dono.getId(), empresa.id(), entrada(dia, false), chave).id()).isEqualTo(criada.id());
    }

    @Test void centavosQuitacaoPosteriorETotaisIndependemDaPagina() {
        var dono = usuario();
        var empresa = empresas.criar(dono.getId(), "Centavos");
        var dia = LocalDate.now(ZoneId.of("America/Sao_Paulo"));
        var entrega = entregas.criar(dono.getId(), empresa.id(), new EntregaEntrada(
                dia.minusDays(1), null, null, BigDecimal.ONE, new BigDecimal("0.30"), false, null));
        entregas.receber(dono.getId(), empresa.id(), entrega.id(), new PagamentoEntrada(dia, new BigDecimal("0.10")));
        assertThat(entregas.consultar(dono.getId(), empresa.id(), entrega.id()).entrega().saldoPendente())
                .isEqualByComparingTo("0.20");
        entregas.receber(dono.getId(), empresa.id(), entrega.id(), new PagamentoEntrada(dia, new BigDecimal("0.20")));
        gastos.criar(dono.getId(), empresa.id(), new GastoEntrada("A", new BigDecimal("0.10"), dia, null, null));
        gastos.criar(dono.getId(), empresa.id(), new GastoEntrada("B", new BigDecimal("0.05"), dia, null, null));

        var primeira = movimento.consultar(dono.getId(), empresa.id(), dia, 0, 1);
        var segunda = movimento.consultar(dono.getId(), empresa.id(), dia, 1, 1);
        for (var resumo : List.of(primeira, segunda)) {
            assertThat(resumo.totalRecebido()).isEqualByComparingTo("0.30");
            assertThat(resumo.totalGasto()).isEqualByComparingTo("0.15");
            assertThat(resumo.saldoDoDia()).isEqualByComparingTo("0.15");
            assertThat(resumo.recebimentos().total()).isEqualTo(2);
            assertThat(resumo.recebimentos().itens()).hasSize(1);
            assertThat(resumo.quantidadeEntregas()).isZero();
        }
        assertThat(primeira.recebimentos().itens().getFirst().id())
                .isNotEqualTo(segunda.recebimentos().itens().getFirst().id());
        assertThat(movimento.consultar(dono.getId(), empresa.id(), dia.minusDays(1), 0, 1).totalRecebido()).isZero();
        assertThat(entregas.consultar(dono.getId(), empresa.id(), entrega.id()).pagamentos()).hasSize(2);
        assertThat(entregas.consultar(dono.getId(), empresa.id(), entrega.id()).entrega().saldoPendente()).isZero();
        assertThat(entregas.listar(dono.getId(), empresa.id(), dia.minusDays(1), dia, true, 0, 1).total()).isZero();
    }

    @Test void rejeicoesNaoAlteramSaldoNemCriamRecebimento() {
        var dono = usuario();
        var empresa = empresas.criar(dono.getId(), "Rejeicoes");
        var dia = LocalDate.now(ZoneId.of("America/Sao_Paulo"));
        var entrega = entregas.criar(dono.getId(), empresa.id(), entrada(dia, false));
        for (var pagamento : List.of(
                new PagamentoEntrada(dia.plusDays(1), BigDecimal.ONE),
                new PagamentoEntrada(dia, new BigDecimal("150.01")),
                new PagamentoEntrada(dia, new BigDecimal("0.001")),
                new PagamentoEntrada(dia, BigDecimal.ZERO))) {
            assertThatIllegalArgumentException().isThrownBy(() -> entregas.receber(dono.getId(), empresa.id(), entrega.id(), pagamento));
        }
        var gratis = entregas.criar(dono.getId(), empresa.id(), entrada(dia, true));
        assertThatIllegalArgumentException().isThrownBy(() -> entregas.receber(dono.getId(), empresa.id(), gratis.id(),
                new PagamentoEntrada(dia, BigDecimal.ONE)));
        assertThat(entregas.consultar(dono.getId(), empresa.id(), entrega.id()).entrega().saldoPendente()).isEqualByComparingTo("150");
        assertThat(entregas.consultar(dono.getId(), empresa.id(), entrega.id()).pagamentos()).isEmpty();
        assertThat(entregas.consultar(dono.getId(), empresa.id(), gratis.id()).entrega().saldoPendente()).isZero();
        assertThat(entregas.consultar(dono.getId(), empresa.id(), gratis.id()).pagamentos()).isEmpty();
        assertThat(movimento.consultar(dono.getId(), empresa.id(), dia, 0, 1).totalRecebido()).isZero();
    }

    @Test void limiteMonetarioPersisteExatoEAgregadoPodeUltrapassaLo() {
        var dono = usuario();
        var empresa = empresas.criar(dono.getId(), "Limites");
        var dia = LocalDate.now(ZoneId.of("America/Sao_Paulo"));
        var limite = new BigDecimal("999999999999.99");
        for (int i = 0; i < 2; i++) {
            var entrega = entregas.criar(dono.getId(), empresa.id(), new EntregaEntrada(
                    dia, null, null, BigDecimal.ONE, limite, false, null));
            entregas.receber(dono.getId(), empresa.id(), entrega.id(), new PagamentoEntrada(dia, limite));
            assertThat(entregas.consultar(dono.getId(), empresa.id(), entrega.id()).entrega().valorPago()).isEqualByComparingTo(limite);
        }
        assertThatIllegalArgumentException().isThrownBy(() -> entregas.criar(dono.getId(), empresa.id(),
                new EntregaEntrada(dia, null, null, BigDecimal.ONE, new BigDecimal("1000000000000.00"), false, null)));
        var resumo = movimento.consultar(dono.getId(), empresa.id(), dia, 0, 1);
        assertThat(resumo.totalEntregas()).isEqualByComparingTo("1999999999999.98");
        assertThat(resumo.totalRecebido()).isEqualByComparingTo("1999999999999.98");
        assertThat(resumo.quantidadeEntregas()).isEqualTo(2);
    }

    @Test void rollbackDesfazPagamentoESaldoMesmoDepoisDoFlush() {
        var dono = usuario();
        var empresa = empresas.criar(dono.getId(), "Rollback");
        var dia = LocalDate.now(ZoneId.of("America/Sao_Paulo"));
        var entrega = entregas.criar(dono.getId(), empresa.id(), entrada(dia, false));
        var falha = new IllegalStateException("Falha simulada apos escrita");
        assertThatThrownBy(() -> new TransactionTemplate(transacoes).executeWithoutResult(status -> {
            entregas.receber(dono.getId(), empresa.id(), entrega.id(), new PagamentoEntrada(dia, new BigDecimal("50.25")));
            entityManager.flush();
            entityManager.clear();
            var dentro = entregas.consultar(dono.getId(), empresa.id(), entrega.id());
            assertThat(dentro.pagamentos()).hasSize(1);
            assertThat(dentro.entrega().valorPago()).isEqualByComparingTo("50.25");
            throw falha;
        })).isSameAs(falha);
        var depois = entregas.consultar(dono.getId(), empresa.id(), entrega.id());
        assertThat(depois.pagamentos()).isEmpty();
        assertThat(depois.entrega().valorPago()).isZero();
        assertThat(depois.entrega().saldoPendente()).isEqualByComparingTo("150");
        assertThat(movimento.consultar(dono.getId(), empresa.id(), dia, 0, 1).totalRecebido()).isZero();
    }

    @Test void clienteCadastradoPreservaNomeHistoricoERejeitaOutraEmpresa() {
        var dono = usuario();
        var empresa = empresas.criar(dono.getId(), "Cliente A");
        var outra = empresas.criar(dono.getId(), "Cliente B");
        var dia = LocalDate.now(ZoneId.of("America/Sao_Paulo"));
        var cliente = clientes.criar(dono.getId(), empresa.id(), new ClienteEntrada("Nome original", null, null));
        var entrada = new EntregaEntrada(dia, cliente.id(), null, BigDecimal.ONE, BigDecimal.TEN, false, null);
        var entrega = entregas.criar(dono.getId(), empresa.id(), entrada);
        clientes.atualizar(dono.getId(), empresa.id(), cliente.id(), new ClienteEntrada("Novo nome", null, null));
        assertThat(entregas.consultar(dono.getId(), empresa.id(), entrega.id()).entrega().identificacao()).isEqualTo("Nome original");
        assertThatThrownBy(() -> entregas.criar(dono.getId(), outra.id(), entrada)).isInstanceOf(ClienteNaoEncontradoException.class);
        assertThat(entregas.listar(dono.getId(), outra.id(), dia, dia, false, 0, 1).total()).isZero();
    }

    @Test void httpIsolaDetalhesListasTotaisEEscritas() throws Exception {
        var dono = usuario();
        var outro = usuario();
        var empresa = empresas.criar(dono.getId(), "Privada");
        var outra = empresas.criar(dono.getId(), "Mesmo dono");
        var dia = LocalDate.now(ZoneId.of("America/Sao_Paulo"));
        var entrega = entregas.criar(dono.getId(), empresa.id(), entrada(dia, false));
        var base = "/api/estabelecimentos/" + empresa.id();
        var corpo = "{\"data\":\"" + dia + "\",\"valor\":\"1.00\",\"usuarioId\":\"" + dono.getId() + "\"}";
        for (var rota : List.of(base + "/entregas/" + entrega.id(), base + "/entregas", base + "/movimento")) {
            mvc.perform(get(rota).with(user(new UsuarioAutenticado(outro)))
                    .param("inicio", dia.toString()).param("fim", dia.toString()).param("data", dia.toString()))
                    .andExpect(status().isNotFound());
        }
        mvc.perform(post(base + "/entregas/" + entrega.id() + "/pagamentos")
                .with(user(new UsuarioAutenticado(outro))).with(csrf()).contentType("application/json").content(corpo))
                .andExpect(status().isNotFound());
        var rotaOutra = "/api/estabelecimentos/" + outra.id() + "/entregas/" + entrega.id();
        mvc.perform(get(rotaOutra).with(user(new UsuarioAutenticado(dono)))).andExpect(status().isNotFound());
        mvc.perform(post(rotaOutra + "/pagamentos").with(user(new UsuarioAutenticado(dono))).with(csrf())
                .contentType("application/json").content(corpo)).andExpect(status().isNotFound());
        assertThat(entregas.consultar(dono.getId(), empresa.id(), entrega.id()).pagamentos()).isEmpty();
        assertThat(entregas.consultar(dono.getId(), empresa.id(), entrega.id()).entrega().saldoPendente()).isEqualByComparingTo("150");
    }
}
