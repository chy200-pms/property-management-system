/**
 * 接口封装
 * ---------------------------------------------------------------
 * 统一处理: token 注入、返回体解析、错误提示、演示模式降级。
 * 当后端服务不可用时自动切换到内置演示数据(Mock)。
 */
(function () {
    const http = axios.create({
        baseURL: AppConfig.baseURL,
        timeout: AppConfig.timeout,
        headers: { 'Content-Type': 'application/json;charset=UTF-8' }
    });

    // 请求拦截: 注入登录令牌
    http.interceptors.request.use(config => {
        const token = localStorage.getItem('pms_token');
        if (token) {
            config.headers['Authorization'] = token;
        }
        return config;
    }, error => Promise.reject(error));

    /** 提前多少毫秒续期(默认 15 分钟) */
    const REFRESH_AHEAD_MS = (AppConfig.refreshAheadMs || 15 * 60 * 1000);

    /** 续期中的共享 Promise, 避免并发请求各发一次续期 */
    let refreshing = null;

    /**
     * 令牌临近过期时自动续期(滑动续期)。
     * <p>登录时后端返回 expiresIn, 前端算出绝对到期时间存本地;
     * 之后每次请求前检查一次, 剩余不足 15 分钟就先用旧令牌换一枚新令牌,
     * 这样长时间停留页面也不会突然被踢回登录页。
     */
    function refreshIfNeeded() {
        const token = localStorage.getItem('pms_token');
        if (!token) return Promise.resolve();
        const exp = parseInt(localStorage.getItem('pms_token_exp') || '0', 10);
        if (!exp) return Promise.resolve();
        if (Date.now() < exp - REFRESH_AHEAD_MS) return Promise.resolve();
        if (refreshing) return refreshing;
        refreshing = http({ method: 'post', url: '/auth/refresh' })
            .then(res => {
                const b = res.data;
                if (b && b.code === 200 && b.data && b.data.token) {
                    localStorage.setItem('pms_token', b.data.token);
                    if (b.data.expiresIn) {
                        localStorage.setItem('pms_token_exp', String(Date.now() + b.data.expiresIn * 1000));
                    }
                }
            })
            .catch(() => {
                // 续期失败不影响本次请求; 真失效了由 401 分支统一处理
            })
            .finally(() => {
                refreshing = null;
            });
        return refreshing;
    }

    /** 构造带业务码的错误, 便于调用方按 code 分支(428 需要验证码 / 429 已锁定 / 401 未登录) */
    function bizError(body, fallback) {
        const err = new Error((body && body.msg) || fallback || '请求失败');
        err.code = body ? body.code : undefined;
        return err;
    }

    /**
     * 核心请求方法
     */
    async function request(method, url, options) {
        options = options || {};

        // 演示模式: 走本地 Mock
        // 注意: 这里同样要校验返回码, 否则"密码错误""车位已被占用"等业务失败会被静默当成成功
        if (DemoMode.isOn()) {
            const body = await Mock.handle(method, url, options);
            if (body && body.code === 200) {
                return body;
            }
            if (body && body.code === 401) {
                localStorage.removeItem('pms_token');
                if (!/index\.html$|\/$/.test(location.pathname)) {
                    alert('登录已失效，请重新登录');
                    location.href = 'index.html';
                }
                throw bizError(body, '登录已失效');
            }
            throw bizError(body);
        }

        try {
            await refreshIfNeeded();
            const res = await http({ method, url, params: options.params, data: options.data });
            const body = res.data;
            if (body && body.code === 200) {
                return body;
            }
            // 未登录 / 登录失效
            if (body && body.code === 401) {
                localStorage.removeItem('pms_token');
                localStorage.removeItem('pms_token_exp');
                if (!/index\.html$|\/$/.test(location.pathname)) {
                    alert('登录已失效，请重新登录');
                    location.href = 'index.html';
                }
                throw bizError(body, '登录已失效');
            }
            throw bizError(body);
        } catch (err) {
            // 网络异常(后端未启动)
            // 仅当显式开启 allowDemo 时才降级为内置演示数据; 默认直接报错,
            // 避免"页面能点其实数据没落库"这类误判。
            const isNetwork = !err.response && (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED'
                || err.message === 'Network Error' || err.code === 'ERR_CONNECTION_REFUSED');
            if (isNetwork && AppConfig.allowDemo && !DemoMode.isOn()) {
                DemoMode.enable();
                return Mock.handle(method, url, options);
            }
            if (err.response) {
                throw bizError(err.response.data, '请求失败(' + err.response.status + ')');
            }
            if (isNetwork) {
                throw new Error('无法连接后端服务（' + AppConfig.baseURL + '），请确认后端已启动');
            }
            throw err;
        }
    }

    /**
     * 通用 CRUD 封装
     * 暴露 _request 以便在标准 CRUD 之外调用模块专有接口(如 /house/checkIn、/parking/allocate)
     */
    function crud(resource) {
        return {
            _request: request,
            page: params => request('get', '/' + resource + '/page', { params }),
            list: params => request('get', '/' + resource + '/list', { params }),
            detail: id => request('get', '/' + resource + '/' + id),
            add: data => request('post', '/' + resource, { data }),
            update: data => request('put', '/' + resource, { data }),
            remove: id => request('delete', '/' + resource + '/' + id)
        };
    }

    window.Api = {
        _request: request,

        /** 探测后端是否可用 */
        ping() {
            return new Promise(resolve => {
                axios.get(AppConfig.baseURL + '/auth/captcha', { timeout: 2500 })
                    .then(() => resolve(true))
                    .catch(err => {
                        // 有响应(即使是 401/404)说明服务在线
                        resolve(!!err.response);
                    });
            });
        },

        // ==================== 登录认证 ====================
        /**
         * 登录
         * @param {string} username 账号
         * @param {string} password 密码
         * @param {string} [captchaId] 验证码ID(后端要求验证码时必传)
         * @param {string} [captchaCode] 用户输入的验证码
         */
        login(username, password, captchaId, captchaCode) {
            const data = { username, password };
            if (captchaId) data.captchaId = captchaId;
            if (captchaCode) data.captchaCode = captchaCode;
            return request('post', '/auth/login', { data });
        },
        /** 获取图形验证码: 返回 { captchaId, image(base64), expireSeconds } */
        captcha() {
            return request('get', '/auth/captcha');
        },
        /** 手动续期(通常由 request() 在临近过期时自动调用) */
        refresh() {
            return request('post', '/auth/refresh');
        },
        logout() {
            return request('post', '/auth/logout');
        },
        currentUser() {
            return request('get', '/auth/current');
        },
        changePassword(data) {
            return request('post', '/auth/password', { data });
        },

        // ==================== 操作日志(仅管理员) ====================
        log: {
            page: params => request('get', '/log/page', { params }),
            statistics: () => request('get', '/log/statistics'),
            detail: id => request('get', '/log/detail/' + id)
        },

        // ==================== 用户管理 ====================
        users: {
            list: params => request('get', '/auth/users', { params }),
            detail: id => request('get', '/auth/users/' + id),
            add: data => request('post', '/auth/users', { data }),
            update: data => request('put', '/auth/users', { data }),
            remove: id => request('delete', '/auth/users/' + id)
        },

        // ==================== 3D 小区场景 ====================
        community: {
            /** 3D 地图渲染数据(楼栋几何 + 入住汇总, 业主额外返回自己的房屋位置) */
            scene: () => request('get', '/community/scene')
        },

        // ==================== 各业务模块 ====================
        // 注意: building 在通用 CRUD 之外还额外提供 statistics(入住情况统计)
        building: Object.assign(crud('building'), {
            statistics: () => request('get', '/building/statistics')
        }),
        house: crud('house'),
        owner: crud('owner'),
        parking: crud('parking'),
        tempParking: {
            page: params => request('get', '/tempParking/page', { params }),
            detail: id => request('get', '/tempParking/' + id),
            entry: data => request('post', '/tempParking/entry', { data }),
            exit: params => request('post', '/tempParking/exit', { params }),
            preview: id => request('get', '/tempParking/preview/' + id),
            calcFee: minutes => request('get', '/tempParking/calcFee', { params: { minutes } }),
            inParking: () => request('get', '/tempParking/inParking'),
            update: data => request('put', '/tempParking', { data }),
            remove: id => request('delete', '/tempParking/' + id),
            statistics: () => request('get', '/tempParking/statistics')
        },
        feeStandard: crud('feeStandard'),
        feeBill: {
            page: params => request('get', '/feeBill/page', { params }),
            list: params => request('get', '/feeBill/list', { params }),
            detail: id => request('get', '/feeBill/' + id),
            add: data => request('post', '/feeBill', { data }),
            update: data => request('put', '/feeBill', { data }),
            remove: id => request('delete', '/feeBill/' + id),
            pay: (id, payMethod) => request('post', '/feeBill/pay', { params: { id, payMethod } }),
            payBatch: (ids, payMethod) => request('post', '/feeBill/payBatch', { data: ids, params: { payMethod } }),
            cancelPay: id => request('post', '/feeBill/cancelPay', { params: { id } }),
            generateProperty: period => request('post', '/feeBill/generate/property', { params: { period } }),
            generateParking: period => request('post', '/feeBill/generate/parking', { params: { period } }),
            statusStatistics: () => request('get', '/feeBill/statistics/status'),
            typeStatistics: () => request('get', '/feeBill/statistics/type'),
            periodStatistics: () => request('get', '/feeBill/statistics/period')
        },
        feePayment: {
            page: params => request('get', '/feePayment/page', { params }),
            detail: id => request('get', '/feePayment/' + id),
            remove: id => request('delete', '/feePayment/' + id),
            monthStatistics: () => request('get', '/feePayment/statistics/month'),
            methodStatistics: () => request('get', '/feePayment/statistics/method')
        },
        repair: {
            page: params => request('get', '/repair/page', { params }),
            detail: id => request('get', '/repair/' + id),
            add: data => request('post', '/repair', { data }),
            update: data => request('put', '/repair', { data }),
            remove: id => request('delete', '/repair/' + id),
            assign: params => request('post', '/repair/assign', { params }),
            start: id => request('post', '/repair/start', { params: { id } }),
            finish: params => request('post', '/repair/finish', { params }),
            rate: params => request('post', '/repair/rate', { params }),
            statusStatistics: () => request('get', '/repair/statistics/status'),
            typeStatistics: () => request('get', '/repair/statistics/type')
        },
        complaint: {
            page: params => request('get', '/complaint/page', { params }),
            detail: id => request('get', '/complaint/' + id),
            add: data => request('post', '/complaint', { data }),
            update: data => request('put', '/complaint', { data }),
            remove: id => request('delete', '/complaint/' + id),
            reply: params => request('post', '/complaint/reply', { params }),
            statusStatistics: () => request('get', '/complaint/statistics/status'),
            typeStatistics: () => request('get', '/complaint/statistics/type')
        },
        notice: crud('notice'),
        visitor: {
            page: params => request('get', '/visitor/page', { params }),
            detail: id => request('get', '/visitor/' + id),
            add: data => request('post', '/visitor', { data }),
            update: data => request('put', '/visitor', { data }),
            remove: id => request('delete', '/visitor/' + id),
            leave: id => request('post', '/visitor/leave', { params: { id } })
        },
        equipment: {
            page: params => request('get', '/equipment/page', { params }),
            detail: id => request('get', '/equipment/' + id),
            add: data => request('post', '/equipment', { data }),
            update: data => request('put', '/equipment', { data }),
            remove: id => request('delete', '/equipment/' + id),
            maintain: params => request('post', '/equipment/maintain', { params })
        },

        // ==================== 首页看板 ====================
        dashboard: {
            overview: () => request('get', '/dashboard/overview'),
            charts: () => request('get', '/dashboard/charts'),
            todos: () => request('get', '/dashboard/todos'),
            /** 数据大屏聚合数据(管理侧含全量维度, 业主仅自有数据) */
            screen: () => request('get', '/dashboard/screen')
        }
    };
})();
