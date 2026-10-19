package ke.fichuamtaa.api;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.reflect.Proxy;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

class SessionAccountValidityFilterTest {
  @AfterEach
  void clearSecurityContext() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void invalidatesAnOldSessionWhenItsAccountNoLongerExists() throws Exception {
    UserRepository users = users(false);
    var registry = new ActiveSessionRegistry();
    var session = new MockHttpSession();
    registry.register(19L, session);
    var request = new MockHttpServletRequest();
    request.setSession(session);
    var response = new MockHttpServletResponse();
    var reachedEndpoint = new AtomicBoolean();
    SecurityContextHolder.getContext().setAuthentication(authentication());
    var filter = new SessionAccountValidityFilter(users, registry, new ObjectMapper());

    filter.doFilter(request, response, (req, res) -> reachedEndpoint.set(true));

    assertEquals(401, response.getStatus());
    assertFalse(reachedEndpoint.get());
    assertTrue(session.isInvalid());
  }

  @Test
  void existingAccountsContinueThroughTheFilter() throws Exception {
    var request = new MockHttpServletRequest();
    var response = new MockHttpServletResponse();
    var reachedEndpoint = new AtomicBoolean();
    SecurityContextHolder.getContext().setAuthentication(authentication());
    var filter = new SessionAccountValidityFilter(users(true), new ActiveSessionRegistry(), new ObjectMapper());

    filter.doFilter(request, response, (req, res) -> reachedEndpoint.set(true));

    assertTrue(reachedEndpoint.get());
  }

  private UserRepository users(boolean exists) {
    return (UserRepository) Proxy.newProxyInstance(
        UserRepository.class.getClassLoader(), new Class<?>[] {UserRepository.class},
        (proxy, method, args) -> switch (method.getName()) {
          case "existsByEmailIgnoreCase" -> exists;
          case "toString" -> "test users";
          default -> throw new UnsupportedOperationException(method.getName());
        });
  }

  private UsernamePasswordAuthenticationToken authentication() {
    return UsernamePasswordAuthenticationToken.authenticated(
        "citizen@example.test", null, List.of(new SimpleGrantedAuthority("ROLE_CITIZEN")));
  }
}
