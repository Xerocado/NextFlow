package com.nextflow.estabelecimento;

import java.net.URI;
import java.util.UUID;
import com.nextflow.autenticacao.UsuarioAutenticado;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/estabelecimentos")
public class EstabelecimentoController {
    private final EstabelecimentoService service;

    public EstabelecimentoController(EstabelecimentoService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<EstabelecimentoResposta> criar(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @Valid @RequestBody Cadastro cadastro) {
        var resposta = service.criar(usuario.getId(), cadastro.nome());
        return ResponseEntity.created(URI.create("/api/estabelecimentos/" + resposta.id())).body(resposta);
    }

    @GetMapping
    public EstabelecimentoService.Pagina listar(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @RequestParam(defaultValue = "0") int pagina, @RequestParam(defaultValue = "20") int tamanho) {
        return service.listar(usuario.getId(), pagina, tamanho);
    }

    @GetMapping("/{id}")
    public EstabelecimentoResposta consultar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable UUID id) {
        return service.consultar(usuario.getId(), id);
    }

    public record Cadastro(@NotBlank @Size(max = 120) String nome) { }

    @PutMapping("/{id}/nome")
    public EstabelecimentoResposta renomear(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @PathVariable UUID id, @Valid @RequestBody Cadastro cadastro) {
        return service.renomear(usuario.getId(), id, cadastro.nome());
    }
    @PutMapping("/{id}/dados")
    public EstabelecimentoResposta atualizarDados(@AuthenticationPrincipal UsuarioAutenticado usuario,
            @PathVariable UUID id, @Valid @RequestBody DadosEmpresa dados) {
        return service.atualizarDados(usuario.getId(), id, dados);
    }
}
