package in.rajan.nexgate.management.dto.responseDto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginResponse {
    private String token;
    private String tokenType;
    private Long expiresInSeconds;
    private String role;
    private Long organizationId;
}
