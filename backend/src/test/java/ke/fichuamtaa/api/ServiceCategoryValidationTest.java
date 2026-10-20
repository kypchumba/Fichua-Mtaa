package ke.fichuamtaa.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class ServiceCategoryValidationTest {
  @Test
  void acceptsNewAndHistoricalRequestCategories() {
    List.of(
            "Waste Management",
            "Roads and Transport",
            "Drainage and Flooding",
            "Street Lighting",
            "Water and Sanitation",
            "Public Facilities",
            "Public Safety Hazards",
            "Community Development",
            "Roads and Drainage",
            "Water Supply",
            "Waste Collection",
            "Other")
        .forEach(category -> assertEquals(category, ApiController.validCategory(category)));
  }

  @Test
  void rejectsCategoriesOutsideTheSupportedSet() {
    ResponseStatusException exception =
        assertThrows(
            ResponseStatusException.class,
            () -> ApiController.validCategory("Unlisted category"));

    assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
  }
}
