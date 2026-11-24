package in.rajan.nexgate.gateway.proxy;

import java.util.List;
import java.util.Map;

public record ProxyResult(int status, byte[] body, Map<String, List<String>> headers) {}
