package com.nextflow.autenticacao;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.mail.AuthenticationFailedException;
import jakarta.mail.MessagingException;
import java.net.SocketTimeoutException;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailSendException;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class RecuperacaoDispatcherTest {
    @Test
    void categorizaAutenticacaoDiretaEEncapsulada() {
        assertThat(RecuperacaoDispatcher.categoria(new MailAuthenticationException("segredo")))
                .isEqualTo("SMTP_AUTENTICACAO");
        var falha = new MailSendException(Map.of("mensagem", new AuthenticationFailedException("segredo")));
        assertThat(RecuperacaoDispatcher.categoria(falha)).isEqualTo("SMTP_AUTENTICACAO");
    }

    @Test
    void categorizaTimeoutEncapsuladoPeloSmtp() {
        var falha = new MailSendException("falha", new MessagingException("smtp", new SocketTimeoutException("segredo")));
        assertThat(RecuperacaoDispatcher.categoria(falha)).isEqualTo("SMTP_CONEXAO");
    }

    @Test
    void separaFalhaDeEnvioDeFalhaInterna() {
        assertThat(RecuperacaoDispatcher.categoria(new MailSendException("recusado"))).isEqualTo("SMTP_ENVIO");
        var ciclo = new RuntimeException("interno");
        var outra = new RuntimeException("outra", ciclo);
        ciclo.initCause(outra);
        assertThat(RecuperacaoDispatcher.categoria(ciclo)).isEqualTo("PROCESSAMENTO_INTERNO");
    }

    @Test
    void logContemSomenteCategoriaSemDadosOuStackTrace() {
        var service = mock(RecuperacaoSenhaService.class);
        doThrow(new MailAuthenticationException("senha-ficticia token-ficticio pessoa@example.test"))
                .when(service).solicitar("pessoa@example.test");
        var logger = (Logger) LoggerFactory.getLogger(RecuperacaoDispatcher.class);
        var appender = new ListAppender<ILoggingEvent>();
        appender.start(); logger.addAppender(appender);
        try {
            assertThatCode(() -> new RecuperacaoDispatcher(service).solicitar("pessoa@example.test")).doesNotThrowAnyException();
            assertThat(appender.list).hasSize(1);
            var evento = appender.list.getFirst();
            assertThat(evento.getFormattedMessage()).endsWith("categoria=SMTP_AUTENTICACAO")
                    .doesNotContain("senha-ficticia", "token-ficticio", "pessoa@example.test");
            assertThat(evento.getThrowableProxy()).isNull();
        } finally { logger.detachAppender(appender); appender.stop(); }
    }
}
