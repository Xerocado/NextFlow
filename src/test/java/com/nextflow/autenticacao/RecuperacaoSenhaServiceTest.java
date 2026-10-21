package com.nextflow.autenticacao;

import java.time.*;
import java.util.Optional;
import com.nextflow.usuario.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class RecuperacaoSenhaServiceTest {
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final TokenRecuperacaoRepository tokens = mock(TokenRecuperacaoRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final EmailRecuperacao email = mock(EmailRecuperacao.class);
    private final Instant agora = Instant.parse("2026-01-01T00:00:00Z");
    private final Clock clock = Clock.fixed(agora, ZoneOffset.UTC);
    private final Usuario usuario = new Usuario("Pessoa Teste", "teste@example.test", "hash-antigo", agora);
    private RecuperacaoSenhaService service;

    @BeforeEach
    void preparar() {
        service = new RecuperacaoSenhaService(usuarios, tokens, encoder, email, clock, new LimiteTentativas(clock));
        when(usuarios.findByEmail(usuario.getEmail())).thenReturn(Optional.of(usuario));
        when(usuarios.buscarParaAtualizacao(usuario.getId())).thenReturn(Optional.of(usuario));
    }

    private TokenRecuperacao codigoValido() {
        var token = new TokenRecuperacao(usuario.getId(), "hash-codigo", agora.plusSeconds(600));
        when(tokens.findByUsuarioId(usuario.getId())).thenReturn(Optional.of(token));
        when(encoder.matches("012345", "hash-codigo")).thenReturn(true);
        return token;
    }

    @Test
    void geraSeisNumerosArmazenaHashEExpiraEmDezMinutos() {
        when(encoder.encode(anyString())).thenReturn("hash-protegido");
        service.solicitar("TESTE@example.test");
        var codigo = ArgumentCaptor.forClass(String.class);
        verify(email).enviar(eq(usuario.getEmail()), codigo.capture());
        assertThat(codigo.getValue()).matches("[0-9]{6}");
        verify(encoder).encode(codigo.getValue());
        var persistido = ArgumentCaptor.forClass(TokenRecuperacao.class);
        verify(tokens).save(persistido.capture());
        verify(tokens).excluirDoUsuario(usuario.getId());
        assertThat(persistido.getValue().getTokenHash()).isEqualTo("hash-protegido");
        assertThat(persistido.getValue().validoEm(agora.plusSeconds(599))).isTrue();
        assertThat(persistido.getValue().validoEm(agora.plusSeconds(600))).isFalse();
    }

    @Test
    void limitaTresSolicitacoesSemAlterarSenha() {
        for (int i = 0; i < 4; i++) service.solicitar(usuario.getEmail());
        verify(email, times(3)).enviar(eq(usuario.getEmail()), anyString());
        assertThat(usuario.getVersaoCredencial()).isZero();
    }

    @Test
    void contaDesconhecidaNaoEnviaNemCriaToken() {
        service.solicitar("desconhecido@example.test");
        verifyNoInteractions(tokens, email);
    }

    @Test
    void codigoValidoTrocaSenhaIncrementaVersaoERevogaTodos() {
        codigoValido();
        when(encoder.encode("nova senha de teste")).thenReturn("hash-novo");
        service.redefinir("TESTE@example.test", "012345", "nova senha de teste");
        assertThat(usuario.getSenhaHash()).isEqualTo("hash-novo");
        assertThat(usuario.getVersaoCredencial()).isEqualTo(1);
        verify(tokens).excluirDoUsuario(usuario.getId());
    }

    @Test
    void rejeitaSenhaAtualSemConsumirCodigoEPermiteOutra() {
        codigoValido();
        when(encoder.matches("senha atual de teste", "hash-antigo")).thenReturn(true);
        assertThatThrownBy(() -> service.redefinir(usuario.getEmail(), "012345", "senha atual de teste"))
                .isInstanceOf(SenhaIgualAtualException.class);
        assertThat(usuario.getVersaoCredencial()).isZero();
        verify(tokens, never()).excluirDoUsuario(any());
        when(encoder.encode("senha diferente de teste")).thenReturn("hash-novo");
        service.redefinir(usuario.getEmail(), "012345", "senha diferente de teste");
        assertThat(usuario.getSenhaHash()).isEqualTo("hash-novo");
    }

    @Test
    void cincoErrosBloqueiamMesmoCodigoCorretoSemMudarSenha() {
        var token = codigoValido();
        for (int i = 0; i < 5; i++) {
            assertThatThrownBy(() -> service.redefinir(usuario.getEmail(), "999999", "nova senha de teste"))
                    .isInstanceOf(CodigoRecuperacaoInvalidoException.class);
        }
        assertThat(token.bloqueado()).isTrue();
        assertThatThrownBy(() -> service.redefinir(usuario.getEmail(), "012345", "nova senha de teste"))
                .isInstanceOf(CodigoRecuperacaoInvalidoException.class);
        verify(encoder, never()).matches("012345", "hash-codigo");
        verify(encoder, never()).encode(anyString());
        assertThat(usuario.getVersaoCredencial()).isZero();
    }

    @Test
    void quatroErrosAindaPermitemCodigoCorreto() {
        codigoValido();
        for (int i = 0; i < 4; i++) {
            assertThatThrownBy(() -> service.redefinir(usuario.getEmail(), "999999", "nova senha de teste"))
                    .isInstanceOf(CodigoRecuperacaoInvalidoException.class);
        }
        service.redefinir(usuario.getEmail(), "012345", "nova senha de teste");
        verify(tokens).excluirDoUsuario(usuario.getId());
    }

    @Test
    void rejeitaCodigoExpiradoSemCompararSenha() {
        when(tokens.findByUsuarioId(usuario.getId())).thenReturn(Optional.of(new TokenRecuperacao(usuario.getId(), "hash", agora)));
        assertThatThrownBy(() -> service.redefinir(usuario.getEmail(), "012345", "nova senha de teste"))
                .isInstanceOf(CodigoRecuperacaoInvalidoException.class);
        verifyNoInteractions(encoder);
    }

    @Test
    void rejeitaEmailAlheioOuCodigoAusenteComMesmoErro() {
        assertThatThrownBy(() -> service.redefinir("outro@example.test", "012345", "nova senha de teste"))
                .isInstanceOf(CodigoRecuperacaoInvalidoException.class);
        assertThatThrownBy(() -> service.redefinir(usuario.getEmail(), "012345", "nova senha de teste"))
                .isInstanceOf(CodigoRecuperacaoInvalidoException.class);
        verifyNoInteractions(encoder);
    }
}
