package com.thecatalyst.dms.config;

import com.thecatalyst.dms.security.JwtAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;

/**
 * SECURITY NOTE:
 * - Session policy is STATELESS - auth is JWT bearer-token only, no server
 *   session, no auth cookie. Because the token travels in an Authorization
 *   header (not a cookie the browser attaches automatically), classic CSRF
 *   does not apply to these endpoints, so CSRF protection is disabled here
 *   deliberately (not by oversight) - see comment on .csrf() below.
 * - BCrypt strength 12 for password hashing (OWASP-recommended minimum
 *   work factor as of 2024+; adjust upward as hardware improves).
 * - Every route except /api/auth/** requires authentication by default
 *   (default-deny). Fine-grained role checks are then layered on top with
 *   @PreAuthorize at the controller/service method level.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final SecurityHeadersFilter securityHeadersFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter, SecurityHeadersFilter securityHeadersFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.securityHeadersFilter = securityHeadersFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Stateless JWT bearer auth -> CSRF token protection is not
            // applicable (see class-level note). If a cookie-based auth
            // mode is ever added, CSRF protection MUST be re-enabled.
            .csrf(csrf -> csrf.disable())
            .cors(cors -> {}) // configured in CorsConfig
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .headers(headers -> headers
                .frameOptions(frame -> frame.deny())
                .contentTypeOptions(contentTypeOptions -> {})
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(new AntPathRequestMatcher("/api/auth/register", "POST")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/api/auth/login", "POST")).permitAll()
                .requestMatchers(new AntPathRequestMatcher("/actuator/health", "GET")).permitAll()
                .anyRequest().authenticated() // default-deny for everything else
            )
            .addFilterBefore(securityHeadersFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
