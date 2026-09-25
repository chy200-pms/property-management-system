package com.property.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.property.common.WebUtils;
import com.property.entity.SysLog;
import com.property.entity.SysUser;
import com.property.service.SysLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.util.ContentCachingRequestWrapper;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

/**
 * 操作日志拦截器
 *
 * <p>设计取向: <b>零侵入</b>。不给上百个接口逐个加注解, 而是:
 * <ul>
 *   <li>只记录<b>写操作</b>(POST/PUT/DELETE)与登录/注销 —— 读操作量大且无审计价值;</li>
 *   <li>模块由请求路径首段推导({@code /feeBill/pay} → 费用账单), 配一张中文名映射表;</li>
 *   <li>动作由「方法 + 路径末尾」特例表推导({@code POST /feeBill/pay} → 账单缴费),
 *       命中不了就退化成「新增/修改/删除」。</li>
 * </ul>
 *
 * <p>另外两处细节:
 * ① 在 {@code preHandle} 里就把登录用户抓下来 —— 因为 {@code afterCompletion} 是逆序执行,
 * 此时 {@link LoginInterceptor} 已经把 ThreadLocal 清掉了;
 * ② 失败原因由 {@code GlobalExceptionHandler} 写到请求属性 {@code log.error} 上再取回来 ——
 * 被 @ExceptionHandler 处理掉的异常, {@code afterCompletion} 的 ex 参数是 null, 拿不到原因。
 */
@Slf4j
@Component
public class OperationLogInterceptor implements HandlerInterceptor {

    /** 请求进入时间戳(纳秒) */
    private static final String ATTR_START = "oplog.start";
    /** 业务失败原因 */
    public static final String ATTR_ERROR = "log.error";
    /** 已记录的登录用户 */
    private static final String ATTR_USER = "oplog.user";
    /** 已记录的登录账号(登录接口登录前也存在) */
    private static final String ATTR_USERNAME = "oplog.username";

    /** 这些路径不写日志: 刷新令牌会高频触发, 验证码只是取图 */
    private static final Set<String> SKIP_URIS = new LinkedHashSet<>(Arrays.asList(
            "/auth/refresh", "/auth/captcha"
    ));

    /** 敏感字段: 值一律脱敏, 不落库 */
    private static final Set<String> SENSITIVE_KEYS = new LinkedHashSet<>(Arrays.asList(
            "password", "oldPassword", "newPassword", "confirmPassword",
            "captchaCode", "code", "token", "authorization"
    ));

    /** 路径首段 → 中文模块名 */
    private static final Map<String, String> MODULE_NAMES = new LinkedHashMap<>();

    static {
        MODULE_NAMES.put("auth", "登录认证");
        MODULE_NAMES.put("building", "楼栋管理");
        MODULE_NAMES.put("house", "房屋管理");
        MODULE_NAMES.put("owner", "人员档案");
        MODULE_NAMES.put("parking", "车位管理");
        MODULE_NAMES.put("feeStandard", "收费标准");
        MODULE_NAMES.put("feeBill", "费用账单");
        MODULE_NAMES.put("feePayment", "缴费记录");
        MODULE_NAMES.put("tempParking", "临时停车");
        MODULE_NAMES.put("repair", "报修工单");
        MODULE_NAMES.put("complaint", "投诉建议");
        MODULE_NAMES.put("notice", "通知公告");
        MODULE_NAMES.put("visitor", "访客管理");
        MODULE_NAMES.put("equipment", "设备设施");
        MODULE_NAMES.put("community", "3D 场景");
        MODULE_NAMES.put("dashboard", "数据看板");
        MODULE_NAMES.put("log", "操作日志");
    }

    /** "METHOD 路径" → 中文动作 */
    private static final Map<String, String> ACTION_NAMES = new LinkedHashMap<>();

    static {
        ACTION_NAMES.put("POST /auth/login", "登录");
        ACTION_NAMES.put("POST /auth/logout", "注销");
        ACTION_NAMES.put("POST /auth/password", "修改密码");
        ACTION_NAMES.put("POST /house/checkIn", "房屋入住登记");
        ACTION_NAMES.put("POST /parking/allocate", "车位分配");
        ACTION_NAMES.put("POST /parking/release", "车位退租");
        ACTION_NAMES.put("POST /feeBill/generate/property", "生成物业费账单");
        ACTION_NAMES.put("POST /feeBill/generate/parking", "生成车位费账单");
        ACTION_NAMES.put("POST /feeBill/pay", "账单缴费");
        ACTION_NAMES.put("POST /feeBill/payBatch", "批量缴费");
        ACTION_NAMES.put("POST /feeBill/cancelPay", "撤销缴费");
        ACTION_NAMES.put("POST /tempParking/entry", "临时车入场登记");
        ACTION_NAMES.put("POST /tempParking/exit", "临时车出场结算");
        ACTION_NAMES.put("POST /repair/assign", "报修派单");
        ACTION_NAMES.put("POST /repair/start", "报修开工");
        ACTION_NAMES.put("POST /repair/finish", "报修完工");
        ACTION_NAMES.put("POST /repair/rate", "报修评价");
        ACTION_NAMES.put("POST /complaint/reply", "投诉回复");
        ACTION_NAMES.put("POST /equipment/maintain", "设备维保登记");
        ACTION_NAMES.put("POST /visitor/leave", "访客离场核销");
    }

    @Autowired
    private SysLogService sysLogService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${security.oplog.enabled:true}")
    private boolean enabled;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        request.setAttribute(ATTR_START, System.nanoTime());
        // 此刻 LoginInterceptor 已执行完, 能拿到当前登录用户
        SysUser user = LoginInterceptor.getCurrentUser();
        if (user != null) {
            request.setAttribute(ATTR_USER, user);
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        if (!enabled || !shouldLog(request)) {
            return;
        }
        try {
            SysLog entity = new SysLog();
            String uri = request.getRequestURI();
            String contextPath = request.getContextPath();
            if (contextPath != null && !contextPath.isEmpty() && uri.startsWith(contextPath)) {
                uri = uri.substring(contextPath.length());
            }
            String method = request.getMethod();

            // ---- 操作人 ----
            SysUser user = (SysUser) request.getAttribute(ATTR_USER);
            if (user != null) {
                entity.setUserId(user.getId());
                entity.setUsername(user.getUsername());
                entity.setRealName(user.getRealName());
                entity.setRole(user.getRole());
            } else {
                // 登录接口: 此时还没有登录态, 从请求体里取账号
                Map<String, Object> body = readBody(request);
                Object name = body == null ? null : body.get("username");
                entity.setUsername(name == null ? null : String.valueOf(name));
            }

            // ---- 模块 / 动作 ----
            String moduleKey = firstSegment(uri);
            entity.setModule(MODULE_NAMES.getOrDefault(moduleKey, moduleKey));
            entity.setAction(resolveAction(method, uri));

            // ---- 请求信息 ----
            entity.setMethod(method);
            entity.setUri(truncate(uri, 255));
            entity.setParams(truncate(maskAndSerialize(request), 2000));
            entity.setIp(WebUtils.clientIp(request));
            entity.setUserAgent(truncate(request.getHeader("User-Agent"), 255));

            // ---- 结果 ----
            Object attr = request.getAttribute(ATTR_ERROR);
            String failMsg = attr == null ? null : String.valueOf(attr);
            if (failMsg == null && ex != null) {
                failMsg = ex.getMessage() == null ? ex.getClass().getSimpleName() : ex.getMessage();
            }
            if (failMsg == null) {
                entity.setStatus(1);
            } else {
                entity.setStatus(0);
                entity.setErrorMsg(truncate(failMsg, 500));
            }

            // ---- 耗时 ----
            Object start = request.getAttribute(ATTR_START);
            long cost = start instanceof Long s ? (System.nanoTime() - s) / 1_000_000L : 0L;
            entity.setCostMs((int) Math.min(cost, Integer.MAX_VALUE));

            sysLogService.record(entity);
        } catch (Exception e) {
            // 日志失败绝不影响主流程
            log.warn("操作日志记录异常: {}", e.getMessage());
        }
    }

    /** 只记写操作 */
    private boolean shouldLog(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isEmpty() && uri.startsWith(contextPath)) {
            uri = uri.substring(contextPath.length());
        }
        if (SKIP_URIS.contains(uri)) {
            return false;
        }
        String method = request.getMethod();
        return "POST".equals(method) || "PUT".equals(method) || "DELETE".equals(method);
    }

    /** 动作名: 先查特例表, 再按 HTTP 方法退化 */
    private String resolveAction(String method, String uri) {
        String key = method + " " + uri;
        String hit = ACTION_NAMES.get(key);
        if (hit != null) {
            return hit;
        }
        // 兼容路径尾部带 ID 的写法: DELETE /building/12
        for (Map.Entry<String, String> e : ACTION_NAMES.entrySet()) {
            if (e.getKey().startsWith(method + " ") && uri.startsWith(e.getKey().substring(method.length() + 1))) {
                return e.getValue();
            }
        }
        switch (method) {
            case "POST":
                return "新增";
            case "PUT":
                return "修改";
            case "DELETE":
                return "删除";
            default:
                return method;
        }
    }

    private String firstSegment(String uri) {
        if (uri == null || uri.length() < 2) {
            return "-";
        }
        String s = uri.startsWith("/") ? uri.substring(1) : uri;
        int slash = s.indexOf('/');
        return slash > 0 ? s.substring(0, slash) : s;
    }

    /** 读取缓存的请求体并转成 Map */
    @SuppressWarnings("unchecked")
    private Map<String, Object> readBody(HttpServletRequest request) {
        if (!(request instanceof ContentCachingRequestWrapper wrapper)) {
            return null;
        }
        byte[] buf = wrapper.getContentAsByteArray();
        if (buf == null || buf.length == 0) {
            return null;
        }
        try {
            return objectMapper.readValue(new String(buf, StandardCharsets.UTF_8), Map.class);
        } catch (Exception e) {
            return null;
        }
    }

    /** 参数脱敏后序列化: 密码类字段一律替换为 *** */
    private String maskAndSerialize(HttpServletRequest request) {
        Map<String, Object> body = readBody(request);
        if (body != null && !body.isEmpty()) {
            Map<String, Object> masked = new LinkedHashMap<>();
            body.forEach((k, v) -> masked.put(k, SENSITIVE_KEYS.contains(k) ? "***" : v));
            try {
                return objectMapper.writeValueAsString(masked);
            } catch (Exception ignore) {
                return "{...}";
            }
        }
        // 无请求体时退化为查询串(分页、筛选条件也在审计范围内)
        String qs = request.getQueryString();
        return qs == null ? null : qs;
    }

    private String truncate(String v, int max) {
        if (v == null) {
            return null;
        }
        return v.length() <= max ? v : v.substring(0, max);
    }
}
