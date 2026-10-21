package com.nextflow.gasto;

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

@WebMvcTest(GastoController.class)
@Import({SegurancaConfig.class, LimiteTentativas.class})
class GastoWebTest {
    @Autowired MockMvc mvc;
    @MockitoBean GastoService service;
    @MockitoBean UsuarioRepository usuarios;
    private final Usuario usuario = new Usuario("Teste", "teste@example.test", "hash", Instant.EPOCH);
    private final UUID empresa = UUID.randomUUID();
    private final String corpo = "{\"descricao\":\"Transporte\",\"valor\":\"25.50\",\"data\":\"2026-10-17\"}";
    private String caminho() { return "/api/estabelecimentos/" + empresa + "/gastos"; }
    @BeforeEach void preparar() { when(usuarios.findById(usuario.getId())).thenReturn(Optional.of(usuario)); }

    @Test void exigeSessaoECsrf() throws Exception {
        mvc.perform(get(caminho()).param("data", "2026-10-17")).andExpect(status().isUnauthorized());
        mvc.perform(post(caminho()).with(csrf()).contentType("application/json").content(corpo)).andExpect(status().isUnauthorized());
        mvc.perform(post(caminho()).with(user(new UsuarioAutenticado(usuario))).contentType("application/json").content(corpo)).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test void rejeitaCamposInvalidos() throws Exception {
        for (String json : List.of("{}", corpo.replace("25.50", "0"), corpo.replace("25.50", "1.001"), corpo.replace("Transporte", " "))) {
            mvc.perform(post(caminho()).with(user(new UsuarioAutenticado(usuario))).with(csrf())
                    .contentType("application/json").content(json)).andExpect(status().isBadRequest());
        }
        verifyNoInteractions(service);
    }

    @Test void identidadeVemDaSessaoMesmoComCampoForjado() throws Exception {
        mvc.perform(post(caminho()).with(user(new UsuarioAutenticado(usuario))).with(csrf()).contentType("application/json")
                .content(corpo.replace("}", ",\"usuarioId\":\"" + UUID.randomUUID() + "\"}"))).andExpect(status().isCreated());
        verify(service).criar(eq(usuario.getId()), eq(empresa), any(GastoEntrada.class));
    }
}
