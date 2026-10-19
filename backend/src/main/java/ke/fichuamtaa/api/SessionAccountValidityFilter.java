package ke.fichuamtaa.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

// Servlet sessions may live on separate instances; the deleted account row is the shared revocation check.
class SessionAccountValidityFilter extends OncePerRequestFilter {
  private final UserRepository users;
  private final ActiveSessionRegistry sessions;
  private final ObjectMapper objectMapper;

  SessionAccountValidityFilter(
      UserRepository users, ActiveSessionRegistry sessions, ObjectMapper objectMapper) {
    this.users = users;
    this.sessions = sessions;
    this.objectMapper = objectMapper;
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    if (authentication == null
        || !authentication.isAuthenticated()
        || authentication instanceof AnonymousAuthenticationToken
        || users.existsByEmailIgnoreCase(authentication.getName())) {
      chain.doFilter(request, response);
      return;
    }

    SecurityContextHolder.clearContext();
    var session = request.getSession(false);
    if (session != null) {
      sessions.unregister(session.getId());
      try {
        session.invalidate();
      } catch (IllegalStateException ignored) {
        // A concurrent logout or expiry already invalidated it.
      }
    }
    response.setStatus(HttpStatus.UNAUTHORIZED.value());
    response.setCharacterEncoding("UTF-8");
    response.setContentType("application/json");
    objectMapper.writeValue(
        response.getOutputStream(),
        Map.of("message", "Please sign in to continue.", "fields", Map.of()));
  }
}
