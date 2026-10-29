package com.cleiton.kanban.security;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private static final long WINDOW_MILLIS = Duration.ofMinutes(15).toMillis();
    private static final int MAX_LOGIN_FAILURES = 10;
    private static final int MAX_REGISTRATION_ATTEMPTS = 5;

    private final ConcurrentHashMap<String, AttemptWindow> attempts = new ConcurrentHashMap<>();
    private final AtomicLong requestCounter = new AtomicLong();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        if (requestCounter.incrementAndGet() % 256 == 0) {
            long now = System.currentTimeMillis();
            attempts.entrySet().removeIf(entry -> now - entry.getValue().startedAt >= WINDOW_MILLIS);
        }

        String path = request.getRequestURI();
        boolean login = "POST".equalsIgnoreCase(request.getMethod()) && "/login".equals(path);
        boolean registration = "POST".equalsIgnoreCase(request.getMethod())
                && "/api/auth/register".equals(path);

        if (!login && !registration) {
            filterChain.doFilter(request, response);
            return;
        }

        String key = (login ? "login:" : "register:") + request.getRemoteAddr();

        if (isBlocked(key, login ? MAX_LOGIN_FAILURES : MAX_REGISTRATION_ATTEMPTS)) {
            response.setStatus(429);
            response.setHeader("Retry-After", "900");
            response.setHeader("Cache-Control", "no-store");
            response.setContentType("text/plain;charset=UTF-8");
            response.getWriter().write("Muitas tentativas. Aguarde 15 minutos e tente novamente.");
            return;
        }

        if (registration) {
            recordAttempt(key);
            filterChain.doFilter(request, response);
            return;
        }

        filterChain.doFilter(request, response);

        String location = response.getHeader("Location");
        if (response.getStatus() == HttpServletResponse.SC_FOUND
                && location != null && location.contains("login.html?error")) {
            recordAttempt(key);
        } else if (response.getStatus() == HttpServletResponse.SC_FOUND
                && location != null && !location.contains("login.html?error")) {
            attempts.remove(key);
        }
    }

    private boolean isBlocked(String key, int limit) {
        AttemptWindow window = attempts.get(key);
        if (window == null) return false;
        synchronized (window) {
            if (System.currentTimeMillis() - window.startedAt >= WINDOW_MILLIS) {
                attempts.remove(key, window);
                return false;
            }
            return window.count >= limit;
        }
    }

    private void recordAttempt(String key) {
        long now = System.currentTimeMillis();
        attempts.compute(key, (ignored, existing) -> {
            if (existing == null || now - existing.startedAt >= WINDOW_MILLIS) {
                return new AttemptWindow(now, 1);
            }
            synchronized (existing) {
                existing.count++;
                return existing;
            }
        });
    }

    private static final class AttemptWindow {
        private final long startedAt;
        private int count;

        private AttemptWindow(long startedAt, int count) {
            this.startedAt = startedAt;
            this.count = count;
        }
    }
}
