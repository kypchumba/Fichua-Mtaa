package ke.fichuamtaa.api;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;

enum Role {
  CITIZEN,
  ADMIN
}

enum RequestStatus {
  PENDING,
  IN_PROGRESS,
  RESOLVED;

  boolean canMoveTo(RequestStatus next) {
    return (this == PENDING && next == IN_PROGRESS) || (this == IN_PROGRESS && next == RESOLVED);
  }
}

@Entity
@Table(name = "app_user")
class AppUser {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  Long id;

  @Column(name = "full_name", nullable = false, length = 120)
  String fullName;

  @Column(nullable = false, unique = true, length = 254)
  String email;

  @Column(name = "password_hash", nullable = false, length = 100)
  String passwordHash;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  Role role;

  @Column(name = "created_at", nullable = false)
  Instant createdAt = Instant.now();

  protected AppUser() {}

  AppUser(String fullName, String email, String passwordHash, Role role) {
    this.fullName = fullName;
    this.email = email;
    this.passwordHash = passwordHash;
    this.role = role;
  }
}

@Entity
@Table(name = "service_request")
class ServiceRequest {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  Long id;

  @Column(name = "reference_number", nullable = false, unique = true, length = 24)
  String referenceNumber;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "citizen_id")
  AppUser citizen;

  @Column(nullable = false, length = 120)
  String title;

  @Column(nullable = false, length = 3000)
  String description;

  @Column(nullable = false, length = 40)
  String category;

  @Column(nullable = false, length = 180)
  String location;

  @Column(name = "attachment_url", length = 1000)
  String attachmentUrl;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  RequestStatus status = RequestStatus.PENDING;

  @Column(name = "created_at", nullable = false)
  Instant createdAt = Instant.now();

  @Column(name = "updated_at", nullable = false)
  Instant updatedAt = Instant.now();

  @Column(name = "resolved_at")
  Instant resolvedAt;

  protected ServiceRequest() {}

  ServiceRequest(
      String ref,
      AppUser citizen,
      String title,
      String description,
      String category,
      String location,
      String url) {
    this.referenceNumber = ref;
    this.citizen = citizen;
    this.title = title;
    this.description = description;
    this.category = category;
    this.location = location;
    this.attachmentUrl = url;
  }
}

@Entity
@Table(name = "request_history")
class RequestHistory {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "request_id", nullable = false)
  ServiceRequest request;

  @Enumerated(EnumType.STRING)
  @Column(name = "previous_status", length = 20)
  RequestStatus previousStatus;

  @Enumerated(EnumType.STRING)
  @Column(name = "new_status", nullable = false, length = 20)
  RequestStatus newStatus;

  @Column(name = "changed_at", nullable = false)
  Instant changedAt = Instant.now();

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "changed_by")
  AppUser changedBy;

  @Column(length = 1000)
  String note;

  protected RequestHistory() {}

  RequestHistory(
      ServiceRequest r,
      RequestStatus oldStatus,
      RequestStatus newStatus,
      AppUser actor,
      String note) {
    this.request = r;
    this.previousStatus = oldStatus;
    this.newStatus = newStatus;
    this.changedBy = actor;
    this.note = note;
  }
}

@Entity
@Table(name = "admin_note")
class AdminNote {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "request_id", nullable = false)
  ServiceRequest request;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "admin_id", nullable = false)
  AppUser admin;

  @Column(nullable = false, length = 2000)
  String body;

  @Column(name = "created_at", nullable = false)
  Instant createdAt = Instant.now();

  protected AdminNote() {}

  AdminNote(ServiceRequest r, AppUser a, String b) {
    request = r;
    admin = a;
    body = b;
  }
}

interface UserRepository
    extends org.springframework.data.jpa.repository.JpaRepository<AppUser, Long> {
  Optional<AppUser> findByEmailIgnoreCase(String email);

  boolean existsByEmailIgnoreCase(String email);
}

interface RequestRepository
    extends org.springframework.data.jpa.repository.JpaRepository<ServiceRequest, Long>,
        org.springframework.data.jpa.repository.JpaSpecificationExecutor<ServiceRequest> {
  List<ServiceRequest> findByCitizenIdOrderByCreatedAtDesc(Long citizenId);

  Optional<ServiceRequest> findByIdAndCitizenId(Long id, Long citizenId);

  @org.springframework.data.jpa.repository.Query(
      "select r.status, count(r) from ServiceRequest r group by r.status")
  List<Object[]> countGroupedByStatus();

  @org.springframework.data.jpa.repository.Query(
      "select r.category, count(r) from ServiceRequest r group by r.category")
  List<Object[]> countGroupedByCategory();
}

interface HistoryRepository
    extends org.springframework.data.jpa.repository.JpaRepository<RequestHistory, Long> {
  List<RequestHistory> findByRequestIdOrderByChangedAtAsc(Long requestId);
}

interface NoteRepository
    extends org.springframework.data.jpa.repository.JpaRepository<AdminNote, Long> {
  List<AdminNote> findByRequestIdOrderByCreatedAtAsc(Long requestId);
}
