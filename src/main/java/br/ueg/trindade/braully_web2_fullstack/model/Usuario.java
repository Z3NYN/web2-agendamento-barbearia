package br.ueg.trindade.braully_web2_fullstack.model;

import java.util.HashSet;
import java.util.Set;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToMany;

@Entity
public class Usuario {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nome;
    @Column(nullable = false, unique = true)
    private String username;
    @JsonIgnore
    private String senha;
    private String email;
    private boolean ativo = true;
    private long versaoSessao;
    @Column(nullable = false, columnDefinition = "boolean default true not null")
    private boolean notifSistema = true;
    @Column(nullable = false, columnDefinition = "boolean default false not null")
    private boolean notifPush = false;
    @Column(nullable = false, columnDefinition = "boolean default true not null")
    private boolean notifLembretes = true;
    @Column(nullable = false, columnDefinition = "boolean default true not null")
    private boolean notifFidelidade = true;

    public boolean isAtivo() { return ativo; }
    public void setAtivo(boolean ativo) { this.ativo = ativo; }
    @JsonIgnore public long getVersaoSessao() { return versaoSessao; }
    public void revogarSessoes() { versaoSessao++; }
    @JsonIgnore public boolean isNotifSistema() { return notifSistema; }
    public void setNotifSistema(boolean notifSistema) { this.notifSistema = notifSistema; }
    @JsonIgnore public boolean isNotifPush() { return notifPush; }
    public void setNotifPush(boolean notifPush) { this.notifPush = notifPush; }
    @JsonIgnore public boolean isNotifLembretes() { return notifLembretes; }
    public void setNotifLembretes(boolean notifLembretes) { this.notifLembretes = notifLembretes; }
    @JsonIgnore public boolean isNotifFidelidade() { return notifFidelidade; }
    public void setNotifFidelidade(boolean notifFidelidade) { this.notifFidelidade = notifFidelidade; }

    @ManyToMany
    private Set<Permissao> permissoes = new HashSet<>();

    public Usuario(){
        
    }

    public Usuario(String nome, String username, String senha, String email) {
        this.nome = nome;
        this.username = username;
        this.senha = senha;
        this.email = email;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getSenha() {
        return senha;
    }

    public void setSenha(String senha) {
        this.senha = senha;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Set<Permissao> getPermissoes() {
        return permissoes;
    }

    public void setPermissoes(Set<Permissao> permissoes) {
        this.permissoes = permissoes;
    }

}
