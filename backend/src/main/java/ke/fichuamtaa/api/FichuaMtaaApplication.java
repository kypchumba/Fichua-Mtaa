package ke.fichuamtaa.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@org.springframework.scheduling.annotation.EnableScheduling
public class FichuaMtaaApplication {
  public static void main(String[] args) {
    SpringApplication.run(FichuaMtaaApplication.class, args);
  }
}
