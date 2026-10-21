package com.nextflow.cliente;

import java.time.Instant;
import java.util.*;
import com.nextflow.autenticacao.*;
import com.nextflow.usuario.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ClienteController.class)
@Import({SegurancaConfig.class, LimiteTentativas.class})
class ClienteWebTest {
    @Autowired MockMvc mvc;
    @MockitoBean ClienteService service;
    @MockitoBean UsuarioRepository usuarios;
    private final Usuario usuario = new Usuario("Teste", "teste@example.test", "hash", Instant.EPOCH);
    private final UUID empresa = UUID.randomUUID();
    private final UUID id = UUID.randomUUID();
    private String caminho() { return "/api/estabelecimentos/" + empresa + "/clientes"; }
    @BeforeEach void preparar() { when(usuarios.findById(usuario.getId())).thenReturn(Optional.of(usuario)); }

    @Test void exigeSessaoECsrfNasEscritas() throws Exception {
        mvc.perform(get(caminho())).andExpect(status().isUnauthorized());
        mvc.perform(get(caminho() + "/" + id)).andExpect(status().isUnauthorized());
        mvc.perform(post(caminho()).with(csrf()).contentType("application/json").content("{\"nome\":\"Teste\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post(caminho()).with(user(new UsuarioAutenticado(usuario))).contentType("application/json").content("{\"nome\":\"Teste\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(put(caminho() + "/" + id).with(user(new UsuarioAutenticado(usuario))).contentType("application/json").content("{\"nome\":\"Teste\"}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test void rejeitaEntradasInvalidasNoCadastroENaEdicao() throws Exception {
        for (String json : List.of("{}", "{\"nome\":\" \"}", "{\"nome\":\"Teste\",\"telefone\":\"abc\"}",
                "{\"nome\":\"" + "x".repeat(121) + "\"}", "{\"nome\":\"Teste\",\"observacao\":\"" + "x".repeat(501) + "\"}")) {
            mvc.perform(post(caminho()).with(user(new UsuarioAutenticado(usuario))).with(csrf())
                    .contentType("application/json").content(json)).andExpect(status().isBadRequest());
            mvc.perform(put(caminho() + "/" + id).with(user(new UsuarioAutenticado(usuario))).with(csrf())
                    .contentType("application/json").content(json)).andExpect(status().isBadRequest());
        }
        verifyNoInteractions(service);
    }

    @Test void usaIdentidadeDaSessaoERetornaLocation() throws Exception {
        when(service.criar(eq(usuario.getId()), eq(empresa), any())).thenReturn(new ClienteResposta(id, "Teste", null, null));
        var corpo = "{\"nome\":\"Teste\",\"usuarioId\":\"" + UUID.randomUUID() + "\",\"estabelecimentoId\":\"" + UUID.randomUUID() + "\"}";
        mvc.perform(post(caminho()).with(user(new UsuarioAutenticado(usuario))).with(csrf()).contentType("application/json").content(corpo))
                .andExpect(status().isCreated()).andExpect(header().string("Location", caminho() + "/" + id));
        mvc.perform(put(caminho() + "/" + id).with(user(new UsuarioAutenticado(usuario))).with(csrf()).contentType("application/json").content(corpo))
                .andExpect(status().isOk());
        verify(service).criar(eq(usuario.getId()), eq(empresa), any());
        verify(service).atualizar(eq(usuario.getId()), eq(empresa), eq(id), any());
    }

    @Test void clienteAusenteRetorna404SemDetalhesInternos() throws Exception {
        when(service.consultar(usuario.getId(), empresa, id)).thenThrow(new ClienteNaoEncontradoException());
        mvc.perform(get(caminho() + "/" + id).with(user(new UsuarioAutenticado(usuario))))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.detail").value("Cliente nao encontrado."));
    }
}
