package com.nextflow.movimento;

import java.time.*;
import java.util.*;
import com.nextflow.autenticacao.*;
import com.nextflow.usuario.*;
import com.nextflow.estabelecimento.EstabelecimentoNaoEncontradoException;
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

@WebMvcTest(MovimentoController.class)
@Import({SegurancaConfig.class, LimiteTentativas.class})
class MovimentoWebTest {
    @Autowired MockMvc mvc;
    @MockitoBean MovimentoService service;
    @MockitoBean UsuarioRepository usuarios;
    final Usuario usuario = new Usuario("Teste", "teste@example.test", "hash", Instant.EPOCH);
    final UUID empresa = UUID.randomUUID();
    String caminho() { return "/api/estabelecimentos/" + empresa + "/movimento"; }
    @BeforeEach void preparar() { when(usuarios.findById(usuario.getId())).thenReturn(Optional.of(usuario)); }

    @Test void exigeSessao() throws Exception {
        mvc.perform(get(caminho()).param("data", "2026-10-23")).andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }
    @Test void identidadeVemDaSessao() throws Exception {
        mvc.perform(get(caminho()).with(user(new UsuarioAutenticado(usuario))).param("data", "2026-10-23")
                .param("usuarioId", UUID.randomUUID().toString())).andExpect(status().isOk());
        verify(service).consultar(usuario.getId(), empresa, LocalDate.of(2026, 10, 23), 0, 20);
    }
    @Test void empresaAlheiaRetorna404() throws Exception {
        when(service.consultar(eq(usuario.getId()), eq(empresa), any(), eq(0), eq(20)))
                .thenThrow(new EstabelecimentoNaoEncontradoException());
        mvc.perform(get(caminho()).with(user(new UsuarioAutenticado(usuario))).param("data", "2026-10-23"))
                .andExpect(status().isNotFound());
    }
}
