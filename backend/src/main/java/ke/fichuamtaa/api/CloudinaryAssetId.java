package ke.fichuamtaa.api;

import java.net.URI;
import java.util.UUID;
import java.util.regex.Pattern;

// Only application-generated, untransformed Cloudinary URLs are eligible for deletion.
final class CloudinaryAssetId {
  private static final Pattern VERSION = Pattern.compile("v[0-9]+");

  private CloudinaryAssetId() {}

  static String fromOwnedUploadUrl(String value, String cloudName) {
    if (value == null || cloudName == null || cloudName.isBlank()) return null;
    try {
      URI uri = URI.create(value);
      if (!"https".equalsIgnoreCase(uri.getScheme())
          || !"res.cloudinary.com".equalsIgnoreCase(uri.getHost())
          || uri.getPort() != -1
          || uri.getUserInfo() != null
          || uri.getQuery() != null
          || uri.getFragment() != null) return null;

      String[] parts = uri.getPath().split("/");
      if (parts.length < 6
          || !cloudName.equals(parts[1])
          || !"image".equals(parts[2])
          || !"upload".equals(parts[3])) return null;

      int assetPart = 4;
      if (VERSION.matcher(parts[assetPart]).matches()) assetPart++;
      if (parts.length != assetPart + 2 || !"fichua-mtaa".equals(parts[assetPart])) return null;

      String filename = parts[assetPart + 1];
      int extension = filename.lastIndexOf('.');
      if (extension < 0) return null;
      String format = filename.substring(extension + 1).toLowerCase(java.util.Locale.ROOT);
      if (!SetFormats.SUPPORTED.contains(format)) return null;

      UUID id = UUID.fromString(filename.substring(0, extension));
      return "fichua-mtaa/" + id;
    } catch (IllegalArgumentException ignored) {
      return null;
    }
  }

  private static final class SetFormats {
    private static final java.util.Set<String> SUPPORTED = java.util.Set.of("jpg", "jpeg", "png", "webp");
  }
}
