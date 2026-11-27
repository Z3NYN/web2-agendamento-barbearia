package br.ueg.trindade.braully_web2_fullstack.model;

import java.time.LocalDateTime;
import jakarta.persistence.*;

@Entity
@Table(
    indexes = {
        @Index(columnList = "destinatario_id,criadaEm"),
        @Index(columnList = "destinatario_id,lida")
    },
    uniqueConstraints = @UniqueConstraint(columnNames = "chaveUnica")
)
public class Notificacao {
    public enum Tipo {
        NOVO_AGENDAMENTO, CONFIRMADO, CANCELADO, REAGENDADO, LEMBRETE, RECOMPENSA_FIDELIDADE
    }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    public Usuario destinatario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    public Tipo tipo;

    @Column(nullable = false, length = 120)
    public String titulo;

    @Column(nullable = false, length = 280)
    public String mensagem;

    @Column(nullable = false, length = 160)
    public String destinoUrl;

    @Column(nullable = false, unique = true, length = 160)
    public String chaveUnica;

    public boolean lida = false;

    @Column(nullable = false)
    public LocalDateTime criadaEm;
}
