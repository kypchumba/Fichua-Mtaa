package ke.fichuamtaa.api;

import static org.junit.jupiter.api.Assertions.*;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RegistrationRateLimitTest {
  @Test
  void blocksSixthAttemptAndCountsRequestsBeforeValidation() throws Exception {
    var limiter = new RegistrationRateLimiter(5, Duration.ofMinutes(15), 100);
    var filter = new RegistrationRateLimitFilter(limiter, new TrustedProxyClientIpResolver(""));

    for (int attempt = 0; attempt < 5; attempt++) {
      MockHttpServletResponse response = filterRequest(filter, "/api/auth/register", "192.0.2.7");
      assertEquals(204, response.getStatus());
    }

    // The filter does not parse form fields; even an invalid registration consumes an attempt.
    MockHttpServletResponse response = filterRequest(filter, "/api/auth/register", "192.0.2.7");
    assertEquals(429, response.getStatus());
    assertEquals("900", response.getHeader("Retry-After"));
    assertTrue(response.getContentAsString().contains("Too many registration attempts."));
  }

  @Test
  void expiredWindowAllowsAttemptsAgainAndExpiredEntriesFreeCapacity() {
    AtomicLong now = new AtomicLong(1L);
    var limiter = new RegistrationRateLimiter(1, Duration.ofMinutes(15), 1, now::get);

    assertTrue(limiter.allowAttempt("192.0.2.1"));
    assertFalse(limiter.allowAttempt("192.0.2.1"));
    assertFalse(limiter.allowAttempt("192.0.2.2"));

    now.addAndGet(Duration.ofMinutes(15).toNanos());
    assertTrue(limiter.allowAttempt("192.0.2.2"));
  }

  @Test
  void onlyRegistrationPostsAreRateLimited() throws Exception {
    var limiter = new RegistrationRateLimiter(1, Duration.ofMinutes(15), 100);
    var filter = new RegistrationRateLimitFilter(limiter, new TrustedProxyClientIpResolver(""));

    assertEquals(204, filterRequest(filter, "/api/auth/register", "192.0.2.7").getStatus());
    assertEquals(204, filterRequest(filter, "/api/auth/login", "192.0.2.7").getStatus());
    assertEquals(204, filterRequest(filter, "/api/admin/analytics", "192.0.2.7").getStatus());
    assertEquals(429, filterRequest(filter, "/api/auth/register", "192.0.2.7").getStatus());
  }

  @Test
  void forwardedAddressesAreIgnoredUnlessSocketPeerIsTrusted() {
    var request = new MockHttpServletRequest();
    request.setRemoteAddr("198.51.100.12");
    request.addHeader("X-Forwarded-For", "203.0.113.50");

    assertEquals("198.51.100.12", new TrustedProxyClientIpResolver("").resolve(request));

    request.setRemoteAddr("10.4.5.6");
    request.removeHeader("X-Forwarded-For");
    request.addHeader("X-Forwarded-For", "203.0.113.50, 10.4.5.1");
    var resolver = new TrustedProxyClientIpResolver("10.0.0.0/8");

    assertEquals("203.0.113.50", resolver.resolve(request));
  }

  private MockHttpServletResponse filterRequest(
      RegistrationRateLimitFilter filter, String path, String address) throws Exception {
    var request = new MockHttpServletRequest("POST", path);
    request.setServletPath(path);
    request.setRemoteAddr(address);
    request.setContent("{}".getBytes(java.nio.charset.StandardCharsets.UTF_8));
    var response = new MockHttpServletResponse();
    AtomicInteger calls = new AtomicInteger();

    filter.doFilter(request, response, (incoming, outgoing) -> {
      calls.incrementAndGet();
      ((HttpServletResponse) outgoing).setStatus(204);
    });

    if (response.getStatus() == 200) response.setStatus(204);
    if (response.getStatus() == 429) assertEquals(0, calls.get());
    return response;
  }
}
