/**
 * In-memory sliding-window rate limiter for sensitive authentication endpoints.
 * Protects against credential stuffing and brute-force attacks without adding extra external dependencies.
 */

const ipRequests = new Map();

// Periodic cleanup every 10 minutes to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of ipRequests.entries()) {
        if (now > data.resetTime) {
            ipRequests.delete(ip);
        }
    }
}, 10 * 60 * 1000);

const authRateLimiter = (maxRequests = 30, windowMinutes = 15) => {
    const windowMs = windowMinutes * 60 * 1000;

    return (req, res, next) => {
        // Skip in testing environments if specified
        if (process.env.NODE_ENV === "test") {
            return next();
        }

        const clientIp = (
            req.headers["x-forwarded-for"] ||
            req.socket.remoteAddress ||
            req.ip ||
            "unknown"
        ).toString().split(",")[0].trim();

        const now = Date.now();
        const clientData = ipRequests.get(clientIp);

        if (!clientData || now > clientData.resetTime) {
            ipRequests.set(clientIp, {
                count: 1,
                resetTime: now + windowMs
            });
            res.setHeader("X-RateLimit-Limit", maxRequests);
            res.setHeader("X-RateLimit-Remaining", maxRequests - 1);
            return next();
        }

        if (clientData.count >= maxRequests) {
            const retryAfterSeconds = Math.ceil((clientData.resetTime - now) / 1000);
            res.setHeader("Retry-After", retryAfterSeconds);
            res.setHeader("X-RateLimit-Limit", maxRequests);
            res.setHeader("X-RateLimit-Remaining", 0);

            return res.status(429).json({
                success: false,
                message: `Too many requests from this IP. Please try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`
            });
        }

        clientData.count += 1;
        res.setHeader("X-RateLimit-Limit", maxRequests);
        res.setHeader("X-RateLimit-Remaining", maxRequests - clientData.count);
        next();
    };
};

module.exports = { authRateLimiter };

