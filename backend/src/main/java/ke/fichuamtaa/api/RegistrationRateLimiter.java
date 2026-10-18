package ke.fichuamtaa.api;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.LongSupplier;

/** A bounded, per-instance fixed-window counter for public account creation attempts. */
final class RegistrationRateLimiter {
  private final int maximumAttempts;
  private final long windowNanos;
  private final int maximumEntries;
  private final LongSupplier nanoTime;
  private final ConcurrentHashMap<String, AttemptWindow> windows = new ConcurrentHashMap<>();
  private final AtomicInteger entryCount = new AtomicInteger();
  private final AtomicLong operationCount = new AtomicLong();

  RegistrationRateLimiter(int maximumAttempts, Duration window, int maximumEntries) {
    this(maximumAttempts, window, maximumEntries, System::nanoTime);
  }

  RegistrationRateLimiter(
      int maximumAttempts, Duration window, int maximumEntries, LongSupplier nanoTime) {
    if (maximumAttempts < 1 || window.isZero() || window.isNegative() || maximumEntries < 1) {
      throw new IllegalArgumentException("Registration rate-limit settings must be positive");
    }

    this.maximumAttempts = maximumAttempts;
    this.windowNanos = window.toNanos();
    this.maximumEntries = maximumEntries;
    this.nanoTime = nanoTime;
  }

  boolean allowAttempt(String clientAddress) {
    long now = nanoTime.getAsLong();
    if (entryCount.get() >= maximumEntries || (operationCount.incrementAndGet() & 63) == 0) {
      removeExpired(now);
    }

    String key = clientAddress == null || clientAddress.isBlank() ? "unknown" : clientAddress;
    AtomicBoolean allowed = new AtomicBoolean();
    windows.compute(
        key,
        (ignored, current) -> {
          if (current == null) {
            if (!reserveEntry()) return null;
            allowed.set(true);
            return new AttemptWindow(now, 1);
          }

          if (now - current.startedAtNanos >= windowNanos) {
            allowed.set(true);
            return new AttemptWindow(now, 1);
          }

          if (current.attempts >= maximumAttempts) return current;

          allowed.set(true);
          return new AttemptWindow(current.startedAtNanos, current.attempts + 1);
        });

    return allowed.get();
  }

  long retryAfterSeconds() {
    return Math.max(1, Duration.ofNanos(windowNanos).toSeconds());
  }

  private boolean reserveEntry() {
    while (true) {
      int current = entryCount.get();
      if (current >= maximumEntries) return false;
      if (entryCount.compareAndSet(current, current + 1)) return true;
    }
  }

  private void removeExpired(long now) {
    windows.forEach(
        (key, value) -> {
          if (now - value.startedAtNanos >= windowNanos && windows.remove(key, value)) {
            entryCount.decrementAndGet();
          }
        });
  }

  private record AttemptWindow(long startedAtNanos, int attempts) {}
}
