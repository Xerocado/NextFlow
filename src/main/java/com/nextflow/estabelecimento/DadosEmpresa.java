package com.nextflow.estabelecimento;

import jakarta.validation.constraints.*;

public record DadosEmpresa(
        @NotBlank @Pattern(regexp = "servicos|produtos|ambos") String atividade,
        @Size(max = 30) @Pattern(regexp = "[0-9+() .-]*") String telefone,
        @Pattern(regexp = "(?:[0-9]{5}-?[0-9]{3})?") String cep,
        @Size(max = 150) String logradouro,
        @Size(max = 20) String numero,
        @Size(max = 100) String complemento,
        @Size(max = 100) String bairro,
        @Size(max = 100) String cidade,
        @Pattern(regexp = "(?:AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)?") String uf,
        boolean semNumero) {
    @AssertTrue(message = "Informe o numero ou marque endereco sem numero.")
    public boolean isNumeroValido() {
        return semNumero ? numero == null || numero.isBlank() : numero != null && !numero.isBlank();
    }
}
