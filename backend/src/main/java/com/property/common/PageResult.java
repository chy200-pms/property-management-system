package com.property.common;

import lombok.Data;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

/**
 * 分页结果封装
 *
 * @param <T> 行数据类型
 */
@Data
public class PageResult<T> implements Serializable {

    /** 总记录数 */
    private long total;

    /** 当前页数据 */
    private List<T> rows;

    /** 当前页码 */
    private int pageNum;

    /** 每页条数 */
    private int pageSize;

    public PageResult() {
        this.rows = new ArrayList<>();
    }

    public PageResult(long total, List<T> rows) {
        this.total = total;
        this.rows = rows == null ? new ArrayList<>() : rows;
    }

    public PageResult(long total, List<T> rows, int pageNum, int pageSize) {
        this(total, rows);
        this.pageNum = pageNum;
        this.pageSize = pageSize;
    }
}
