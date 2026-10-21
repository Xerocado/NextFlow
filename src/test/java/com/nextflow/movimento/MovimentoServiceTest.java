package com.nextflow.movimento;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import com.nextflow.entrega.*;
import com.nextflow.estabelecimento.*;
import com.nextflow.gasto.GastoRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class MovimentoServiceTest {
    final EstabelecimentoRepository empresas = mock(EstabelecimentoRepository.class);
    final EntregaRepository entregas = mock(EntregaRepository.class);
    final PagamentoRepository pagamentos = mock(PagamentoRepository.class);
    final GastoRepository gastos = mock(GastoRepository.class);
    final MovimentoService service = new MovimentoService(empresas, entregas, pagamentos, gastos);
    final UUID usuario = UUID.randomUUID(), empresa = UUID.randomUUID();
    final LocalDate data = LocalDate.of(2026, 10, 23);

    void autorizar() {
        when(empresas.buscarDoUsuario(usuario, empresa)).thenReturn(Optional.of(new Estabelecimento("Teste", Instant.EPOCH)));
    }

    @Test void saldoUsaRecebimentosEfetivosETotaisNaoDependemDaPagina() {
        autorizar();
        var resumo = mock(EntregaRepository.ResumoDia.class);
        when(resumo.getQuantidade()).thenReturn(2L);
        when(resumo.getLitros()).thenReturn(1000L);
        when(resumo.getValor()).thenReturn(new BigDecimal("150.00"));
        when(entregas.resumirDia(empresa, data)).thenReturn(resumo);
        when(pagamentos.totalDoDia(empresa, data)).thenReturn(new BigDecimal("100.10"));
        when(gastos.totalDoDia(empresa, data)).thenReturn(new BigDecimal("25.20"));
        when(pagamentos.listarDia(empresa, data, PageRequest.of(0, 1)))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 1), 3));
        var dia = service.consultar(usuario, empresa, data, 0, 1);
        assertThat(dia.totalEntregas()).isEqualByComparingTo("150");
        assertThat(dia.saldoDoDia()).isEqualByComparingTo("74.90");
        assertThat(dia.totalLitros()).isEqualTo(1000);
        assertThat(dia.recebimentos().total()).isEqualTo(3);
    }

    @Test void empresaAlheiaNaoConsultaDadosFinanceiros() {
        assertThatThrownBy(() -> service.consultar(usuario, empresa, data, 0, 20)).isInstanceOf(EstabelecimentoNaoEncontradoException.class);
        verifyNoInteractions(entregas, pagamentos, gastos);
    }

    @Test void validaDataEPaginacaoAntesDasConsultas() {
        autorizar();
        assertThatIllegalArgumentException().isThrownBy(() -> service.consultar(usuario, empresa, null, 0, 20));
        assertThatIllegalArgumentException().isThrownBy(() -> service.consultar(usuario, empresa, data, -1, 20));
        for (int tamanho : new int[]{0, 101})
            assertThatIllegalArgumentException().isThrownBy(() -> service.consultar(usuario, empresa, data, 0, tamanho));
        verifyNoInteractions(entregas, pagamentos, gastos);
    }
}
