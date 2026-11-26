package in.rajan.nexgate.management.service;

import java.net.Inet4Address;
import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Blocks route targets that point at internal infrastructure (SSRF protection).
 * A target is accepted only if its host is explicitly allow-listed, or every
 * address it resolves to is a public address.
 */
public class UpstreamTargetGuard {

    private final Set<String> allowedInternalHosts;

    public UpstreamTargetGuard(String allowedInternalHostsCsv) {
        this.allowedInternalHosts = allowedInternalHostsCsv == null || allowedInternalHostsCsv.isBlank()
                ? Set.of()
                : Arrays.stream(allowedInternalHostsCsv.split(","))
                        .map(s -> s.trim().toLowerCase(Locale.ROOT))
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toUnmodifiableSet());
    }

    /** @return null if the target is acceptable, otherwise a human-readable rejection reason. */
    public String check(URI uri) {
        if (uri.getRawUserInfo() != null) {
            return "Target URI must not contain credentials";
        }
        String host = uri.getHost().toLowerCase(Locale.ROOT);
        if (allowedInternalHosts.contains(host)) {
            return null;
        }
        InetAddress[] addresses;
        try {
            addresses = InetAddress.getAllByName(host);
        } catch (UnknownHostException ex) {
            return "Target host cannot be resolved: " + host;
        }
        for (InetAddress address : addresses) {
            if (isInternal(address)) {
                return "Target host resolves to a private or internal address and is not allowed";
            }
        }
        return null;
    }

    static boolean isInternal(InetAddress a) {
        if (a.isAnyLocalAddress() || a.isLoopbackAddress() || a.isLinkLocalAddress()
                || a.isSiteLocalAddress() || a.isMulticastAddress()) {
            return true;
        }
        byte[] b = a.getAddress();
        if (a instanceof Inet4Address) {
            int first = b[0] & 0xff;
            int second = b[1] & 0xff;
            return first == 0                                   // 0.0.0.0/8
                    || (first == 100 && second >= 64 && second <= 127)   // 100.64.0.0/10 (CGNAT)
                    || (first == 198 && (second == 18 || second == 19))  // 198.18.0.0/15 (benchmarking)
                    || first >= 240;                            // reserved / broadcast
        }
        if (a instanceof Inet6Address) {
            return (b[0] & 0xfe) == 0xfc;                       // fc00::/7 unique local
        }
        return false;
    }
}
