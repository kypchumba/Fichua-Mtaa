package ke.fichuamtaa.api;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestHandler;
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.cors.*;

@Configuration
@EnableMethodSecurity
class SecurityConfig {
  static final String RAW_CSRF_TOKEN_ATTRIBUTE = "fichuamtaa.raw-csrf-token";

  static final RequestMatcher CSRF_BOOTSTRAP_REQUEST =
      request -> {
        String path = request.getServletPath();
        if (path == null || path.isBlank()) {
          path = request.getRequestURI().substring(request.getContextPath().length());
        }
        return HttpMethod.GET.matches(request.getMethod()) && "/api/auth/csrf".equals(path);
      };

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
      UserRepository users,
      ActiveSessionRegistry sessions,
      ObjectMapper objectMapper,
      CsrfTokenRepository csrfRepo)
      throws Exception {
    return http.cors(c -> {})
        .csrf(
            c ->
                c.csrfTokenRepository(csrfRepo)
                    .csrfTokenRequestHandler(new SpaCsrfTokenRequestHandler()))
        .authorizeHttpRequests(
            a ->
                a.requestMatchers("/api/auth/register", "/api/auth/login", "/api/health")
                    .permitAll()
                    // Browsers need an anonymous bootstrap request before a CSRF-protected login.
                    .requestMatchers(CSRF_BOOTSTRAP_REQUEST)
                    .permitAll()
                    .requestMatchers("/api/admin/**")
                    .hasRole("ADMIN")
                    .requestMatchers(HttpMethod.POST, "/api/requests")
                    .hasRole("CITIZEN")
                    .requestMatchers(HttpMethod.POST, "/api/uploads/image")
                    .hasRole("CITIZEN")
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
        .addFilterAfter(
            new SessionAccountValidityFilter(users, sessions, objectMapper),
            SecurityContextHolderFilter.class)
        .build();
  }

  @Bean
  CsrfTokenRepository csrfTokenRepository(
      @org.springframework.beans.factory.annotation.Value("${SESSION_COOKIE_SECURE:false}")
          boolean secureCookie,
      @org.springframework.beans.factory.annotation.Value("${SESSION_SAME_SITE:lax}")
          String sameSite) {
    var csrfRepo = CookieCsrfTokenRepository.withHttpOnlyFalse();
    csrfRepo.setCookiePath("/");
    csrfRepo.setCookieCustomizer(cookie -> cookie.secure(secureCookie).sameSite(sameSite));
    return csrfRepo;
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
      @Value("${app.cors.allowed-origins}") String configuredOrigins) {
    List<String> origins = Arrays.stream(configuredOrigins.split(","))
        .map(String::trim)
        .filter(origin -> !origin.isEmpty())
        .toList();
    if (origins.isEmpty() || origins.stream().anyMatch(origin -> origin.contains("*"))) {
      throw new IllegalArgumentException(
          "Configure one or more explicit CORS origins; wildcard origins cannot use credentials.");
    }

    var cfg = new CorsConfiguration();
    cfg.setAllowedOrigins(origins);
    cfg.setAllowCredentials(true);
    cfg.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS"));
    cfg.setAllowedHeaders(List.of("Content-Type", "X-XSRF-TOKEN"));
    var src = new UrlBasedCorsConfigurationSource();
    src.registerCorsConfiguration("/api/**", cfg);
    return src;
  }
}

// Retain XOR masking for request attributes while accepting the SPA's raw cookie token in a header.
final class SpaCsrfTokenRequestHandler implements CsrfTokenRequestHandler {
  private final CsrfTokenRequestHandler xor = new XorCsrfTokenRequestAttributeHandler();

  @Override
  public void handle(
      jakarta.servlet.http.HttpServletRequest request,
      jakarta.servlet.http.HttpServletResponse response,
      java.util.function.Supplier<org.springframework.security.web.csrf.CsrfToken> token) {
    xor.handle(request, response, token);
    var rawToken = token.get();
    // The SPA is cross-origin in production, so it reads the token from this JSON endpoint.
    request.setAttribute(SecurityConfig.RAW_CSRF_TOKEN_ATTRIBUTE, rawToken.getToken());
  }

  @Override
  public String resolveCsrfTokenValue(
      jakarta.servlet.http.HttpServletRequest request,
      org.springframework.security.web.csrf.CsrfToken token) {
    String header = request.getHeader(token.getHeaderName());
    return header != null ? header : xor.resolveCsrfTokenValue(request, token);
  }
}
