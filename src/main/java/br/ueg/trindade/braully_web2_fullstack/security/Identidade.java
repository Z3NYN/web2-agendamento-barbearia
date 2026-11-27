package br.ueg.trindade.braully_web2_fullstack.security;

import org.springframework.security.core.Authentication;

public record Identidade(Long id, String username) {
    public static Long id(Authentication auth) {
        return ((Identidade) auth.getPrincipal()).id();
    }

    public static boolean tem(Authentication auth, String papel) {
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(PermissaoSistema.PREFIXO_PAPEL + papel));
    }

    public static boolean temPermissao(Authentication auth, PermissaoSistema permissao) {
        if (auth == null || permissao == null) return false;
        String autoridade = permissao.ehPerfil()
                ? PermissaoSistema.PREFIXO_PAPEL + permissao.codigo()
                : permissao.autoridade();
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals(autoridade));
    }

    public static boolean temAlgumaPermissao(Authentication auth, PermissaoSistema... permissoes) {
        if (auth == null || permissoes == null) return false;
        for (PermissaoSistema p : permissoes) {
            if (temPermissao(auth, p)) return true;
        }
        return false;
    }
}
