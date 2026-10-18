package ke.fichuamtaa.api;

import java.util.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
class ApiErrors {
  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<Map<String, Object>> invalid(MethodArgumentNotValidException ex) {
    Map<String, String> fields = new LinkedHashMap<>();
    ex.getBindingResult()
        .getFieldErrors()
        .forEach(error -> fields.putIfAbsent(error.getField(), error.getDefaultMessage()));
    return ResponseEntity.badRequest()
        .body(Map.of("message", "Please check the highlighted fields.", "fields", fields));
  }

  @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
  ResponseEntity<Map<String, String>> status(
      org.springframework.web.server.ResponseStatusException ex) {
    return ResponseEntity.status(ex.getStatusCode())
        .body(
            Map.of(
                "message",
                Objects.requireNonNullElse(ex.getReason(), "Request could not be completed.")));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<Map<String, String>> conflict(Exception ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(Map.of("message", "A record conflicts with existing data."));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<Map<String, String>> unexpected(Exception ex) {
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(Map.of("message", "An unexpected error occurred. Please try again."));
  }
}
