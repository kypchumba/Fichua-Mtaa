package ke.fichuamtaa.api;

import static org.junit.jupiter.api.Assertions.*;

import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

class AccountDeletionTest {
  private static final String EMAIL = "citizen@example.test";
  private static final String PASSWORD = "Strong-Pass-2026";
  private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

  @AfterEach
  void clearTransactionSynchronization() {
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
      TransactionSynchronizationManager.clearSynchronization();
    }
  }

  @Test
  void rejectsConfirmationWithoutDeletingAnyData() {
    Fixture fixture = fixture(new AppUser("Citizen", EMAIL, encoder.encode(PASSWORD), Role.CITIZEN));

    var error = assertThrows(
        ResponseStatusException.class,
        () -> fixture.service.deleteCurrentAccount(EMAIL, PASSWORD, "delete"));

    assertEquals(400, error.getStatusCode().value());
    assertFalse(fixture.events.contains("delete-reports"));
    assertFalse(fixture.events.contains("delete-user"));
  }

  @Test
  void rejectsAnIncorrectPasswordBeforeDeletingAnyData() {
    Fixture fixture = fixture(new AppUser("Citizen", EMAIL, encoder.encode(PASSWORD), Role.CITIZEN));

    var error = assertThrows(
        ResponseStatusException.class,
        () -> fixture.service.deleteCurrentAccount(EMAIL, "wrong-password", "DELETE"));

    assertEquals(400, error.getStatusCode().value());
    assertFalse(fixture.events.contains("delete-reports"));
    assertFalse(fixture.events.contains("delete-user"));
  }

  @Test
  void deletesReportsBeforeTheAccountAndRevokesSessionsAfterCommit() {
    AppUser citizen = new AppUser("Citizen", EMAIL, encoder.encode(PASSWORD), Role.CITIZEN);
    Fixture fixture = fixture(citizen);
    var session = new MockHttpSession();
    fixture.sessions.register(citizen.id, session);
    TransactionSynchronizationManager.initSynchronization();

    fixture.service.deleteCurrentAccount(EMAIL, PASSWORD, "DELETE");

    assertTrue(fixture.events.indexOf("delete-reports") < fixture.events.indexOf("delete-user"));
    assertFalse(session.isInvalid());
    TransactionSynchronizationManager.getSynchronizations().forEach(sync -> sync.afterCommit());
    assertTrue(session.isInvalid());
  }

  @Test
  void refusesToDeleteAdministratorAccounts() {
    AppUser admin = new AppUser("Admin", "admin@example.test", encoder.encode(PASSWORD), Role.ADMIN);
    Fixture fixture = fixture(admin);

    assertThrows(
        ResponseStatusException.class,
        () -> fixture.service.deleteCurrentAccount("admin@example.test", PASSWORD, "DELETE"));
    assertFalse(fixture.events.contains("delete-user"));
  }

  @Test
  void retainsACloudinaryAssetThatIsStillReferencedByAnotherCitizen() {
    String url = uploadUrl("35d3764f-5d37-460a-a9dd-cf4fa851c12a");
    Fixture fixture = fixture(
        new AppUser("Citizen", EMAIL, encoder.encode(PASSWORD), Role.CITIZEN),
        url,
        java.util.Collections.singletonList(new Object[] {url, 99L}));
    TransactionSynchronizationManager.initSynchronization();

    fixture.service.deleteCurrentAccount(EMAIL, PASSWORD, "DELETE");

    assertFalse(fixture.events.contains("queue-cloudinary-cleanup"));
  }

  @Test
  void queuesAnUnsharedAppOwnedCloudinaryAssetForCleanup() {
    String url = uploadUrl("35d3764f-5d37-460a-a9dd-cf4fa851c12a");
    Fixture fixture = fixture(
        new AppUser("Citizen", EMAIL, encoder.encode(PASSWORD), Role.CITIZEN),
        url,
        java.util.Collections.singletonList(new Object[] {url, 42L}));
    TransactionSynchronizationManager.initSynchronization();

    fixture.service.deleteCurrentAccount(EMAIL, PASSWORD, "DELETE");

    assertTrue(fixture.events.contains("queue-cloudinary-cleanup"));
  }

  @Test
  void accountRemovalRunsInsideADatabaseTransaction() throws Exception {
    var method = AccountDeletionService.class.getDeclaredMethod(
        "deleteCurrentAccount", String.class, String.class, String.class);
    assertNotNull(method.getAnnotation(Transactional.class));
  }

  @Test
  void onlyAcceptsGeneratedCloudinaryUploadAssetUrls() {
    String id = "35d3764f-5d37-460a-a9dd-cf4fa851c12a";
    assertEquals(
        "fichua-mtaa/" + id,
        CloudinaryAssetId.fromOwnedUploadUrl(
            "https://res.cloudinary.com/sample-cloud/image/upload/v1720000000/fichua-mtaa/" + id + ".webp",
            "sample-cloud"));
    assertNull(
        CloudinaryAssetId.fromOwnedUploadUrl(
            "https://res.cloudinary.com/sample-cloud/image/upload/fichua-mtaa/not-ours.webp",
            "sample-cloud"));
    assertNull(
        CloudinaryAssetId.fromOwnedUploadUrl(
            "https://attacker.example/fichua-mtaa/" + id + ".webp", "sample-cloud"));
  }

  private Fixture fixture(AppUser selectedUser) {
    return fixture(selectedUser, null, List.of());
  }

  private Fixture fixture(AppUser selectedUser, String attachmentUrl, List<Object[]> references) {
    selectedUser.id = 42L;
    List<String> events = new ArrayList<>();
    ActiveSessionRegistry sessions = new ActiveSessionRegistry();
    UserRepository users = (UserRepository) Proxy.newProxyInstance(
        UserRepository.class.getClassLoader(), new Class<?>[] {UserRepository.class},
        (proxy, method, args) -> switch (method.getName()) {
          case "findByEmailIgnoreCase" -> Optional.of(selectedUser);
          case "delete" -> { events.add("delete-user"); yield null; }
          case "flush" -> { events.add("flush-user"); yield null; }
          case "toString" -> "test users";
          default -> throw new UnsupportedOperationException(method.getName());
        });
    ServiceRequest report = new ServiceRequest(
        "FM-2026-TEST", selectedUser, "Streetlight", "A sufficiently long description",
        "Street Lighting", "Central", attachmentUrl);
    RequestRepository requests = (RequestRepository) Proxy.newProxyInstance(
        RequestRepository.class.getClassLoader(), new Class<?>[] {RequestRepository.class},
        (proxy, method, args) -> switch (method.getName()) {
          case "findByCitizenIdOrderByCreatedAtDesc" -> List.of(report);
          case "findAttachmentReferences" -> references;
          case "deleteAll" -> { events.add("delete-reports"); yield null; }
          case "flush" -> { events.add("flush-reports"); yield null; }
          case "toString" -> "test requests";
          default -> throw new UnsupportedOperationException(method.getName());
        });
    CloudinaryCleanupRepository cleanup = (CloudinaryCleanupRepository) Proxy.newProxyInstance(
        CloudinaryCleanupRepository.class.getClassLoader(),
        new Class<?>[] {CloudinaryCleanupRepository.class},
        (proxy, method, args) -> switch (method.getName()) {
          case "existsByPublicId" -> false;
          case "save" -> { events.add("queue-cloudinary-cleanup"); yield args[0]; }
          case "toString" -> "test cleanup tasks";
          default -> throw new UnsupportedOperationException(method.getName());
        });
    var service = new AccountDeletionService(
        users, requests, cleanup, encoder, sessions, "sample-cloud", "admin@example.test");
    return new Fixture(service, sessions, events);
  }

  private String uploadUrl(String id) {
    return "https://res.cloudinary.com/sample-cloud/image/upload/v1720000000/fichua-mtaa/"
        + id + ".webp";
  }

  private record Fixture(
      AccountDeletionService service, ActiveSessionRegistry sessions, List<String> events) {}
}
