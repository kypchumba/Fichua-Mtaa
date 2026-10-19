package ke.fichuamtaa.api;

import java.util.HashSet;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountDeletionService {
  private final UserRepository users;
  private final RequestRepository requests;
  private final CloudinaryCleanupRepository cleanupTasks;
  private final PasswordEncoder passwordEncoder;
  private final ActiveSessionRegistry sessions;
  private final String cloudName;
  private final String configuredAdminEmail;

  AccountDeletionService(
      UserRepository users,
      RequestRepository requests,
      CloudinaryCleanupRepository cleanupTasks,
      PasswordEncoder passwordEncoder,
      ActiveSessionRegistry sessions,
      @Value("${CLOUDINARY_CLOUD_NAME:}") String cloudName,
      @Value("${app.admin.email:}") String configuredAdminEmail) {
    this.users = users;
    this.requests = requests;
    this.cleanupTasks = cleanupTasks;
    this.passwordEncoder = passwordEncoder;
    this.sessions = sessions;
    this.cloudName = cloudName;
    this.configuredAdminEmail = configuredAdminEmail.trim();
  }

  @Transactional
  public void deleteCurrentAccount(String email, String password, String confirmation) {
    AppUser user = users.findByEmailIgnoreCase(email)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    if (user.role != Role.CITIZEN
        || (!configuredAdminEmail.isBlank()
            && configuredAdminEmail.equalsIgnoreCase(user.email))) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account cannot be deleted here.");
    }
    if (!"DELETE".equals(confirmation)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Type DELETE to confirm account removal.");
    }
    if (password == null || !passwordEncoder.matches(password, user.passwordHash)) {
      // Keep the authenticated session valid after a mistyped re-authentication password.
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The password could not be verified.");
    }

    var ownedRequests = requests.findByCitizenIdOrderByCreatedAtDesc(user.id);
    Set<String> candidateIds = new HashSet<>();
    for (ServiceRequest request : ownedRequests) {
      String publicId = CloudinaryAssetId.fromOwnedUploadUrl(request.attachmentUrl, cloudName);
      if (publicId != null) candidateIds.add(publicId);
    }

    // Do not remove an asset if any other account still references it.
    Set<String> sharedIds = new HashSet<>();
    for (Object[] reference : requests.findAttachmentReferences()) {
      Long ownerId = (Long) reference[1];
      if (!user.id.equals(ownerId)) {
        String publicId = CloudinaryAssetId.fromOwnedUploadUrl((String) reference[0], cloudName);
        if (publicId != null) sharedIds.add(publicId);
      }
    }
    candidateIds.removeAll(sharedIds);
    for (String publicId : candidateIds) {
      if (!cleanupTasks.existsByPublicId(publicId)) cleanupTasks.save(new CloudinaryCleanupTask(publicId));
    }

    // The schema cascades history and notes from each report; deleting reports first
    // preserves those constraints and keeps all database work in this transaction.
    requests.deleteAll(ownedRequests);
    requests.flush();
    users.delete(user);
    users.flush();

    Long deletedUserId = user.id;
    TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
      @Override
      public void afterCommit() {
        sessions.invalidateUser(deletedUserId);
      }
    });
  }
}
