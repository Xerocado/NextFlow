package com.nextflow.autenticacao;

import org.springframework.beans.factory.annotation.Value;
import java.nio.charset.StandardCharsets;
import java.io.IOException;
import jakarta.mail.MessagingException;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.MailPreparationException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

@Component
public class SmtpEmailRecuperacao implements EmailRecuperacao {
    private final JavaMailSender sender;
    private final String remetente;

    public SmtpEmailRecuperacao(JavaMailSender sender,
            @Value("${app.email.remetente}") String remetente) {
        this.sender = sender;
        this.remetente = remetente;
    }

    @Override
    public void enviar(String destinatario, String token) {
        if (token == null || !token.matches("[0-9]{6}")) throw new MailPreparationException("Formato de codigo invalido.");
        try {
            var message = sender.createMimeMessage();
            var helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(remetente);
            helper.setTo(destinatario);
            helper.setSubject("Seu código de recuperação — NextFlow");
            var texto = "NextFlow\nRecupere seu acesso\n\nSeu código: " + token
                    + "\nVálido por 10 minutos e para um único uso."
                    + "\n\nNo NextFlow, abra Esqueci minha senha e informe seu e-mail, este código e uma nova senha diferente da atual."
                    + "\nApós 5 tentativas incorretas, solicite outro código."
                    + "\nSe não solicitou, ignore esta mensagem. Sua senha permanece inalterada."
                    + "\nNão compartilhe este código. Nunca pediremos sua senha por e-mail.";
            var html = new ClassPathResource("templates/email/recuperacao-senha.html")
                    .getContentAsString(StandardCharsets.UTF_8).replace("{{codigo}}", token);
            helper.setText(texto, html);
            sender.send(message);
        } catch (MessagingException | IOException exception) {
            throw new MailPreparationException("Nao foi possivel preparar o email de recuperacao.", exception);
        }
    }
}
