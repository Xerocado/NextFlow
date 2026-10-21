package com.nextflow.estabelecimento;

import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class EstabelecimentoServiceTest {
    @Test
    void renomearExigeProprietarioENaoBuscaIdSemUsuario() {
        var usuario = UUID.randomUUID();
        var id = UUID.randomUUID();
        var negocio = new Estabelecimento("Anterior", Instant.EPOCH);
        when(estabelecimentos.buscarDoProprietario(usuario, id, VinculoEstabelecimento.Papel.PROPRIETARIO))
                .thenReturn(Optional.of(negocio));
        assertThat(service.renomear(usuario, id, "  Atualizado  ").nome()).isEqualTo("Atualizado");
        var terceiro = UUID.randomUUID();
        when(estabelecimentos.buscarDoProprietario(terceiro, id, VinculoEstabelecimento.Papel.PROPRIETARIO))
                .thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.renomear(terceiro, id, "Intruso"))
                .isInstanceOf(EstabelecimentoNaoEncontradoException.class);
        assertThat(negocio.getNome()).isEqualTo("Atualizado");
        assertThatIllegalArgumentException().isThrownBy(() -> service.renomear(usuario, id, " "));
        verify(estabelecimentos, never()).findById(any());
    }
    private final EstabelecimentoRepository estabelecimentos = mock(EstabelecimentoRepository.class);
    private final VinculoEstabelecimentoRepository vinculos = mock(VinculoEstabelecimentoRepository.class);
    private final EstabelecimentoService service = new EstabelecimentoService(estabelecimentos, vinculos,
            Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));

    @Test
    void consultaSempreIncluiUsuarioEId() {
        var usuario = UUID.randomUUID();
        var id = UUID.randomUUID();
        when(estabelecimentos.buscarDoUsuario(usuario, id)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.consultar(usuario, id)).isInstanceOf(EstabelecimentoNaoEncontradoException.class);
        verify(estabelecimentos).buscarDoUsuario(usuario, id);
        verify(estabelecimentos, never()).findById(any());
    }

    @Test
    void listaPaginadaFiltraUsuarioEDefineDefaults() {
        var usuario = UUID.randomUUID();
        var negocio = new Estabelecimento("  Negocio teste  ", Instant.EPOCH);
        when(estabelecimentos.listarDoUsuario(usuario, PageRequest.of(0, 20)))
                .thenReturn(new PageImpl<>(List.of(negocio)));
        var pagina = service.listar(usuario, 0, 20);
        assertThat(pagina.total()).isEqualTo(1);
        assertThat(pagina.itens().getFirst().nome()).isEqualTo("Negocio teste");
        assertThat(pagina.itens().getFirst().moeda()).isEqualTo("BRL");
        assertThat(pagina.itens().getFirst().fuso()).isEqualTo("America/Sao_Paulo");
        assertThat(pagina.itens().getFirst().ativo()).isTrue();
    }

    @Test
    void rejeitaPaginaENomeInvalidos() {
        var usuario = UUID.randomUUID();
        assertThatIllegalArgumentException().isThrownBy(() -> service.listar(usuario, -1, 20));
        assertThatIllegalArgumentException().isThrownBy(() -> service.listar(usuario, 0, 101));
        assertThatIllegalArgumentException().isThrownBy(() -> service.listar(usuario, 0, 0));
        assertThatIllegalArgumentException().isThrownBy(() -> new Estabelecimento("   ", Instant.EPOCH));
        verifyNoInteractions(estabelecimentos, vinculos);
    }
    @Test
    void dadosExigemProprietarioESemNumeroRemoveNumero() {
        var usuario = UUID.randomUUID();
        var negocio = new Estabelecimento("Teste", Instant.EPOCH);
        var dados = new DadosEmpresa("servicos", "", "", "Rua teste", null, "", "", "", "SP", true);
        when(estabelecimentos.buscarDoProprietario(usuario, negocio.getId(), VinculoEstabelecimento.Papel.PROPRIETARIO))
                .thenReturn(Optional.of(negocio));
        assertThat(service.atualizarDados(usuario, negocio.getId(), dados).dados()).isEqualTo(dados);
        assertThatThrownBy(() -> service.atualizarDados(UUID.randomUUID(), negocio.getId(), dados))
                .isInstanceOf(EstabelecimentoNaoEncontradoException.class);
        verify(estabelecimentos, never()).findById(any());
    }

    @Test
    void validaAtividadeCepUfLimitesENumero() {
        try (var factory = jakarta.validation.Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertThat(validator.validate(new DadosEmpresa("servicos", "", "12345-678", "", "12", "", "", "", "SP", false))).isEmpty();
            assertThat(validator.validate(new DadosEmpresa("ambos", "", "", "", null, "", "", "", "", true))).isEmpty();
            var erros = validator.validate(new DadosEmpresa("invalida", "x".repeat(31), "123", "", " ", "", "", "", "XX", false));
            assertThat(erros).extracting(v -> v.getPropertyPath().toString())
                    .contains("atividade", "telefone", "cep", "uf", "numeroValido");
            assertThat(validator.validate(new DadosEmpresa("servicos", "", "", "", "12", "", "", "", "", true)))
                    .extracting(v -> v.getPropertyPath().toString()).contains("numeroValido");
        }
    }
}
