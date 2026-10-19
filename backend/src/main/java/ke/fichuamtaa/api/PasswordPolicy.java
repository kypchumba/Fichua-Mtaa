package ke.fichuamtaa.api;

import java.util.regex.Pattern;

// Shared by registration validation and the environment-driven administrator bootstrap.
final class PasswordPolicy {
  static final int MIN_LENGTH = 8;
  static final int MAX_LENGTH = 72;
  static final String REGEX =
      "(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[^A-Za-z0-9\\s])(?=\\S+$).+";

  private static final Pattern REQUIREMENTS = Pattern.compile(REGEX);

  private PasswordPolicy() {}

  static boolean meetsRequirements(String value) {
    return value != null
        && value.length() >= MIN_LENGTH
        && value.length() <= MAX_LENGTH
        && REQUIREMENTS.matcher(value).matches();
  }
}
