package ke.fichuamtaa.api;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.DefaultCsrfToken;

class CsrfBootstrapTest {
  private final SecurityConfig securityConfig = new SecurityConfig();

  @Test
  void onlyTheCsrfBootstrapGetRequestMatchesItsPublicRule() {
    var get = new MockHttpServletRequest(HttpMethod.GET.name(), "/api/auth/csrf");
    get.setServletPath("/api/auth/csrf");
    var post = new MockHttpServletRequest(HttpMethod.POST.name(), "/api/auth/csrf");
    post.setServletPath("/api/auth/csrf");
    var otherGet = new MockHttpServletRequest(HttpMethod.GET.name(), "/api/admin/analytics");
    otherGet.setServletPath("/api/admin/analytics");

    assertTrue(SecurityConfig.CSRF_BOOTSTRAP_REQUEST.matches(get));
    assertFalse(SecurityConfig.CSRF_BOOTSTRAP_REQUEST.matches(post));
    assertFalse(SecurityConfig.CSRF_BOOTSTRAP_REQUEST.matches(otherGet));
  }

  @Test
  void csrfControllerReturnsTheRawTokenInTheFrontendContract() {
    var request = new MockHttpServletRequest(HttpMethod.GET.name(), "/api/auth/csrf");
    request.setAttribute(SecurityConfig.RAW_CSRF_TOKEN_ATTRIBUTE, "csrf-value");
    ApiController controller =
        new ApiController(
            null, null, null, null, null, null, null, null, null, false, "lax", "", "", "");

    assertEquals(Map.of("token", "csrf-value"), controller.csrf(request));
  }

  @Test
  void csrfCookieIsSentBackAndMatchesTheTokenReturnedByTheEndpoint() {
    CookieCsrfTokenRepository repository =
        (CookieCsrfTokenRepository) securityConfig.csrfTokenRepository(true, "none");
    var request = new MockHttpServletRequest(HttpMethod.GET.name(), "/api/auth/csrf");
    var response = new MockHttpServletResponse();
    var token = repository.generateToken(request);

    repository.saveToken(token, request, response);

    var cookie = response.getCookie("XSRF-TOKEN");
    assertNotNull(cookie);
    assertFalse(cookie.isHttpOnly());
    assertTrue("none".equalsIgnoreCase(cookie.getAttribute("SameSite")));
    assertTrue(cookie.getSecure());

    var nextRequest = new MockHttpServletRequest(HttpMethod.POST.name(), "/api/auth/login");
    nextRequest.setCookies(cookie);
    assertEquals(token.getToken(), repository.loadToken(nextRequest).getToken());
  }

  @Test
  void spaHandlerAcceptsTheRawJsonTokenInTheExpectedHeader() {
    var request = new MockHttpServletRequest(HttpMethod.POST.name(), "/api/auth/login");
    request.addHeader("X-XSRF-TOKEN", "csrf-value");
    var token = new DefaultCsrfToken("X-XSRF-TOKEN", "_csrf", "csrf-value");

    assertEquals(
        "csrf-value", new SpaCsrfTokenRequestHandler().resolveCsrfTokenValue(request, token));
  }
}
