package com.nextflow.compartilhado.erro;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(com.nextflow.compartilhado.idempotencia.ConflitoIdempotenciaException.class)
    public ProblemDetail conflitoIdempotencia() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT,
                "A chave de repeticao ja foi usada com outros dados.");
    }

    @ExceptionHandler(com.nextflow.entrega.EntregaNaoEncontradaException.class)
    public ProblemDetail entregaNaoEncontrada() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "Entrega nao encontrada.");
    }
    @ExceptionHandler(com.nextflow.cliente.ClienteNaoEncontradoException.class)
    public ProblemDetail clienteNaoEncontrado() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "Cliente nao encontrado.");
    }
    @ExceptionHandler(com.nextflow.autenticacao.SenhaIgualAtualException.class)
    public ProblemDetail senhaIgualAtual() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY,
                "A nova senha deve ser diferente da senha atual.");
    }
    @ExceptionHandler(com.nextflow.estabelecimento.EstabelecimentoNaoEncontradoException.class)
    public ProblemDetail estabelecimentoNaoEncontrado() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "Estabelecimento nao encontrado.");
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    public ProblemDetail entradaInvalida(Exception exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Verifique os campos informados.");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail regraInvalida(IllegalArgumentException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, exception.getMessage());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ProblemDetail conflito(DataIntegrityViolationException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, "Nao foi possivel concluir o cadastro com os dados informados.");
    }

    @ExceptionHandler(TaskRejectedException.class)
    public ProblemDetail ocupado(TaskRejectedException exception) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS, "Aguarde antes de tentar novamente.");
    }
}
