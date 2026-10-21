package com.nextflow.autenticacao;

import jakarta.mail.Session;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.internet.MimeMessage;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailPreparationException;
import org.springframework.mail.javamail.JavaMailSender;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class SmtpEmailRecuperacaoTest {
    @Test
    void montaHtmlETextoSemAcessarSmtpReal() throws Exception {
        JavaMailSender sender = mock(JavaMailSender.class);
        var mensagem = new MimeMessage(Session.getInstance(new Properties()));
        when(sender.createMimeMessage()).thenReturn(mensagem);
        new SmtpEmailRecuperacao(sender, "remetente@example.test").enviar("destino@example.test", "012345");
        verify(sender).send(mensagem);
        mensagem.saveChanges();
        assertThat(mensagem.getAllRecipients()[0].toString()).isEqualTo("destino@example.test");
        assertThat(mensagem.getSubject()).contains("NextFlow");
        assertThat(parte(mensagem, "text/html")).contains("012345", "10 minutos", "Next", "viewport", "5 tentativas").doesNotContain("{{codigo}}", "<script");
        assertThat(parte(mensagem, "text/plain")).contains("012345", "10 minutos", "Esqueci minha senha", "5 tentativas").doesNotContain("<html", "POST /api");
    }

    @Test
    void rejeitaConteudoNaoNumericoAntesDePrepararEmail() {
        var sender = mock(JavaMailSender.class);
        assertThatThrownBy(() -> new SmtpEmailRecuperacao(sender, "remetente@example.test").enviar("destino@example.test", "<script>"))
                .isInstanceOf(MailPreparationException.class);
        verifyNoInteractions(sender);
    }

    private String parte(Part parte, String tipo) throws Exception {
        if (parte.isMimeType(tipo)) return (String) parte.getContent();
        if (parte.getContent() instanceof Multipart multipart) {
            for (int i = 0; i < multipart.getCount(); i++) {
                var encontrada = parte(multipart.getBodyPart(i), tipo);
                if (encontrada != null) return encontrada;
            }
        }
        return null;
    }
}
