/**
 * 3D 小区地图
 * ---------------------------------------------------------------
 * 借鉴地图类产品的 3D 建筑呈现方式:
 *   - 楼栋以体块呈现, 每层楼板可单独点选, 悬停高亮
 *   - 道路 / 绿化 / 地面车位 / 临街车位 / 物业服务中心 等场景元素
 *   - 支持鸟瞰、俯视、地面视角切换与自由旋转缩放
 *
 * 数据权限:
 *   - 管理员 / 物业人员: 可点选任意楼栋与房间, 查看房屋信息与住户信息
 *   - 业主: 3D 场景中自己的房屋金色高亮(可进入), 其他房间呈"锁定"灰色,
 *           点击提示无权查看; 数据由后端数据权限兜底, 前端不做安全假设。
 *
 * 依赖: libs/three.min.js + libs/OrbitControls.js (均为本地文件, 不依赖外网)
 */
Vue.component('page-community3d', {
    template: `
    <div class="c3d-page" :class="{ 'c3d-night': nightMode }">

        <!-- ============ 顶部信息条 ============ -->
        <div class="c3d-topbar">
            <div class="c3d-brand">
                <span class="c3d-logo"><i class="el-icon-office-building"></i></span>
                <div class="c3d-brand-txt">
                    <div class="c3d-brand-title">阳光家园 · 3D 小区地图</div>
                    <div class="c3d-brand-sub">3D COMMUNITY MAP · 点击楼栋直达房间</div>
                </div>
            </div>
            <div class="c3d-stats">
                <div class="c3d-stat"><b>{{ buildings.length }}</b><span>楼栋</span></div>
                <em class="c3d-stat-sep"></em>
                <div class="c3d-stat"><b>{{ totalHouses }}</b><span>房屋</span></div>
                <em class="c3d-stat-sep"></em>
                <div class="c3d-stat"><b>{{ totalOccupied }}</b><span>已入住</span></div>
                <em class="c3d-stat-sep"></em>
                <div class="c3d-stat accent"><b>{{ occupancyRate }}</b><span>入住率</span></div>
            </div>
        </div>

        <!-- ============ 工具条 ============ -->
        <div class="c3d-toolbar">
            <div class="c3d-tb-group">
                <button class="c3d-btn" :class="{ on: view === 'bird' }" @click="setView('bird')">
                    <i class="el-icon-view"></i><span>鸟瞰</span>
                </button>
                <button class="c3d-btn" :class="{ on: view === 'top' }" @click="setView('top')">
                    <i class="el-icon-s-grid"></i><span>俯视</span>
                </button>
                <button class="c3d-btn" :class="{ on: view === 'walk' }" @click="setView('walk')">
                    <i class="el-icon-position"></i><span>地面</span>
                </button>
            </div>

            <em class="c3d-tb-sep"></em>

            <div class="c3d-tb-group">
                <button class="c3d-btn" @click="resetView">
                    <i class="el-icon-refresh-left"></i><span>重置视角</span>
                </button>
                <button class="c3d-btn" :class="{ on: showTrees }" @click="toggleTrees">
                    <i class="el-icon-sunny"></i><span>{{ showTrees ? '绿化开' : '绿化关' }}</span>
                </button>
                <button class="c3d-btn" :class="{ on: colorByStatus }" @click="toggleStatusColor">
                    <i class="el-icon-magic-stick"></i>
                    <span>{{ colorByStatus ? '按入住着色' : '按楼栋着色' }}</span>
                </button>
                <button class="c3d-btn" :class="{ on: nightMode }" @click="toggleNight">
                    <i :class="nightMode ? 'el-icon-moon' : 'el-icon-sunny'"></i>
                    <span>{{ nightMode ? '夜间' : '日间' }}</span>
                </button>
            </div>

            <em class="c3d-tb-sep"></em>

            <button v-if="isOwner && myHouse" class="c3d-btn c3d-btn-hl" @click="flyToMyHouse">
                <i class="el-icon-location"></i><span>定位到我家</span>
            </button>

            <div class="c3d-legend">
                <span class="lg"><i class="dot self"></i>{{ isOwner ? '我的房屋' : '自住' }}</span>
                <span class="lg"><i class="dot rented"></i>出租</span>
                <span class="lg"><i class="dot empty"></i>空置</span>
                <span class="lg"><i class="dot decorating"></i>装修中</span>
                <span class="lg" v-if="isOwner"><i class="dot locked"></i>无权查看</span>
            </div>
        </div>

        <div class="c3d-body">
            <!-- ============ 3D 画布 ============ -->
            <div class="c3d-stage">
                <div ref="canvasHost" class="c3d-canvas"></div>

                <i class="c3d-corner tl"></i>
                <i class="c3d-corner tr"></i>
                <i class="c3d-corner bl"></i>
                <i class="c3d-corner br"></i>

                <div class="c3d-hud" v-if="webglOk">
                    <span class="hud-dot"></span>实时 3D 渲染
                </div>

                <!-- WebGL 不可用时的降级视图: 依然可点选楼栋/房间 -->
                <div class="c3d-fallback" v-if="!webglOk">
                    <div class="fb-title">
                        <i class="el-icon-warning-outline"></i>
                        当前浏览器未启用 WebGL, 已切换为 2D 小区平面图(功能一致)
                    </div>
                    <div class="fb-grid">
                        <div class="fb-building" v-for="b in buildings" :key="b.id"
                            :class="{ active: selBuilding && selBuilding.id===b.id }"
                            :style="{ borderColor: buildingColor(b) }"
                            @click="selectBuilding(b)">
                            <div class="fb-no">{{ b.buildingNo }}</div>
                            <div class="fb-meta">{{ b.unitCount }}单元 / {{ b.floorCount }}层</div>
                            <div class="fb-meta">{{ b.occupiedCount }}/{{ b.houseCount }} 已入住</div>
                            <div class="fb-bar">
                                <i :style="{ width: occPct(b) + '%', background: buildingColor(b) }"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="c3d-hint">
                    <i class="el-icon-mouse"></i>
                    <span>左键旋转 · 滚轮缩放 · 右键平移 · 点击楼栋或房间查看详情</span>
                </div>

                <div class="c3d-owner-banner" v-if="isOwner && myHouse">
                    <span class="ob-ico"><i class="el-icon-house"></i></span>
                    <div class="ob-txt">
                        <div class="ob-label">您家</div>
                        <div class="ob-no">{{ myHouse.houseNo }}</div>
                    </div>
                    <button class="c3d-btn c3d-btn-hl" @click="flyToMyHouse">
                        <i class="el-icon-position"></i><span>带我过去</span>
                    </button>
                </div>
            </div>

            <!-- ============ 右侧信息面板 ============ -->
            <div class="c3d-panel" v-loading="loading">
                <!-- 小区概览 -->
                <template v-if="!selBuilding">
                    <div class="panel-title">
                        <span class="pt-ico"><i class="el-icon-map-location"></i></span>
                        <div class="pt-txt">
                            <div class="pt-main">小区总览</div>
                            <div class="pt-sub">选择楼栋查看楼层与房间</div>
                        </div>
                    </div>

                    <div class="ov-grid">
                        <div class="ov-item">
                            <i class="ov-ico el-icon-office-building"></i>
                            <div class="ov-num">{{ buildings.length }}</div>
                            <div class="ov-label">楼栋</div>
                        </div>
                        <div class="ov-item">
                            <i class="ov-ico el-icon-house"></i>
                            <div class="ov-num">{{ totalHouses }}</div>
                            <div class="ov-label">房屋</div>
                        </div>
                        <div class="ov-item">
                            <i class="ov-ico el-icon-circle-check"></i>
                            <div class="ov-num">{{ totalOccupied }}</div>
                            <div class="ov-label">已入住</div>
                        </div>
                        <div class="ov-item hl">
                            <i class="ov-ico el-icon-data-line"></i>
                            <div class="ov-num">{{ occupancyRate }}</div>
                            <div class="ov-label">入住率</div>
                        </div>
                    </div>

                    <div class="panel-sub"><i class="el-icon-office-building"></i> 楼栋列表</div>
                    <div class="bd-list">
                        <div class="bd-item" v-for="b in buildings" :key="b.id" @click="selectBuilding(b)">
                            <span class="bd-dot" :style="{ background: buildingColor(b) }"></span>
                            <div class="bd-main">
                                <div class="bd-name">{{ b.buildingNo }}
                                    <span class="bd-type">{{ b.buildingType }}</span>
                                </div>
                                <div class="bd-meta">{{ b.unitCount }}单元 · {{ b.floorCount }}层 ·
                                    {{ b.occupiedCount }}/{{ b.houseCount }} 已入住</div>
                                <div class="bd-bar">
                                    <i :style="{ width: occPct(b) + '%', background: buildingColor(b) }"></i>
                                </div>
                            </div>
                            <i class="el-icon-arrow-right bd-arrow"></i>
                        </div>
                    </div>

                    <div class="owner-block" v-if="isOwner && myHouse">
                        <div class="panel-sub"><i class="el-icon-house"></i> 我的房屋</div>
                        <div class="bd-item active" @click="enterMyHouse">
                            <span class="bd-dot" style="background:#f0b429"></span>
                            <div class="bd-main">
                                <div class="bd-name">{{ myHouse.houseNo }}</div>
                                <div class="bd-meta">{{ myHouse.houseType }} · {{ myHouse.area }}㎡ ·
                                    {{ myHouse.ownerName }}</div>
                            </div>
                            <i class="el-icon-arrow-right bd-arrow"></i>
                        </div>
                    </div>
                </template>

                <!-- 楼栋详情 -->
                <template v-else>
                    <div class="panel-title">
                        <span class="pt-ico"><i class="el-icon-office-building"></i></span>
                        <div class="pt-txt">
                            <div class="pt-main">{{ selBuilding.buildingNo }}</div>
                            <div class="pt-sub">{{ selBuilding.name }}</div>
                        </div>
                        <button class="c3d-btn c3d-btn-sm" @click="clearSelection">
                            <i class="el-icon-back"></i><span>返回概览</span>
                        </button>
                    </div>

                    <div class="info-table">
                        <div class="info-row"><span>楼栋类型</span><b>{{ selBuilding.buildingType }}</b></div>
                        <div class="info-row"><span>单元 / 层数</span>
                            <b>{{ selBuilding.unitCount }} 单元 / {{ selBuilding.floorCount }} 层</b></div>
                        <div class="info-row"><span>房屋数量</span><b>{{ selBuilding.houseCount }} 套</b></div>
                        <div class="info-row"><span>入住情况</span>
                            <b>{{ selBuilding.occupiedCount }} 套已入住 · {{ selBuilding.emptyCount }} 套空置</b></div>
                        <div class="info-row hl"><span>入住率</span><b>{{ selBuilding.occupancyRate }}</b></div>
                        <div class="info-row" v-if="selBuilding.manager"><span>物业负责人</span>
                            <b>{{ selBuilding.manager }} {{ selBuilding.managerPhone }}</b></div>
                    </div>

                    <div class="panel-sub" v-if="isOwner">
                        <i class="el-icon-house"></i>
                        {{ myHouseInThisBuilding ? '您在该楼栋的房屋' : '您在该楼栋没有房屋' }}
                        <div class="bd-item active" v-if="myHouseInThisBuilding" @click="enterMyHouse">
                            <span class="bd-dot" style="background:#f0b429"></span>
                            <div class="bd-main">
                                <div class="bd-name">{{ myHouse.houseNo }}</div>
                                <div class="bd-meta">{{ myHouse.houseType }} · {{ myHouse.area }}㎡</div>
                            </div>
                            <i class="el-icon-arrow-right bd-arrow"></i>
                        </div>
                    </div>

                    <template v-else>
                        <div class="panel-sub"><i class="el-icon-s-grid"></i> 房间列表(可按楼层点选 3D 模型)</div>
                        <div class="floor-list" v-loading="houseLoading">
                            <div class="floor-group" v-for="g in houseGroups" :key="g.key">
                                <div class="floor-head">
                                    <span class="fh-tag">{{ g.unitNo }}单元</span>
                                    <span class="fh-floor">{{ g.floorNo }} 层</span>
                                    <span class="fh-count">{{ g.rows.length }} 套</span>
                                </div>
                                <div class="floor-rooms">
                                    <span class="room-chip" v-for="h in g.rows" :key="h.id"
                                        :class="'st-' + h.status"
                                        @click="selectHouse(h)">
                                        <i class="rc-dot"></i>{{ h.roomNo }}
                                        <em>{{ statusText(h.status) }}</em>
                                    </span>
                                </div>
                            </div>
                            <div class="empty-tip" v-if="!houseLoading && !houseGroups.length">该楼栋暂无房屋数据</div>
                        </div>
                    </template>
                </template>

                <!-- 房屋详情 -->
                <div class="house-detail" v-if="selHouse">
                    <div class="panel-sub">
                        <i class="el-icon-house"></i> {{ selHouse.houseNo }}
                        <button class="c3d-btn c3d-btn-sm" @click="selHouse = null; residents = []">
                            <i class="el-icon-close"></i><span>收起</span>
                        </button>
                    </div>
                    <div class="info-table">
                        <div class="info-row"><span>建筑面积</span><b>{{ selHouse.area }} ㎡</b></div>
                        <div class="info-row"><span>户型 / 朝向</span>
                            <b>{{ selHouse.houseType }} / {{ selHouse.orientation }}</b></div>
                        <div class="info-row"><span>状态</span>
                            <el-tag :type="PmsUtils.tag('houseStatus', selHouse.status)" size="mini">
                                {{ statusText(selHouse.status) }}</el-tag></div>
                        <div class="info-row"><span>装修</span><b>{{ selHouse.decoration }}</b></div>
                    </div>

                    <div class="panel-sub"><i class="el-icon-user"></i> 住户信息 ({{ residents.length }})</div>
                    <div class="resident" v-for="r in residents" :key="r.id">
                        <span class="r-avatar">{{ String(r.name || '?').slice(0, 1) }}</span>
                        <div class="r-main">
                            <div class="r-top">
                                <span class="r-name">{{ r.name }}</span>
                                <el-tag size="mini" :type="PmsUtils.tag('personType', r.personType)">
                                    {{ PmsUtils.label('personType', r.personType) }}</el-tag>
                            </div>
                            <div class="r-sub">
                                <span v-if="r.phone"><i class="el-icon-mobile-phone"></i>{{ maskPhone(r.phone) }}</span>
                                <span>{{ r.gender }} · 入住 {{ r.moveInDate }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="empty-tip" v-if="!residentLoading && !residents.length">该房屋暂未登记人员</div>

                    <div class="detail-actions">
                        <button class="c3d-btn c3d-btn-primary" @click="goHousePage">
                            <i class="el-icon-tickets"></i><span>进入房屋档案</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            loading: true,
            webglOk: true,
            isOwner: false,
            myHouse: null,
            buildings: [],
            view: 'bird',
            nightMode: false,
            showTrees: true,
            colorByStatus: true,
            selBuilding: null,
            selHouse: null,
            buildingHouses: [],
            houseLoading: false,
            residents: [],
            residentLoading: false
        };
    },
    computed: {
        totalHouses() {
            return this.buildings.reduce((s, b) => s + (b.houseCount || 0), 0);
        },
        totalOccupied() {
            return this.buildings.reduce((s, b) => s + (b.occupiedCount || 0), 0);
        },
        occupancyRate() {
            const t = this.totalHouses;
            return t ? Math.round(this.totalOccupied * 100 / t) + '%' : '0%';
        },
        /** 按"单元 + 楼层"分组, 便于与 3D 模型逐层对应 */
        houseGroups() {
            const map = {};
            this.buildingHouses.forEach(h => {
                const key = h.unitNo + '-' + h.floorNo;
                (map[key] = map[key] || { key, unitNo: h.unitNo, floorNo: h.floorNo, rows: [] }).rows.push(h);
            });
            return Object.keys(map).map(k => map[k])
                .sort((a, b) => (a.unitNo - b.unitNo) || (a.floorNo - b.floorNo));
        },
        myHouseInThisBuilding() {
            return !!(this.myHouse && this.selBuilding && this.myHouse.buildingId === this.selBuilding.id);
        }
    },
    mounted() {
        this.loadScene();
    },
    beforeDestroy() {
        this.disposeScene();
    },
    methods: {
        statusText(s) {
            return PmsUtils.label('houseStatus', s);
        },
        /** 业主视角下手机号脱敏展示 */
        maskPhone(p) {
            const s = String(p || '');
            return s.length === 11 ? s.slice(0, 3) + '****' + s.slice(7) : s;
        },
        buildingColor(b) {
            const rate = b.houseCount ? b.occupiedCount / b.houseCount : 0;
            if (rate >= 0.85) return '#3f9c6a';
            if (rate >= 0.7) return '#c9a227';
            return '#c0563f';
        },
        /** 楼栋入住率百分比(用于列表内进度条) */
        occPct(b) {
            const total = b && b.houseCount ? b.houseCount : 0;
            if (!total) return 0;
            return Math.max(0, Math.min(100, Math.round((b.occupiedCount || 0) * 100 / total)));
        },

        /** 日/夜场景切换(仅调整雾与灯光, 不动几何体, 切换是瞬时的) */
        toggleNight() {
            this.nightMode = !this.nightMode;
            this.applyTheme();
        },
        applyTheme() {
            const night = this.nightMode;
            const scene = this._scene;
            if (!scene) return;
            if (scene.fog) {
                scene.fog.color.setHex(night ? 0x16223c : 0xdfe9f3);
                scene.fog.near = night ? 200 : 220;
                scene.fog.far = night ? 470 : 460;
            }
            if (this._hemi) {
                this._hemi.color.setHex(night ? 0x8fa8e8 : 0xffffff);
                this._hemi.groundColor.setHex(night ? 0x1e2942 : 0x9db39a);
                this._hemi.intensity = night ? 0.55 : 0.85;
            }
            if (this._sun) {
                this._sun.color.setHex(night ? 0xffd7a0 : 0xfff3d6);
                this._sun.intensity = night ? 0.45 : 0.85;
            }
            if (this._fill) {
                this._fill.color.setHex(night ? 0x6f8fd8 : 0xcfe3ff);
                this._fill.intensity = night ? 0.3 : 0.35;
            }
        },


        // ==================== 数据 ====================
        async loadScene() {
            this.loading = true;
            try {
                const res = await Api.community.scene();
                const d = res.data || {};
                this.buildings = d.buildings || [];
                this.isOwner = !!d.isOwner;
                this.myHouse = d.myHouse || null;
                this.$nextTick(() => this.initThree());
            } catch (e) {
                this.$message.error(e.message || '小区场景数据加载失败');
            } finally {
                this.loading = false;
            }
        },
        async selectBuilding(b) {
            this.selBuilding = b;
            this.selHouse = null;
            this.residents = [];
            this.buildingHouses = [];
            this.highlightBuilding(b.id);
            this.flyToBuilding(b);
            if (this.isOwner) return;   // 业主只允许查看自己的房屋

            this.houseLoading = true;
            try {
                const res = await Api.house.page({ buildingId: b.id, pageNum: 1, pageSize: 500 });
                this.buildingHouses = (res.data && res.data.rows) || [];
                this.applyHouseStatus(b.id, this.buildingHouses);
            } catch (e) {
                this.$message.error(e.message || '房屋列表加载失败');
            } finally {
                this.houseLoading = false;
            }
        },
        async selectHouse(h) {
            // 业主: 只允许进入自己的房间(后端同样会拦截)
            if (this.isOwner && (!this.myHouse || h.id !== this.myHouse.houseId)) {
                this.$message.error('无权查看其他房间的信息');
                return;
            }
            try {
                const res = await Api.house.detail(h.id);
                this.selHouse = res.data || h;
            } catch (e) {
                this.$message.error(e.message || '房屋详情加载失败');
                return;
            }
            this.residentLoading = true;
            try {
                const r = await Api.owner.page({ houseId: h.id, pageNum: 1, pageSize: 50 });
                this.residents = (r.data && r.data.rows) || [];
            } catch (e) {
                this.residents = [];
            } finally {
                this.residentLoading = false;
            }
            this.flyToHouse(h);
        },
        enterMyHouse() {
            if (!this.myHouse) return;
            this.selectBuilding(this.buildings.find(b => b.id === this.myHouse.buildingId) || this.selBuilding);
            this.selectHouse({ id: this.myHouse.houseId, roomNo: this.myHouse.roomNo, ...this.myHouse });
        },
        goHousePage() {
            this.$router.push('/house');
        },
        clearSelection() {
            this.selBuilding = null;
            this.selHouse = null;
            this.residents = [];
            this.buildingHouses = [];
            this.highlightBuilding(null);
            this.resetView();
        },

        // ==================== Three.js 场景 ====================
        initThree() {
            const host = this.$refs.canvasHost;
            if (!host || typeof THREE !== 'object') {
                this.webglOk = false;
                return;
            }
            // 先探测 WebGL 能力再创建渲染器, 避免在不支持的环境抛错/刷控制台日志
            const canvas = document.createElement('canvas');
            let gl = null;
            try {
                gl = canvas.getContext('webgl', { antialias: true })
                    || canvas.getContext('experimental-webgl');
            } catch (e) {
                gl = null;
            }
            if (!gl) {
                this.webglOk = false;
                return;
            }
            let renderer;
            try {
                renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
                renderer.setSize(host.clientWidth || 900, host.clientHeight || 560);
                renderer.shadowMap.enabled = true;
                renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                // —— 立体感的关键三件套(缺一个都会"发塑料") ——
                // 1) sRGB 输出: 否则颜色偏灰、明暗过渡死板
                // 2) ACES 电影级色调映射: 高光不再一片死白, 暗部保留层次
                // 3) 用线性空间计算光照, 光强数值符合物理直觉
                renderer.outputEncoding = THREE.sRGBEncoding;
                renderer.toneMapping = THREE.ACESFilmicToneMapping;
                renderer.toneMappingExposure = 1.06;
                host.appendChild(renderer.domElement);
            } catch (e) {
                this.webglOk = false;
                return;
            }
            this._renderer = renderer;

            const scene = new THREE.Scene();
            scene.fog = new THREE.Fog(0xdfe9f3, 220, 460);
            const camera = new THREE.PerspectiveCamera(48,
                (host.clientWidth || 900) / (host.clientHeight || 560), 0.5, 1200);
            camera.position.set(0, 96, 138);

            const controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.08;
            controls.minDistance = 40;
            controls.maxDistance = 320;
            controls.maxPolarAngle = Math.PI * 0.47;
            controls.target.set(0, 6, 0);
            controls.update();

            this._scene = scene;
            this._camera = camera;
            this._controls = controls;
            this._raycaster = new THREE.Raycaster();
            this._pickables = [];
            this._slabMap = {};
            this._buildings = {};
            this._mySlabs = [];
            /** 窗体玻璃材质(昼夜切换时统一改自发光, 点亮"亮灯的窗户") */
            this._glassMats = [];
            /** canvas 生成的贴图, 销毁时需逐个释放 */
            this._textures = [];
            /** 共享材质(混凝土/沥青/草地等), 只建一次, 避免上千个材质实例 */
            this._mat = {};

            // 光照: 左上主光 + 半球环境光(与界面高光方向一致)
            // 句柄保留在实例上, 供 applyTheme() 做昼夜切换
            this._hemi = new THREE.HemisphereLight(0xffffff, 0x9db39a, 0.85);
            scene.add(this._hemi);
            const sun = new THREE.DirectionalLight(0xfff3d6, 0.85);
            sun.position.set(-70, 110, 80);
            sun.castShadow = true;
            // 阴影贴图提到 2048 + 收紧相机范围, 让阴影边缘清晰、不再糊成一团
            sun.shadow.mapSize.set(2048, 2048);
            sun.shadow.camera.left = -120;
            sun.shadow.camera.right = 120;
            sun.shadow.camera.top = 120;
            sun.shadow.camera.bottom = -120;
            sun.shadow.camera.near = 1;
            sun.shadow.camera.far = 420;
            // bias/normalBias 消除自阴影摩尔纹(条纹会让建筑看起来像塑料贴纸)
            sun.shadow.bias = -0.0006;
            sun.shadow.normalBias = 0.03;
            scene.add(sun);
            // 反向补光: 给暗面一点冷色, 让体块有转折而不是一片死黑
            const fill = new THREE.DirectionalLight(0xcfe3ff, 0.35);
            fill.position.set(90, 60, -70);
            scene.add(fill);
            // 一点点环境光兜底, 避免背光面纯黑
            this._amb = new THREE.AmbientLight(0xffffff, 0.16);
            scene.add(this._amb);
            this._sun = sun;
            this._fill = fill;

            this.buildGround();
            this.buildRoads();
            this.buildBuildings();
            this.buildParkingLots();
            this.buildTrees();
            this.buildFence();
            // 业主视角: 自己的房间高亮可进入, 其余房间呈锁定灰
            this.applyOwnerMask();

            this._onResize = () => this.resize();
            window.addEventListener('resize', this._onResize);
            renderer.domElement.addEventListener('pointermove', this.onPointerMove);
            renderer.domElement.addEventListener('pointerleave', () => { this.clearHover(); });
            renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
            renderer.domElement.addEventListener('click', this.onClick);
            // 应用当前昼夜主题(切换过状态后再重建场景时保持一致)
            this.applyTheme();
            this.animate();
        },
        resize() {
            const host = this.$refs.canvasHost;
            if (!host || !this._renderer || !this._camera) return;
            const w = host.clientWidth || 900, h = host.clientHeight || 560;
            this._camera.aspect = w / h;
            this._camera.updateProjectionMatrix();
            this._renderer.setSize(w, h);
        },
        disposeScene() {
            if (this._raf) cancelAnimationFrame(this._raf);
            window.removeEventListener('resize', this._onResize);
            const el = this._renderer && this._renderer.domElement;
            if (el) {
                el.removeEventListener('pointermove', this.onPointerMove);
                el.removeEventListener('pointerdown', this.onPointerDown);
                el.removeEventListener('click', this.onClick);
            }
            if (this._scene) {
                this._scene.traverse(o => {
                    if (o.geometry) o.geometry.dispose();
                    if (o.material) {
                        const mats = Array.isArray(o.material) ? o.material : [o.material];
                        mats.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
                    }
                });
            }
            if (this._renderer) {
                this._renderer.dispose();
                if (el && el.parentNode) el.parentNode.removeChild(el);
            }
            // 释放对灯光/场景的引用, 避免残留
            this._hemi = null;
            this._sun = null;
            this._fill = null;
            this._amb = null;
            // 释放 canvas 生成的贴图(geometry/material 上面已经遍历释放过, 贴图要单独处理)
            (this._textures || []).forEach(t => { if (t && t.dispose) t.dispose(); });
            this._textures = [];
            this._glassMats = [];
            this._mat = {};
            this._scene = this._camera = this._controls = this._renderer = null;
            this._pickables = [];
            this._slabMap = {};
            this._mySlabs = [];
        },

        // ---------- 地面 / 道路 / 绿化 ----------
        buildGround() {
            const S = this._scene;
            const plot = new THREE.Mesh(
                new THREE.BoxGeometry(178, 2, 132),
                new THREE.MeshLambertMaterial({ color: 0xa9c48f })
            );
            plot.position.y = -1;
            plot.receiveShadow = true;
            S.add(plot);

            // 中心景观带
            const plaza = new THREE.Mesh(
                new THREE.CylinderGeometry(17, 17, 0.5, 40),
                new THREE.MeshLambertMaterial({ color: 0xdcd6c4 })
            );
            plaza.position.set(0, 0.25, -5);
            plaza.receiveShadow = true;
            S.add(plaza);

            const pond = new THREE.Mesh(
                new THREE.CylinderGeometry(8, 8, 0.7, 32),
                new THREE.MeshLambertMaterial({ color: 0x7fb6d9 })
            );
            pond.position.set(0, 0.3, -5);
            S.add(pond);
        },
        buildRoads() {
            const S = this._scene;
            const roadMat = new THREE.MeshLambertMaterial({ color: 0x6d7480 });
            const add = (w, d, x, z) => {
                const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.4, d), roadMat);
                m.position.set(x, 0.2, z);
                m.receiveShadow = true;
                S.add(m);
            };
            add(178, 12, 0, 50);       // 小区主干道
            add(11, 118, 0, -4);       // 中央纵路
            add(178, 8, 0, -50);       // 北侧支路

            // 车位分隔线(地面车位)
            const lineMat = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });
            for (let i = 0; i < 12; i++) {
                const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 6), lineMat);
                l.position.set(58 + i * 2.6, 0.45, 22);
                S.add(l);
            }
        },
        buildParkingLots() {
            const S = this._scene;
            const lot = new THREE.Mesh(
                new THREE.BoxGeometry(38, 0.4, 26),
                new THREE.MeshLambertMaterial({ color: 0x8b8f96 })
            );
            lot.position.set(60, 0.25, 24);
            lot.receiveShadow = true;
            S.add(lot);

            // 小区外临街停车区(围栏外)
            const outer = new THREE.Mesh(
                new THREE.BoxGeometry(120, 0.4, 14),
                new THREE.MeshLambertMaterial({ color: 0x81858c })
            );
            outer.position.set(-20, 0.25, 74);
            outer.receiveShadow = true;
            S.add(outer);

            // 地下车库入口坡道
            const ramp = new THREE.Mesh(
                new THREE.BoxGeometry(14, 2, 10),
                new THREE.MeshLambertMaterial({ color: 0x555a61 })
            );
            ramp.position.set(-62, 0.4, 42);
            S.add(ramp);

            // 车辆(固定摆位, 保证每次渲染一致)
            const colors = [0xd64b4b, 0x2f6fb5, 0x2f2f33, 0xe0e0e0, 0x2e8b57, 0xd9a441];
            const cars = [
                [52, 24], [56, 24], [60, 24], [64, 24], [68, 24],
                [-60, 74], [-52, 74], [-44, 74], [-36, 74],
                [6, 44], [-6, 44], [70, -18]
            ];
            cars.forEach((p, i) => {
                const g = new THREE.Group();
                const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.5, 2.2),
                    new THREE.MeshLambertMaterial({ color: colors[i % colors.length] }));
                body.position.y = 1.1;
                body.castShadow = true;
                const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 2),
                    new THREE.MeshLambertMaterial({ color: 0xdfe6ee }));
                top.position.y = 2.35;
                g.add(body, top);
                g.position.set(p[0], 0.5, p[1]);
                S.add(g);
            });
        },
        buildTrees() {
            // 用固定种子的伪随机布置, 保证场景稳定可复现
            let seed = 20260923;
            const rnd = () => {
                seed = (seed * 1103515245 + 12345) % 2147483648;
                return seed / 2147483648;
            };
            const group = new THREE.Group();
            const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
            const leafMats = [
                new THREE.MeshLambertMaterial({ color: 0x4f8f4a }),
                new THREE.MeshLambertMaterial({ color: 0x3f7d3c }),
                new THREE.MeshLambertMaterial({ color: 0x66a35a })
            ];
            const spots = [];
            for (let i = 0; i < 46; i++) {
                const x = -80 + rnd() * 160;
                const z = -58 + rnd() * 116;
                // 避开楼栋与道路
                if (Math.abs(x) < 12 && z > -60 && z < 55) continue;
                if (z > 44 && z < 56) continue;
                if (spots.some(s => Math.abs(s[0] - x) < 7 && Math.abs(s[1] - z) < 7)) continue;
                spots.push([x, z]);
                const t = new THREE.Group();
                const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 4, 8), trunkMat);
                trunk.position.y = 2;
                const leaf = new THREE.Mesh(new THREE.ConeGeometry(3.1, 8.5, 9),
                    leafMats[Math.floor(rnd() * leafMats.length)]);
                leaf.position.y = 8;
                leaf.castShadow = true;
                t.add(trunk, leaf);
                t.position.set(x, 0.4, z);
                t.rotation.y = rnd() * Math.PI;
                group.add(t);
            }
            this._trees = group;
            this._scene.add(group);
        },
        buildFence() {
            const S = this._scene;
            const mat = new THREE.MeshLambertMaterial({ color: 0xb8bfc6 });
            const mk = (w, d, x, z) => {
                const m = new THREE.Mesh(new THREE.BoxGeometry(w, 2.4, d), mat);
                m.position.set(x, 1.6, z);
                S.add(m);
            };
            mk(180, 1.2, 0, -66);       // 北
            mk(180, 1.2, 0, 60);        // 南(留出大门缺口)
            mk(1.2, 126, -89, -3);      // 西
            mk(1.2, 126, 89, -3);       // 东
            // 大门
            const gateMat = new THREE.MeshLambertMaterial({ color: 0x8a7452 });
            [-12, 12].forEach(x => {
                const p = new THREE.Mesh(new THREE.BoxGeometry(2.6, 7, 2.6), gateMat);
                p.position.set(x, 3.9, 60);
                S.add(p);
            });
            const board = new THREE.Mesh(new THREE.BoxGeometry(27, 2.6, 1),
                new THREE.MeshLambertMaterial({ color: 0x3f6d54 }));
            board.position.set(0, 8.6, 60);
            S.add(board);
        },

        // ---------- 楼栋 ----------
        buildBuildings() {
            const layout = [
                [-52, -30], [0, -30], [52, -30],
                [-52, 18], [0, 18], [52, 18]
            ];
            const statusColor = {
                OCCUPIED: 0xd9b25f, RENTED: 0x6b9bd1, EMPTY: 0xb9bec4, DECORATING: 0xd98f5a
            };
            this.buildings.forEach((b, i) => {
                const pos = layout[i] || [0, -30 + i * 4];
                const g = new THREE.Group();
                g.position.set(pos[0], 0.4, pos[1]);

                const unitW = 11, depth = 15, floorH = 3.1;
                const width = b.unitCount * unitW;
                const height = b.floorCount * floorH;

                // 主楼体
                const body = new THREE.Mesh(
                    new THREE.BoxGeometry(width, height, depth),
                    new THREE.MeshLambertMaterial({ color: 0xe6e2d8 })
                );
                body.position.y = height / 2;
                body.castShadow = true;
                body.receiveShadow = true;
                body.userData = { type: 'building', buildingId: b.id };
                g.add(body);
                this._pickables.push(body);

                // 每层楼板(可点选) + 层间线脚
                const bandMat = new THREE.MeshLambertMaterial({ color: 0xcfcabd });
                for (let u = 1; u <= b.unitCount; u++) {
                    for (let f = 1; f <= b.floorCount; f++) {
                        const x = -width / 2 + unitW / 2 + (u - 1) * unitW;
                        const y = (f - 1) * floorH + floorH / 2;
                        const slab = new THREE.Mesh(
                            new THREE.BoxGeometry(unitW - 0.5, floorH - 0.5, depth + 0.6),
                            new THREE.MeshLambertMaterial({ color: statusColor.EMPTY })
                        );
                        slab.position.set(x, y, 0);
                        slab.castShadow = true;
                        slab.userData = { type: 'floor', buildingId: b.id, unitNo: u, floorNo: f, base: 0xb9bec4 };
                        g.add(slab);
                        this._pickables.push(slab);
                        const key = b.id + '-' + u + '-' + f;
                        (this._slabMap[key] = this._slabMap[key] || []).push(slab);

                        // 阳台
                        const balcony = new THREE.Mesh(
                            new THREE.BoxGeometry(unitW * 0.55, 0.5, 2.6),
                            bandMat
                        );
                        balcony.position.set(x, (f - 1) * floorH + 0.6, depth / 2 + 1.2);
                        balcony.castShadow = true;
                        g.add(balcony);
                    }
                }

                // 屋顶 + 电梯间 + 水箱
                const roof = new THREE.Mesh(
                    new THREE.BoxGeometry(width + 1.2, 0.8, depth + 1.2),
                    new THREE.MeshLambertMaterial({ color: 0x9aa0a6 })
                );
                roof.position.y = height + 0.4;
                roof.castShadow = true;
                g.add(roof);
                const lift = new THREE.Mesh(
                    new THREE.BoxGeometry(4.5, 3, 4.5),
                    new THREE.MeshLambertMaterial({ color: 0xb0b6bc })
                );
                lift.position.set(-width / 2 + 3.5, height + 2.2, 0);
                lift.castShadow = true;
                g.add(lift);
                const tank = new THREE.Mesh(
                    new THREE.CylinderGeometry(2.2, 2.2, 3, 16),
                    new THREE.MeshLambertMaterial({ color: 0xcdd3d8 })
                );
                tank.position.set(width / 2 - 4, height + 2.2, 0);
                tank.castShadow = true;
                g.add(tank);

                // 楼栋名称标牌
                const label = this.makeLabel(b.buildingNo + ' · ' + b.occupancyRate);
                label.position.set(0, height + 8, 0);
                g.add(label);

                this._buildings[b.id] = g;
                this._scene.add(g);
            });
        },
        /** 用 canvas 生成朝向相机的文字标牌(内容为楼栋名, 绘制而非拼接 HTML) */
        makeLabel(text) {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 64;
            const ctx = canvas.getContext && canvas.getContext('2d');
            if (!ctx) {
                // 无 2D 上下文时用几何体占位, 不影响场景
                return new THREE.Object3D();
            }
            ctx.fillStyle = 'rgba(20, 28, 24, 0.72)';
            ctx.fillRect(0, 0, 256, 64);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 30px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 128, 34);
            const tex = new THREE.CanvasTexture(canvas);
            const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
            sprite.scale.set(15, 3.75, 1);
            return sprite;
        },
        /** 依据真实房屋状态给楼板着色 */
        applyHouseStatus(buildingId, houses) {
            if (!this.colorByStatus) return;
            const color = {
                OCCUPIED: 0xd9b25f, RENTED: 0x6b9bd1, EMPTY: 0xb9bec4, DECORATING: 0xd98f5a
            };
            houses.forEach(h => {
                const slabs = this._slabMap[buildingId + '-' + h.unitNo + '-' + h.floorNo] || [];
                slabs.forEach(s => {
                    const c = (this.isOwner && this.myHouse && this.myHouse.houseId === h.id)
                        ? 0xf0b429 : (color[h.status] || 0xb9bec4);
                    s.material.color.setHex(c);
                });
            });
        },
        /** 业主视角: 自己的房间金色高亮 + 其他房间锁定灰 */
        applyOwnerMask() {
            if (!this.isOwner || !this.myHouse) return;
            Object.keys(this._slabMap).forEach(key => {
                const [bid, u, f] = key.split('-').map(Number);
                const mine = bid === this.myHouse.buildingId && u === this.myHouse.unitNo
                    && f === this.myHouse.floorNo;
                this._slabMap[key].forEach(s => {
                    if (mine) {
                        s.material.color.setHex(0xf0b429);
                        s.material.emissive && s.material.emissive.setHex(0x6b4a00);
                        this._mySlabs = (this._mySlabs || []).concat(s);
                    } else {
                        s.material.color.setHex(0x9aa0a6);
                        s.material.transparent = true;
                        s.material.opacity = 0.55;
                    }
                });
            });
        },
        toggleStatusColor() {
            this.colorByStatus = !this.colorByStatus;
            Object.keys(this._slabMap).forEach(key => {
                const [bid, u, f] = key.split('-').map(Number);
                const mine = this.isOwner && this.myHouse && bid === this.myHouse.buildingId
                    && u === this.myHouse.unitNo && f === this.myHouse.floorNo;
                this._slabMap[key].forEach(s => {
                    if (this.colorByStatus) {
                        s.material.color.setHex(mine ? 0xf0b429 : 0xb9bec4);
                    } else {
                        s.material.color.setHex(mine ? 0xf0b429 : 0xcfd8e3);
                    }
                });
            });
            if (this.colorByStatus && this.buildingHouses.length) {
                this.applyHouseStatus(this.selBuilding.id, this.buildingHouses);
                this.applyOwnerMask();
            }
            this.$message.success(this.colorByStatus ? '已按入住状态着色' : '已按楼栋统一着色');
        },

        // ---------- 交互 ----------
        onPointerDown(e) {
            this._downX = e.clientX;
            this._downY = e.clientY;
        },
        onPointerMove(e) {
            const hit = this.pick(e);
            if (this._hovered && (!hit || hit.object !== this._hovered.object)) {
                this.clearHover();
            }
            if (hit && hit.object.userData.type === 'floor') {
                this._hovered = hit;
                if (hit.object.material.emissive) {
                    hit.object.material.emissive.setHex(0x33597a);
                }
                this._renderer.domElement.style.cursor = 'pointer';
            } else if (hit) {
                this._renderer.domElement.style.cursor = 'pointer';
            } else {
                this._renderer.domElement.style.cursor = 'grab';
            }
        },
        clearHover() {
            if (this._hovered && this._hovered.object.material.emissive) {
                this._hovered.object.material.emissive.setHex(0x000000);
            }
            this._hovered = null;
            if (this._renderer) this._renderer.domElement.style.cursor = 'grab';
        },
        pick(e) {
            const host = this._renderer.domElement;
            const rect = host.getBoundingClientRect();
            const ndc = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
            );
            this._raycaster.setFromCamera(ndc, this._camera);
            const hits = this._raycaster.intersectObjects(this._pickables, false);
            return hits.length ? hits[0] : null;
        },
        onClick(e) {
            // 拖拽后不触发点选
            if (Math.abs(e.clientX - (this._downX || 0)) > 5
                || Math.abs(e.clientY - (this._downY || 0)) > 5) return;
            const hit = this.pick(e);
            if (!hit) return;
            const d = hit.object.userData;
            const b = this.buildings.find(x => x.id === d.buildingId);
            if (!b) return;
            if (d.type === 'building') {
                this.selectBuilding(b);
                return;
            }
            // 点到某一层的房间
            const houses = this.buildingHouses.filter(h => h.unitNo === d.unitNo && h.floorNo === d.floorNo);
            this.selectBuilding(b);
            if (this.isOwner) {
                const mine = this.myHouse && this.myHouse.buildingId === d.buildingId
                    && this.myHouse.unitNo === d.unitNo && this.myHouse.floorNo === d.floorNo;
                if (mine) {
                    this.enterMyHouse();
                } else {
                    this.$message.error('无权查看其他房间的信息');
                }
                return;
            }
            if (houses.length) {
                this.selectHouse(houses[0]);
            }
        },

        // ---------- 视角 ----------
        setView(v) {
            this.view = v;
            const aim = {
                bird: [{ x: 0, y: 96, z: 138 }, { x: 0, y: 6, z: 0 }],
                top: [{ x: 0, y: 190, z: 2 }, { x: 0, y: 0, z: 0 }],
                walk: [{ x: 0, y: 6, z: 92 }, { x: 0, y: 10, z: 0 }]
            }[v];
            this.flyTo(aim[0], aim[1]);
        },
        resetView() {
            this.view = 'bird';
            this.flyTo({ x: 0, y: 96, z: 138 }, { x: 0, y: 6, z: 0 });
        },
        flyToBuilding(b) {
            const g = this._buildings[b.id];
            if (!g) return;
            const x = g.position.x, z = g.position.z;
            const h = b.floorCount * 3.1;
            this.flyTo({ x: x + 34, y: h + 28, z: z + 52 }, { x: x, y: h / 2, z: z });
        },
        flyToHouse(h) {
            const g = this.selBuilding ? this._buildings[this.selBuilding.id] : null;
            if (!g) return;
            const t = { x: g.position.x, y: (h.floorNo || 1) * 3.1, z: g.position.z };
            this.flyTo({ x: t.x + 22, y: t.y + 16, z: t.z + 34 }, t);
        },
        flyToMyHouse() {
            if (!this.myHouse) return;
            const b = this.buildings.find(x => x.id === this.myHouse.buildingId);
            if (b) this.selBuilding = b;
            this.highlightBuilding(this.myHouse.buildingId);
            this.flyToHouse({ floorNo: this.myHouse.floorNo });
            this.$message.success('已定位到 ' + this.myHouse.houseNo);
        },
        highlightBuilding(id) {
            Object.keys(this._buildings).forEach(k => {
                const g = this._buildings[k];
                g.children.forEach(c => {
                    if (c.userData.type === 'building') {
                        c.material.color.setHex(+k === id ? 0xfff2cf : 0xe6e2d8);
                    }
                });
            });
        },
        toggleTrees() {
            this.showTrees = !this.showTrees;
            if (this._trees) this._trees.visible = this.showTrees;
        },
        /** 平滑飞行(在渲染循环里插值, 无第三方补间依赖) */
        flyTo(camPos, target) {
            if (!this._camera) return;
            this._fly = {
                fromPos: this._camera.position.clone(),
                toPos: new THREE.Vector3(camPos.x, camPos.y, camPos.z),
                fromTgt: this._controls.target.clone(),
                toTgt: new THREE.Vector3(target.x, target.y, target.z),
                start: performance.now(),
                dur: 760
            };
        },

        // ---------- 渲染循环 ----------
        animate() {
            const loop = () => {
                this._raf = requestAnimationFrame(loop);
                const now = performance.now();
                if (this._fly) {
                    const k = Math.min(1, (now - this._fly.start) / this._fly.dur);
                    const e = k < 0.5 ? 2 * k * k : -1 + (4 - 2 * k) * k;   // easeInOutQuad
                    this._camera.position.lerpVectors(this._fly.fromPos, this._fly.toPos, e);
                    this._controls.target.lerpVectors(this._fly.fromTgt, this._fly.toTgt, e);
                    if (k >= 1) this._fly = null;
                }
                // 自家房屋呼吸灯效果
                if (this._mySlabs && this._mySlabs.length) {
                    const intensity = 0.35 + 0.35 * Math.sin(now / 420);
                    this._mySlabs.forEach(s => {
                        if (s.material.emissive) s.material.emissive.setRGB(intensity * 0.55, intensity * 0.38, 0);
                    });
                }
                this._controls.update();
                this._renderer.render(this._scene, this._camera);
            };
            loop();
        }
    }
});
