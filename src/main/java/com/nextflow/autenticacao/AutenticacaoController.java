package com.nextflow.autenticacao;

import java.util.Map;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AutenticacaoController {
    private final CadastroService cadastro;
    private final RecuperacaoDispatcher dispatcher;
    private final RecuperacaoSenhaService recuperacao;

    public AutenticacaoController(CadastroService cadastro, RecuperacaoDispatcher dispatcher,
            RecuperacaoSenhaService recuperacao) {
        this.cadastro = cadastro;
        this.dispatcher = dispatcher;
        this.recuperacao = recuperacao;
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("headerName", token.getHeaderName(), "token", token.getToken());
    }

    @PostMapping("/cadastro")
    @ResponseStatus(HttpStatus.CREATED)
    public void cadastrar(@Valid @RequestBody CadastroRequest request) {
        cadastro.cadastrar(request.nome(), request.email(), request.senha());
    }

    @GetMapping("/me")
    public PerfilResponse perfil(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return new PerfilResponse(usuario.getId(), usuario.getUsername());
    }

    @PostMapping("/recuperar-senha")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> solicitar(@Valid @RequestBody RecuperarRequest request) {
        dispatcher.solicitar(request.email());
        return Map.of("mensagem", "Se houver uma conta para esse e-mail, enviaremos instrucoes de recuperacao.");
    }

    @PostMapping("/redefinir-senha")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void redefinir(@Valid @RequestBody RedefinirRequest request) {
        recuperacao.redefinir(request.email(), request.token(), request.novaSenha());
    }

    public record CadastroRequest(@NotBlank @Size(max = 120) String nome,
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 12, max = 72) String senha) { }
    public record RecuperarRequest(@NotBlank @Email @Size(max = 254) String email) { }
    public record RedefinirRequest(@NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Pattern(regexp = "[0-9]{6}") String token,
            @NotBlank @Size(min = 12, max = 72) String novaSenha) { }
    public record PerfilResponse(UUID id, String email) { }
}
