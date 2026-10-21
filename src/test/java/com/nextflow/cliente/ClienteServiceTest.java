package com.nextflow.cliente;

import java.time.*;
import java.util.*;
import com.nextflow.estabelecimento.*;
import jakarta.validation.Validation;
import org.junit.jupiter.api.*;
import org.springframework.data.domain.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ClienteServiceTest {
    private final ClienteRepository clientes = mock(ClienteRepository.class);
    private final EstabelecimentoRepository empresas = mock(EstabelecimentoRepository.class);
    private final UUID usuario = UUID.randomUUID();
    private final Estabelecimento empresa = new Estabelecimento("Empresa teste", Instant.EPOCH);
    private final jakarta.validation.ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
    private final ClienteService service = new ClienteService(clientes, empresas, factory.getValidator(), Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));
    private final ClienteEntrada entrada = new ClienteEntrada(" Cliente exemplo ", " (11) 90000-0000 ", "  ");

    @AfterEach void fechar() { factory.close(); }
    private void autorizar() {
        when(empresas.buscarDoProprietario(usuario, empresa.getId(), VinculoEstabelecimento.Papel.PROPRIETARIO)).thenReturn(Optional.of(empresa));
        when(empresas.buscarDoUsuario(usuario, empresa.getId())).thenReturn(Optional.of(empresa));
    }

    @Test void criaNormalizaEPermiteLimparOpcionaisNaEdicao() {
        autorizar();
        when(clientes.save(any())).thenAnswer(invocacao -> invocacao.getArgument(0));
        var resposta = service.criar(usuario, empresa.getId(), entrada);
        assertThat(resposta.nome()).isEqualTo("Cliente exemplo");
        assertThat(resposta.telefone()).isEqualTo("(11) 90000-0000");
        assertThat(resposta.observacao()).isNull();
        var cliente = new Cliente(empresa.getId(), entrada, Instant.EPOCH);
        when(clientes.findByIdAndEstabelecimentoId(cliente.resposta().id(), empresa.getId())).thenReturn(Optional.of(cliente));
        var editado = service.atualizar(usuario, empresa.getId(), cliente.resposta().id(), new ClienteEntrada("Outro nome", "", null));
        assertThat(editado.id()).isEqualTo(cliente.resposta().id());
        assertThat(editado.nome()).isEqualTo("Outro nome");
        assertThat(editado.telefone()).isNull();
    }

    @Test void validaCamposAntesDeGravar() {
        autorizar();
        for (var invalida : List.of(new ClienteEntrada(" ", null, null), new ClienteEntrada("x".repeat(121), null, null),
                new ClienteEntrada("Nome", "abc", null), new ClienteEntrada("Nome", "1".repeat(31), null),
                new ClienteEntrada("Nome", null, "x".repeat(501)))) {
            assertThatIllegalArgumentException().isThrownBy(() -> service.criar(usuario, empresa.getId(), invalida));
        }
        verifyNoInteractions(clientes);
    }

    @Test void empresaAlheiaBloqueiaTodasAsOperacoesAntesDeConsultarClientes() {
        var id = UUID.randomUUID();
        assertThatThrownBy(() -> service.criar(usuario, empresa.getId(), entrada)).isInstanceOf(EstabelecimentoNaoEncontradoException.class);
        assertThatThrownBy(() -> service.listar(usuario, empresa.getId(), 0, 20)).isInstanceOf(EstabelecimentoNaoEncontradoException.class);
        assertThatThrownBy(() -> service.consultar(usuario, empresa.getId(), id)).isInstanceOf(EstabelecimentoNaoEncontradoException.class);
        assertThatThrownBy(() -> service.atualizar(usuario, empresa.getId(), id, entrada)).isInstanceOf(EstabelecimentoNaoEncontradoException.class);
        verifyNoInteractions(clientes);
    }

    @Test void clienteDeOutraEmpresaNaoPodeSerConsultadoOuEditado() {
        autorizar();
        var id = UUID.randomUUID();
        assertThatThrownBy(() -> service.consultar(usuario, empresa.getId(), id)).isInstanceOf(ClienteNaoEncontradoException.class);
        assertThatThrownBy(() -> service.atualizar(usuario, empresa.getId(), id, entrada)).isInstanceOf(ClienteNaoEncontradoException.class);
        verify(clientes, times(2)).findByIdAndEstabelecimentoId(id, empresa.getId());
        verify(clientes, never()).save(any());
    }

    @Test void listaFiltraEmpresaEPaginaELimitaTamanho() {
        autorizar();
        var cliente = new Cliente(empresa.getId(), entrada, Instant.EPOCH);
        when(clientes.findByEstabelecimentoIdOrderByNomeAscIdAsc(empresa.getId(), PageRequest.of(0, 1)))
                .thenReturn(new PageImpl<>(List.of(cliente), PageRequest.of(0, 1), 2));
        var pagina = service.listar(usuario, empresa.getId(), 0, 1);
        assertThat(pagina.total()).isEqualTo(2);
        assertThat(pagina.itens()).hasSize(1);
        for (int tamanho : new int[]{0, 101}) assertThatIllegalArgumentException().isThrownBy(() -> service.listar(usuario, empresa.getId(), 0, tamanho));
        assertThatIllegalArgumentException().isThrownBy(() -> service.listar(usuario, empresa.getId(), -1, 20));
    }
}
