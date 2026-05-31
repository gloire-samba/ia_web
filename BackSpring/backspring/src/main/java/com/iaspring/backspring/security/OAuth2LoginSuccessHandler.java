package com.iaspring.backspring.security;

import java.io.IOException;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import com.iaspring.backspring.entity.Utilisateur;
import com.iaspring.backspring.repository.UtilisateurRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UtilisateurRepository utilisateurRepository;
    private final JwtService jwtService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        
        String email = oAuth2User.getAttribute("email");
        if (email == null) {
            email = oAuth2User.getAttribute("login") + "@github.com";
        }

        final String finalEmail = email;
        
        Utilisateur utilisateur = utilisateurRepository.findByEmail(finalEmail)
                .orElseGet(() -> {
                    Utilisateur newUser = Utilisateur.builder()
                            .email(finalEmail)
                            .motDePasse(UUID.randomUUID().toString())
                            .role("ROLE_USER")
                            .authProvider(oAuth2User.getAttribute("login") != null ? "GITHUB" : "GOOGLE")
                            .build();
                    return utilisateurRepository.save(newUser);
                });

        String token = jwtService.genererToken(utilisateur);

        String frontend = null;
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("oauth_frontend_origin".equals(cookie.getName())) {
                    frontend = cookie.getValue();
                    break;
                }
            }
        }

        String frontendUrl = "http://localhost:4200"; 
        if ("react".equals(frontend)) {
            frontendUrl = "http://localhost:5173";
        }

        Cookie cookieNettoyage = new Cookie("oauth_frontend_origin", null);
        cookieNettoyage.setPath("/");
        cookieNettoyage.setMaxAge(0);
        response.addCookie(cookieNettoyage);

        String targetUrl = frontendUrl + "/login?token=" + token 
                         + "&id=" + utilisateur.getId() 
                         + "&role=" + utilisateur.getRole()
                         + "&email=" + utilisateur.getEmail()
                         + "&backend=spring"; // 👉 L'identité de Spring forcée ici;
                         
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}