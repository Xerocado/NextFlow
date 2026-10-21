package com.nextflow.estabelecimento;

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

@WebMvcTest(EstabelecimentoController.class)
@Import({SegurancaConfig.class, LimiteTentativas.class})
class EstabelecimentoWebTest {
    @Test
    void dadosInvalidosNaoChegamAoServico() throws Exception {
        var caminho = "/api/estabelecimentos/" + UUID.randomUUID() + "/dados";
        var corpos = List.of(
                "{}",
                "{\"atividade\":\"servicos\",\"semNumero\":false}",
                "{\"atividade\":\"servicos\",\"semNumero\":true,\"numero\":\"10\"}",
                "{\"atividade\":\"servicos\",\"semNumero\":true,\"telefone\":\"<script>\"}",
                "{\"atividade\":\"servicos\",\"semNumero\":true,\"cep\":\"../123\"}",
                "{\"atividade\":\"servicos\",\"semNumero\":true,\"uf\":\"ZZ\"}",
                "{\"atividade\":\"servicos\",\"semNumero\":true,\"logradouro\":\"" + "x".repeat(151) + "\"}",
                "{\"atividade\":\"servicos\",\"semNumero\":true,\"cidade\":\"" + "x".repeat(101) + "\"}");
        for (var corpo : corpos) {
            mvc.perform(put(caminho).with(user(new UsuarioAutenticado(usuario))).with(csrf())
                    .contentType("application/json").content(corpo)).andExpect(status().isBadRequest());
        }
        verifyNoInteractions(service);
    }

    @Test
    void csrfInvalidoBloqueiaTodasAsEscritas() throws Exception {
        var id = UUID.randomUUID();
        var caminhos = List.of("/api/estabelecimentos/" + id + "/nome", "/api/estabelecimentos/" + id + "/dados");
        for (var caminho : caminhos) {
            mvc.perform(put(caminho).with(user(new UsuarioAutenticado(usuario))).with(csrf().useInvalidToken())
                    .contentType("application/json").content("{}"))
                    .andExpect(status().isForbidden());
        }
        mvc.perform(post("/api/estabelecimentos").with(user(new UsuarioAutenticado(usuario))).with(csrf().useInvalidToken())
                .contentType("application/json").content("{\"nome\":\"Teste\"}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void dadosUsamIdentidadeDaSessaoMesmoComUsuarioForjado() throws Exception {
        var id = UUID.randomUUID();
        var dados = new DadosEmpresa("servicos", null, null, null, null, null, null, null, null, true);
        when(service.atualizarDados(usuario.getId(), id, dados))
                .thenReturn(new EstabelecimentoResposta(id, "Teste", true, "BRL", "America/Sao_Paulo", dados));
        mvc.perform(put("/api/estabelecimentos/" + id + "/dados").with(user(new UsuarioAutenticado(usuario))).with(csrf())
                .contentType("application/json").content("{\"atividade\":\"servicos\",\"semNumero\":true,\"usuarioId\":\"" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isOk());
        verify(service).atualizarDados(usuario.getId(), id, dados);
        verifyNoMoreInteractions(service);
    }

    @Test
    void renomearValidaSessaoCsrfNomeEProprietario() throws Exception {
        var id = UUID.randomUUID();
        var caminho = "/api/estabelecimentos/" + id + "/nome";
        mvc.perform(put(caminho).with(csrf()).contentType("application/json").content("{\"nome\":\"Novo\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(put(caminho).with(user(new UsuarioAutenticado(usuario)))
                .contentType("application/json").content("{\"nome\":\"Novo\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(put(caminho).with(user(new UsuarioAutenticado(usuario))).with(csrf())
                .contentType("application/json").content("{\"nome\":\" \"}"))
                .andExpect(status().isBadRequest());
        when(service.renomear(usuario.getId(), id, "Novo"))
                .thenReturn(new EstabelecimentoResposta(id, "Novo", true, "BRL", "America/Sao_Paulo"));
        mvc.perform(put(caminho).with(user(new UsuarioAutenticado(usuario))).with(csrf())
                .contentType("application/json").content("{\"nome\":\"Novo\",\"usuarioId\":\"" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.nome").value("Novo"));
        verify(service).renomear(usuario.getId(), id, "Novo");
        when(service.renomear(usuario.getId(), id, "Alheio")).thenThrow(new EstabelecimentoNaoEncontradoException());
        mvc.perform(put(caminho).with(user(new UsuarioAutenticado(usuario))).with(csrf())
                .contentType("application/json").content("{\"nome\":\"Alheio\"}"))
                .andExpect(status().isNotFound());
    }
    @Autowired MockMvc mvc;
    @MockitoBean EstabelecimentoService service;
    @MockitoBean UsuarioRepository usuarios;
    private Usuario usuario;

    @BeforeEach
    void preparar() {
        usuario = new Usuario("Teste", "estabelecimento@example.test", "hash", Instant.EPOCH);
        when(usuarios.findById(usuario.getId())).thenReturn(Optional.of(usuario));
    }

    @Test
    void exigeAutenticacaoECsrf() throws Exception {
        mvc.perform(get("/api/estabelecimentos")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/estabelecimentos/" + UUID.randomUUID())).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/estabelecimentos").with(csrf()).contentType("application/json").content("{\"nome\":\"Teste\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/estabelecimentos").with(user(new UsuarioAutenticado(usuario)))
                .contentType("application/json").content("{\"nome\":\"Teste\"}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void criacaoUsaSessaoMesmoComProprietarioForjado() throws Exception {
        var resposta = new EstabelecimentoResposta(UUID.randomUUID(), "Teste", true, "BRL", "America/Sao_Paulo");
        when(service.criar(usuario.getId(), "Teste")).thenReturn(resposta);
        mvc.perform(post("/api/estabelecimentos").with(user(new UsuarioAutenticado(usuario))).with(csrf())
                .contentType("application/json").content("{\"nome\":\"Teste\",\"usuarioId\":\"" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isCreated()).andExpect(header().string("Location", "/api/estabelecimentos/" + resposta.id()))
                .andExpect(jsonPath("$.id").value(resposta.id().toString()));
        verify(service).criar(usuario.getId(), "Teste");
    }

    @Test
    void validaNomeENaoRevelaEstabelecimentoAlheio() throws Exception {
        mvc.perform(post("/api/estabelecimentos").with(user(new UsuarioAutenticado(usuario))).with(csrf())
                .contentType("application/json").content("{\"nome\":\" \"}"))
                .andExpect(status().isBadRequest());
        var id = UUID.randomUUID();
        when(service.consultar(usuario.getId(), id)).thenThrow(new EstabelecimentoNaoEncontradoException());
        mvc.perform(get("/api/estabelecimentos/" + id).with(user(new UsuarioAutenticado(usuario))))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.detail").value("Estabelecimento nao encontrado."));
    }
    @Test
    void dadosValidamSessaoCsrfEConteudo() throws Exception {
        var id = UUID.randomUUID();
        var caminho = "/api/estabelecimentos/" + id + "/dados";
        var corpo = "{\"atividade\":\"servicos\",\"semNumero\":true}";
        mvc.perform(put(caminho).with(csrf()).contentType("application/json").content(corpo)).andExpect(status().isUnauthorized());
        mvc.perform(put(caminho).with(user(new UsuarioAutenticado(usuario))).contentType("application/json").content(corpo)).andExpect(status().isForbidden());
        mvc.perform(put(caminho).with(user(new UsuarioAutenticado(usuario))).with(csrf()).contentType("application/json")
                .content("{\"atividade\":\"invalida\"}")).andExpect(status().isBadRequest());
        var dados = new DadosEmpresa("servicos", null, null, null, null, null, null, null, null, true);
        when(service.atualizarDados(usuario.getId(), id, dados)).thenReturn(new EstabelecimentoResposta(id, "Teste", true, "BRL", "America/Sao_Paulo", dados));
        mvc.perform(put(caminho).with(user(new UsuarioAutenticado(usuario))).with(csrf()).contentType("application/json").content(corpo))
                .andExpect(status().isOk()).andExpect(jsonPath("$.dados.atividade").value("servicos"));
        verify(service).atualizarDados(usuario.getId(), id, dados);
        when(service.atualizarDados(usuario.getId(), id, dados)).thenThrow(new EstabelecimentoNaoEncontradoException());
        mvc.perform(put(caminho).with(user(new UsuarioAutenticado(usuario))).with(csrf()).contentType("application/json").content(corpo)).andExpect(status().isNotFound());
    }
}
