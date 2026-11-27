package br.ueg.trindade.braully_web2_fullstack.service;

import java.io.IOException;
import java.math.BigInteger;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.AlgorithmParameters;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.SecureRandom;
import java.security.Signature;
import java.security.interfaces.ECPrivateKey;
import java.security.interfaces.ECPublicKey;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPoint;
import java.security.spec.ECPrivateKeySpec;
import java.security.spec.ECPublicKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.Properties;
import java.util.function.Consumer;
import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class WebPushService {
    private static final Logger log = LoggerFactory.getLogger(WebPushService.class);
    private static final Base64.Encoder B64_URL = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder B64_URL_DEC = Base64.getUrlDecoder();
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final byte[] INFO_PREFIX = "WebPush: info\0".getBytes(StandardCharsets.UTF_8);
    private static final byte[] CEK_INFO = "Content-Encoding: aes128gcm\0\1".getBytes(StandardCharsets.UTF_8);
    private static final byte[] NONCE_INFO = "Content-Encoding: nonce\0\1".getBytes(StandardCharsets.UTF_8);

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build();

    @Value("${app.vapid.public-key:}")
    private String propPub;
    @Value("${app.vapid.private-key:}")
    private String propPriv;
    @Value("${app.vapid.subject:mailto:contato@soldadodocorte.local}")
    private String subject;
    @Value("${app.vapid.arquivo:./dados/vapid.properties}")
    private String arquivoPath;
    @Value("${app.vapid.allow-loopback-http:false}")
    private boolean allowLoopbackHttp;
    @Value("${spring.datasource.url:}")
    private String dbUrl;

    private ECParameterSpec ecSpec;
    private ECPublicKey publicKey;
    private ECPrivateKey privateKey;
    private String publicKeyB64;

    @PostConstruct
    void inicializar() {
        try {
            var params = AlgorithmParameters.getInstance("EC");
            params.init(new ECGenParameterSpec("secp256r1"));
            ecSpec = params.getParameterSpec(ECParameterSpec.class);

            if (!propPub.isBlank() && !propPriv.isBlank()) {
                carregarChaves(propPub.trim(), propPriv.trim());
                return;
            }
            if (dbUrl.startsWith("jdbc:h2:mem:")) {
                gerarEmMemoria();
                return;
            }
            Path caminho = Path.of(arquivoPath);
            if (Files.isRegularFile(caminho)) {
                var props = new Properties();
                try (var in = Files.newInputStream(caminho)) {
                    props.load(in);
                }
                String pub = props.getProperty("publicKey", "").trim();
                String priv = props.getProperty("privateKey", "").trim();
                if (!pub.isBlank() && !priv.isBlank()) {
                    carregarChaves(pub, priv);
                    return;
                }
            }
            gerarEmMemoria();
            if (caminho.getParent() != null) Files.createDirectories(caminho.getParent());
            var props = new Properties();
            props.setProperty("publicKey", publicKeyB64);
            props.setProperty("privateKey", B64_URL.encodeToString(unsigned32(privateKey.getS())));
            try (var out = Files.newOutputStream(caminho)) {
                props.store(out, "VAPID P-256 credentials (generated automatically outside source control)");
            }
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao inicializar chaves VAPID para Web Push.", e);
        }
    }

    private void gerarEmMemoria() throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(new ECGenParameterSpec("secp256r1"), RANDOM);
        KeyPair kp = kpg.generateKeyPair();
        this.publicKey = (ECPublicKey) kp.getPublic();
        this.privateKey = (ECPrivateKey) kp.getPrivate();
        this.publicKeyB64 = B64_URL.encodeToString(codificarPontoNaoComprimido(this.publicKey));
    }

    private void carregarChaves(String pubB64, String privB64) throws Exception {
        byte[] pubBytes = decodificarB64(pubB64);
        byte[] privBytes = decodificarB64(privB64);
        if (privBytes.length != 32) {
            throw new IllegalArgumentException("Chave privada VAPID inválida.");
        }
        BigInteger s = new BigInteger(1, privBytes);
        if (s.signum() <= 0 || s.compareTo(ecSpec.getOrder()) >= 0) {
            throw new IllegalArgumentException("Escalar privado VAPID fora do intervalo P-256.");
        }
        this.publicKey = decodificarPontoNaoComprimido(pubBytes);
        var kf = KeyFactory.getInstance("EC");
        this.privateKey = (ECPrivateKey) kf.generatePrivate(new ECPrivateKeySpec(s, ecSpec));
        this.publicKeyB64 = B64_URL.encodeToString(codificarPontoNaoComprimido(this.publicKey));
    }

    public String chavePublica() {
        return publicKeyB64;
    }

    public URI validarEndpoint(String endpoint) {
        if (endpoint == null || endpoint.isBlank() || endpoint.length() > 600) {
            throw Regra.invalida("Endpoint de Web Push inválido.");
        }
        URI uri;
        try {
            uri = URI.create(endpoint.trim());
        } catch (IllegalArgumentException e) {
            throw Regra.invalida("Endpoint de Web Push inválido.");
        }
        if (uri.getUserInfo() != null || uri.getFragment() != null) {
            throw Regra.invalida("Endpoint de Web Push inválido.");
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(java.util.Locale.ROOT);
        String rawHost = uri.getHost() == null ? "" : uri.getHost().toLowerCase(java.util.Locale.ROOT);
        String host = rawHost.startsWith("[") && rawHost.endsWith("]") ? rawHost.substring(1, rawHost.length() - 1) : rawHost;
        if (host.isBlank() || uri.getAuthority() == null) {
            throw Regra.invalida("Endpoint de Web Push inválido.");
        }
        boolean loopbackHost = host.equals("localhost") || host.equals("127.0.0.1");
        if ("http".equals(scheme)) {
            if (!allowLoopbackHttp || !loopbackHost) throw Regra.invalida("Endpoint de Web Push inválido.");
            return uri;
        }
        if (!"https".equals(scheme)) {
            throw Regra.invalida("Endpoint de Web Push inválido.");
        }
        if (loopbackHost || host.equals("::1") || host.endsWith(".local") || host.endsWith(".internal")) {
            throw Regra.invalida("Endpoint de Web Push inválido.");
        }
        try {
            InetAddress[] addrs = InetAddress.getAllByName(host);
            if (addrs.length == 0) throw Regra.invalida("Endpoint de Web Push inválido.");
            for (InetAddress addr : addrs) {
                if (!ehEnderecoPublicoSeguro(addr)) {
                    throw Regra.invalida("Endpoint de Web Push inválido.");
                }
            }
        } catch (UnknownHostException e) {
            throw Regra.invalida("Endpoint de Web Push inválido.");
        }
        return uri;
    }

    public void validarChavesInscricao(String p256dh, String auth) {
        try {
            byte[] pub = decodificarB64(p256dh);
            byte[] sec = decodificarB64(auth);
            if (pub.length != 65 || pub[0] != 0x04 || sec.length != 16) {
                throw Regra.invalida("Chaves da inscrição Web Push inválidas.");
            }
            decodificarPontoNaoComprimido(pub);
        } catch (IllegalArgumentException e) {
            throw Regra.invalida("Chaves da inscrição Web Push inválidas.");
        } catch (Exception e) {
            throw Regra.invalida("Chaves da inscrição Web Push inválidas.");
        }
    }

    public void enviar(String endpoint, String p256dh, String auth, String jsonPayload, Consumer<String> aoExpirar) {
        try {
            URI uri = validarEndpoint(endpoint);
            byte[] corpo = criptografarAes128Gcm(decodificarB64(p256dh), decodificarB64(auth), jsonPayload.getBytes(StandardCharsets.UTF_8));
            String jwt = assinarVapid(uri);
            HttpRequest req = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofSeconds(10))
                    .header("Content-Type", "application/octet-stream")
                    .header("Content-Encoding", "aes128gcm")
                    .header("TTL", "86400")
                    .header("Urgency", "normal")
                    .header("Authorization", "vapid t=" + jwt + ", k=" + publicKeyB64)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(corpo))
                    .build();
            http.sendAsync(req, HttpResponse.BodyHandlers.discarding())
                    .thenAccept(res -> {
                        int sc = res.statusCode();
                        if (sc == 404 || sc == 410) {
                            aoExpirar.accept(endpoint);
                        } else if (sc >= 400) {
                            log.debug("Web Push retornou status {} para {}", sc, uri.getHost());
                        }
                    })
                    .exceptionally(ex -> {
                        log.debug("Falha ao entregar Web Push para {}: {}", uri.getHost(), ex.getMessage());
                        return null;
                    });
        } catch (Exception e) {
            log.debug("Erro ao preparar Web Push: {}", e.getMessage());
        }
    }

    private String assinarVapid(URI uri) throws Exception {
        int port = uri.getPort();
        boolean defaultPort = port == -1
                || ("https".equalsIgnoreCase(uri.getScheme()) && port == 443)
                || ("http".equalsIgnoreCase(uri.getScheme()) && port == 80);
        String aud = uri.getScheme().toLowerCase(java.util.Locale.ROOT) + "://"
                + uri.getHost().toLowerCase(java.util.Locale.ROOT) + (defaultPort ? "" : ":" + port);
        long exp = Instant.now().getEpochSecond() + 43200;
        String header = B64_URL.encodeToString("{\"typ\":\"JWT\",\"alg\":\"ES256\"}".getBytes(StandardCharsets.UTF_8));
        String payloadJson = "{\"aud\":\"" + aud.replace("\"", "") + "\",\"exp\":" + exp + ",\"sub\":\"" + subject.replace("\"", "") + "\"}";
        String payload = B64_URL.encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));
        String signingInput = header + "." + payload;

        Signature sig = Signature.getInstance("SHA256withECDSAinP1363Format");
        sig.initSign(privateKey);
        sig.update(signingInput.getBytes(StandardCharsets.US_ASCII));
        byte[] assinatura = sig.sign();
        return signingInput + "." + B64_URL.encodeToString(assinatura);
    }

    private byte[] criptografarAes128Gcm(byte[] uaPublic, byte[] authSecret, byte[] plaintext) throws Exception {
        ECPublicKey uaPubKey = decodificarPontoNaoComprimido(uaPublic);

        KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
        kpg.initialize(ecSpec, RANDOM);
        KeyPair asKp = kpg.generateKeyPair();
        ECPublicKey asPubKey = (ECPublicKey) asKp.getPublic();
        byte[] asPublic = codificarPontoNaoComprimido(asPubKey);

        KeyAgreement ka = KeyAgreement.getInstance("ECDH");
        ka.init(asKp.getPrivate());
        ka.doPhase(uaPubKey, true);
        byte[] ecdhSecret = ka.generateSecret();

        byte[] salt = new byte[16];
        RANDOM.nextBytes(salt);

        byte[] prkKey = hmacSha256(authSecret, ecdhSecret);
        byte[] keyInfo = ByteBuffer.allocate(INFO_PREFIX.length + uaPublic.length + asPublic.length + 1)
                .put(INFO_PREFIX).put(uaPublic).put(asPublic).put((byte) 1).array();
        byte[] ikm = hmacSha256(prkKey, keyInfo);
        byte[] prk = hmacSha256(salt, ikm);

        byte[] cek = Arrays.copyOf(hmacSha256(prk, CEK_INFO), 16);
        byte[] nonce = Arrays.copyOf(hmacSha256(prk, NONCE_INFO), 12);

        byte[] padded = Arrays.copyOf(plaintext, plaintext.length + 1);
        padded[plaintext.length] = 2;

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(cek, "AES"), new GCMParameterSpec(128, nonce));
        byte[] ciphertext = cipher.doFinal(padded);

        return ByteBuffer.allocate(16 + 4 + 1 + asPublic.length + ciphertext.length)
                .put(salt)
                .putInt(4096)
                .put((byte) asPublic.length)
                .put(asPublic)
                .put(ciphertext)
                .array();
    }

    private static byte[] hmacSha256(byte[] key, byte[] data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return mac.doFinal(data);
    }

    private ECPublicKey decodificarPontoNaoComprimido(byte[] bytes) throws Exception {
        if (bytes.length != 65 || bytes[0] != 0x04) throw new IllegalArgumentException("Ponto P-256 inválido");
        BigInteger x = new BigInteger(1, Arrays.copyOfRange(bytes, 1, 33));
        BigInteger y = new BigInteger(1, Arrays.copyOfRange(bytes, 33, 65));
        return (ECPublicKey) KeyFactory.getInstance("EC").generatePublic(new ECPublicKeySpec(new ECPoint(x, y), ecSpec));
    }

    private static byte[] codificarPontoNaoComprimido(ECPublicKey key) {
        ECPoint w = key.getW();
        byte[] out = new byte[65];
        out[0] = 0x04;
        System.arraycopy(unsigned32(w.getAffineX()), 0, out, 1, 32);
        System.arraycopy(unsigned32(w.getAffineY()), 0, out, 33, 32);
        return out;
    }

    private static byte[] unsigned32(BigInteger value) {
        byte[] raw = value.toByteArray();
        byte[] out = new byte[32];
        int copyLen = Math.min(raw.length, 32);
        System.arraycopy(raw, raw.length - copyLen, out, 32 - copyLen, copyLen);
        return out;
    }

    private static byte[] decodificarB64(String raw) {
        String s = raw.trim().replace('+', '-').replace('/', '_').replace("=", "");
        return B64_URL_DEC.decode(s);
    }

    private static boolean ehEnderecoPublicoSeguro(InetAddress addr) {
        if (addr.isAnyLocalAddress() || addr.isLoopbackAddress() || addr.isLinkLocalAddress()
                || addr.isSiteLocalAddress() || addr.isMulticastAddress()) {
            return false;
        }
        byte[] b = addr.getAddress();
        if (b.length == 4) {
            return ehIpv4Publico(b);
        }
        if (b.length == 16) {
            if ((b[0] & 0xfe) == 0xfc) return false;
            boolean ipv4Mapeado = true;
            for (int i = 0; i < 10; i++) {
                if (b[i] != 0) { ipv4Mapeado = false; break; }
            }
            if (ipv4Mapeado && b[10] == (byte) 0xff && b[11] == (byte) 0xff) {
                return ehIpv4Publico(Arrays.copyOfRange(b, 12, 16));
            }
            return true;
        }
        return false;
    }

    private static boolean ehIpv4Publico(byte[] b) {
        int b0 = b[0] & 0xff;
        int b1 = b[1] & 0xff;
        if (b0 == 0 || b0 == 10 || b0 == 127) return false;
        if (b0 == 172 && (b1 & 0xf0) == 16) return false;
        if (b0 == 192 && b1 == 168) return false;
        if (b0 == 169 && b1 == 254) return false;
        if (b0 == 100 && (b1 & 0xc0) == 64) return false;
        return true;
    }
}
