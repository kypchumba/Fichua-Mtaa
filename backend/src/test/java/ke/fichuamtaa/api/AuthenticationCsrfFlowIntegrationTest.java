package ke.fichuamtaa.api;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.Proxy;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.core.env.MapPropertySource;

/** Exercises authentication, CSRF, and logout through the application's real security filters. */
class AuthenticationCsrfFlowIntegrationTest {
  private static final String EMAIL = "citizen@example.test";
  private static final String PASSWORD = "Valid-Password-2026";
  private static final String XSRF_COOKIE = "XSRF-TOKEN";

  private AnnotationConfigWebApplicationContext context;
  private MockMvc mvc;

  @BeforeEach
  void startWebContext() {
    context = new AnnotationConfigWebApplicationContext();
    context.setServletContext(new MockServletContext());
    context
        .getEnvironment()
        .getPropertySources()
        .addFirst(
            new MapPropertySource(
                "test-properties",
                Map.of(
                    "app.cors.allowed-origins",
                    "http://localhost:5173",
                    "registration.rate-limit.window",
                    "PT15M")));
    context.register(TestWebConfiguration.class);
    context.refresh();
    mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
  }

  @AfterEach
  void closeWebContext() {
    if (context != null) {
      context.close();
    }
  }

  @Test
  void csrfLoginProtectedWriteAndLogoutUseTheRealFilterChain() throws Exception {
    MvcResult anonymousCsrf =
        mvc.perform(get("/api/auth/csrf"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty())
            .andReturn();
    String anonymousToken = token(anonymousCsrf);
    var anonymousCookie = anonymousCsrf.getResponse().getCookie(XSRF_COOKIE);
    assertNotNull(anonymousCookie, "CSRF bootstrap should issue the double-submit cookie");
    assertFalse(anonymousToken.isBlank());

    MvcResult login =
        mvc.perform(
                post("/api/auth/login")
                    .cookie(anonymousCookie)
                    .header("X-XSRF-TOKEN", anonymousToken)
                    .contentType("application/json")
                    .content(json(Map.of("email", EMAIL, "password", PASSWORD))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.user.email").value(EMAIL))
            .andReturn();
    MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);
    assertNotNull(session, "Successful login should create a server-managed session");
    assertNotNull(session.getAttribute("SPRING_SECURITY_CONTEXT"));

    MvcResult authenticatedCsrf =
        mvc.perform(get("/api/auth/csrf").session(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty())
            .andReturn();
    String freshToken = token(authenticatedCsrf);
    var freshCookie = authenticatedCsrf.getResponse().getCookie(XSRF_COOKIE);
    assertNotNull(freshCookie, "A fresh post-login CSRF cookie should be issued");

    mvc.perform(get("/api/auth/me").session(session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.email").value(EMAIL));

    String requestBody =
        json(
            Map.of(
                "title", "Streetlight is not working",
                "category", "Street Lighting",
                "location", "Kisumu Central",
                "description", "The streetlight near the community hall has been out for days."));

    mvc.perform(
            post("/api/requests")
                .session(session)
                .cookie(freshCookie)
                .contentType("application/json")
                .content(requestBody))
        .andExpect(status().isForbidden());

    mvc.perform(
            post("/api/requests")
                .session(session)
                .cookie(freshCookie)
                .header("X-XSRF-TOKEN", "invalid-token")
                .contentType("application/json")
                .content(requestBody))
        .andExpect(status().isForbidden());

    MvcResult submitted =
        mvc.perform(
                post("/api/requests")
                    .session(session)
                    .cookie(freshCookie)
                    .header("X-XSRF-TOKEN", freshToken)
                    .contentType("application/json")
                    .content(requestBody))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("PENDING"))
            .andExpect(jsonPath("$.history[0].newStatus").value("PENDING"))
            .andReturn();
    assertFalse(submitted.getResponse().getContentAsString().isBlank());

    mvc.perform(
            post("/api/auth/logout")
                .session(session)
                .cookie(freshCookie)
                .header("X-XSRF-TOKEN", freshToken))
        .andExpect(status().isNoContent());
    assertTrue(session.isInvalid(), "Logout should invalidate the server-side session");

    mvc.perform(get("/api/auth/me").session(session))
        .andExpect(status().isUnauthorized());
  }

  private String token(MvcResult result) throws Exception {
    return new ObjectMapper().readTree(result.getResponse().getContentAsString()).get("token").asText();
  }

  private String json(Object value) throws Exception {
    return new ObjectMapper().writeValueAsString(value);
  }

  @Configuration
  @EnableWebMvc
  @EnableWebSecurity
  @Import(SecurityConfig.class)
  static class TestWebConfiguration {
    private static final String EMAIL = "citizen@example.test";
    private static final String PASSWORD = "Valid-Password-2026";
    private final List<RequestHistory> requestHistory = new java.util.ArrayList<>();

    @Bean
    ObjectMapper objectMapper() {
      return new ObjectMapper();
    }

    @Bean
    RegistrationRateLimiter registrationRateLimiter() {
      return new RegistrationRateLimiter(5, java.time.Duration.ofMinutes(15), 100);
    }

    @Bean
    TrustedProxyClientIpResolver trustedProxyClientIpResolver() {
      return new TrustedProxyClientIpResolver("");
    }

    @Bean
    AppUser citizen(PasswordEncoder encoder) {
      AppUser user = new AppUser("Test Citizen", EMAIL, encoder.encode(PASSWORD), Role.CITIZEN);
      user.id = 27L;
      return user;
    }

    @Bean
    UserRepository userRepository(AppUser citizen) {
      return repositoryProxy(
          UserRepository.class,
          (method, args) -> {
            if ("findByEmailIgnoreCase".equals(method)) {
              return EMAIL.equalsIgnoreCase((String) args[0])
                  ? Optional.of(citizen)
                  : Optional.empty();
            }
            if ("existsByEmailIgnoreCase".equals(method)) {
              return EMAIL.equalsIgnoreCase((String) args[0]);
            }
            if ("findById".equals(method)) {
              return Optional.of(citizen);
            }
            return null;
          });
    }

    @Bean
    RequestRepository requestRepository() {
      return repositoryProxy(
          RequestRepository.class,
          (method, args) -> {
            if ("save".equals(method)) {
              ServiceRequest request = (ServiceRequest) args[0];
              request.id = 301L;
              return request;
            }
            return null;
          });
    }

    @Bean
    HistoryRepository historyRepository() {
      return repositoryProxy(
          HistoryRepository.class,
          (method, args) -> {
            if ("save".equals(method)) {
              RequestHistory saved = (RequestHistory) args[0];
              saved.id = (long) requestHistory.size() + 1;
              requestHistory.add(saved);
              return saved;
            }
            if ("findByRequestIdOrderByChangedAtAsc".equals(method)) {
              return requestHistory;
            }
            return null;
          });
    }

    @Bean
    NoteRepository noteRepository() {
      return repositoryProxy(
          NoteRepository.class,
          (method, args) -> "findByRequestIdOrderByCreatedAtAsc".equals(method) ? List.of() : null);
    }

    @Bean
    CloudinaryCleanupRepository cleanupRepository() {
      return repositoryProxy(CloudinaryCleanupRepository.class, (method, args) -> null);
    }

    @Bean
    ActiveSessionRegistry activeSessionRegistry() {
      return new ActiveSessionRegistry();
    }

    @Bean
    AccountDeletionService accountDeletionService(
        UserRepository users,
        RequestRepository requests,
        CloudinaryCleanupRepository cleanupTasks,
        PasswordEncoder encoder,
        ActiveSessionRegistry sessions) {
      return new AccountDeletionService(users, requests, cleanupTasks, encoder, sessions, "", "");
    }

    @Bean
    ApiController apiController(
        UserRepository users,
        RequestRepository requests,
        HistoryRepository history,
        NoteRepository notes,
        PasswordEncoder encoder,
        org.springframework.security.authentication.AuthenticationManager authManager,
        AccountDeletionService accountDeletion,
        ActiveSessionRegistry sessions,
        CsrfTokenRepository csrfRepository) {
      return new ApiController(
          users,
          requests,
          history,
          notes,
          encoder,
          authManager,
          accountDeletion,
          sessions,
          csrfRepository,
          false,
          "lax",
          "",
          "",
          "");
    }

    @Bean
    ApiErrors apiErrors() {
      return new ApiErrors();
    }

    private static <T> T repositoryProxy(Class<T> repositoryType, RepositoryCall call) {
      return repositoryType.cast(
          Proxy.newProxyInstance(
              repositoryType.getClassLoader(),
              new Class<?>[] {repositoryType},
              (proxy, method, args) -> {
                if ("toString".equals(method.getName())) {
                  return "isolated integration-test fixture";
                }
                if ("hashCode".equals(method.getName())) {
                  return System.identityHashCode(proxy);
                }
                if ("equals".equals(method.getName())) {
                  return proxy == args[0];
                }
                return call.invoke(method.getName(), args == null ? new Object[0] : args);
              }));
    }

    @FunctionalInterface
    private interface RepositoryCall {
      Object invoke(String methodName, Object[] args);
    }
  }
}
