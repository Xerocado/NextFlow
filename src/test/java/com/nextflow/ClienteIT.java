package com.nextflow;

import java.time.Instant;
import java.util.UUID;
import com.nextflow.cliente.*;
import com.nextflow.estabelecimento.*;
import com.nextflow.usuario.*;
import com.nextflow.autenticacao.UsuarioAutenticado;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.*;
import org.testcontainers.postgresql.PostgreSQLContainer;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class ClienteIT {
    @Container @ServiceConnection
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:16-alpine");
    @Autowired ClienteService clientes;
    @Autowired EstabelecimentoService empresas;
    @Autowired UsuarioRepository usuarios;
    @Autowired MockMvc mvc;

    private Usuario usuario() {
        return usuarios.saveAndFlush(new Usuario("Exemplo", UUID.randomUUID() + "@example.test", "hash-ficticio", Instant.EPOCH));
    }

    @Test void persisteEditaEPaginaSemMisturarEmpresasDoMesmoUsuario() {
        var dono = usuario();
        var a = empresas.criar(dono.getId(), "Empresa A");
        var b = empresas.criar(dono.getId(), "Empresa B");
        var primeiro = clientes.criar(dono.getId(), a.id(), new ClienteEntrada("Ana exemplo", null, null));
        clientes.criar(dono.getId(), a.id(), new ClienteEntrada("Bruno exemplo", null, null));
        var outro = clientes.criar(dono.getId(), b.id(), new ClienteEntrada("Ana exemplo", null, null));
        var pagina = clientes.listar(dono.getId(), a.id(), 0, 1);
        assertThat(pagina.total()).isEqualTo(2);
        assertThat(pagina.itens()).extracting(ClienteResposta::id).containsExactly(primeiro.id());
        assertThat(clientes.listar(dono.getId(), a.id(), 1, 1).itens()).extracting(ClienteResposta::nome).containsExactly("Bruno exemplo");
        clientes.atualizar(dono.getId(), a.id(), primeiro.id(), new ClienteEntrada("Nome atualizado", "", "Exemplo"));
        assertThat(clientes.consultar(dono.getId(), a.id(), primeiro.id()).observacao()).isEqualTo("Exemplo");
        assertThatThrownBy(() -> clientes.consultar(dono.getId(), a.id(), outro.id())).isInstanceOf(ClienteNaoEncontradoException.class);
        assertThatThrownBy(() -> clientes.atualizar(dono.getId(), a.id(), outro.id(), new ClienteEntrada("Forjado", null, null)))
                .isInstanceOf(ClienteNaoEncontradoException.class);
        assertThat(clientes.consultar(dono.getId(), b.id(), outro.id()).nome()).isEqualTo("Ana exemplo");
    }

    @Test void httpBloqueiaOutroUsuarioEClienteDeOutraEmpresa() throws Exception {
        var dono = usuario();
        var outro = usuario();
        var a = empresas.criar(dono.getId(), "Privada A");
        var b = empresas.criar(dono.getId(), "Privada B");
        var cliente = clientes.criar(dono.getId(), a.id(), new ClienteEntrada("Original", null, null));
        var caminho = "/api/estabelecimentos/" + a.id() + "/clientes";
        var corpo = "{\"nome\":\"Forjado\",\"usuarioId\":\"" + dono.getId() + "\",\"estabelecimentoId\":\"" + b.id() + "\"}";
        mvc.perform(get(caminho).with(user(new UsuarioAutenticado(outro)))).andExpect(status().isNotFound());
        mvc.perform(get(caminho + "/" + cliente.id()).with(user(new UsuarioAutenticado(outro)))).andExpect(status().isNotFound());
        mvc.perform(post(caminho).with(user(new UsuarioAutenticado(outro))).with(csrf()).contentType("application/json").content(corpo))
                .andExpect(status().isNotFound());
        mvc.perform(put(caminho + "/" + cliente.id()).with(user(new UsuarioAutenticado(outro))).with(csrf()).contentType("application/json").content(corpo))
                .andExpect(status().isNotFound());
        var caminhoOutraEmpresa = "/api/estabelecimentos/" + b.id() + "/clientes/" + cliente.id();
        mvc.perform(get(caminhoOutraEmpresa).with(user(new UsuarioAutenticado(dono)))).andExpect(status().isNotFound());
        mvc.perform(put(caminhoOutraEmpresa).with(user(new UsuarioAutenticado(dono))).with(csrf()).contentType("application/json").content(corpo))
                .andExpect(status().isNotFound());
        assertThat(clientes.consultar(dono.getId(), a.id(), cliente.id()).nome()).isEqualTo("Original");
        assertThat(clientes.listar(dono.getId(), a.id(), 0, 20).total()).isEqualTo(1);
        mvc.perform(post(caminho).with(user(new UsuarioAutenticado(dono))).with(csrf()).contentType("application/json").content(corpo))
                .andExpect(status().isCreated());
        assertThat(clientes.listar(dono.getId(), a.id(), 0, 20).total()).isEqualTo(2);
        assertThat(clientes.listar(dono.getId(), b.id(), 0, 20).total()).isZero();
    }
}
