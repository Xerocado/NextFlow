package com.nextflow.autenticacao;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailException;
import org.springframework.mail.MailSendException;
import jakarta.mail.AuthenticationFailedException;
import jakarta.mail.MessagingException;
import java.io.InterruptedIOException;
import java.net.ConnectException;
import java.net.NoRouteToHostException;
import java.net.UnknownHostException;
import javax.net.ssl.SSLException;
import java.util.ArrayDeque;
import java.util.Collections;
import java.util.IdentityHashMap;

@Service
public class RecuperacaoDispatcher {
    private static final Logger LOG = LoggerFactory.getLogger(RecuperacaoDispatcher.class);
    private final RecuperacaoSenhaService service;

    public RecuperacaoDispatcher(RecuperacaoSenhaService service) { this.service = service; }

    @Async("recuperacaoExecutor")
    public void solicitar(String email) {
        try {
            service.solicitar(email);
        } catch (RuntimeException exception) {
            // Nao incluir excecao: mensagens SMTP podem conter destinatarios e conteudo.
            LOG.warn("Nao foi possivel processar uma solicitacao de recuperacao de senha. categoria={}", categoria(exception));
        }
    }

    static String categoria(Throwable exception) {
        var pendentes = new ArrayDeque<Throwable>();
        var visitadas = Collections.newSetFromMap(new IdentityHashMap<Throwable, Boolean>());
        pendentes.add(exception);
        boolean conexao = false;
        boolean envio = false;
        // Limite defensivo para cadeias de causas ou excecoes SMTP ciclicas.
        for (int i = 0; i < 32 && !pendentes.isEmpty(); i++) {
            var causa = pendentes.removeFirst();
            if (!visitadas.add(causa)) continue;
            if (causa instanceof MailAuthenticationException || causa instanceof AuthenticationFailedException) {
                return "SMTP_AUTENTICACAO";
            }
            if (causa instanceof ConnectException || causa instanceof UnknownHostException
                    || causa instanceof NoRouteToHostException || causa instanceof InterruptedIOException
                    || causa instanceof SSLException) conexao = true;
            if (causa instanceof MailException || causa instanceof MessagingException) envio = true;
            if (causa.getCause() != null) pendentes.add(causa.getCause());
            if (causa instanceof MessagingException mensagem && mensagem.getNextException() != null) {
                pendentes.add(mensagem.getNextException());
            }
            if (causa instanceof MailSendException falha) {
                for (var detalhe : falha.getMessageExceptions()) {
                    if (pendentes.size() >= 32) break;
                    if (detalhe != null) pendentes.add(detalhe);
                }
            }
        }
        return conexao ? "SMTP_CONEXAO" : envio ? "SMTP_ENVIO" : "PROCESSAMENTO_INTERNO";
    }
}
