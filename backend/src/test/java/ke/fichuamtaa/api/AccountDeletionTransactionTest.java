package ke.fichuamtaa.api;

import static org.junit.jupiter.api.Assertions.*;

import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.annotation.Propagation;

class AccountDeletionTransactionTest {
  private final AnnotationTransactionAttributeSource attributes =
      new AnnotationTransactionAttributeSource();

  @Test
  void accountDeletionOverridesTheReadOnlyControllerTransaction() throws Exception {
    Method endpoint = ApiController.class.getDeclaredMethod(
        "deleteAccount",
        ApiController.DeleteAccount.class,
        org.springframework.security.core.Authentication.class);

    var transaction = attributes.getTransactionAttribute(endpoint, ApiController.class);

    assertNotNull(transaction);
    assertFalse(transaction.isReadOnly());
    assertEquals(Propagation.REQUIRED.value(), transaction.getPropagationBehavior());
  }

  @Test
  void cleanupOutboxAndAccountChangesUseTheSameWritableRequiredTransaction() throws Exception {
    Method serviceMethod = AccountDeletionService.class.getDeclaredMethod(
        "deleteCurrentAccount", String.class, String.class, String.class);

    var transaction = attributes.getTransactionAttribute(serviceMethod, AccountDeletionService.class);

    assertNotNull(transaction);
    assertFalse(transaction.isReadOnly());
    assertEquals(Propagation.REQUIRED.value(), transaction.getPropagationBehavior());
  }
}
