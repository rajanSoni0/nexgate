package in.rajan.nexgate.management.service;

import in.rajan.nexgate.management.dto.requestDto.LoginRequest;
import in.rajan.nexgate.management.dto.responseDto.LoginResponse;
import in.rajan.nexgate.management.repository.ManagementUserRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.transaction.annotation.Transactional;


public class AuthenticationService {
    private final ManagementUserRepository managementUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final long expirationSeconds;

    public AuthenticationService(ManagementUserRepository managementUserRepository,
                                 PasswordEncoder passwordEncoder,
                                 JwtEncoder jwtEncoder,
                                 @Value("${security.jwt.expiration-seconds}") long expirationSeconds) {
        this.managementUserRepository = managementUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder;
        this.expirationSeconds = expirationSeconds;
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest resquest) {
        return null;
    }
}
