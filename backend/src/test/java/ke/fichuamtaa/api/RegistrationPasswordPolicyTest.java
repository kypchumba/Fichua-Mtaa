package ke.fichuamtaa.api;

import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.util.Set;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class RegistrationPasswordPolicyTest {
  private static ValidatorFactory validatorFactory;
  private static Validator validator;

  @BeforeAll
  static void createValidator() {
    validatorFactory = Validation.buildDefaultValidatorFactory();
    validator = validatorFactory.getValidator();
  }

  @AfterAll
  static void closeValidatorFactory() {
    validatorFactory.close();
  }

  @Test
  void acceptsPasswordMeetingEveryRegistrationRequirement() {
    assertTrue(violations("ValidPass1!").isEmpty());
  }

  @Test
  void rejectsShortPassword() {
    assertPasswordRejected("Aa1!abc");
  }

  @Test
  void rejectsMissingUppercaseLowercaseNumberOrSpecialCharacter() {
    assertPasswordRejected("lowercase1!");
    assertPasswordRejected("UPPERCASE1!");
    assertPasswordRejected("NoNumber!!");
    assertPasswordRejected("NoSpecial1A");
  }

  @Test
  void rejectsWhitespaceWithoutTrimmingOrChangingPassword() {
    assertPasswordRejected("Valid Pass1!");
    assertPasswordRejected("ValidPass1!\n");
  }

  private static void assertPasswordRejected(String password) {
    assertTrue(
        violations(password).stream()
            .anyMatch(
                violation -> "password".equals(violation.getPropertyPath().toString())),
        "Expected password validation to reject the supplied value.");
  }

  private static Set<jakarta.validation.ConstraintViolation<ApiController.Register>> violations(
      String password) {
    return validator.validate(
        new ApiController.Register("Citizen", "citizen@example.test", password, password));
  }
}
