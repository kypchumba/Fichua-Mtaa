package ke.fichuamtaa.api;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

// The database outbox remains durable when Cloudinary is unavailable after account deletion.
@Component
class CloudinaryCleanupWorker {
  private static final Logger logger = LoggerFactory.getLogger(CloudinaryCleanupWorker.class);
  private final CloudinaryCleanupRepository tasks;
  private final String cloudName;
  private final String cloudKey;
  private final String cloudSecret;
  private final RestClient restClient = RestClient.create();

  CloudinaryCleanupWorker(
      CloudinaryCleanupRepository tasks,
      @Value("${CLOUDINARY_CLOUD_NAME:}") String cloudName,
      @Value("${CLOUDINARY_API_KEY:}") String cloudKey,
      @Value("${CLOUDINARY_API_SECRET:}") String cloudSecret) {
    this.tasks = tasks;
    this.cloudName = cloudName;
    this.cloudKey = cloudKey;
    this.cloudSecret = cloudSecret;
  }

  @Scheduled(fixedDelayString = "${CLOUDINARY_CLEANUP_INTERVAL_MS:60000}")
  void processDueTasks() {
    if (cloudName.isBlank() || cloudKey.isBlank() || cloudSecret.isBlank()) return;
    for (CloudinaryCleanupTask task :
        tasks.findTop25ByNextAttemptAtLessThanEqualOrderByNextAttemptAtAsc(Instant.now())) {
      try {
        if (destroy(task.publicId)) {
          tasks.delete(task);
        } else {
          retry(task);
        }
      } catch (Exception exception) {
        // Log only the asset identifier and never provider credentials or response payloads.
        logger.warn("Cloudinary cleanup will retry for asset {}", task.publicId);
        retry(task);
      }
    }
  }

  private boolean destroy(String publicId) throws Exception {
    String timestamp = Long.toString(Instant.now().getEpochSecond());
    String signature = signature(publicId, timestamp);
    MultipartBodyBuilder body = new MultipartBodyBuilder();
    body.part("public_id", publicId);
    body.part("timestamp", timestamp);
    body.part("api_key", cloudKey);
    body.part("signature", signature);

    Map<String, Object> result =
        restClient
            .post()
            .uri("https://api.cloudinary.com/v1_1/" + cloudName + "/image/destroy")
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(body.build())
            .retrieve()
            .body(new ParameterizedTypeReference<Map<String, Object>>() {});
    Object status = result == null ? null : result.get("result");
    return "ok".equals(status) || "not found".equals(status);
  }

  private String signature(String publicId, String timestamp) throws Exception {
    String canonical = "public_id=" + publicId + "&timestamp=" + timestamp + cloudSecret;
    byte[] digest =
        MessageDigest.getInstance("SHA-1").digest(canonical.getBytes(StandardCharsets.UTF_8));
    return HexFormat.of().formatHex(digest);
  }

  void retry(CloudinaryCleanupTask task) {
    var current = tasks.findById(task.id).orElse(null);
    if (current == null) return;
    current.attemptCount++;
    long delaySeconds = Math.min(86400L, 60L << Math.min(current.attemptCount, 10));
    current.nextAttemptAt = Instant.now().plusSeconds(delaySeconds);
    tasks.save(current);
  }
}
