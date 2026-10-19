package ke.fichuamtaa.api;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

@Configuration
class StartupConfig {
  // Creates the first admin only when both deployment secrets are explicitly supplied.
  @Bean
  CommandLineRunner createInitialAdmin(
      UserRepository users,
      org.springframework.security.crypto.password.PasswordEncoder encoder,
      Environment env) {
    return args -> {
      String email = env.getProperty("app.admin.email", "").trim();
      String password = env.getProperty("app.admin.password", "");
      if (email.isBlank() || password.isBlank()) return;
      String normalized = email.toLowerCase(java.util.Locale.ROOT);
      var existing = users.findByEmailIgnoreCase(normalized);
      if (existing.isPresent()) {
        AppUser admin = existing.get();
        if (admin.role != Role.ADMIN)
          throw new IllegalStateException("ADMIN_EMAIL is already registered as a citizen");
        return;
      }
      if (password.length() < 16 || !PasswordPolicy.meetsRequirements(password))
        throw new IllegalStateException(
            "ADMIN_PASSWORD must be at least 16 characters and meet the password requirements");
      users.save(
          new AppUser("System Administrator", normalized, encoder.encode(password), Role.ADMIN));
    };
  }
}
