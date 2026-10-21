package com.nextflow.cliente;

import java.net.URI;
import java.util.UUID;
import com.nextflow.autenticacao.UsuarioAutenticado;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/estabelecimentos/{empresaId}/clientes")
public class ClienteController {
    private final ClienteService service;

    public ClienteController(ClienteService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<ClienteResposta> criar(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @PathVariable UUID empresaId, @Valid @RequestBody ClienteEntrada entrada) {
        var resposta = service.criar(usuario.getId(), empresaId, entrada);
        return ResponseEntity.created(URI.create("/api/estabelecimentos/" + empresaId + "/clientes/" + resposta.id())).body(resposta);
    }

    @GetMapping
    public ClienteService.Pagina listar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable UUID empresaId,
            @RequestParam(defaultValue = "0") int pagina, @RequestParam(defaultValue = "20") int tamanho) {
        return service.listar(usuario.getId(), empresaId, pagina, tamanho);
    }

    @GetMapping("/{id}")
    public ClienteResposta consultar(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @PathVariable UUID empresaId, @PathVariable UUID id) {
        return service.consultar(usuario.getId(), empresaId, id);
    }

    @PutMapping("/{id}")
    public ClienteResposta atualizar(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @PathVariable UUID empresaId, @PathVariable UUID id, @Valid @RequestBody ClienteEntrada entrada) {
        return service.atualizar(usuario.getId(), empresaId, id, entrada);
    }
}
