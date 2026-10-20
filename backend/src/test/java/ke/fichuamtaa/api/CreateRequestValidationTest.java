package ke.fichuamtaa.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ConstraintViolation;
import java.util.Set;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.junit.jupiter.api.Test;

class CreateRequestValidationTest {
  @Test
  void rejectsShortTitleAndLocationWithFieldSpecificGuidance() {
    ApiController.CreateRequest request =
        new ApiController.CreateRequest(
            "Hi", "Waste Management", "Ny", "Garbage collection has stopped in the area.", null);

    try (var factory = Validation.buildDefaultValidatorFactory()) {
      Validator validator = factory.getValidator();
      Set<ConstraintViolation<ApiController.CreateRequest>> errors =
          validator.validate(request);

      assertTrue(
          errors.stream()
              .anyMatch(
                  violation ->
                      "title".equals(property(violation))
                          && "Request title must be between 5 and 120 characters."
                              .equals(violation.getMessage())));
      assertTrue(
          errors.stream()
              .anyMatch(
                  violation ->
                      "location".equals(property(violation))
                          && "Affected location must be between 3 and 180 characters."
                              .equals(violation.getMessage())));
    }
  }

  @Test
  void acceptsTitleAndLocationWithinSupportedLengths() {
    ApiController.CreateRequest request =
        new ApiController.CreateRequest(
            "Broken light", "Street Lighting", "Nyeri", "A streetlight has been out for days.", null);

    try (var factory = Validation.buildDefaultValidatorFactory()) {
      assertTrue(factory.getValidator().validate(request).isEmpty());
    }
  }

  @Test
  void reportsMissingTitleAndLocationClearly() {
    ApiController.CreateRequest request =
        new ApiController.CreateRequest(
            " ", "Street Lighting", " ", "A streetlight has been out for days.", null);

    try (var factory = Validation.buildDefaultValidatorFactory()) {
      Set<ConstraintViolation<ApiController.CreateRequest>> errors =
          factory.getValidator().validate(request);

      assertTrue(
          errors.stream()
              .anyMatch(
                  violation ->
                      "title".equals(property(violation))
                          && "Please enter a request title.".equals(violation.getMessage())));
      assertTrue(
          errors.stream()
              .anyMatch(
                  violation ->
                      "location".equals(property(violation))
                          && "Please enter the affected location.".equals(violation.getMessage())));
    }
  }

  @Test
  void returnsFieldErrorsInTheStructuredApiResponse() {
    ApiController.CreateRequest request =
        new ApiController.CreateRequest(
            "Hi", "Street Lighting", "Ny", "A streetlight has been out for days.", null);
    var bindingResult = new BeanPropertyBindingResult(request, "createRequest");
    bindingResult.addError(
        new FieldError(
            "createRequest", "title", "Hi", false, new String[] {"Size"}, null, "invalid size"));
    bindingResult.addError(
        new FieldError(
            "createRequest", "location", "Ny", false, new String[] {"Size"}, null, "invalid size"));

    var response = new ApiErrors().invalid(new MethodArgumentNotValidException(null, bindingResult));

    assertEquals(400, response.getStatusCode().value());
    assertTrue(response.getBody() != null);
    assertEquals(
        "Please correct the highlighted fields.", response.getBody().get("message"));
    @SuppressWarnings("unchecked")
    var fields = (java.util.Map<String, String>) response.getBody().get("fields");
    assertEquals(
        "Request title must be between 5 and 120 characters.", fields.get("title"));
    assertEquals(
        "Affected location must be between 3 and 180 characters.", fields.get("location"));
  }

  private String property(ConstraintViolation<ApiController.CreateRequest> violation) {
    return violation.getPropertyPath().toString();
  }
}
