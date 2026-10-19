package ke.fichuamtaa.api;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class CorsConfigurationTest {
  private final SecurityConfig securityConfig = new SecurityConfig();

  @Test
  void allowsMultipleExplicitCredentialedFrontendOrigins() {
    var source = securityConfig.corsConfigurationSource(
        "http://localhost:5173, http://192.168.1.24:5173");
    var request = new MockHttpServletRequest("GET", "/api/health");
    var cors = source.getCorsConfiguration(request);

    assertNotNull(cors);
    assertEquals(
        List.of("http://localhost:5173", "http://192.168.1.24:5173"),
        cors.getAllowedOrigins());
    assertEquals("http://localhost:5173", cors.checkOrigin("http://localhost:5173"));
    assertEquals(
        "http://192.168.1.24:5173",
        cors.checkOrigin("http://192.168.1.24:5173"));
    assertTrue(cors.getAllowCredentials());
    assertTrue(cors.getAllowedMethods().contains("OPTIONS"));
    assertTrue(cors.getAllowedHeaders().contains("X-XSRF-TOKEN"));
  }

  @Test
  void rejectsWildcardOriginsWhenCredentialsAreEnabled() {
    assertThrows(
        IllegalArgumentException.class,
        () -> securityConfig.corsConfigurationSource("http://localhost:5173, https://*.example.test"));
  }
}
