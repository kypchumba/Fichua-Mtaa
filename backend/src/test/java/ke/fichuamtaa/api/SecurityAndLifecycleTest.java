package ke.fichuamtaa.api;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import jakarta.validation.Validation;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class SecurityAndLifecycleTest {
  @Test
  void passwordsAreHashedAndCanBeVerified() {
    var encoder = new BCryptPasswordEncoder();
    String password = "Community-Access-2026";
    String hash = encoder.encode(password);
    assertNotEquals(password, hash);
    assertTrue(encoder.matches(password, hash));
    assertFalse(encoder.matches("different-password", hash));
  }

  @Test
  void statusLifecycleAllowsOnlyForwardSteps() {
    assertTrue(RequestStatus.PENDING.canMoveTo(RequestStatus.IN_PROGRESS));
    assertTrue(RequestStatus.IN_PROGRESS.canMoveTo(RequestStatus.RESOLVED));
    assertFalse(RequestStatus.PENDING.canMoveTo(RequestStatus.RESOLVED));
    assertFalse(RequestStatus.RESOLVED.canMoveTo(RequestStatus.IN_PROGRESS));
    assertFalse(RequestStatus.IN_PROGRESS.canMoveTo(RequestStatus.PENDING));
  }

  @Test
  void requestInputConstraintsRejectMissingAndOversizedValues() {
    var validator = Validation.buildDefaultValidatorFactory().getValidator();
    var invalid = new ApiController.CreateRequest("", "unknown", "", "too short", null);
    var violations = validator.validate(invalid);

    assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("title")));
    assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("description")));
    assertTrue(violations.stream().anyMatch(v -> v.getPropertyPath().toString().equals("location")));
  }
}
