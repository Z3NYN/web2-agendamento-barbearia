package br.ueg.trindade.braully_web2_fullstack.model;

import java.math.BigDecimal;
import jakarta.persistence.*;

@Entity
public class Servico {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) public Barbearia barbearia;
    @Column(nullable = false) public String nome;
    public String descricao;
    @Column(nullable = false, precision = 10, scale = 2) public BigDecimal preco;
    public int duracaoMinutos;
    public boolean elegivel;
    public boolean ativo = true;

    public Long getId() { return id; }
    public String getNome() { return nome; }
}
