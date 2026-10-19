package ke.fichuamtaa.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;

class RoleAuthorizationTest {
  @Test
  void methodSecurityIsEnabledAndCitizenCreationEndpointsRequireCitizenRole() throws Exception {
    assertNotNull(SecurityConfig.class.getAnnotation(EnableMethodSecurity.class));

    Method create =
        ApiController.class.getDeclaredMethod(
            "create",
            ApiController.CreateRequest.class,
            org.springframework.security.core.Authentication.class);
    Method upload =
        ApiController.class.getDeclaredMethod(
            "uploadImage", org.springframework.web.multipart.MultipartFile.class);

    assertEquals("hasRole('CITIZEN')", create.getAnnotation(PreAuthorize.class).value());
    assertEquals("hasRole('CITIZEN')", upload.getAnnotation(PreAuthorize.class).value());
  }
}
