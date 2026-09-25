package com.property.mapper;

import com.property.entity.SysLog;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.Map;

/**
 * 操作日志 Mapper
 */
@Mapper
public interface SysLogMapper {

    @Insert("""
            INSERT INTO sys_log (user_id, username, real_name, role, module, action, method, uri,
                                 params, ip, user_agent, status, error_msg, cost_ms)
            VALUES (#{userId}, #{username}, #{realName}, #{role}, #{module}, #{action}, #{method}, #{uri},
                    #{params}, #{ip}, #{userAgent}, #{status}, #{errorMsg}, #{costMs})
            """)
    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(SysLog log);

    @Select("SELECT * FROM sys_log WHERE id = #{id}")
    SysLog selectById(@Param("id") Long id);

    /** 公共筛选条件 */
    String WHERE = """
            <where>
              <if test="keyword != null and keyword != ''">
                AND (username LIKE CONCAT('%', #{keyword}, '%')
                     OR real_name LIKE CONCAT('%', #{keyword}, '%')
                     OR action LIKE CONCAT('%', #{keyword}, '%')
                     OR uri LIKE CONCAT('%', #{keyword}, '%'))
              </if>
              <if test="module != null and module != ''">AND module = #{module}</if>
              <if test="role != null and role != ''">AND role = #{role}</if>
              <if test="status != null">AND status = #{status}</if>
              <if test="startTime != null and startTime != ''">AND create_time &gt;= #{startTime}</if>
              <if test="endTime != null and endTime != ''">AND create_time &lt;= #{endTime}</if>
            </where>
            """;

    @Select("""
            <script>
            SELECT * FROM sys_log
            """ + WHERE + """
            ORDER BY id DESC
            LIMIT #{offset}, #{limit}
            </script>
            """)
    List<SysLog> selectPage(@Param("keyword") String keyword,
                            @Param("module") String module,
                            @Param("role") String role,
                            @Param("status") Integer status,
                            @Param("startTime") String startTime,
                            @Param("endTime") String endTime,
                            @Param("offset") int offset,
                            @Param("limit") int limit);

    @Select("""
            <script>
            SELECT COUNT(*) FROM sys_log
            """ + WHERE + """
            </script>
            """)
    long countPage(@Param("keyword") String keyword,
                   @Param("module") String module,
                   @Param("role") String role,
                   @Param("status") Integer status,
                   @Param("startTime") String startTime,
                   @Param("endTime") String endTime);

    /** 按模块统计(用于日志页顶部的分布图) */
    @Select("SELECT module AS name, COUNT(*) AS value FROM sys_log GROUP BY module ORDER BY value DESC")
    List<Map<String, Object>> countGroupByModule();

    /** 近 N 天每日操作量 */
    @Select("""
            SELECT DATE_FORMAT(create_time, '%Y-%m-%d') AS name, COUNT(*) AS value
            FROM sys_log
            WHERE create_time >= DATE_SUB(CURDATE(), INTERVAL #{days} DAY)
            GROUP BY name ORDER BY name
            """)
    List<Map<String, Object>> countGroupByDay(@Param("days") int days);

    /** 成功/失败分布 */
    @Select("SELECT status, COUNT(*) AS value FROM sys_log GROUP BY status")
    List<Map<String, Object>> countGroupByStatus();

    @Select("SELECT COUNT(*) FROM sys_log WHERE create_time >= CURDATE()")
    long countToday();

    /** 清理过期日志 */
    @Select("DELETE FROM sys_log WHERE create_time < DATE_SUB(NOW(), INTERVAL #{days} DAY)")
    int deleteOlderThan(@Param("days") int days);
}
