package ke.fichuamtaa.api;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

class RegistrationSessionTest {
  @AfterEach
  void clearSecurityContext() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void registrationCreatesACitizenWithoutAuthenticatingOrCreatingASession() {
    AtomicReference<AppUser> savedUser = new AtomicReference<>();
    UserRepository users =
        (UserRepository)
            java.lang.reflect.Proxy.newProxyInstance(
                UserRepository.class.getClassLoader(),
                new Class<?>[] {UserRepository.class},
                (proxy, method, args) -> {
                  return switch (method.getName()) {
                    case "existsByEmailIgnoreCase" -> false;
                    case "save" -> {
                      AppUser user = (AppUser) args[0];
                      user.id = 17L;
                      savedUser.set(user);
                      yield user;
                    }
                    case "findByEmailIgnoreCase" -> Optional.empty();
                    default -> null;
                  };
                });
    PasswordEncoder encoder =
        new PasswordEncoder() {
          @Override
          public String encode(CharSequence password) {
            return "bcrypt-hash";
          }

          @Override
          public boolean matches(CharSequence password, String encodedPassword) {
            return "bcrypt-hash".equals(encodedPassword);
          }
        };
    AuthenticationManager authenticationManager =
        authentication -> fail("Registration must not authenticate the new account.");
    ApiController controller =
        new ApiController(
            users,
            null,
            null,
            null,
            encoder,
            authenticationManager,
            null,
            null,
            null,
            false,
            "lax",
            "",
            "",
            "");
    SecurityContextHolder.clearContext();

    var response =
        controller.register(
            new ApiController.Register(
                "Citizen", "citizen@example.test", "ValidPass1!", "ValidPass1!"));

    assertEquals(HttpStatus.CREATED, response.getStatusCode());
    assertEquals("CITIZEN", response.getBody().role());
    assertEquals("bcrypt-hash", savedUser.get().passwordHash);
    assertNull(SecurityContextHolder.getContext().getAuthentication());
  }
}
