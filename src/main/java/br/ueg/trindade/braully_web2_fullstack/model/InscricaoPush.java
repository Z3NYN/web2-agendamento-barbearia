package br.ueg.trindade.braully_web2_fullstack.model;

import java.time.LocalDateTime;
import jakarta.persistence.*;

@Entity
@Table(
    indexes = @Index(columnList = "usuario_id"),
    uniqueConstraints = @UniqueConstraint(columnNames = "endpoint")
)
public class InscricaoPush {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    public Usuario usuario;

    @Column(nullable = false, unique = true, length = 600)
    public String endpoint;

    @Column(nullable = false, length = 160)
    public String p256dh;

    @Column(nullable = false, length = 80)
    public String auth;

    @Column(nullable = false)
    public LocalDateTime criadaEm;
}
