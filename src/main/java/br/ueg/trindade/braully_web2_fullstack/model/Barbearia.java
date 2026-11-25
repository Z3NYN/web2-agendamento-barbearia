package br.ueg.trindade.braully_web2_fullstack.model;

import jakarta.persistence.*;

@Entity
public class Barbearia {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @Column(nullable = false) public String nome;
    public String descricao;
    public String endereco;
    public String telefone;
    public String instagram;
    public String whatsapp;
    public String corDestaque;
    public String corFundo;
    @Lob public byte[] logo;
    public String tipoLogo;
    public long versaoLogo;
    public boolean demonstracao;
    public boolean fidelidadeAtiva;
    public int meta;
    @ManyToOne(fetch = FetchType.LAZY) public Servico premio;
    public int antecedenciaMinutos;

}
