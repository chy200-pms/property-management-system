package com.property.common;

import com.property.config.OperationLogInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * 全局异常处理器
 *
 * <p>每个分支都会把失败原因写到请求属性 {@code log.error} 上,
 * 供 {@code OperationLogInterceptor} 在请求结束时把「失败的操作」也记进操作日志 ——
 * 被 @ExceptionHandler 接住的异常, 拦截器拿不到异常对象, 只能靠这个属性传递。
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** 标记本次请求失败, 供操作日志记录原因 */
    private void markLogError(HttpServletRequest request, String msg) {
        if (request != null) {
            request.setAttribute(OperationLogInterceptor.ATTR_ERROR, msg);
        }
    }

    /** 业务异常 */
    @ExceptionHandler(BusinessException.class)
    public Result<Void> handleBusiness(BusinessException e, HttpServletRequest request) {
        log.warn("业务异常: {}", e.getMessage());
        markLogError(request, e.getMessage());
        return Result.error(e.getCode(), e.getMessage());
    }

    /** 参数校验异常 (@Valid 注解触发) */
    @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class})
    public Result<Void> handleValid(BindException e, HttpServletRequest request) {
        FieldError fieldError = e.getBindingResult().getFieldError();
        String msg = fieldError == null ? "参数校验失败" : fieldError.getDefaultMessage();
        log.warn("参数校验失败: {}", msg);
        markLogError(request, msg);
        return Result.error(400, msg);
    }

    /** 未登录 */
    @ExceptionHandler(UnauthorizedException.class)
    public Result<Void> handleUnauthorized(UnauthorizedException e, HttpServletRequest request) {
        markLogError(request, e.getMessage());
        return Result.error(401, e.getMessage());
    }

    /**
     * 请求参数问题(缺参数 / 请求体缺失或格式错误 / 类型不匹配)
     * <p>
     * 这类错误属于调用方问题, 应该给明确的"参数"提示, 而不是笼统的"系统异常"。
     */
    @ExceptionHandler({
            MissingServletRequestParameterException.class,
            HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class,
            ServletRequestBindingException.class
    })
    public Result<Void> handleBadRequest(Exception e, HttpServletRequest request) {
        String msg;
        if (e instanceof MissingServletRequestParameterException m) {
            msg = "缺少必要参数: " + m.getParameterName();
        } else if (e instanceof MethodArgumentTypeMismatchException m) {
            msg = "参数类型不正确: " + m.getName();
        } else if (e instanceof HttpMessageNotReadableException) {
            msg = "请求体缺失或格式错误(需要合法的 JSON)";
        } else {
            msg = "请求参数不正确";
        }
        log.warn("参数错误: {}", msg);
        markLogError(request, msg);
        return Result.error(400, msg);
    }

    /** 其他未捕获异常 */
    @ExceptionHandler(Exception.class)
    public Result<Void> handleException(Exception e, HttpServletRequest request) {
        log.error("系统异常", e);
        // 部分异常(如 MyBatis 包装异常)的 message 为 null, 兜底用类名, 避免出现"系统异常: null"
        String detail = e.getMessage();
        if (detail == null || detail.isBlank()) {
            detail = e.getClass().getSimpleName();
            Throwable cause = e.getCause();
            if (cause != null && cause != e && cause.getMessage() != null) {
                detail += " - " + cause.getMessage();
            }
        }
        markLogError(request, detail);
        return Result.error("系统异常: " + detail);
    }
}
