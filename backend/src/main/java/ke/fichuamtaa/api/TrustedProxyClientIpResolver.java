package ke.fichuamtaa.api;

import jakarta.servlet.http.HttpServletRequest;
import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.List;

/** Uses forwarding headers only when the socket peer matches an explicitly trusted CIDR. */
final class TrustedProxyClientIpResolver {
  private static final int MAX_FORWARDED_HEADER_LENGTH = 2048;
  private static final int MAX_FORWARDED_HOPS = 16;

  private final List<CidrBlock> trustedProxies;

  TrustedProxyClientIpResolver(String trustedProxyCidrs) {
    this.trustedProxies = parseTrustedProxies(trustedProxyCidrs);
  }

  String resolve(HttpServletRequest request) {
    String remoteAddress = request.getRemoteAddr();
    InetAddress peer = parseAddress(remoteAddress);
    if (peer == null || !isTrusted(peer)) return remoteAddress;

    String forwardedFor = request.getHeader("X-Forwarded-For");
    if (forwardedFor == null || forwardedFor.isBlank()) return remoteAddress;
    if (forwardedFor.length() > MAX_FORWARDED_HEADER_LENGTH) return remoteAddress;

    String[] chain = forwardedFor.split(",");
    if (chain.length > MAX_FORWARDED_HOPS) return remoteAddress;

    for (int index = chain.length - 1; index >= 0; index--) {
      String candidate = chain[index].trim();
      InetAddress address = parseAddress(candidate);
      if (address == null) return remoteAddress;
      if (!isTrusted(address)) return address.getHostAddress();
    }

    return remoteAddress;
  }

  private boolean isTrusted(InetAddress address) {
    return trustedProxies.stream().anyMatch(cidr -> cidr.contains(address));
  }

  private static List<CidrBlock> parseTrustedProxies(String configuredCidrs) {
    List<CidrBlock> ranges = new ArrayList<>();
    if (configuredCidrs == null || configuredCidrs.isBlank()) return List.of();

    for (String configured : configuredCidrs.split(",")) {
      String value = configured.trim();
      if (!value.isEmpty()) ranges.add(CidrBlock.parse(value));
    }

    return List.copyOf(ranges);
  }

  private static InetAddress parseAddress(String value) {
    if (value == null || !value.matches("[0-9a-fA-F:.]+")) return null;
    try {
      return InetAddress.getByName(value);
    } catch (UnknownHostException ignored) {
      return null;
    }
  }

  private record CidrBlock(byte[] network, int prefixLength) {
    static CidrBlock parse(String value) {
      String[] parts = value.split("/", -1);
      if (parts.length > 2) throw new IllegalArgumentException("Invalid trusted proxy CIDR");

      InetAddress address = parseAddress(parts[0]);
      if (address == null) throw new IllegalArgumentException("Invalid trusted proxy CIDR");

      byte[] bytes = address.getAddress();
      int maximumPrefix = bytes.length * 8;
      int prefix = parts.length == 1 ? maximumPrefix : Integer.parseInt(parts[1]);
      if (prefix < 0 || prefix > maximumPrefix) {
        throw new IllegalArgumentException("Invalid trusted proxy CIDR prefix");
      }

      return new CidrBlock(bytes, prefix);
    }

    boolean contains(InetAddress address) {
      byte[] candidate = address.getAddress();
      if (candidate.length != network.length) return false;

      int fullBytes = prefixLength / 8;
      int remainingBits = prefixLength % 8;
      for (int index = 0; index < fullBytes; index++) {
        if (candidate[index] != network[index]) return false;
      }
      if (remainingBits == 0) return true;

      int mask = 0xff << (8 - remainingBits);
      return (candidate[fullBytes] & mask) == (network[fullBytes] & mask);
    }
  }
}
