package com.property.common;

/**
 * 未登录 /登录失效 异常
 */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }
}
