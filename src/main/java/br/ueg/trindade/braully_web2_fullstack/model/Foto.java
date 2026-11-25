package br.ueg.trindade.braully_web2_fullstack.model;

import jakarta.persistence.*;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
public class Foto {
    public enum Alvo { ABERTURA, CAPA, SERVICO, BARBEIRO, GALERIA }
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    public UUID id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    public Barbearia barbearia;
    @Enumerated(EnumType.STRING) @JdbcTypeCode(SqlTypes.VARCHAR) @Column(nullable = false, length = 24)
    public Alvo alvo;
    public Long cadastroId;
    @Column(length = 120)
    public String legenda;
    @Column(length = 24)
    public String categoria;
    @Column(nullable = false)
    public String tipo;
    @Lob @Column(nullable = false)
    public byte[] conteudo;
}
