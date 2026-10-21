package com.nextflow.autenticacao;

import java.io.IOException;
import com.nextflow.usuario.Usuario;
import com.nextflow.usuario.UsuarioRepository;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

// Registrado apenas na cadeia do Spring Security, evitando execucao duplicada.
public class ProtecaoAutenticacaoFilter extends OncePerRequestFilter {
    private final UsuarioRepository usuarios;
    private final LimiteTentativas limites;

    public ProtecaoAutenticacaoFilter(UsuarioRepository usuarios, LimiteTentativas limites) {
        this.usuarios = usuarios;
        this.limites = limites;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        if ("POST".equals(request.getMethod()) && path.startsWith("/api/auth/")) {
            if (!limites.permitir("ip:" + path + ":" + request.getRemoteAddr(), 20)) {
                response.setStatus(429);
                response.setHeader("Retry-After", "900");
                return;
            }
            if (path.equals("/api/auth/login")) {
                String email = request.getParameter("email");
                String senha = request.getParameter("password");
                if (email == null || email.length() > 254 || senha == null
                        || senha.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72) {
                    response.setStatus(401);
                    return;
                }
                if (!limites.permitir("login:" + RecuperacaoSenhaService.hash(Usuario.normalizarEmail(email)), 10)) {
                    response.setStatus(429);
                    return;
                }
            }
        }
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UsuarioAutenticado principal) {
            boolean atual = usuarios.findById(principal.getId())
                    .map(u -> u.getVersaoCredencial() == principal.getVersaoCredencial()).orElse(false);
            if (!atual) {
                SecurityContextHolder.clearContext();
                var session = request.getSession(false);
                if (session != null) { session.invalidate(); }
                response.setStatus(401);
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
