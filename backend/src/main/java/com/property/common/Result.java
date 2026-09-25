package com.property.common;

import lombok.Data;

import java.io.Serializable;

/**
 * 统一接口返回结果
 *
 * @param <T> 数据类型
 */
@Data
public class Result<T> implements Serializable {

    /** 状态码: 200 成功 / 401 未登录 / 403 无权限 / 500 业务异常 */
    private Integer code;

    /** 提示信息 */
    private String msg;

    /** 返回数据 */
    private T data;

    /** 数据总条数(分页场景使用) */
    private Long total;

    public Result() {
    }

    public Result(Integer code, String msg, T data) {
        this.code = code;
        this.msg = msg;
        this.data = data;
    }

    public static <T> Result<T> ok() {
        return new Result<>(200, "操作成功", null);
    }

    public static <T> Result<T> ok(T data) {
        return new Result<>(200, "操作成功", data);
    }

    public static <T> Result<T> ok(String msg, T data) {
        return new Result<>(200, msg, data);
    }

    public static <T> Result<T> error(String msg) {
        return new Result<>(500, msg, null);
    }

    public static <T> Result<T> error(Integer code, String msg) {
        return new Result<>(code, msg, null);
    }
}
