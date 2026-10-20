package ke.fichuamtaa.api;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestControllerAdvice
class ApiErrors {
  private static final Logger logger = LoggerFactory.getLogger(ApiErrors.class);
  private static final String INVALID_CREDENTIALS =
      "Incorrect email or password. Please try again.";

  @ExceptionHandler({BadCredentialsException.class, UsernameNotFoundException.class})
  ResponseEntity<Map<String, Object>> authenticationFailure(Exception ignored) {
    return error(HttpStatus.UNAUTHORIZED, INVALID_CREDENTIALS);
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<Map<String, Object>> invalid(MethodArgumentNotValidException exception) {
    Map<String, String> fields = new LinkedHashMap<>();
    exception.getBindingResult().getFieldErrors().forEach(fieldError -> {
      String field = fieldError.getField();
      String code = constraintName(fieldError.getCode());
      String message = validationMessage(field, code);

      // If a blank field also violates another constraint, show the required-field guidance.
      if ("NotBlank".equals(code) || !fields.containsKey(field)) {
        fields.put(field, message);
      }
    });

    return ResponseEntity.badRequest()
        .body(Map.of("message", "Please correct the highlighted fields.", "fields", fields));
  }

  @ExceptionHandler(ResponseStatusException.class)
  ResponseEntity<Map<String, Object>> status(ResponseStatusException exception) {
    return error(
        HttpStatus.valueOf(exception.getStatusCode().value()),
        Objects.requireNonNullElse(exception.getReason(), "Request could not be completed."));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<Map<String, Object>> conflict(DataIntegrityViolationException ignored) {
    return error(HttpStatus.CONFLICT, "A record conflicts with existing data.");
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  ResponseEntity<Map<String, Object>> unreadable(HttpMessageNotReadableException ignored) {
    return error(HttpStatus.BAD_REQUEST, "Please check the submitted information.");
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<Map<String, Object>> unexpected(Exception exception) {
    // Keep internal details in server logs; never return stack traces to API clients.
    logger.error("Unhandled API exception", exception);
    return error(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred. Please try again.");
  }

  private ResponseEntity<Map<String, Object>> error(HttpStatus status, String message) {
    return ResponseEntity.status(status)
        .body(Map.of("message", message, "fields", Map.of()));
  }

  private String validationMessage(String field, String constraint) {
    if ("NotBlank".equals(constraint)) {
      return switch (field) {
        case "fullName" -> "Please enter your full name.";
        case "email" -> "Please enter your email address.";
        case "password" -> "Please enter your password.";
        case "confirmation" -> "Please confirm your password.";
        case "title" -> "Please enter a request title.";
        case "category" -> "Please choose a service category.";
        case "location" -> "Please enter the affected location.";
        case "description" -> "Please describe the issue.";
        default -> "Please complete this field.";
      };
    }

    if ("Email".equals(constraint) && "email".equals(field)) {
      return "Please enter a valid email address.";
    }
    if ("Size".equals(constraint)) {
      return switch (field) {
        case "fullName" -> "Full name must be 120 characters or fewer.";
        case "email" -> "Email address must be 254 characters or fewer.";
        case "password" -> "Password must be between 8 and 72 characters.";
        case "title" -> "Request title must be between 5 and 120 characters.";
        case "location" -> "Affected location must be between 3 and 180 characters.";
        case "description" -> "Description must be between 20 and 3000 characters.";
        case "body" -> "Note must be 2000 characters or fewer.";
        default -> "Please check the length of this field.";
      };
    }
    if ("Pattern".equals(constraint) && "password".equals(field)) {
      return "Use uppercase and lowercase letters, a number, and a special character; do not use spaces.";
    }
    return "Please check this value.";
  }

  private String constraintName(String code) {
    if (code == null) return "";
    int qualifier = code.indexOf('.');
    return qualifier >= 0 ? code.substring(0, qualifier) : code;
  }
}
