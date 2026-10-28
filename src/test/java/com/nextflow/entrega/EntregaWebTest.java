package com.nextflow.entrega;

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

@WebMvcTest(EntregaController.class)
@Import({SegurancaConfig.class, LimiteTentativas.class})
class EntregaWebTest {
    @Autowired MockMvc mvc;
    @MockitoBean EntregaService service;
    @MockitoBean UsuarioRepository usuarios;
    final Usuario usuario=new Usuario("Teste","teste@example.test","hash",Instant.EPOCH);
    final UUID empresa=UUID.randomUUID(), id=UUID.randomUUID();
    String caminho() { return "/api/estabelecimentos/"+empresa+"/entregas"; }
    @BeforeEach void preparar() { when(usuarios.findById(usuario.getId())).thenReturn(Optional.of(usuario)); }
    @Test void exigeSessaoECsrf() throws Exception {
        mvc.perform(get(caminho()+"/"+id)).andExpect(status().isUnauthorized());
        mvc.perform(post(caminho()+"/"+id+"/pagamentos").with(user(new UsuarioAutenticado(usuario)))
            .contentType("application/json").content("{}" )).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }
    @Test void rejeitaCamposInvalidos() throws Exception {
        for(String sufixo:List.of("", "/"+id+"/pagamentos"))
            mvc.perform(post(caminho()+sufixo).with(user(new UsuarioAutenticado(usuario))).with(csrf())
                .contentType("application/json").content("{}" )).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
    @Test void recebimentoUsaIdentidadeDaSessao() throws Exception {
        mvc.perform(post(caminho()+"/"+id+"/pagamentos").with(user(new UsuarioAutenticado(usuario))).with(csrf())
            .contentType("application/json").content("{\"data\":\"2026-10-10\",\"valor\":100,\"usuarioId\":\""+UUID.randomUUID()+"\"}"))
            .andExpect(status().isCreated());
        verify(service).receber(eq(usuario.getId()),eq(empresa),eq(id),any(),isNull());
    }
    @Test void entregaAusenteRetorna404() throws Exception {
        when(service.consultar(usuario.getId(),empresa,id)).thenThrow(new EntregaNaoEncontradaException());
        mvc.perform(get(caminho()+"/"+id).with(user(new UsuarioAutenticado(usuario))))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.detail").value("Entrega nao encontrada."));
    }
}
