package ke.fichuamtaa.api;

import static org.junit.jupiter.api.Assertions.*;

import jakarta.servlet.http.HttpServletRequest;
import java.lang.reflect.Proxy;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class LoginSessionTest {
  private static final String EMAIL = "citizen@example.test";
  private static final String PASSWORD = "Valid-Password-2026";

  @Test
  void successfulLoginCreatesSessionAndMeReturnsTheAuthenticatedCitizen() {
    var encoder = new BCryptPasswordEncoder();
    AppUser citizen = new AppUser("Citizen", EMAIL, encoder.encode(PASSWORD), Role.CITIZEN);
    citizen.id = 42L;
    UserRepository users =
        userRepository(citizen);
    AuthenticationManager authManager =
        authentication -> {
          var submitted = (UsernamePasswordAuthenticationToken) authentication;
          if (!encoder.matches((String) submitted.getCredentials(), citizen.passwordHash)) {
            throw new BadCredentialsException("Bad credentials");
          }
          return UsernamePasswordAuthenticationToken.authenticated(
              EMAIL, null, List.of(new SimpleGrantedAuthority("ROLE_CITIZEN")));
        };
    var csrfRepository = new SecurityConfig().csrfTokenRepository(true, "none");
    var sessions = new ActiveSessionRegistry();
    var controller =
        new ApiController(
            users,
            null,
            null,
            null,
            encoder,
            authManager,
            null,
            sessions,
            csrfRepository,
            true,
            "none",
            "",
            "",
            "");
    HttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
    var response = new MockHttpServletResponse();

    Map<String, Object> loginResult =
        controller.login(new ApiController.Login(EMAIL, PASSWORD), request, response);

    assertEquals("CITIZEN", ((ApiController.UserView) loginResult.get("user")).role());
    var session = (MockHttpSession) request.getSession(false);
    assertNotNull(session);
    var context = (SecurityContext) session.getAttribute("SPRING_SECURITY_CONTEXT");
    assertNotNull(context);
    assertEquals(EMAIL, context.getAuthentication().getName());
    assertEquals(EMAIL, controller.me(context.getAuthentication()).email());

    controller.logout(request, response);

    assertTrue(session.isInvalid());
    assertTrue(
        response.getHeaders(HttpHeaders.SET_COOKIE).stream()
            .anyMatch(
                cookie ->
                    cookie.startsWith("JSESSIONID=")
                        && cookie.contains("SameSite=none")
                        && cookie.contains("Secure")
                        && cookie.contains("HttpOnly")));
  }

  @Test
  void failedLoginDoesNotCreateAnAuthenticatedSession() {
    var encoder = new BCryptPasswordEncoder();
    AppUser citizen = new AppUser("Citizen", EMAIL, encoder.encode(PASSWORD), Role.CITIZEN);
    citizen.id = 42L;
    var controller =
        new ApiController(
            userRepository(citizen),
            null,
            null,
            null,
            encoder,
            authentication -> {
              throw new BadCredentialsException("Bad credentials");
            },
            null,
            new ActiveSessionRegistry(),
            new SecurityConfig().csrfTokenRepository(true, "none"),
            true,
            "none",
            "",
            "",
            "");
    var request = new MockHttpServletRequest("POST", "/api/auth/login");

    assertThrows(
        BadCredentialsException.class,
        () ->
            controller.login(
                new ApiController.Login(EMAIL, "wrong-password"),
                request,
                new MockHttpServletResponse()));
    assertNull(request.getSession(false));
  }

  private UserRepository userRepository(AppUser citizen) {
    return (UserRepository)
        Proxy.newProxyInstance(
            UserRepository.class.getClassLoader(),
            new Class<?>[] {UserRepository.class},
            (proxy, method, args) -> {
              if ("findByEmailIgnoreCase".equals(method.getName())) {
                return EMAIL.equalsIgnoreCase((String) args[0])
                    ? Optional.of(citizen)
                    : Optional.empty();
              }
              if ("existsByEmailIgnoreCase".equals(method.getName())) {
                return EMAIL.equalsIgnoreCase((String) args[0]);
              }
              if ("toString".equals(method.getName())) return "test users";
              return null;
            });
  }
}
