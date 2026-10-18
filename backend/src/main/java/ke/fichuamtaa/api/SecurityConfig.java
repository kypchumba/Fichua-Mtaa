package ke.fichuamtaa.api;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestHandler;
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.*;

@Configuration
class SecurityConfig {
  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  UserDetailsService userDetailsService(UserRepository users) {
    return email ->
        users
            .findByEmailIgnoreCase(email)
            .map(
                u ->
                    User.withUsername(u.email)
                        .password(u.passwordHash)
                        .roles(u.role.name())
                        .build())
            .orElseThrow(() -> new UsernameNotFoundException("Account not found"));
  }

  @Bean
  AuthenticationManager authenticationManager(AuthenticationConfiguration c) throws Exception {
    return c.getAuthenticationManager();
  }

  @Bean
  SecurityFilterChain filterChain(
      HttpSecurity http,
      RegistrationRateLimiter registrationRateLimiter,
      TrustedProxyClientIpResolver clientIpResolver,
      ObjectMapper objectMapper,
      @org.springframework.beans.factory.annotation.Value("${SESSION_COOKIE_SECURE:false}")
          boolean secureCookie,
      @org.springframework.beans.factory.annotation.Value("${SESSION_SAME_SITE:lax}")
          String sameSite)
      throws Exception {
    var csrfRepo = CookieCsrfTokenRepository.withHttpOnlyFalse();
    csrfRepo.setCookiePath("/");
    csrfRepo.setCookieCustomizer(cookie -> cookie.secure(secureCookie).sameSite(sameSite));
    return http.cors(c -> {})
        .csrf(
            c ->
                c.csrfTokenRepository(csrfRepo)
                    .csrfTokenRequestHandler(new SpaCsrfTokenRequestHandler()))
        .authorizeHttpRequests(
            a ->
                a.requestMatchers("/api/auth/register", "/api/auth/login", "/api/health")
                    .permitAll()
                    .requestMatchers("/api/admin/**")
                    .hasRole("ADMIN")
                    .requestMatchers(HttpMethod.OPTIONS, "/**")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .formLogin(f -> f.disable())
        .httpBasic(b -> b.disable())
        .exceptionHandling(
            e ->
                e.authenticationEntryPoint(
                        (req, res, ex) ->
                            writeApiError(
                                objectMapper,
                                res,
                                HttpServletResponse.SC_UNAUTHORIZED,
                                "Please sign in to continue."))
                    .accessDeniedHandler(
                        (req, res, ex) ->
                            writeApiError(
                                objectMapper,
                                res,
                                HttpServletResponse.SC_FORBIDDEN,
                                "You do not have permission to perform this action.")))
        // Run before CSRF and MVC validation so every registration POST consumes an attempt.
        .addFilterBefore(
            new RegistrationRateLimitFilter(registrationRateLimiter, clientIpResolver),
            CsrfFilter.class)
        .build();
  }

  private static void writeApiError(
      ObjectMapper mapper, HttpServletResponse response, int status, String message)
      throws IOException {
    response.setStatus(status);
    response.setCharacterEncoding(StandardCharsets.UTF_8.name());
    response.setContentType("application/json");
    mapper.writeValue(response.getOutputStream(), Map.of("message", message, "fields", Map.of()));
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource(
      @Value("${app.cors.allowed-origin}") String origin) {
    var cfg = new CorsConfiguration();
    cfg.setAllowedOrigins(List.of(origin));
    cfg.setAllowCredentials(true);
    cfg.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS"));
    cfg.setAllowedHeaders(List.of("Content-Type", "X-XSRF-TOKEN"));
    var src = new UrlBasedCorsConfigurationSource();
    src.registerCorsConfiguration("/api/**", cfg);
    return src;
  }
}

// Spring uses an XOR token for rendered forms; this handler also accepts the raw double-submit
// cookie token used by the SPA.
final class SpaCsrfTokenRequestHandler implements CsrfTokenRequestHandler {
  private final CsrfTokenRequestHandler xor = new XorCsrfTokenRequestAttributeHandler();

  @Override
  public void handle(
      jakarta.servlet.http.HttpServletRequest request,
      jakarta.servlet.http.HttpServletResponse response,
      java.util.function.Supplier<org.springframework.security.web.csrf.CsrfToken> token) {
    xor.handle(request, response, token);
    token.get();
  }

  @Override
  public String resolveCsrfTokenValue(
      jakarta.servlet.http.HttpServletRequest request,
      org.springframework.security.web.csrf.CsrfToken token) {
    String header = request.getHeader(token.getHeaderName());
    return header != null ? header : xor.resolveCsrfTokenValue(request, token);
  }
}
