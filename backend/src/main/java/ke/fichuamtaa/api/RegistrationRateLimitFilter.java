package ke.fichuamtaa.api;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

/** Counts registration POSTs before controller validation, including invalid submissions. */
final class RegistrationRateLimitFilter extends OncePerRequestFilter {
  private static final String TOO_MANY_REQUESTS_JSON =
      "{\"message\":\"Too many registration attempts. Please try again later.\",\"fields\":{}}";

  private final RegistrationRateLimiter limiter;
  private final TrustedProxyClientIpResolver clientIpResolver;

  RegistrationRateLimitFilter(
      RegistrationRateLimiter limiter, TrustedProxyClientIpResolver clientIpResolver) {
    this.limiter = limiter;
    this.clientIpResolver = clientIpResolver;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String contextPath = request.getContextPath();
    String path = request.getRequestURI().substring(contextPath.length());
    return !"POST".equalsIgnoreCase(request.getMethod()) || !"/api/auth/register".equals(path);
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request, HttpServletResponse response, FilterChain chain)
      throws ServletException, IOException {
    if (!limiter.allowAttempt(clientIpResolver.resolve(request))) {
      response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
      response.setContentType(MediaType.APPLICATION_JSON_VALUE);
      response.setCharacterEncoding(StandardCharsets.UTF_8.name());
      response.setHeader("Retry-After", Long.toString(limiter.retryAfterSeconds()));
      response.getWriter().write(TOO_MANY_REQUESTS_JSON);
      return;
    }

    chain.doFilter(request, response);
  }
}
