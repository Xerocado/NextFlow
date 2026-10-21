package com.nextflow.entrega;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import com.nextflow.cliente.*;
import com.nextflow.estabelecimento.*;
import jakarta.validation.Validation;
import org.junit.jupiter.api.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class EntregaServiceTest {
    final EntregaRepository entregas=mock(EntregaRepository.class);
    final PagamentoRepository pagamentos=mock(PagamentoRepository.class);
    final ClienteRepository clientes=mock(ClienteRepository.class);
    final EstabelecimentoRepository empresas=mock(EstabelecimentoRepository.class);
    final UUID usuario=UUID.randomUUID();
    final Estabelecimento empresa=new Estabelecimento("Teste",Instant.EPOCH);
    final jakarta.validation.ValidatorFactory factory=Validation.buildDefaultValidatorFactory();
    final Clock clock=Clock.fixed(Instant.parse("2026-10-23T15:00:00Z"),ZoneOffset.UTC);
    final EntregaService service=new EntregaService(entregas,pagamentos,clientes,empresas,factory.getValidator(),clock);
    final LocalDate dia=LocalDate.of(2026,10,10);
    @AfterEach void fechar() { factory.close(); }
    void autorizar() {
        when(empresas.buscarDoProprietario(usuario,empresa.getId(),VinculoEstabelecimento.Papel.PROPRIETARIO)).thenReturn(Optional.of(empresa));
        when(empresas.buscarDoUsuario(usuario,empresa.getId())).thenReturn(Optional.of(empresa));
        when(entregas.save(any())).thenAnswer(i->i.getArgument(0));
        when(pagamentos.save(any())).thenAnswer(i->i.getArgument(0));
    }
    EntregaEntrada entrada(boolean gratis, String valor) { return new EntregaEntrada(dia,null,null,new BigDecimal("1000"),new BigDecimal(valor),gratis,null); }
    Entrega preparar() {
        var e=new Entrega(empresa.getId(),entrada(false,"150.00"),null,clock.instant());
        when(entregas.bloquear(e.id(),empresa.getId())).thenReturn(Optional.of(e)); return e;
    }
    @Test void preservaValorManualEPermiteAvulsoAnonimo() {
        autorizar(); var r=service.criar(usuario,empresa.getId(),entrada(false,"137.50"));
        assertThat(r.valorTotal()).isEqualByComparingTo("137.50");
        assertThat(r.saldoPendente()).isEqualByComparingTo("137.50");
        assertThat(r.identificacao()).isNull(); verifyNoInteractions(clientes);
    }
    @Test void pagamentosParciaisEmDatasDistintasQuitamSemCredito() {
        autorizar(); var e=preparar();
        service.receber(usuario,empresa.getId(),e.id(),new PagamentoEntrada(dia,new BigDecimal("50")));
        assertThat(e.saldo()).isEqualByComparingTo("100");
        var r=service.receber(usuario,empresa.getId(),e.id(),new PagamentoEntrada(LocalDate.of(2026,10,23),new BigDecimal("100")));
        assertThat(r.data()).isEqualTo(LocalDate.of(2026,10,23));
        assertThat(e.resposta().data()).isEqualTo(dia); assertThat(e.saldo()).isZero();
        assertThatIllegalArgumentException().isThrownBy(()->service.receber(usuario,empresa.getId(),e.id(),new PagamentoEntrada(dia,BigDecimal.ONE)));
        verify(pagamentos,times(2)).save(any());
    }
    @Test void semCobrancaNaoGeraDividaNemRecebePagamento() {
        autorizar(); var r=service.criar(usuario,empresa.getId(),entrada(true,"150")); assertThat(r.saldoPendente()).isZero();
        var e=new Entrega(empresa.getId(),entrada(true,"150"),null,clock.instant());
        when(entregas.bloquear(e.id(),empresa.getId())).thenReturn(Optional.of(e));
        assertThatIllegalArgumentException().isThrownBy(()->service.receber(usuario,empresa.getId(),e.id(),new PagamentoEntrada(dia,BigDecimal.ONE)));
        verifyNoInteractions(pagamentos);
    }
    @Test void rejeitaExcedenteValoresInvalidosELitrosFracionariosNaoFazemParteDoContrato() {
        autorizar(); var e=preparar();
        for(String valor:List.of("0","-1","1.001","151"))
            assertThatIllegalArgumentException().isThrownBy(()->service.receber(usuario,empresa.getId(),e.id(),new PagamentoEntrada(dia,new BigDecimal(valor))));
        for(String litros:List.of("0","1.5","2147483648"))
            assertThatIllegalArgumentException().isThrownBy(()->service.criar(usuario,empresa.getId(),new EntregaEntrada(dia,null,null,new BigDecimal(litros),BigDecimal.ONE,false,null)));
        assertThatIllegalArgumentException().isThrownBy(()->service.criar(usuario,empresa.getId(),entrada(false,"0")));
        verifyNoInteractions(pagamentos); assertThat(e.saldo()).isEqualByComparingTo("150");
    }
    @Test void empresaAlheiaBloqueiaTodasAsOperacoes() {
        UUID id=UUID.randomUUID();
        assertThatThrownBy(()->service.criar(usuario,empresa.getId(),entrada(false,"1"))).isInstanceOf(EstabelecimentoNaoEncontradoException.class);
        assertThatThrownBy(()->service.receber(usuario,empresa.getId(),id,new PagamentoEntrada(dia,BigDecimal.ONE))).isInstanceOf(EstabelecimentoNaoEncontradoException.class);
        assertThatThrownBy(()->service.consultar(usuario,empresa.getId(),id)).isInstanceOf(EstabelecimentoNaoEncontradoException.class);
        assertThatThrownBy(()->service.listar(usuario,empresa.getId(),dia,dia,true,0,20)).isInstanceOf(EstabelecimentoNaoEncontradoException.class);
        verifyNoInteractions(entregas,pagamentos,clientes);
    }
    @Test void clienteEEntregaDeOutraEmpresaRetornamAusentes() {
        autorizar(); UUID id=UUID.randomUUID();
        assertThatThrownBy(()->service.criar(usuario,empresa.getId(),new EntregaEntrada(dia,id,null,BigDecimal.ONE,BigDecimal.ONE,false,null))).isInstanceOf(ClienteNaoEncontradoException.class);
        assertThatThrownBy(()->service.receber(usuario,empresa.getId(),id,new PagamentoEntrada(dia,BigDecimal.ONE))).isInstanceOf(EntregaNaoEncontradaException.class);
        assertThatThrownBy(()->service.consultar(usuario,empresa.getId(),id)).isInstanceOf(EntregaNaoEncontradaException.class);
        verifyNoInteractions(pagamentos);
    }
}
