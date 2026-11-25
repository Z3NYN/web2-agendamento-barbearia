package br.ueg.trindade.braully_web2_fullstack.model;

import jakarta.persistence.*;

@Entity
public class Barbeiro {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) public Barbearia barbearia;
    @OneToOne(fetch = FetchType.LAZY) @JoinColumn(unique = true) public Usuario usuario;
    @Column(nullable = false) public String nome;
    public String descricao;
    public boolean ativo = true;

    public Long getId() { return id; }
    public String getNome() { return nome; }
    public Usuario getUsuario() { return usuario; }
}
