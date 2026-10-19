package ke.fichuamtaa.api;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import java.lang.reflect.Proxy;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.InternalAuthenticationServiceException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.server.ResponseStatusException;

class AuthErrorTest {
  @Test
  void wrongPasswordAndUnknownEmailShareTheSameSafeMessage() {
    var errors = new ApiErrors();
    var wrongPassword = errors.authenticationFailure(new BadCredentialsException("bad password"));
    var unknownEmail = errors.authenticationFailure(new BadCredentialsException("unknown user"));

    assertEquals(HttpStatus.UNAUTHORIZED, wrongPassword.getStatusCode());
    assertEquals(
        "Incorrect email or password. Please try again.",
        wrongPassword.getBody().get("message"));
    assertEquals(wrongPassword.getBody(), unknownEmail.getBody());
  }

  @Test
  void serverAuthenticationFailuresDoNotLookLikeBadCredentials() {
    var response =
        new ApiErrors()
            .unexpected(new InternalAuthenticationServiceException("database unavailable"));

    assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
    assertEquals(
        "An unexpected error occurred. Please try again.", response.getBody().get("message"));
  }

  @Test
  void requiredLoginFieldsReceiveFieldSpecificMessages() {
    var binding = new BeanPropertyBindingResult(new ApiController.Login("", ""), "login");
    binding.addError(
        new FieldError(
            "login",
            "email",
            "",
            false,
            new String[] {"Email.login.email"},
            null,
            "Please enter a valid email address."));
    binding.addError(
        new FieldError(
            "login",
            "email",
            "",
            false,
            new String[] {"NotBlank.login.email"},
            null,
            "Please enter your email address."));
    binding.addError(
        new FieldError(
            "login",
            "password",
            "",
            false,
            new String[] {"NotBlank.login.password"},
            null,
            "Please enter your password."));
    var invalid = new MethodArgumentNotValidException(null, binding);

    var response = new ApiErrors().invalid(invalid);
    @SuppressWarnings("unchecked")
    var fields = (java.util.Map<String, String>) response.getBody().get("fields");

    assertEquals("Please enter your email address.", fields.get("email"));
    assertEquals("Please enter your password.", fields.get("password"));
  }

  @Test
  void duplicateEmailReturnsTheRegistrationSpecificMessage() {
    UserRepository users = userRepository(true, new AtomicReference<>());
    ApiController controller = controller(users, ignored -> null, new BCryptPasswordEncoder());

    ResponseStatusException exception =
        assertThrows(
            ResponseStatusException.class,
            () ->
                controller.register(
                    new ApiController.Register(
                        "Citizen",
                        "citizen@example.com",
                        "Community-Access-2026",
                        "Community-Access-2026"),
                    new MockHttpServletRequest()));

    assertEquals(HttpStatus.CONFLICT, exception.getStatusCode());
    assertEquals(
        "An account with this email already exists. Please log in instead.",
        exception.getReason());
  }

  @Test
  void successfulRegistrationStillCreatesAndReturnsACitizen() throws Exception {
    var saved = new AtomicReference<AppUser>();
    UserRepository users = userRepository(false, saved);
    var encoder = new BCryptPasswordEncoder();
    AuthenticationManager authManager =
        authentication ->
            UsernamePasswordAuthenticationToken.authenticated(
                authentication.getName(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_CITIZEN")));
    ApiController controller = controller(users, authManager, encoder);

    var response =
        controller.register(
            new ApiController.Register(
                "Citizen", "citizen@example.com", "Community-Access-2026", "Community-Access-2026"),
            new MockHttpServletRequest());

    assertEquals(HttpStatus.CREATED, response.getStatusCode());
    assertEquals("CITIZEN", response.getBody().role());
    assertTrue(encoder.matches("Community-Access-2026", saved.get().passwordHash));
  }

  private ApiController controller(
      UserRepository users,
      AuthenticationManager authManager,
      org.springframework.security.crypto.password.PasswordEncoder encoder) {
    return new ApiController(
        users,
        null,
        null,
        null,
        encoder,
        authManager,
        null,
        new ActiveSessionRegistry(),
        "",
        "",
        "");
  }

  private UserRepository userRepository(boolean emailExists, AtomicReference<AppUser> saved) {
    return (UserRepository)
        Proxy.newProxyInstance(
            UserRepository.class.getClassLoader(),
            new Class<?>[] {UserRepository.class},
            (proxy, method, arguments) -> {
              if ("existsByEmailIgnoreCase".equals(method.getName())) return emailExists;
              if ("save".equals(method.getName())) {
                AppUser user = (AppUser) arguments[0];
                user.id = 1L;
                saved.set(user);
                return user;
              }
              if ("toString".equals(method.getName())) return "Test user repository";
              throw new UnsupportedOperationException(method.getName());
            });
  }
}
