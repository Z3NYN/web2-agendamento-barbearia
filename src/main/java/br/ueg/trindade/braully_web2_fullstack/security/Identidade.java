package br.ueg.trindade.braully_web2_fullstack.security;

import org.springframework.security.core.Authentication;

public record Identidade(Long id, String username) {
    public static Long id(Authentication auth) {
        return ((Identidade) auth.getPrincipal()).id();
    }

    public static boolean tem(Authentication auth, String papel) {
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_" + papel));
    }
}
