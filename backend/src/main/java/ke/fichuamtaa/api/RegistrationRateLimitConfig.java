package ke.fichuamtaa.api;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
class RegistrationRateLimitConfig {
  @Bean
  RegistrationRateLimiter registrationRateLimiter(
      @Value("${registration.rate-limit.maximum-attempts:5}") int maximumAttempts,
      @Value("${registration.rate-limit.window:15m}") Duration window,
      @Value("${registration.rate-limit.maximum-entries:10000}") int maximumEntries) {
    return new RegistrationRateLimiter(maximumAttempts, window, maximumEntries);
  }

  @Bean
  TrustedProxyClientIpResolver trustedProxyClientIpResolver(
      @Value("${security.trusted-proxy-cidrs:}") String trustedProxyCidrs) {
    return new TrustedProxyClientIpResolver(trustedProxyCidrs);
  }

}
