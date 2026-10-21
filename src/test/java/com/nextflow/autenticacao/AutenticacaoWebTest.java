package com.nextflow.autenticacao;

import java.time.Instant;
import java.util.Optional;
import com.nextflow.usuario.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AutenticacaoController.class)
@Import({SegurancaConfig.class, LimiteTentativas.class})
class AutenticacaoWebTest {
    @Test
    void redefinicaoExigeEmailESeisNumerosPreservandoZeroInicial() throws Exception {
        mvc.perform(post("/api/auth/redefinir-senha").with(csrf()).contentType("application/json")
                .content("{\"token\":\"012345\",\"novaSenha\":\"senha nova de teste\"}"))
                .andExpect(status().isBadRequest());
        for (var codigo : new String[]{"12345", "1234567", "abcdef", "a".repeat(43)}) {
            mvc.perform(post("/api/auth/redefinir-senha").with(csrf()).contentType("application/json")
                    .content("{\"email\":\"teste@example.test\",\"token\":\"" + codigo + "\",\"novaSenha\":\"senha nova de teste\"}"))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(recuperacao);
        mvc.perform(post("/api/auth/redefinir-senha").with(csrf()).contentType("application/json")
                .content("{\"email\":\"teste@example.test\",\"token\":\"012345\",\"novaSenha\":\"senha nova de teste\"}"))
                .andExpect(status().isNoContent());
        verify(recuperacao).redefinir("teste@example.test", "012345", "senha nova de teste");
    }
    @Test
    void senhaAtualRecebeErroEspecificoSemRetornarDadosSensiveis() throws Exception {
        var codigo = "012345";
        doThrow(new SenhaIgualAtualException()).when(recuperacao).redefinir("teste@example.test", codigo, "senha original de teste");
        mvc.perform(post("/api/auth/redefinir-senha").with(csrf()).contentType("application/json")
                .content("{\"email\":\"teste@example.test\",\"token\":\"" + codigo + "\",\"novaSenha\":\"senha original de teste\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.detail").value("A nova senha deve ser diferente da senha atual."))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.senhaHash").doesNotExist());
    }
    @Autowired MockMvc mvc;
    @Autowired PasswordEncoder encoder;
    @MockitoBean UsuarioRepository usuarios;
    @MockitoBean CadastroService cadastro;
    @MockitoBean RecuperacaoDispatcher dispatcher;
    @MockitoBean RecuperacaoSenhaService recuperacao;
    private Usuario usuario;

    @BeforeEach
    void preparar() {
        usuario = new Usuario("Pessoa Teste", "web@example.test", encoder.encode("senha de teste longa"), Instant.EPOCH);
        when(usuarios.findByEmail(usuario.getEmail())).thenReturn(Optional.of(usuario));
        when(usuarios.findById(usuario.getId())).thenReturn(Optional.of(usuario));
    }

    private MockHttpSession login() throws Exception {
        var result = mvc.perform(post("/api/auth/login").with(csrf())
                .param("email", usuario.getEmail()).param("password", "senha de teste longa"))
                .andExpect(status().isNoContent()).andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    @Test
    void bloqueiaAnonimoEPostSemCsrf() throws Exception {
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").param("email", usuario.getEmail()).param("password", "senha de teste longa"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/login").with(csrf()).param("email", usuario.getEmail()).param("password", "senha incorreta"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void csrfRealPermiteLoginELogoutInvalidaSessao() throws Exception {
        var result = mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk()).andReturn();
        var json = new tools.jackson.databind.ObjectMapper().readTree(result.getResponse().getContentAsString());
        var autenticado = mvc.perform(post("/api/auth/login")
                .session((MockHttpSession) result.getRequest().getSession(false))
                .header(json.get("headerName").asText(), json.get("token").asText())
                .param("email", "WEB@example.test").param("password", "senha de teste longa"))
                .andExpect(status().isNoContent()).andReturn();
        var sessao = (MockHttpSession) autenticado.getRequest().getSession(false);
        mvc.perform(get("/api/auth/me").session(sessao)).andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(usuario.getEmail()))
                .andExpect(jsonPath("$.senhaHash").doesNotExist());
        mvc.perform(post("/api/auth/logout").with(csrf()).session(sessao)).andExpect(status().isNoContent());
        assertThat(sessao.isInvalid()).isTrue();
    }

    @Test
    void alteracaoDeVersaoInvalidaSessaoNoProximoAcesso() throws Exception {
        var sessao = login();
        usuario.redefinirSenha("hash-novo");
        mvc.perform(get("/api/auth/me").session(sessao)).andExpect(status().isUnauthorized());
        assertThat(sessao.isInvalid()).isTrue();
    }

    @Test
    void validacaoRejeitaDadosInvalidosERecuperacaoNaoDevolveCodigo() throws Exception {
        mvc.perform(post("/api/auth/cadastro").with(csrf()).contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/auth/recuperar-senha").with(csrf()).contentType("application/json")
                .content("{\"email\":\"desconhecido@example.test\"}"))
                .andExpect(status().isAccepted()).andExpect(jsonPath("$.token").doesNotExist());
        verify(dispatcher).solicitar("desconhecido@example.test");
    }
}
