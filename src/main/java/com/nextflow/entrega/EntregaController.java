package com.nextflow.entrega;
import java.time.LocalDate;
import java.util.UUID;
import com.nextflow.autenticacao.UsuarioAutenticado;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/estabelecimentos/{empresaId}/entregas")
public class EntregaController {
    private final EntregaService service;
    public EntregaController(EntregaService service) { this.service=service; }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public Entrega.Resposta criar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable UUID empresaId,
            @Valid @RequestBody EntregaEntrada entrada) { return service.criar(usuario.getId(),empresaId,entrada); }
    @PostMapping("/{id}/pagamentos") @ResponseStatus(HttpStatus.CREATED)
    public Pagamento.Resposta receber(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable UUID empresaId,
            @PathVariable UUID id, @Valid @RequestBody PagamentoEntrada entrada) { return service.receber(usuario.getId(),empresaId,id,entrada); }
    @GetMapping("/{id}")
    public EntregaService.Detalhe consultar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable UUID empresaId,
            @PathVariable UUID id) { return service.consultar(usuario.getId(),empresaId,id); }
    @GetMapping
    public EntregaService.Pagina listar(@AuthenticationPrincipal UsuarioAutenticado usuario, @PathVariable UUID empresaId,
            @RequestParam LocalDate inicio, @RequestParam LocalDate fim, @RequestParam(defaultValue="false") boolean pendentes,
            @RequestParam(defaultValue="0") int pagina, @RequestParam(defaultValue="20") int tamanho) {
        return service.listar(usuario.getId(),empresaId,inicio,fim,pendentes,pagina,tamanho);
    }
}
