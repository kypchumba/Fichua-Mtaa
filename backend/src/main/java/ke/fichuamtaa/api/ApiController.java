package ke.fichuamtaa.api;

import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import java.util.HexFormat;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.*;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
@org.springframework.transaction.annotation.Transactional(readOnly = true)
class ApiController {
  private final UserRepository users;
  private final RequestRepository requests;
  private final HistoryRepository history;
  private final NoteRepository notes;
  private final org.springframework.security.crypto.password.PasswordEncoder encoder;
  private final AuthenticationManager authManager;
  private final String cloudName, cloudKey, cloudSecret;

  ApiController(
      UserRepository users,
      RequestRepository requests,
      HistoryRepository history,
      NoteRepository notes,
      org.springframework.security.crypto.password.PasswordEncoder encoder,
      AuthenticationManager authManager,
      @Value("${CLOUDINARY_CLOUD_NAME:}") String cloudName,
      @Value("${CLOUDINARY_API_KEY:}") String cloudKey,
      @Value("${CLOUDINARY_API_SECRET:}") String cloudSecret) {
    this.users = users;
    this.requests = requests;
    this.history = history;
    this.notes = notes;
    this.encoder = encoder;
    this.authManager = authManager;
    this.cloudName = cloudName;
    this.cloudKey = cloudKey;
    this.cloudSecret = cloudSecret;
  }

  record Register(
      @NotBlank(message = "Please enter your full name.")
          @Size(max = 120, message = "Full name must be 120 characters or fewer.")
          String fullName,
      @NotBlank(message = "Please enter your email address.")
          @Email(message = "Please enter a valid email address.")
          @Size(max = 254, message = "Email address must be 254 characters or fewer.")
          String email,
      @NotBlank(message = "Please enter your password.")
          @Size(min = 10, max = 72, message = "Password must be between 10 and 72 characters.")
          @Pattern(
              regexp = "(?=.*[A-Za-z])(?=.*\\d).+",
              message = "Password must contain a letter and a number")
          String password,
      @NotBlank(message = "Please confirm your password.") String confirmation) {}

  record Login(
      @NotBlank(message = "Please enter your email address.")
          @Email(message = "Please enter a valid email address.")
          String email,
      @NotBlank(message = "Please enter your password.") String password) {}

  record CreateRequest(
      @NotBlank @Size(min = 5, max = 120) String title,
      @NotBlank String category,
      @NotBlank @Size(max = 180) String location,
      @NotBlank @Size(min = 20, max = 3000) String description,
      @Size(max = 1000) String attachmentUrl) {}

  record StatusChange(@NotNull RequestStatus status, @Size(max = 1000) String note) {}

  record CategoryChange(@NotBlank String category) {}

  record NoteInput(@NotBlank @Size(max = 2000) String body) {}

  record UserView(Long id, String fullName, String email, String role) {}

  record HistoryView(
      String previousStatus, String newStatus, Instant changedAt, String changedBy, String note) {}

  record NoteView(Long id, String body, Instant createdAt, String admin) {}

  record RequestView(
      Long id,
      String referenceNumber,
      String title,
      String description,
      String category,
      String location,
      String attachmentUrl,
      String status,
      Instant createdAt,
      Instant updatedAt,
      Instant resolvedAt,
      UserView citizen,
      List<HistoryView> history,
      List<NoteView> internalNotes) {}

  record PageView(
      List<RequestView> content, int page, int size, long totalElements, int totalPages) {}

  @GetMapping("/health")
  Map<String, String> health() {
    return Map.of("status", "ok");
  }

  @GetMapping("/auth/csrf")
  Map<String, String> csrf(CsrfToken token) {
    return Map.of("token", token.getToken());
  }

  @PostMapping("/auth/register")
  @Transactional
  ResponseEntity<UserView> register(
      @Valid @RequestBody Register input, HttpServletRequest request) {
    if (!input.password().equals(input.confirmation()))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Passwords must match.");
    String email = input.email().trim().toLowerCase(Locale.ROOT);
    if (users.existsByEmailIgnoreCase(email))
      throw new ResponseStatusException(
          HttpStatus.CONFLICT,
          "An account with this email already exists. Please log in instead.");
    AppUser user =
        users.save(
            new AppUser(
                input.fullName().trim(), email, encoder.encode(input.password()), Role.CITIZEN));
    var result =
        authManager.authenticate(new UsernamePasswordAuthenticationToken(email, input.password()));
    var context =
        org.springframework.security.core.context.SecurityContextHolder.createEmptyContext();
    context.setAuthentication(result);
    org.springframework.security.core.context.SecurityContextHolder.setContext(context);
    if (request.getSession(false) != null) request.changeSessionId();
    request.getSession(true).setAttribute("SPRING_SECURITY_CONTEXT", context);
    return ResponseEntity.status(HttpStatus.CREATED).body(userView(user));
  }

  @PostMapping("/auth/login")
  Map<String, Object> login(@Valid @RequestBody Login input, HttpServletRequest req) {
    var result =
        authManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                input.email().trim().toLowerCase(Locale.ROOT), input.password()));
    var context =
        org.springframework.security.core.context.SecurityContextHolder.createEmptyContext();
    context.setAuthentication(result);
    org.springframework.security.core.context.SecurityContextHolder.setContext(context);
    if (req.getSession(false) != null) req.changeSessionId();
    req.getSession(true).setAttribute("SPRING_SECURITY_CONTEXT", context);
    return Map.of("user", userView(users.findByEmailIgnoreCase(result.getName()).orElseThrow()));
  }

  @PostMapping("/auth/logout")
  ResponseEntity<Void> logout(HttpServletRequest req, HttpServletResponse res) {
    try {
      req.logout();
    } catch (Exception ignored) {
    }
    var session = req.getSession(false);
    if (session != null) session.invalidate();
    res.setHeader("Set-Cookie", "JSESSIONID=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
    return ResponseEntity.noContent().build();
  }

  @GetMapping("/auth/me")
  UserView me(Authentication auth) {
    return userView(current(auth));
  }

  @PostMapping("/requests")
  @PreAuthorize("hasRole('CITIZEN')")
  @Transactional
  ResponseEntity<RequestView> create(@Valid @RequestBody CreateRequest input, Authentication auth) {
    String category = validCategory(input.category());
    if (input.attachmentUrl() != null
        && !input
            .attachmentUrl()
            .startsWith("https://res.cloudinary.com/" + cloudName + "/image/upload/"))
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Attachment URL is not a valid uploaded image.");
    String ref =
        "FM-"
            + Year.now(ZoneOffset.UTC).getValue()
            + "-"
            + Long.toString(ThreadLocalRandom.current().nextLong(36L * 36 * 36 * 36 * 36 * 36), 36)
                .toUpperCase(Locale.ROOT);
    ServiceRequest r =
        requests.save(
            new ServiceRequest(
                ref,
                current(auth),
                input.title().trim(),
                input.description().trim(),
                category,
                input.location().trim(),
                input.attachmentUrl()));
    history.save(new RequestHistory(r, null, RequestStatus.PENDING, null, "Request submitted"));
    return ResponseEntity.status(HttpStatus.CREATED).body(requestView(r, false));
  }

  @GetMapping("/requests/mine")
  List<RequestView> mine(
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String category,
      @RequestParam(required = false) String q,
      Authentication auth) {
    return requests.findByCitizenIdOrderByCreatedAtDesc(current(auth).id).stream()
        .filter(r -> status == null || status.isBlank() || r.status == parseStatus(status))
        .filter(
            r ->
                category == null
                    || category.isBlank()
                    || r.category.equals(validCategory(category)))
        .filter(
            r ->
                q == null
                    || q.isBlank()
                    || (r.title + " " + r.referenceNumber + " " + r.location + " " + r.description)
                        .toLowerCase(Locale.ROOT)
                        .contains(q.toLowerCase(Locale.ROOT)))
        .map(r -> requestView(r, false))
        .toList();
  }

  @GetMapping("/requests/{id}")
  RequestView myRequest(@PathVariable Long id, Authentication auth) {
    var r =
        requests
            .findByIdAndCitizenId(id, current(auth).id)
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));
    return requestView(r, false);
  }

  // Stream only the already-compressed image through the backend; size and file signature are
  // checked again here.
  @PostMapping(value = "/uploads/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @PreAuthorize("hasRole('CITIZEN')")
  Map<String, String> uploadImage(@RequestPart("image") MultipartFile image) {
    if (cloudName.isBlank() || cloudKey.isBlank() || cloudSecret.isBlank())
      throw new ResponseStatusException(
          HttpStatus.SERVICE_UNAVAILABLE,
          "Image attachments are not configured. Submit the request without an image.");
    if (image.isEmpty() || image.getSize() > 512000)
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Image must be no larger than 500 KB.");
    try {
      byte[] bytes = image.getBytes();
      String format = sniffImage(bytes);
      if (format == null)
        throw new ResponseStatusException(
            HttpStatus.BAD_REQUEST, "Only JPEG, PNG and WebP images are supported.");
      String folder = "fichua-mtaa";
      long timestamp = Instant.now().getEpochSecond();
      String publicId = UUID.randomUUID().toString();
      Map<String, String> signed =
          Map.of("folder", folder, "public_id", publicId, "timestamp", Long.toString(timestamp));
      String signature = cloudSignature(signed, cloudSecret);
      MultipartBodyBuilder body = new MultipartBodyBuilder();
      body.part(
              "file",
              new org.springframework.core.io.ByteArrayResource(bytes) {
                @Override
                public String getFilename() {
                  return "attachment." + format;
                }
              })
          .contentType(
              MediaType.parseMediaType(format.equals("jpg") ? "image/jpeg" : "image/" + format));
      signed.forEach((key, value) -> body.part(key, value));
      body.part("api_key", cloudKey);
      body.part("signature", signature);
      Map<String, Object> result =
          RestClient.create()
              .post()
              .uri("https://api.cloudinary.com/v1_1/" + cloudName + "/image/upload")
              .contentType(MediaType.MULTIPART_FORM_DATA)
              .body(body.build())
              .retrieve()
              .body(new ParameterizedTypeReference<Map<String, Object>>() {});

      // Treat the provider response as external input before storing or returning its URL.
      Object secureUrlValue = result == null ? null : result.get("secure_url");
      if (!(secureUrlValue instanceof String secureUrl)
          || !isValidCloudinaryUrl(secureUrl)) {
        throw new ResponseStatusException(
            HttpStatus.BAD_GATEWAY, "Image upload returned an invalid image URL.");
      }

      return Map.of("url", secureUrl);
    } catch (ResponseStatusException e) {
      throw e;
    } catch (Exception e) {
      throw new ResponseStatusException(
          HttpStatus.BAD_GATEWAY, "Image upload failed. You can retry or submit without an image.");
    }
  }

  private String cloudSignature(Map<String, String> params, String secret) throws Exception {
    String canonical =
        params.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> e.getKey() + "=" + e.getValue())
                .collect(java.util.stream.Collectors.joining("&"))
            + secret;
    byte[] digest =
        MessageDigest.getInstance("SHA-1").digest(canonical.getBytes(StandardCharsets.UTF_8));
    return HexFormat.of().formatHex(digest);
  }

  private String sniffImage(byte[] b) {
    if (b.length >= 3 && (b[0] & 255) == 255 && (b[1] & 255) == 216 && (b[2] & 255) == 255)
      return "jpg";
    if (b.length >= 8
        && (b[0] & 255) == 137
        && b[1] == 'P'
        && b[2] == 'N'
        && b[3] == 'G'
        && b[4] == 13
        && b[5] == 10
        && b[6] == 26
        && b[7] == 10) return "png";
    if (b.length >= 12
        && new String(b, 0, 4, StandardCharsets.US_ASCII).equals("RIFF")
        && new String(b, 8, 4, StandardCharsets.US_ASCII).equals("WEBP")) return "webp";
    return null;
  }

  private boolean isValidCloudinaryUrl(String value) {
    try {
      java.net.URI uri = java.net.URI.create(value);
      String expectedPathPrefix = "/" + cloudName + "/image/upload/";

      return "https".equalsIgnoreCase(uri.getScheme())
          && "res.cloudinary.com".equalsIgnoreCase(uri.getHost())
          && uri.getUserInfo() == null
          && uri.getPath() != null
          && uri.getPath().startsWith(expectedPathPrefix);
    } catch (IllegalArgumentException ignored) {
      return false;
    }
  }

  @GetMapping("/admin/requests")
  PageView all(
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String category,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) LocalDate from,
      @RequestParam(required = false) LocalDate to,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size,
      @RequestParam(defaultValue = "createdAt,desc") String sort) {
    if (page < 0 || size < 1 || size > 100)
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid pagination");
    String[] order = sort.split(",");
    String field =
        Set.of("createdAt", "updatedAt", "status", "category").contains(order[0])
            ? order[0]
            : "createdAt";
    Sort sorting =
        Sort.by(
            "asc".equalsIgnoreCase(order.length > 1 ? order[1] : "desc")
                ? Sort.Direction.ASC
                : Sort.Direction.DESC,
            field);
    if (from != null && to != null && from.isAfter(to))
      throw new ResponseStatusException(
          HttpStatus.BAD_REQUEST, "Start date must not be after end date");
    Specification<ServiceRequest> spec = (root, query, cb) -> cb.conjunction();
    if (status != null && !status.isBlank()) {
      RequestStatus s = parseStatus(status);
      spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), s));
    }
    if (category != null && !category.isBlank())
      spec = spec.and((root, query, cb) -> cb.equal(root.get("category"), validCategory(category)));
    if (q != null && !q.isBlank()) {
      String like = "%" + q.toLowerCase(Locale.ROOT) + "%";
      spec =
          spec.and(
              (root, query, cb) ->
                  cb.or(
                      cb.like(cb.lower(root.get("title")), like),
                      cb.like(cb.lower(root.get("referenceNumber")), like),
                      cb.like(cb.lower(root.get("location")), like)));
    }
    if (from != null) {
      Instant start = from.atStartOfDay(ZoneOffset.UTC).toInstant();
      spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), start));
    }
    if (to != null) {
      Instant end = to.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
      spec = spec.and((root, query, cb) -> cb.lessThan(root.get("createdAt"), end));
    }
    var result = requests.findAll(spec, PageRequest.of(page, size, sorting));
    return new PageView(
        result.getContent().stream().map(r -> requestView(r, true)).toList(),
        page,
        size,
        result.getTotalElements(),
        result.getTotalPages());
  }

  @GetMapping("/admin/requests/{id}")
  RequestView adminRequest(@PathVariable Long id) {
    return requestView(findRequest(id), true);
  }

  @PatchMapping("/admin/requests/{id}/category")
  @Transactional
  RequestView updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryChange input) {
    ServiceRequest r = findRequest(id);
    r.category = validCategory(input.category());
    r.updatedAt = Instant.now();
    return requestView(r, true);
  }

  @PatchMapping("/admin/requests/{id}/status")
  @Transactional
  RequestView updateStatus(
      @PathVariable Long id, @Valid @RequestBody StatusChange input, Authentication auth) {
    ServiceRequest r = findRequest(id);
    RequestStatus old = r.status, next = input.status();
    if (!old.canMoveTo(next))
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Only PENDING → IN_PROGRESS → RESOLVED transitions are allowed");
    r.status = next;
    r.updatedAt = Instant.now();
    if (next == RequestStatus.RESOLVED) r.resolvedAt = r.updatedAt;
    history.save(new RequestHistory(r, old, next, current(auth), input.note()));
    return requestView(r, true);
  }

  @PostMapping("/admin/requests/{id}/notes")
  @Transactional
  NoteView addNote(
      @PathVariable Long id, @Valid @RequestBody NoteInput input, Authentication auth) {
    var note = notes.save(new AdminNote(findRequest(id), current(auth), input.body().trim()));
    return new NoteView(note.id, note.body, note.createdAt, note.admin.fullName);
  }

  @GetMapping("/admin/analytics")
  Map<String, Object> analytics() {
    Map<String, Long> statuses = new TreeMap<>(), categories = new TreeMap<>();
    for (var s : RequestStatus.values()) statuses.put(s.name(), 0L);
    requests
        .countGroupedByStatus()
        .forEach(row -> statuses.put(((RequestStatus) row[0]).name(), (Long) row[1]));
    requests
        .countGroupedByCategory()
        .forEach(row -> categories.put((String) row[0], (Long) row[1]));
    long total = statuses.values().stream().mapToLong(Long::longValue).sum(),
        resolved = statuses.get("RESOLVED");
    return Map.of(
        "total",
        total,
        "pending",
        statuses.get("PENDING"),
        "inProgress",
        statuses.get("IN_PROGRESS"),
        "resolved",
        resolved,
        "open",
        total - resolved,
        "byStatus",
        statuses,
        "byCategory",
        categories);
  }

  private AppUser current(Authentication auth) {
    return users
        .findByEmailIgnoreCase(auth.getName())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
  }

  private ServiceRequest findRequest(Long id) {
    return requests
        .findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));
  }

  private UserView userView(AppUser u) {
    // Accessors initialize lazy proxies; direct field reads bypass Hibernate's proxy behavior.
    return new UserView(u.getId(), u.getFullName(), u.getEmail(), u.getRole().name());
  }

  private RequestView requestView(ServiceRequest r, boolean admin) {
    var h =
        history.findByRequestIdOrderByChangedAtAsc(r.id).stream()
            .map(
                x ->
                    new HistoryView(
                        x.previousStatus == null ? null : x.previousStatus.name(),
                        x.newStatus.name(),
                        x.changedAt,
                        x.changedBy == null ? null : x.changedBy.getFullName(),
                        admin ? x.note : null))
            .toList();
    var n =
        admin
            ? notes.findByRequestIdOrderByCreatedAtAsc(r.id).stream()
                .map(x -> new NoteView(x.id, x.body, x.createdAt, x.admin.getFullName()))
                .toList()
            : List.<NoteView>of();
    return new RequestView(
        r.id,
        r.referenceNumber,
        r.title,
        r.description,
        r.category,
        r.location,
        r.attachmentUrl,
        r.status.name(),
        r.createdAt,
        r.updatedAt,
        r.resolvedAt,
        userView(r.citizen),
        h,
        n);
  }

  private String validCategory(String c) {
    if (!Set.of(
            "Roads and Drainage", "Water Supply", "Waste Collection", "Street Lighting", "Other")
        .contains(c))
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported service category");
    return c;
  }

  private RequestStatus parseStatus(String s) {
    try {
      return RequestStatus.valueOf(s.toUpperCase(Locale.ROOT));
    } catch (Exception e) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status");
    }
  }
}
