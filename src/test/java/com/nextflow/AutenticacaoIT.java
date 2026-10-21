package com.nextflow;

import java.time.*;
import java.util.UUID;
import java.util.concurrent.*;
import com.nextflow.autenticacao.*;
import com.nextflow.usuario.*;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class AutenticacaoIT {
    @Container @ServiceConnection
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine");

    @Autowired MockMvc mvc;
    @Autowired UsuarioRepository usuarios;
    @Autowired CadastroService cadastro;
    @Autowired RecuperacaoSenhaService recuperacao;
    @Autowired PasswordEncoder encoder;
    @Autowired TokenRecuperacaoRepository tokens;
    @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;
    @MockitoBean EmailRecuperacao email;
    @MockitoBean Clock clock;
    private final Instant agora = Instant.parse("2026-01-01T00:00:00Z");

    @Test
    void errosPersistemBloqueiamAposCincoEReemissaoReinicia() {
        String endereco = criarUsuario();
        String codigo = solicitarToken(endereco);
        var usuarioId = usuarios.findByEmail(endereco).orElseThrow().getId();
        var errado = codigo.equals("000000") ? "000001" : "000000";
        for (int i = 1; i <= 5; i++) {
            assertThatIllegalArgumentException().isThrownBy(() -> recuperacao.redefinir(endereco, errado, "nova senha de teste"));
            assertThat(jdbc.queryForObject("select tentativas_invalidas from tokens_recuperacao_senha where usuario_id = ?", Integer.class, usuarioId)).isEqualTo(i);
        }
        assertThatIllegalArgumentException().isThrownBy(() -> recuperacao.redefinir(endereco, codigo, "nova senha de teste"));
        clearInvocations(email);
        String novo = solicitarToken(endereco);
        assertThat(novo).isNotEqualTo(codigo);
        assertThat(jdbc.queryForObject("select tentativas_invalidas from tokens_recuperacao_senha where usuario_id = ?", Integer.class, usuarioId)).isZero();
        recuperacao.redefinir(endereco, novo, "nova senha de teste");
        assertThat(tokens.findByUsuarioId(usuarioId)).isEmpty();
    }

    @Test
    void codigoSoValeParaEmailDoUsuarioEQuatroErrosPermitemAcerto() {
        String endereco = criarUsuario();
        String outro = criarUsuario();
        String codigo = solicitarToken(endereco);
        assertThatIllegalArgumentException().isThrownBy(() -> recuperacao.redefinir(outro, codigo, "nova senha de teste"));
        var errado = codigo.equals("000000") ? "000001" : "000000";
        for (int i = 0; i < 4; i++) {
            assertThatIllegalArgumentException().isThrownBy(() -> recuperacao.redefinir(endereco, errado, "nova senha de teste"));
        }
        recuperacao.redefinir(endereco, codigo, "nova senha de teste");
        assertThat(encoder.matches("senha original teste", usuarios.findByEmail(outro).orElseThrow().getSenhaHash())).isTrue();
    }

    @Test
    void errosConcorrentesNaoPerdemContagem() throws Exception {
        String endereco = criarUsuario();
        String codigo = solicitarToken(endereco);
        var errado = codigo.equals("000000") ? "000001" : "000000";
        var inicio = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            Callable<Boolean> tarefa = () -> {
                inicio.await();
                try { recuperacao.redefinir(endereco, errado, "nova senha de teste"); return false; }
                catch (CodigoRecuperacaoInvalidoException exception) { return true; }
            };
            var a = executor.submit(tarefa); var b = executor.submit(tarefa); inicio.countDown();
            assertThat(a.get(10, TimeUnit.SECONDS)).isTrue();
            assertThat(b.get(10, TimeUnit.SECONDS)).isTrue();
        }
        var usuarioId = usuarios.findByEmail(endereco).orElseThrow().getId();
        assertThat(jdbc.queryForObject("select tentativas_invalidas from tokens_recuperacao_senha where usuario_id = ?", Integer.class, usuarioId)).isEqualTo(2);
    }

    @BeforeEach
    void preparar() { when(clock.instant()).thenReturn(agora); }

    private String criarUsuario() {
        String endereco = UUID.randomUUID() + "@example.test";
        cadastro.cadastrar("Pessoa Teste", endereco, "senha original teste");
        return endereco;
    }

    private MockHttpSession login(String endereco, String senha) throws Exception {
        var result = mvc.perform(post("/api/auth/login").with(csrf())
                .param("email", endereco).param("password", senha)).andExpect(status().isNoContent()).andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    private String solicitarToken(String endereco) {
        recuperacao.solicitar(endereco);
        var codigo = ArgumentCaptor.forClass(String.class);
        verify(email).enviar(eq(endereco), codigo.capture());
        return codigo.getValue();
    }

    @Test
    void cadastroNormalizaEmailProtegeHashERejeitaDuplicado() throws Exception {
        String endereco = UUID.randomUUID() + "@example.test";
        String json = "{\"nome\":\"Pessoa Teste\",\"email\":\"" + endereco.toUpperCase()
                + "\",\"senha\":\"senha original teste\"}";
        mvc.perform(post("/api/auth/cadastro").with(csrf()).contentType("application/json").content(json))
                .andExpect(status().isCreated()).andExpect(content().string(""));
        var usuario = usuarios.findByEmail(endereco).orElseThrow();
        assertThat(usuario.getSenhaHash()).isNotEqualTo("senha original teste");
        assertThat(encoder.matches("senha original teste", usuario.getSenhaHash())).isTrue();
        mvc.perform(post("/api/auth/cadastro").with(csrf()).contentType("application/json").content(json))
                .andExpect(status().isConflict());
    }

    @Test
    void protegeRotasCsrfESenhaIncorreta() throws Exception {
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/cadastro").contentType("application/json").content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/login").with(csrf())
                .param("email", criarUsuario()).param("password", "senha errada teste"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/cadastro").with(csrf()).contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void csrfRealLoginPerfilELogout() throws Exception {
        var csrfResult = mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andReturn();
        String body = csrfResult.getResponse().getContentAsString();
        String token = new tools.jackson.databind.ObjectMapper().readTree(body).get("token").asText();
        String endereco = criarUsuario();
        var result = mvc.perform(post("/api/auth/login")
                .session((MockHttpSession) csrfResult.getRequest().getSession(false))
                .header("X-CSRF-TOKEN", token).param("email", endereco).param("password", "senha original teste"))
                .andExpect(status().isNoContent()).andReturn();
        var sessao = (MockHttpSession) result.getRequest().getSession(false);
        mvc.perform(get("/api/auth/me").session(sessao)).andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(endereco)).andExpect(jsonPath("$.senhaHash").doesNotExist());
        mvc.perform(post("/api/auth/logout").session(sessao).with(csrf())).andExpect(status().isNoContent());
        assertThat(sessao.isInvalid()).isTrue();
    }

    @Test
    void recuperacaoTemRespostaGenericaESemToken() throws Exception {
        String endereco = criarUsuario();
        String conhecido = mvc.perform(post("/api/auth/recuperar-senha").with(csrf()).contentType("application/json")
                .content("{\"email\":\"" + endereco + "\"}")).andExpect(status().isAccepted())
                .andReturn().getResponse().getContentAsString();
        String desconhecido = mvc.perform(post("/api/auth/recuperar-senha").with(csrf()).contentType("application/json")
                .content("{\"email\":\"inexistente@example.test\"}")).andExpect(status().isAccepted())
                .andReturn().getResponse().getContentAsString();
        assertThat(conhecido).isEqualTo(desconhecido).doesNotContain("token");
        verify(email, timeout(3000)).enviar(eq(endereco), anyString());
    }

    @Test
    void redefinicaoRevogaTokenSenhaAntigaESessaoAnterior() throws Exception {
        String endereco = criarUsuario();
        MockHttpSession sessao = login(endereco, "senha original teste");
        String codigo = solicitarToken(endereco);
        mvc.perform(post("/api/auth/redefinir-senha").with(csrf()).contentType("application/json")
                .content("{\"email\":\"" + endereco + "\",\"token\":\"" + codigo + "\",\"novaSenha\":\"senha original teste\"}"))
                .andExpect(status().isUnprocessableEntity());
        mvc.perform(get("/api/auth/me").session(sessao)).andExpect(status().isOk());
        mvc.perform(post("/api/auth/redefinir-senha").with(csrf()).contentType("application/json")
                .content("{\"email\":\"" + endereco + "\",\"token\":\"" + codigo + "\",\"novaSenha\":\"nova senha de teste\"}"))
                .andExpect(status().isNoContent());
        assertThatIllegalArgumentException().isThrownBy(() -> recuperacao.redefinir(endereco, codigo, "outra senha de teste"));
        mvc.perform(get("/api/auth/me").session(sessao)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").with(csrf()).param("email", endereco).param("password", "senha original teste"))
                .andExpect(status().isUnauthorized());
        login(endereco, "nova senha de teste");
    }

    @Test
    void tokenExpiraENovaSolicitacaoRevogaAnterior() {
        String endereco = criarUsuario();
        String primeiro = solicitarToken(endereco);
        clearInvocations(email);
        String segundo = solicitarToken(endereco);
        assertThat(primeiro).isNotEqualTo(segundo);
        assertThatIllegalArgumentException().isThrownBy(() -> recuperacao.redefinir(endereco, primeiro, "nova senha de teste"));
        when(clock.instant()).thenReturn(agora.plusSeconds(1800));
        assertThatIllegalArgumentException().isThrownBy(() -> recuperacao.redefinir(endereco, segundo, "nova senha de teste"));
    }

    @Test
    void limitaTentativasDeLoginPorConta() throws Exception {
        String endereco = UUID.randomUUID() + "@example.test";
        for (int i = 0; i < 10; i++) {
            mvc.perform(post("/api/auth/login").with(csrf()).with(request -> {
                request.setRemoteAddr("192.0.2.10"); return request;
            }).param("email", endereco).param("password", "senha errada teste"))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(post("/api/auth/login").with(csrf()).with(request -> {
            request.setRemoteAddr("192.0.2.10"); return request;
        }).param("email", endereco).param("password", "senha errada teste"))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void somenteUmaRedefinicaoConcorrenteTemSucesso() throws Exception {
        String endereco = criarUsuario();
        String codigo = solicitarToken(endereco);
        var inicio = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            Callable<Boolean> tarefa = () -> {
                inicio.await();
                try {
                    recuperacao.redefinir(endereco, codigo, "nova senha de teste");
                    return true;
                } catch (IllegalArgumentException exception) { return false; }
            };
            var primeira = executor.submit(tarefa);
            var segunda = executor.submit(tarefa);
            inicio.countDown();
            assertThat(java.util.List.of(primeira.get(10, TimeUnit.SECONDS), segunda.get(10, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(true, false);
        }
    }
}
