package com.property.service;

import com.property.common.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.Iterator;
import java.util.Map;
import java.util.Random;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 图形验证码服务
 *
 * <p>用 JDK 自带的 AWT 直接生成 PNG, 不引入验证码中间件, 也无需前端依赖 ——
 * 图片以 base64 内联返回, 前端一个 {@code <img>} 即可显示。
 *
 * <p>安全要点:
 * <ul>
 *   <li>答案只存在服务端内存, 且 <b>一次性消费</b>(校验后立即删除), 防止重放;</li>
 *   <li>默认 5 分钟过期, 定时清理, 不会无限堆积;</li>
 *   <li>去掉了 0/O、1/I/l 等易混淆字符, 降低正常用户输错率;</li>
 *   <li>{@code security.captcha.echo-answer=local} 时仅对<b>回环地址</b>回显答案,
 *       供本机自动化测试完成「取图 → 提交」两步握手; 远程调用永远拿不到答案。</li>
 * </ul>
 */
@Slf4j
@Service
public class CaptchaService {

    /** 验证码字符集(剔除易混淆字符) */
    private static final char[] CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ".toCharArray();

    private static final int WIDTH = 132;
    private static final int HEIGHT = 44;
    private static final int CODE_LEN = 4;

    @Value("${security.captcha.ttl-seconds:300}")
    private long ttlSeconds;

    /** 答案回显策略: false 不回显 / local 仅回环地址回显(默认) / true 总是回显(仅限开发) */
    @Value("${security.captcha.echo-answer:local}")
    private String echoAnswer;

    /** captchaId -> 答案与过期时间 */
    private final Map<String, Item> STORE = new ConcurrentHashMap<>();

    private final Random random = new Random();

    /** 启动时把验证码策略说清楚, 避免"以为开了其实没开"或"线上还回显答案" */
    @jakarta.annotation.PostConstruct
    public void reportMode() {
        String mode = echoMode();
        log.info("图形验证码: 有效期 {} 秒, 答案回显策略 = {}", ttlSeconds, mode);
        if ("true".equals(mode)) {
            log.warn("⚠️ security.captcha.echo-answer=true 会把验证码答案返回给调用方, 仅可用于本地排障, 上线前必须改为 false");
        } else if ("local".equals(mode)) {
            log.info("答案仅对 127.0.0.1/::1 回显(供本机自动化测试), 远程调用不会拿到答案");
        }
    }

    /** 校验码载体 */
    private record Item(String code, long expireAt) {
    }

    /** 生成结果: 直接给 Controller 用 */
    public record Captcha(String captchaId, String code, String imageBase64, long expireSeconds) {
    }

    /** 生成一张新验证码 */
    public Captcha generate() {
        String code = randomCode();
        String captchaId = UUID.randomUUID().toString().replace("-", "");
        STORE.put(captchaId, new Item(code, System.currentTimeMillis() + ttlSeconds * 1000L));
        return new Captcha(captchaId, code, draw(code), ttlSeconds);
    }

    /**
     * 校验验证码 —— 成功或失败都会把该 captchaId 作废(一次性)。
     *
     * @throws BusinessException 验证码为空 / 已过期 / 不正确
     */
    public void verify(String captchaId, String input) {
        if (captchaId == null || captchaId.isEmpty()) {
            throw new BusinessException("请先获取验证码");
        }
        Item item = STORE.remove(captchaId);
        if (item == null) {
            throw new BusinessException("验证码已失效, 请点击图片刷新");
        }
        if (item.expireAt() < System.currentTimeMillis()) {
            throw new BusinessException("验证码已过期, 请点击图片刷新");
        }
        if (input == null || input.trim().isEmpty()) {
            throw new BusinessException("请输入验证码");
        }
        if (!item.code().equalsIgnoreCase(input.trim())) {
            throw new BusinessException("验证码不正确, 请重新输入");
        }
    }

    /** 当前回显策略 */
    public String echoMode() {
        return echoAnswer == null ? "local" : echoAnswer.trim().toLowerCase();
    }

    /** 每 5 分钟清理过期验证码 */
    @Scheduled(fixedDelay = 300_000L)
    public void purgeExpired() {
        long now = System.currentTimeMillis();
        Iterator<Map.Entry<String, Item>> it = STORE.entrySet().iterator();
        while (it.hasNext()) {
            if (it.next().getValue().expireAt() <= now) {
                it.remove();
            }
        }
    }

    private String randomCode() {
        StringBuilder sb = new StringBuilder(CODE_LEN);
        for (int i = 0; i < CODE_LEN; i++) {
            sb.append(CHARS[random.nextInt(CHARS.length)]);
        }
        return sb.toString();
    }

    /** 把验证码画成 PNG 并转 base64 */
    private String draw(String code) {
        BufferedImage img = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

            // 背景: 浅色渐变(与前端登录页的暖色卡片一致)
            g.setPaint(new GradientPaint(0, 0, new Color(0xFDF7EE), WIDTH, HEIGHT, new Color(0xF3E7D3)));
            g.fillRect(0, 0, WIDTH, HEIGHT);

            // 干扰线
            int lines = 6 + random.nextInt(4);
            for (int i = 0; i < lines; i++) {
                g.setColor(new Color(150 + random.nextInt(80), 140 + random.nextInt(80), 120 + random.nextInt(80)));
                g.setStroke(new BasicStroke(1.0f + random.nextFloat()));
                g.drawLine(random.nextInt(WIDTH), random.nextInt(HEIGHT),
                        random.nextInt(WIDTH), random.nextInt(HEIGHT));
            }

            // 噪点
            for (int i = 0; i < 90; i++) {
                g.setColor(new Color(120 + random.nextInt(120), 110 + random.nextInt(120), 90 + random.nextInt(120)));
                g.fillOval(random.nextInt(WIDTH), random.nextInt(HEIGHT), 1 + random.nextInt(2), 1 + random.nextInt(2));
            }

            // 字符: 逐个随机旋转、随机深浅
            int step = (WIDTH - 16) / CODE_LEN;
            for (int i = 0; i < code.length(); i++) {
                AffineTransform old = g.getTransform();
                double angle = (random.nextDouble() - 0.5) * 0.5;   // ±14° 左右
                int x = 12 + i * step;
                int y = HEIGHT / 2 + 10 + random.nextInt(5) - 2;
                g.rotate(angle, x, y);
                g.setFont(new Font("Arial", Font.BOLD, 27 + random.nextInt(5)));
                g.setColor(new Color(random.nextInt(60), 40 + random.nextInt(60), 30 + random.nextInt(60)));
                g.drawString(String.valueOf(code.charAt(i)), x, y);
                g.setTransform(old);
            }
        } finally {
            g.dispose();
        }

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ImageIO.write(img, "png", out);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(out.toByteArray());
        } catch (Exception e) {
            log.error("生成验证码图片失败", e);
            throw new BusinessException("验证码生成失败, 请重试");
        }
    }
}
