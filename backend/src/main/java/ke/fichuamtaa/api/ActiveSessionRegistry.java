package ke.fichuamtaa.api;

import jakarta.servlet.http.HttpSession;
import jakarta.servlet.http.HttpSessionEvent;
import jakarta.servlet.http.HttpSessionListener;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

// Tracks sessions in this process so account deletion can revoke them immediately.
@Component
class ActiveSessionRegistry implements HttpSessionListener {
  private final ConcurrentHashMap<Long, Set<String>> sessionsByUser = new ConcurrentHashMap<>();
  private final ConcurrentHashMap<String, Long> usersBySession = new ConcurrentHashMap<>();
  private final ConcurrentHashMap<String, HttpSession> sessions = new ConcurrentHashMap<>();

  void register(Long userId, HttpSession session) {
    unregister(session.getId());
    sessionsByUser.computeIfAbsent(userId, ignored -> ConcurrentHashMap.newKeySet())
        .add(session.getId());
    usersBySession.put(session.getId(), userId);
    sessions.put(session.getId(), session);
  }

  void unregister(String sessionId) {
    Long userId = usersBySession.remove(sessionId);
    sessions.remove(sessionId);
    if (userId == null) return;
    Set<String> ids = sessionsByUser.get(userId);
    if (ids != null) {
      ids.remove(sessionId);
      if (ids.isEmpty()) sessionsByUser.remove(userId, ids);
    }
  }

  void invalidateUser(Long userId) {
    Set<String> ids = sessionsByUser.remove(userId);
    if (ids == null) return;
    for (String sessionId : ids) {
      HttpSession session = sessions.remove(sessionId);
      usersBySession.remove(sessionId);
      if (session != null) {
        try {
          session.invalidate();
        } catch (IllegalStateException ignored) {
          // A concurrent logout or timeout already invalidated this session.
        }
      }
    }
  }

  @Override
  public void sessionDestroyed(HttpSessionEvent event) {
    unregister(event.getSession().getId());
  }
}
