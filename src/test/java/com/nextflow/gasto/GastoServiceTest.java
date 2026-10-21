package com.nextflow.gasto;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import com.nextflow.estabelecimento.*;
import jakarta.validation.Validation;
import org.junit.jupiter.api.*;
import org.springframework.data.domain.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class GastoServiceTest {
    private final GastoRepository gastos = mock(GastoRepository.class);
    private final EstabelecimentoRepository empresas = mock(EstabelecimentoRepository.class);
    private final UUID usuario = UUID.randomUUID();
    private final Estabelecimento empresa = new Estabelecimento("Empresa teste", Instant.EPOCH);
    private final LocalDate data = LocalDate.of(2026, 10, 17);
    private final jakarta.validation.ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
    private final GastoService service = new GastoService(gastos, empresas, factory.getValidator(), Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));

    @AfterEach void fechar() { factory.close(); }
    private GastoEntrada entrada(String valor) { return new GastoEntrada(" Transporte ", new BigDecimal(valor), data, "  ", " exemplo "); }
    private void autorizar() {
        when(empresas.buscarDoProprietario(usuario, empresa.getId(), VinculoEstabelecimento.Papel.PROPRIETARIO)).thenReturn(Optional.of(empresa));
    }

    @Test void dinheiroMantemCentavosSemArredondarENormalizaOpcionais() {
        autorizar();
        when(gastos.save(any())).thenAnswer(invocacao -> invocacao.getArgument(0));
        var resposta = service.criar(usuario, empresa.getId(), entrada("25.50"));
        assertThat(resposta.valor()).isEqualByComparingTo("25.50");
        assertThat(resposta.descricao()).isEqualTo("Transporte");
        assertThat(resposta.categoria()).isNull();
        assertThat(resposta.observacao()).isEqualTo("exemplo");
        assertThat(resposta.data()).isEqualTo(data);
    }

    @Test void rejeitaValorZeroNegativoPrecisaoELimiteAntesDeGravar() {
        autorizar();
        for (var valor : List.of("0", "-1", "1.001", "1000000000000")) {
            assertThatIllegalArgumentException().isThrownBy(() -> service.criar(usuario, empresa.getId(), entrada(valor)));
        }
        assertThatIllegalArgumentException().isThrownBy(() -> service.criar(usuario, empresa.getId(),
                new GastoEntrada(" ", BigDecimal.ONE, null, "x".repeat(61), "x".repeat(501))));
        verifyNoInteractions(gastos);
    }

    @Test void empresaAlheiaNaoPermiteCriarLerOuTotalizar() {
        assertThatThrownBy(() -> service.criar(usuario, empresa.getId(), entrada("1"))).isInstanceOf(EstabelecimentoNaoEncontradoException.class);
        assertThatThrownBy(() -> service.listar(usuario, empresa.getId(), data, 0, 20)).isInstanceOf(EstabelecimentoNaoEncontradoException.class);
        verifyNoInteractions(gastos);
    }

    @Test void listaETotalUsamEmpresaEDataETotalNaoSeLimitaAPagina() {
        when(empresas.buscarDoUsuario(usuario, empresa.getId())).thenReturn(Optional.of(empresa));
        var gasto = new Gasto(empresa.getId(), entrada("0.10"), Instant.EPOCH);
        when(gastos.findByEstabelecimentoIdAndDataOrderByCriadoEmDescIdDesc(empresa.getId(), data, PageRequest.of(0, 1)))
                .thenReturn(new PageImpl<>(List.of(gasto), PageRequest.of(0, 1), 2));
        when(gastos.totalDoDia(empresa.getId(), data)).thenReturn(new BigDecimal("0.30"));
        var dia = service.listar(usuario, empresa.getId(), data, 0, 1);
        assertThat(dia.total()).isEqualTo(2);
        assertThat(dia.itens()).hasSize(1);
        assertThat(dia.totalGasto()).isEqualByComparingTo("0.30");
        assertThatIllegalArgumentException().isThrownBy(() -> service.listar(usuario, empresa.getId(), data, -1, 20));
    }
}
