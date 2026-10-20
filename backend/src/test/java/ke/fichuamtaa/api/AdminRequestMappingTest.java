package ke.fichuamtaa.api;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

class AdminRequestMappingTest {
  @Test
  void adminRequestDtoReadsProxyRelationshipsThroughAccessors() {
    AppUser citizen = new LazyUserProxy(11L, "Citizen Name", "citizen@example.test", Role.CITIZEN);
    AppUser administrator =
        new LazyUserProxy(12L, "Administrator Name", "admin@example.test", Role.ADMIN);
    ServiceRequest request =
        new ServiceRequest(
            "FM-2026-ABC123",
            citizen,
            "Street light is out",
            "A report description",
            "Street Lighting",
            "Central",
            null);
    request.id = 21L;

    RequestHistory initialHistory =
        new RequestHistory(request, null, RequestStatus.PENDING, null, "Request submitted");
    RequestHistory statusHistory =
        new RequestHistory(
            request,
            RequestStatus.PENDING,
            RequestStatus.IN_PROGRESS,
            administrator,
            "Crew assigned");
    AdminNote note = new AdminNote(request, administrator, "Contacted the maintenance team.");

    RequestRepository requests =
        (RequestRepository)
            java.lang.reflect.Proxy.newProxyInstance(
                RequestRepository.class.getClassLoader(),
                new Class<?>[] {RequestRepository.class},
                (proxy, method, arguments) ->
                    "findById".equals(method.getName()) ? Optional.of(request) : null);
    HistoryRepository history =
        (HistoryRepository)
            java.lang.reflect.Proxy.newProxyInstance(
                HistoryRepository.class.getClassLoader(),
                new Class<?>[] {HistoryRepository.class},
                (proxy, method, arguments) ->
                    "findByRequestIdOrderByChangedAtAsc".equals(method.getName())
                        ? List.of(initialHistory, statusHistory)
                        : null);
    NoteRepository notes =
        (NoteRepository)
            java.lang.reflect.Proxy.newProxyInstance(
                NoteRepository.class.getClassLoader(),
                new Class<?>[] {NoteRepository.class},
                (proxy, method, arguments) ->
                    "findByRequestIdOrderByCreatedAtAsc".equals(method.getName())
                        ? List.of(note)
                        : null);

    ApiController controller =
        new ApiController(
            null, requests, history, notes, null, null, null, null, null, false, "lax", "", "", "");
    ApiController.RequestView result = controller.adminRequest(21L);

    assertEquals("CITIZEN", result.citizen().role());
    assertEquals("Citizen Name", result.citizen().fullName());
    assertEquals("Administrator Name", result.history().get(1).changedBy());
    assertEquals("Administrator Name", result.internalNotes().get(0).admin());
  }

  @Test
  void adminStatusUpdateChangesRequestAndAppendsHistory() {
    AppUser citizen = new AppUser("Citizen", "citizen@example.test", "hash", Role.CITIZEN);
    AppUser administrator =
        new AppUser("Administrator", "admin@example.test", "hash", Role.ADMIN);
    ServiceRequest request =
        new ServiceRequest(
            "FM-2026-ABC123",
            citizen,
            "Street light is out",
            "A report description",
            "Street Lighting",
            "Central",
            null);
    request.id = 21L;
    var historyRows =
        new ArrayList<>(
            List.of(
                new RequestHistory(
                    request, null, RequestStatus.PENDING, null, "Request submitted")));

    RequestRepository requests =
        (RequestRepository)
            java.lang.reflect.Proxy.newProxyInstance(
                RequestRepository.class.getClassLoader(),
                new Class<?>[] {RequestRepository.class},
                (proxy, method, arguments) ->
                    "findById".equals(method.getName()) ? Optional.of(request) : null);
    UserRepository users =
        (UserRepository)
            java.lang.reflect.Proxy.newProxyInstance(
                UserRepository.class.getClassLoader(),
                new Class<?>[] {UserRepository.class},
                (proxy, method, arguments) ->
                    "findByEmailIgnoreCase".equals(method.getName())
                        ? Optional.of(administrator)
                        : null);
    HistoryRepository history =
        (HistoryRepository)
            java.lang.reflect.Proxy.newProxyInstance(
                HistoryRepository.class.getClassLoader(),
                new Class<?>[] {HistoryRepository.class},
                (proxy, method, arguments) -> {
                  if ("findByRequestIdOrderByChangedAtAsc".equals(method.getName())) {
                    return historyRows;
                  }
                  if ("save".equals(method.getName())) {
                    historyRows.add((RequestHistory) arguments[0]);
                    return arguments[0];
                  }
                  return null;
                });
    NoteRepository notes =
        (NoteRepository)
            java.lang.reflect.Proxy.newProxyInstance(
                NoteRepository.class.getClassLoader(),
                new Class<?>[] {NoteRepository.class},
                (proxy, method, arguments) -> List.of());

    ApiController controller =
        new ApiController(
            users, requests, history, notes, null, null, null, null, null, false, "lax", "", "", "");
    var auth =
        UsernamePasswordAuthenticationToken.authenticated(
            "admin@example.test", null, List.of());

    ApiController.RequestView updated =
        controller.updateStatus(
            21L,
            new ApiController.StatusChange(RequestStatus.IN_PROGRESS, null),
            auth);

    assertEquals("IN_PROGRESS", updated.status());
    assertEquals(2, updated.history().size());
    assertEquals("PENDING", updated.history().get(1).previousStatus());
    assertEquals("IN_PROGRESS", updated.history().get(1).newStatus());
    assertEquals(null, updated.history().get(1).note());
    assertEquals("Administrator", updated.history().get(1).changedBy());
  }

  @Test
  void citizenRequestDetailsNeverLoadOrReturnAdministratorOnlyNotes() {
    AppUser citizen = new AppUser("Citizen", "citizen@example.test", "hash", Role.CITIZEN);
    citizen.id = 11L;
    ServiceRequest request =
        new ServiceRequest(
            "FM-2026-ABC123",
            citizen,
            "Street light is out",
            "A report description",
            "Street Lighting",
            "Central",
            null);
    request.id = 21L;
    UserRepository users =
        (UserRepository)
            java.lang.reflect.Proxy.newProxyInstance(
                UserRepository.class.getClassLoader(),
                new Class<?>[] {UserRepository.class},
                (proxy, method, arguments) ->
                    "findByEmailIgnoreCase".equals(method.getName())
                        ? Optional.of(citizen)
                        : null);
    RequestRepository requests =
        (RequestRepository)
            java.lang.reflect.Proxy.newProxyInstance(
                RequestRepository.class.getClassLoader(),
                new Class<?>[] {RequestRepository.class},
                (proxy, method, arguments) ->
                    "findByIdAndCitizenId".equals(method.getName())
                        ? Optional.of(request)
                        : null);
    HistoryRepository history =
        (HistoryRepository)
            java.lang.reflect.Proxy.newProxyInstance(
                HistoryRepository.class.getClassLoader(),
                new Class<?>[] {HistoryRepository.class},
                (proxy, method, arguments) -> List.of());
    NoteRepository notes =
        (NoteRepository)
            java.lang.reflect.Proxy.newProxyInstance(
                NoteRepository.class.getClassLoader(),
                new Class<?>[] {NoteRepository.class},
                (proxy, method, arguments) -> {
                  throw new AssertionError("Citizen detail must not load internal notes.");
                });
    ApiController controller =
        new ApiController(
            users, requests, history, notes, null, null, null, null, null, false, "lax", "", "", "");
    var auth = UsernamePasswordAuthenticationToken.authenticated("citizen@example.test", null, List.of());

    ApiController.RequestView result = controller.myRequest(21L, auth);

    assertEquals(List.of(), result.internalNotes());
  }

  // Hibernate proxies expose entity values through overridden methods, not entity fields.
  private static class LazyUserProxy extends AppUser {
    private final Long userId;
    private final String userName;
    private final String userEmail;
    private final Role userRole;

    LazyUserProxy(Long id, String fullName, String email, Role role) {
      this.userId = id;
      this.userName = fullName;
      this.userEmail = email;
      this.userRole = role;
    }

    @Override
    public Long getId() {
      return userId;
    }

    @Override
    public String getFullName() {
      return userName;
    }

    @Override
    public String getEmail() {
      return userEmail;
    }

    @Override
    public Role getRole() {
      return userRole;
    }
  }
}
