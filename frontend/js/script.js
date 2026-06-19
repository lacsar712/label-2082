document.addEventListener('DOMContentLoaded', () => {
    // State management
    let currentUser = JSON.parse(localStorage.getItem('user')) || null;
    let currentFilter = '';
    let myOrdersView = 'created'; // 'created' or 'accepted'
    let leaderboardPeriod = 'total'; // 'week', 'month', 'total'
    let expandedRunner = null;
    let lfState = {
        type: '全部',
        category: '全部',
        keyword: '',
        sort: 'desc',
        view: 'all' // 'all' or 'mine'
    };
    let lfSearchTimer = null;
    let notifState = {
        type: 'all',
        filter: 'all'
    };
    let notifPollTimer = null;
    let faqState = {
        category: '全部',
        keyword: ''
    };
    let helpSearchTimer = null;

    const elements = {
        authOverlay: document.getElementById('auth-overlay'),
        mainApp: document.getElementById('main-app'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        tabLogin: document.getElementById('tab-login'),
        tabRegister: document.getElementById('tab-register'),
        displayName: document.getElementById('display-name'),
        displayMajor: document.getElementById('display-major'),
        welcomeName: document.getElementById('welcome-name'),
        logoutBtn: document.getElementById('logout-btn'),
        orderList: document.getElementById('order-list'),
        myOrdersList: document.getElementById('my-orders-list'),
        activeCount: document.getElementById('active-count'),
        orderForm: document.getElementById('order-form'),
        navItems: document.querySelectorAll('.nav-item'),
        filterPills: document.querySelectorAll('.pill'),
        viewSections: document.querySelectorAll('.view-section'),
        showCreated: document.getElementById('show-created'),
        showAccepted: document.getElementById('show-accepted'),
        profileRealName: document.getElementById('profile-realname'),
        profileMajor: document.getElementById('profile-major-disp'),
        toast: document.getElementById('toast'),
        editProfileBtn: document.getElementById('edit-profile-btn'),
        accountSecBtn: document.getElementById('account-sec-btn'),
        profileModal: document.getElementById('profile-modal'),
        securityModal: document.getElementById('security-modal'),
        profileForm: document.getElementById('profile-form'),
        securityForm: document.getElementById('security-form'),
        editRealname: document.getElementById('edit-realname'),
        editMajor: document.getElementById('edit-major'),
        editPassword: document.getElementById('edit-password'),
        podiumSection: document.getElementById('podium-section'),
        leaderboardList: document.getElementById('leaderboard-list'),
        periodToggles: document.querySelectorAll('#leaderboard-tab .toggle-btn'),
        lfMasonry: document.getElementById('lf-masonry'),
        lfPostBtn: document.getElementById('lf-post-btn'),
        lfFilterBtns: document.querySelectorAll('.lf-filter-btn'),
        lfSearchInput: document.getElementById('lf-search-input'),
        lfCategorySelect: document.getElementById('lf-category-select'),
        lfSortSelect: document.getElementById('lf-sort-select'),
        lfViewAll: document.getElementById('lf-view-all'),
        lfViewMine: document.getElementById('lf-view-mine'),
        lfModal: document.getElementById('lf-modal'),
        lfForm: document.getElementById('lf-form'),
        lfModalTitle: document.getElementById('lf-modal-title'),
        lfEditId: document.getElementById('lf-edit-id'),
        lfTitle: document.getElementById('lf-title'),
        lfDescription: document.getElementById('lf-description'),
        lfLocation: document.getElementById('lf-location'),
        lfContact: document.getElementById('lf-contact'),
        lfCategory: document.getElementById('lf-category'),
        notifBadge: document.getElementById('notif-badge'),
        notifList: document.getElementById('notif-list'),
        markAllReadBtn: document.getElementById('mark-all-read-btn'),
        notifFilterBtns: document.querySelectorAll('.notif-filter-btn'),
        notifTypeTabs: document.querySelectorAll('.notif-type-tab'),
        helpTab: document.querySelector('[data-tab="help"]'),
        helpSearchInput: document.getElementById('help-search-input'),
        faqCategoryPills: document.querySelectorAll('.faq-category-pills .pill'),
        faqItems: document.querySelectorAll('.faq-item'),
        faqAccordion: document.getElementById('faq-accordion'),
        supportForm: document.getElementById('support-form'),
        supportCategory: document.getElementById('support-category'),
        supportTitle: document.getElementById('support-title'),
        supportDescription: document.getElementById('support-description'),
        feedbackList: document.getElementById('feedback-list')
    };

    // --- Authentication ---
    function updateUIForLogin() {
        if (currentUser) {
            elements.authOverlay.classList.add('hidden');
            elements.mainApp.classList.remove('hidden');
            elements.displayName.textContent = currentUser.realName;
            elements.displayMajor.textContent = currentUser.major;
            elements.welcomeName.textContent = currentUser.realName;
            const pkgCustomerDisp = document.getElementById('pkg-customer-disp');
            if (pkgCustomerDisp) pkgCustomerDisp.textContent = currentUser.realName;

            startNotificationPolling();
            fetchUnreadCount();

            document.querySelector('[data-tab="dashboard"]').click();
        } else {
            stopNotificationPolling();
            elements.authOverlay.classList.remove('hidden');
            elements.mainApp.classList.add('hidden');
        }
    }

    elements.tabLogin.onclick = () => {
        elements.loginForm.classList.remove('hidden');
        elements.registerForm.classList.add('hidden');
        elements.tabLogin.classList.add('active');
        elements.tabRegister.classList.remove('active');
    };

    elements.tabRegister.onclick = () => {
        elements.loginForm.classList.add('hidden');
        elements.registerForm.classList.remove('hidden');
        elements.tabLogin.classList.remove('active');
        elements.tabRegister.classList.add('active');
    };

    elements.loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-user').value;
        const password = document.getElementById('login-pass').value;
        try {
            const resp = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (!resp.ok) {
                showToast('账号或密码错误');
                return;
            }
            const data = await resp.json();
            if (data.status === 'success') {
                currentUser = data;
                localStorage.setItem('user', JSON.stringify(data));
                updateUIForLogin();
                showToast('登录成功！');
                // Clear form
                elements.loginForm.reset();
            } else {
                showToast('账号或密码错误');
            }
        } catch (err) { showToast('服务器连接失败'); }
    };

    elements.registerForm.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            username: document.getElementById('reg-user').value,
            password: document.getElementById('reg-pass').value,
            realName: document.getElementById('reg-name').value,
            major: document.getElementById('reg-major').value
        };
        try {
            const resp = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await resp.json();
            if (resp.ok && data.status === 'success') {
                currentUser = data;
                localStorage.setItem('user', JSON.stringify(data));
                updateUIForLogin();
                showToast('注册成功！');
                elements.registerForm.reset();
            } else {
                showToast(data.message || '注册失败');
            }
        } catch (err) { showToast('注册失败'); }
    };

    elements.logoutBtn.onclick = () => {
        localStorage.removeItem('user');
        currentUser = null;
        // Clear sensitive UI elements
        elements.orderList.innerHTML = '';
        elements.myOrdersList.innerHTML = '';
        elements.loginForm.reset();
        elements.registerForm.reset();

        // Ensure returning to login tab
        elements.tabLogin.click();

        updateUIForLogin();
    };

    // --- Navigation & Tabs ---
    elements.navItems.forEach(item => {
        item.onclick = (e) => {
            e.preventDefault();
            const tab = item.dataset.tab;
            elements.navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            elements.viewSections.forEach(v => v.classList.add('hidden'));
            document.getElementById(`${tab}-tab`).classList.remove('hidden');

            if (tab === 'dashboard') fetchOrders();
            if (tab === 'my-orders') fetchMyOrders();
            if (tab === 'profile') {
                loadProfile();
                loadUserFeedbacks();
            }
            if (tab === 'leaderboard') fetchLeaderboard();
            if (tab === 'lostfound') fetchLostFound();
            if (tab === 'help') loadHelpCenter();
            if (tab === 'stations') {
                stationsState.zoom = 1;
                if (elements.campusMap) elements.campusMap.style.transform = 'scale(1)';
                fetchStations();
            }
            if (tab === 'notifications') {
                fetchNotifications();
                fetchUnreadCount();
            }
        };
    });

    // --- Order Logic ---
    async function fetchOrders() {
        try {
            let url = `/api/orders?category=${encodeURIComponent(currentFilter)}`;
            const resp = await fetch(url);
            const orders = await resp.json();
            renderOrders(orders, elements.orderList);
            elements.activeCount.textContent = orders.filter(o => o.status !== 'completed').length;
        } catch (err) { console.error(err); }
    }

    async function fetchMyOrders() {
        try {
            let url = myOrdersView === 'created'
                ? `/api/orders?creator=${currentUser.username}`
                : `/api/orders?worker=${currentUser.username}`;
            const resp = await fetch(url);
            const orders = await resp.json();
            renderOrders(orders, elements.myOrdersList, true);
        } catch (err) { console.error(err); }
    }

    function renderOrders(orders, container, isMyOrders = false) {
        container.innerHTML = '';
        if (!isMyOrders) {
            orders = orders.filter(o => o.status === 'pending' && o.creator !== currentUser.username);
        }

        if (orders.length === 0) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 40px;">暂无订单数据</div>';
            return;
        }
        orders.forEach(order => {
            const card = document.createElement('div');
            card.className = `order-card ${order.status}`;

            const statusMap = { 'pending': '待接单', 'accepted': '进行中', 'delivered': '待收货', 'completed': '已完成', 'cancelled': '已撤回' };

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="badge ${order.status}">${statusMap[order.status]}</span>
                    <span style="color: #f43f5e; font-weight: 800; font-size: 1.2rem;">${order.reward}</span>
                </div>
                <div class="order-body">
                    <h3>${order.package}</h3>
                    <div class="info-row"><i class="fas fa-map-marker-alt"></i> <span>${order.pickup}</span></div>
                    <div class="info-row"><i class="fas fa-door-open"></i> <span>送至: ${order.delivery}</span></div>
                    <div class="info-row"><i class="fas fa-user-circle"></i> <span>发布人: ${order.creator}</span></div>
                    ${order.worker ? `<div class="info-row"><i class="fas fa-hands-helping"></i> <span>接单人: ${order.worker}</span></div>` : ''}
                </div>
                <div class="order-footer">
                    ${!isMyOrders && order.status === 'pending' ?
                    `<button class="btn-primary" onclick="updateStatus(${order.id}, 'accepted')">确认接单</button>` : ''}

                    ${isMyOrders && myOrdersView === 'accepted' && order.status === 'accepted' ?
                    `<button class="btn-primary" onclick="updateStatus(${order.id}, 'delivered')">确认送达</button>` : ''}

                    ${isMyOrders && myOrdersView === 'created' && (order.status === 'accepted' || order.status === 'delivered') ?
                    `<button class="btn-primary" style="background:var(--accent);color:#fff" onclick="updateStatus(${order.id}, 'completed')">确认收货并支付 / 评价</button>` : ''}

                    ${isMyOrders && myOrdersView === 'created' && order.status === 'pending' ?
                    `<button class="btn-outline" style="color: #ef4444;" onclick="updateStatus(${order.id}, 'cancelled')"><i class="fas fa-undo"></i> 撤回发布</button>` : ''}
                </div>
            `;
            container.appendChild(card);
        });
    }

    // Filter Logic
    elements.filterPills.forEach(pill => {
        pill.onclick = () => {
            elements.filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            let ds = pill.dataset.filter;
            currentFilter = (ds === '全部') ? '' : ds;
            fetchOrders();
        };
    });

    // My Orders Toggle
    elements.showCreated.onclick = () => {
        elements.showCreated.classList.add('active');
        elements.showAccepted.classList.remove('active');
        myOrdersView = 'created';
        fetchMyOrders();
    };
    elements.showAccepted.onclick = () => {
        elements.showAccepted.classList.add('active');
        elements.showCreated.classList.remove('active');
        myOrdersView = 'accepted';
        fetchMyOrders();
    };

    // Post Order
    elements.orderForm.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            package: document.getElementById('pkg-name').value,
            pickup: document.getElementById('pkg-pickup').value,
            delivery: document.getElementById('pkg-delivery').value,
            reward: document.getElementById('pkg-reward').value,
            creator: currentUser.username
        };
        try {
            const resp = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (resp.ok) {
                showToast('发布成功！');
                elements.orderForm.reset();
                document.querySelector('[data-tab="dashboard"]').click();
            } else {
                showToast('发布失败');
            }
        } catch (err) { showToast('发布失败'); }
    }

    // Status Update
    window.updateStatus = async (id, status) => {
        const payload = { id, status, worker: currentUser.username };
        try {
            const resp = await fetch('/api/update_status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!resp.ok) {
                showToast('操作失败，请重试');
                return;
            }

            if (status === 'accepted') showToast('接单成功，请尽快送达！');
            else if (status === 'delivered') showToast('已送达，等待发单人确认。');
            else if (status === 'completed') showToast('任务完成，感谢使用！');
            else if (status === 'cancelled') showToast('已成功撤回该订单。');

            if (document.getElementById('dashboard-tab').classList.contains('hidden')) fetchMyOrders();
            else fetchOrders();
        } catch (err) { showToast('操作失败'); }
    };

    // --- Profile ---
    async function loadProfile() {
        elements.profileRealName.textContent = currentUser.realName;
        elements.profileMajor.textContent = currentUser.major;

        // Fetch real stats from backend
        try {
            // Count orders created by this user (发布任务)
            const createdResp = await fetch(`/api/orders?creator=${currentUser.username}`);
            const createdOrders = await createdResp.json();
            document.getElementById('stat-created').textContent = createdOrders.length;

            // Count orders completed as worker (代取成功)
            const workerResp = await fetch(`/api/orders?worker=${currentUser.username}`);
            const workerOrders = await workerResp.json();
            const completedCount = workerOrders.filter(o => o.status === 'completed').length;
            document.getElementById('stat-delivered').textContent = completedCount;

            // Credit score stays at 98 (static)
            document.getElementById('stat-credit').textContent = '98';
        } catch (err) {
            console.error('Failed to load profile stats:', err);
        }
    }

    elements.editProfileBtn.onclick = () => {
        elements.editRealname.value = currentUser.realName;
        elements.editMajor.value = currentUser.major;
        elements.profileModal.classList.remove('hidden');
    };

    elements.accountSecBtn.onclick = () => {
        elements.editPassword.value = '';
        elements.securityModal.classList.remove('hidden');
    };

    elements.profileForm.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            username: currentUser.username,
            realName: elements.editRealname.value,
            major: elements.editMajor.value
        };
        try {
            const resp = await fetch('/api/update_profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (resp.ok) {
                currentUser.realName = payload.realName;
                currentUser.major = payload.major;
                localStorage.setItem('user', JSON.stringify(currentUser));
                loadProfile();
                updateUIForLogin();
                elements.profileModal.classList.add('hidden');
                showToast('个人资料修改成功！');
            }
        } catch (err) { showToast('修改失败'); }
    };

    elements.securityForm.onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            username: currentUser.username,
            password: elements.editPassword.value
        };
        try {
            const resp = await fetch('/api/update_profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (resp.ok) {
                elements.securityModal.classList.add('hidden');
                showToast('新密码修改成功，请重新登录');
                setTimeout(() => elements.logoutBtn.click(), 1500);
            }
        } catch (err) { showToast('修改失败'); }
    };

    // --- Leaderboard ---
    async function fetchLeaderboard() {
        try {
            const resp = await fetch(`/api/leaderboard?period=${leaderboardPeriod}`);
            const data = await resp.json();
            renderLeaderboard(data);
        } catch (err) {
            console.error('Failed to fetch leaderboard:', err);
            showToast('加载排行榜失败');
        }
    }

    function renderLeaderboard(runners) {
        elements.podiumSection.innerHTML = '';
        elements.leaderboardList.innerHTML = '';
        expandedRunner = null;

        if (runners.length === 0) {
            elements.podiumSection.innerHTML = `
                <div class="empty-leaderboard" style="width:100%;">
                    <i class="fas fa-trophy"></i>
                    <p>暂无排行数据，快去接单冲榜吧！</p>
                </div>
            `;
            return;
        }

        const top3 = runners.slice(0, 3);
        const rest = runners.slice(3);

        top3.forEach((runner, index) => {
            const rank = index + 1;
            const card = document.createElement('div');
            card.className = `podium-card rank-${rank}`;
            card.dataset.username = runner.username;
            card.innerHTML = `
                <div class="podium-rank-badge">${rank}</div>
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${runner.username}" alt="${runner.nickname}" class="podium-avatar">
                <div class="podium-name">${runner.nickname}</div>
                <div class="podium-major">${runner.major}</div>
                <div class="podium-stats">
                    <div class="podium-stat">
                        <span class="podium-stat-val">${runner.totalOrders}</span>
                        <span class="podium-stat-lab">完成单量</span>
                    </div>
                    <div class="podium-stat">
                        <span class="podium-stat-val">${runner.goodRate}%</span>
                        <span class="podium-stat-lab">好评率</span>
                    </div>
                </div>
            `;
            card.onclick = () => toggleRunnerDetail(runner.username, card);
            elements.podiumSection.appendChild(card);
        });

        rest.forEach((runner) => {
            const cardWrap = document.createElement('div');
            cardWrap.className = 'runner-card-wrapper';

            const card = document.createElement('div');
            card.className = 'runner-card';
            card.dataset.username = runner.username;
            card.innerHTML = `
                <div class="runner-rank">${runner.rank}</div>
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${runner.username}" alt="${runner.nickname}" class="runner-avatar">
                <div class="runner-info">
                    <div class="runner-name">${runner.nickname}</div>
                    <div class="runner-major">${runner.major}</div>
                </div>
                <div class="runner-stats">
                    <div class="runner-stat">
                        <div class="runner-stat-val">${runner.totalOrders}</div>
                        <div class="runner-stat-lab">完成单量</div>
                    </div>
                    <div class="runner-stat good">
                        <div class="runner-stat-val">${runner.goodRate}%</div>
                        <div class="runner-stat-lab">好评率</div>
                    </div>
                    <div class="runner-stat activity">
                        <div class="runner-stat-val">${runner.weekActivity}</div>
                        <div class="runner-stat-lab">近7日</div>
                    </div>
                </div>
                <i class="fas fa-chevron-down runner-expand-icon"></i>
            `;
            card.onclick = () => toggleRunnerDetail(runner.username, card);

            const detail = document.createElement('div');
            detail.className = 'runner-detail-panel';
            detail.dataset.username = runner.username;

            cardWrap.appendChild(card);
            cardWrap.appendChild(detail);
            elements.leaderboardList.appendChild(cardWrap);
        });
    }

    async function toggleRunnerDetail(username, cardEl) {
        const isExpanded = cardEl.classList.contains('expanded');

        document.querySelectorAll('.runner-card.expanded').forEach(card => {
            card.classList.remove('expanded');
        });
        document.querySelectorAll('.podium-card.expanded').forEach(card => {
            card.classList.remove('expanded');
        });

        if (isExpanded) {
            expandedRunner = null;
            return;
        }

        cardEl.classList.add('expanded');
        expandedRunner = username;

        let detailPanel;
        if (cardEl.classList.contains('podium-card')) {
            detailPanel = cardEl.querySelector('.podium-detail-panel');
            if (!detailPanel) {
                detailPanel = document.createElement('div');
                detailPanel.className = 'podium-detail-panel';
                cardEl.appendChild(detailPanel);
            }
        } else {
            const wrapper = cardEl.closest('.runner-card-wrapper');
            detailPanel = wrapper.querySelector('.runner-detail-panel');
        }

        if (!detailPanel) return;
        detailPanel.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);"><i class="fas fa-spinner fa-spin"></i> 加载中...</div>';

        try {
            const resp = await fetch(`/api/runner_detail?username=${encodeURIComponent(username)}`);
            const data = await resp.json();
            renderRunnerDetail(detailPanel, data);
        } catch (err) {
            detailPanel.innerHTML = '<div style="text-align:center;padding:20px;color:#ef4444;">加载失败</div>';
        }
    }

    function renderRunnerDetail(panel, data) {
        if (data.recentOrders.length === 0) {
            panel.innerHTML = `
                <div style="text-align:center;padding:20px;color:var(--text-muted);">
                    暂无完成的订单
                </div>
            `;
            return;
        }

        const orders = data.recentOrders.slice(0, 5);
        let html = '<div class="recent-orders-title"><i class="fas fa-box" style="color:var(--primary);margin-right:8px;"></i>近期完成订单</div>';

        orders.forEach(order => {
            const stars = '★'.repeat(order.rating || 5) + '☆'.repeat(5 - (order.rating || 5));
            html += `
                <div class="recent-order-item">
                    <div class="recent-order-icon">
                        <i class="fas fa-package"></i>
                    </div>
                    <div class="recent-order-info">
                        <div class="recent-order-pkg">${order.package}</div>
                        <div class="recent-order-addr">
                            <i class="fas fa-map-marker-alt" style="margin-right:4px;"></i>${order.pickup} → ${order.delivery}
                        </div>
                    </div>
                    <div class="recent-order-meta">
                        <div class="recent-order-reward">${order.reward}</div>
                        <div class="recent-order-rating">${stars}</div>
                    </div>
                </div>
            `;
        });

        panel.innerHTML = html;
    }

    elements.periodToggles.forEach(btn => {
        btn.onclick = () => {
            elements.periodToggles.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            leaderboardPeriod = btn.dataset.period;
            fetchLeaderboard();
        };
    });

    function showToast(msg) {
        const t = elements.toast;
        t.textContent = msg;
        t.classList.remove('hidden');
        setTimeout(() => t.classList.add('hidden'), 3000);
    }

    // --- Lost & Found Logic ---
    async function fetchLostFound() {
        try {
            const params = new URLSearchParams();
            if (lfState.type !== '全部') params.append('type', lfState.type);
            if (lfState.category !== '全部') params.append('category', lfState.category);
            if (lfState.keyword) params.append('keyword', lfState.keyword);
            params.append('sort', lfState.sort);
            if (lfState.view === 'mine') params.append('creator', currentUser.username);

            const resp = await fetch(`/api/lostfound?${params.toString()}`);
            const items = await resp.json();
            renderLostFound(items);
        } catch (err) {
            console.error('Failed to fetch lostfound:', err);
            showToast('加载失物招领数据失败');
        }
    }

    function renderLostFound(items) {
        if (!items || items.length === 0) {
            elements.lfMasonry.innerHTML = `
                <div class="lf-empty-state">
                    <i class="fas fa-inbox"></i>
                    <h3>暂无布告</h3>
                    <p>${lfState.view === 'mine' ? '你还没有发布过布告，快去发布第一条吧！' : '还没有任何布告信息，点击右上角发布吧！'}</p>
                </div>
            `;
            return;
        }

        elements.lfMasonry.innerHTML = '';
        items.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = `lf-card ${item.type}`;
            card.style.animationDelay = `${idx * 0.05}s`;

            const isOwner = item.creator === currentUser.username;
            const typeIcon = item.type === 'lost' ? 'fa-search' : 'fa-hand-holding-heart';
            const typeText = item.type === 'lost' ? '丢失启事' : '拾取招领';

            card.innerHTML = `
                <span class="lf-card-type-badge">
                    <i class="fas ${typeIcon}"></i> ${typeText}
                </span>
                <span class="lf-card-cat-tag">${item.category}</span>
                <h3 class="lf-card-title">${escapeHtml(item.title)}</h3>
                <p class="lf-card-desc">${escapeHtml(item.description)}</p>
                <div class="lf-card-meta">
                    <div class="lf-card-meta-row">
                        <i class="fas fa-map-marker-alt"></i>
                        <span><strong>${escapeHtml(item.location)}</strong></span>
                    </div>
                    <div class="lf-card-meta-row">
                        <i class="fas fa-address-book"></i>
                        <span><strong>${escapeHtml(item.contact)}</strong></span>
                    </div>
                </div>
                <div class="lf-card-footer">
                    <div class="lf-card-creator">
                        <img class="lf-card-avatar" src="https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(item.creator)}" alt="${escapeHtml(item.creatorName)}">
                        <div class="lf-card-user-info">
                            <span class="lf-card-user-name">${escapeHtml(item.creatorName)}</span>
                            <span class="lf-card-date">${formatDate(item.createdAt)}</span>
                        </div>
                    </div>
                    ${isOwner ? `
                    <div class="lf-card-actions">
                        <button class="lf-action-btn edit" title="编辑" onclick="editLostFound(${item.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="lf-action-btn offline" title="下架" onclick="offlineLostFound(${item.id})">
                            <i class="fas fa-eye-slash"></i>
                        </button>
                    </div>
                    ` : ''}
                </div>
            `;
            elements.lfMasonry.appendChild(card);
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr.replace(' ', 'T'));
        if (isNaN(date.getTime())) return dateStr;
        const now = new Date();
        const diff = now - date;
        const min = Math.floor(diff / 60000);
        const hour = Math.floor(diff / 3600000);
        const day = Math.floor(diff / 86400000);
        if (min < 1) return '刚刚';
        if (min < 60) return `${min}分钟前`;
        if (hour < 24) return `${hour}小时前`;
        if (day < 30) return `${day}天前`;
        return dateStr.slice(5, 16);
    }

    function openLfModal(isEdit = false, data = null) {
        elements.lfForm.reset();
        elements.lfEditId.value = '';

        if (isEdit && data) {
            elements.lfModalTitle.innerHTML = '<i class="fas fa-edit"></i> 编辑布告';
            elements.lfEditId.value = data.id;
            elements.lfTitle.value = data.title;
            elements.lfDescription.value = data.description;
            elements.lfLocation.value = data.location;
            elements.lfContact.value = data.contact;
            elements.lfCategory.value = data.category;
            const radio = document.querySelector(`input[name="lf-type"][value="${data.type}"]`);
            if (radio) radio.checked = true;
        } else {
            elements.lfModalTitle.innerHTML = '<i class="fas fa-bullhorn"></i> 发布布告';
            const firstRadio = document.querySelector('input[name="lf-type"]');
            if (firstRadio) firstRadio.checked = false;
        }

        elements.lfModal.classList.remove('hidden');
    }

    elements.lfPostBtn.onclick = () => openLfModal(false);

    window.editLostFound = async (id) => {
        try {
            const resp = await fetch(`/api/lostfound?creator=${encodeURIComponent(currentUser.username)}`);
            const items = await resp.json();
            const item = items.find(x => x.id === id);
            if (item) {
                openLfModal(true, item);
            } else {
                showToast('未找到该布告');
            }
        } catch (err) {
            showToast('加载布告详情失败');
        }
    };

    window.offlineLostFound = async (id) => {
        if (!confirm('确定要下架这条布告吗？下架后将不再显示。')) return;
        try {
            const resp = await fetch('/api/lostfound_offline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, creator: currentUser.username })
            });
            const data = await resp.json();
            if (resp.ok && data.status === 'success') {
                showToast('布告已下架');
                fetchLostFound();
            } else {
                showToast(data.message || '下架失败');
            }
        } catch (err) {
            showToast('下架失败');
        }
    };

    elements.lfForm.onsubmit = async (e) => {
        e.preventDefault();
        const editId = elements.lfEditId.value;
        const typeRadio = document.querySelector('input[name="lf-type"]:checked');
        if (!typeRadio) {
            showToast('请选择布告类型');
            return;
        }

        const payload = {
            type: typeRadio.value,
            title: elements.lfTitle.value.trim(),
            description: elements.lfDescription.value.trim(),
            location: elements.lfLocation.value.trim(),
            contact: elements.lfContact.value.trim(),
            category: elements.lfCategory.value,
            creator: currentUser.username
        };

        if (!payload.title || !payload.description || !payload.location || !payload.contact || !payload.category) {
            showToast('请填写所有必填字段');
            return;
        }

        try {
            let resp;
            if (editId) {
                payload.id = parseInt(editId);
                resp = await fetch('/api/lostfound_update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                resp = await fetch('/api/lostfound', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            const data = await resp.json();
            if (resp.ok && data.status === 'success') {
                showToast(editId ? '布告已更新！' : '布告发布成功！');
                elements.lfModal.classList.add('hidden');
                fetchLostFound();
            } else {
                showToast(data.message || (editId ? '更新失败' : '发布失败'));
            }
        } catch (err) {
            showToast(editId ? '更新失败' : '发布失败');
        }
    };

    // LF Filters
    elements.lfFilterBtns.forEach(btn => {
        btn.onclick = () => {
            elements.lfFilterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            lfState.type = btn.dataset.lfType;
            fetchLostFound();
        };
    });

    elements.lfSearchInput.oninput = () => {
        clearTimeout(lfSearchTimer);
        lfSearchTimer = setTimeout(() => {
            lfState.keyword = elements.lfSearchInput.value.trim();
            fetchLostFound();
        }, 350);
    };

    elements.lfCategorySelect.onchange = () => {
        lfState.category = elements.lfCategorySelect.value;
        fetchLostFound();
    };

    elements.lfSortSelect.onchange = () => {
        lfState.sort = elements.lfSortSelect.value;
        fetchLostFound();
    };

    elements.lfViewAll.onclick = () => {
        elements.lfViewAll.classList.add('active');
        elements.lfViewMine.classList.remove('active');
        lfState.view = 'all';
        fetchLostFound();
    };

    elements.lfViewMine.onclick = () => {
        elements.lfViewMine.classList.add('active');
        elements.lfViewAll.classList.remove('active');
        lfState.view = 'mine';
        fetchLostFound();
    };

    // --- Notifications Logic ---
    async function fetchUnreadCount() {
        if (!currentUser) return;
        try {
            const resp = await fetch(`/api/unread_count?username=${encodeURIComponent(currentUser.username)}`);
            const data = await resp.json();
            if (data.status === 'success') {
                updateNotifBadge(data.count);
            }
        } catch (err) {
            console.error('Failed to fetch unread count:', err);
        }
    }

    function updateNotifBadge(count) {
        if (!elements.notifBadge) return;
        if (count > 0) {
            elements.notifBadge.classList.remove('hidden');
            elements.notifBadge.textContent = count > 99 ? '99+' : count;
        } else {
            elements.notifBadge.classList.add('hidden');
        }
    }

    function startNotificationPolling() {
        stopNotificationPolling();
        notifPollTimer = setInterval(() => {
            if (currentUser) fetchUnreadCount();
        }, 30000);
    }

    function stopNotificationPolling() {
        if (notifPollTimer) {
            clearInterval(notifPollTimer);
            notifPollTimer = null;
        }
    }

    async function fetchNotifications() {
        if (!currentUser) return;
        try {
            let url = `/api/notifications?username=${encodeURIComponent(currentUser.username)}`;
            if (notifState.filter === 'unread') {
                url += '&unread=1';
            }
            const resp = await fetch(url);
            const notifications = await resp.json();
            renderNotifications(notifications);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
            showToast('加载通知失败');
        }
    }

    function renderNotifications(notifications) {
        if (!elements.notifList) return;

        let filtered = notifications;
        if (notifState.type !== 'all') {
            filtered = notifications.filter(n => n.type === notifState.type);
        }

        if (filtered.length === 0) {
            const emptyText = notifState.filter === 'unread'
                ? '暂无未读消息'
                : (notifState.type !== 'all' ? '暂无该类型的消息' : '暂无任何消息');
            elements.notifList.innerHTML = `
                <div class="notif-empty">
                    <i class="fas fa-inbox"></i>
                    <h3>${emptyText}</h3>
                    <p>有新消息时会在这里显示哦～</p>
                </div>
            `;
            return;
        }

        elements.notifList.innerHTML = '';
        filtered.forEach(notif => {
            const typeIconMap = {
                'order': 'fa-box',
                'system': 'fa-bullhorn',
                'auth': 'fa-shield-alt',
                'report': 'fa-flag'
            };
            const typeTextMap = {
                'order': '订单动态',
                'system': '系统公告',
                'auth': '认证结果',
                'report': '举报处理'
            };
            const iconClass = typeIconMap[notif.type] || 'fa-bell';
            const typeText = typeTextMap[notif.type] || '系统消息';
            const notifClass = notif.type || 'system';

            const card = document.createElement('div');
            card.className = `notif-item ${notif.isRead ? '' : 'unread'}`;
            card.innerHTML = `
                <div class="notif-icon ${notifClass}">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="notif-content">
                    <div class="notif-title">
                        ${notif.isRead ? '' : '<span class="notif-unread-dot"></span>'}
                        <span>${escapeHtml(notif.title)}</span>
                    </div>
                    <div class="notif-summary">${escapeHtml(notif.summary)}</div>
                    <div class="notif-meta">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span class="notif-type-tag ${notifClass}">${typeText}</span>
                            <span class="notif-time">
                                <i class="far fa-clock"></i> ${formatDate(notif.createdAt)}
                            </span>
                        </div>
                        ${notif.isRead ? '' : `
                        <button class="notif-action" data-notif-id="${notif.id}" onclick="event.stopPropagation(); markNotifRead(${notif.id})">
                            <i class="fas fa-check"></i> 标记已读
                        </button>
                        `}
                    </div>
                </div>
            `;
            card.onclick = () => {
                if (!notif.isRead) {
                    markNotifRead(notif.id);
                }
            };
            elements.notifList.appendChild(card);
        });
    }

    window.markNotifRead = async (id) => {
        if (!currentUser) return;
        try {
            const resp = await fetch('/api/mark_read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, username: currentUser.username })
            });
            const data = await resp.json();
            if (resp.ok && data.status === 'success') {
                fetchNotifications();
                fetchUnreadCount();
            }
        } catch (err) {
            showToast('操作失败');
        }
    };

    elements.markAllReadBtn.onclick = async () => {
        if (!currentUser) return;
        try {
            const resp = await fetch('/api/mark_all_read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: currentUser.username })
            });
            const data = await resp.json();
            if (resp.ok && data.status === 'success') {
                showToast(data.marked > 0 ? `已将 ${data.marked} 条消息标记为已读` : '没有未读消息');
                fetchNotifications();
                fetchUnreadCount();
            }
        } catch (err) {
            showToast('操作失败');
        }
    };

    elements.notifFilterBtns.forEach(btn => {
        btn.onclick = () => {
            elements.notifFilterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            notifState.filter = btn.dataset.notifFilter;
            fetchNotifications();
        };
    });

    elements.notifTypeTabs.forEach(tab => {
        tab.onclick = () => {
            elements.notifTypeTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            notifState.type = tab.dataset.notifType;
            fetchNotifications();
        };
    });

    // --- Help Center Logic ---

    elements.faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.onclick = () => {
                const isActive = item.classList.contains('active');
                elements.faqItems.forEach(i => i.classList.remove('active'));
                if (!isActive) {
                    item.classList.add('active');
                }
            };
        }
    });

    elements.faqCategoryPills.forEach(pill => {
        pill.onclick = () => {
            elements.faqCategoryPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            faqState.category = pill.dataset.faqCategory;
            filterAndRenderFAQ();
        };
    });

    if (elements.helpSearchInput) {
        elements.helpSearchInput.oninput = () => {
            clearTimeout(helpSearchTimer);
            helpSearchTimer = setTimeout(() => {
                faqState.keyword = elements.helpSearchInput.value.trim();
                filterAndRenderFAQ();
            }, 300);
        };
    }

    function filterAndRenderFAQ() {
        elements.faqItems.forEach(item => {
            const itemCategory = item.dataset.category;
            const categoryMatch = faqState.category === '全部' || itemCategory === faqState.category;

            let keywordMatch = true;
            if (faqState.keyword) {
                const questionEl = item.querySelector('.faq-question span');
                const answerEl = item.querySelector('.faq-answer');
                const text = (questionEl ? questionEl.textContent : '') + (answerEl ? answerEl.textContent : '');
                keywordMatch = text.toLowerCase().includes(faqState.keyword.toLowerCase());
            }

            if (categoryMatch && keywordMatch) {
                item.classList.remove('hidden');
                if (faqState.keyword) {
                    const questionEl = item.querySelector('.faq-question span');
                    const answerEl = item.querySelector('.faq-answer');
                    if (questionEl) highlightText(questionEl, faqState.keyword);
                    if (answerEl) highlightText(answerEl, faqState.keyword);
                } else {
                    const questionEl = item.querySelector('.faq-question span');
                    const answerEl = item.querySelector('.faq-answer');
                    if (questionEl) removeHighlight(questionEl);
                    if (answerEl) removeHighlight(answerEl);
                }
            } else {
                item.classList.add('hidden');
                item.classList.remove('active');
            }
        });
    }

    function highlightText(element, keyword) {
        if (!keyword) return;
        const pattern = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');

        function processNode(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent;
                if (pattern.test(text)) {
                    const fragment = document.createDocumentFragment();
                    let lastIndex = 0;
                    let match;
                    pattern.lastIndex = 0;
                    while ((match = pattern.exec(text)) !== null) {
                        if (match.index > lastIndex) {
                            fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
                        }
                        const mark = document.createElement('mark');
                        mark.textContent = match[0];
                        fragment.appendChild(mark);
                        lastIndex = pattern.lastIndex;
                    }
                    if (lastIndex < text.length) {
                        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
                    }
                    node.parentNode.replaceChild(fragment, node);
                }
            } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'MARK' && node.tagName !== 'I') {
                const children = Array.from(node.childNodes);
                children.forEach(processNode);
            }
        }

        removeHighlight(element);
        processNode(element);
    }

    function removeHighlight(element) {
        const marks = element.querySelectorAll('mark');
        marks.forEach(mark => {
            const parent = mark.parentNode;
            while (mark.firstChild) {
                parent.insertBefore(mark.firstChild, mark);
            }
            parent.removeChild(mark);
            parent.normalize();
        });
    }

    if (elements.supportForm) {
        elements.supportForm.onsubmit = async (e) => {
            e.preventDefault();
            const payload = {
                username: currentUser.username,
                category: elements.supportCategory.value,
                title: elements.supportTitle.value.trim(),
                description: elements.supportDescription.value.trim()
            };

            if (!payload.category || !payload.title || !payload.description) {
                showToast('请填写所有必填字段');
                return;
            }

            try {
                const resp = await fetch('/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await resp.json();
                if (resp.ok && data.status === 'success') {
                    showToast('反馈提交成功，我们会尽快处理！');
                    elements.supportForm.reset();
                } else {
                    showToast(data.message || '提交失败，请重试');
                }
            } catch (err) {
                showToast('提交失败，请检查网络连接');
            }
        };
    }

    async function loadUserFeedbacks() {
        if (!currentUser || !elements.feedbackList) return;

        try {
            const resp = await fetch(`/api/feedback?username=${encodeURIComponent(currentUser.username)}`);
            const feedbacks = await resp.json();
            renderUserFeedbacks(feedbacks);
        } catch (err) {
            console.error('Failed to load user feedbacks:', err);
        }
    }

    function renderUserFeedbacks(feedbacks) {
        if (!elements.feedbackList) return;

        elements.feedbackList.innerHTML = '';

        if (!feedbacks || feedbacks.length === 0) {
            elements.feedbackList.innerHTML = `
                <div style="text-align:center; padding: 30px; color: #64748b;">
                    <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
                    <p>暂无反馈记录</p>
                </div>
            `;
            return;
        }

        feedbacks.forEach(fb => {
            const statusMap = {
                'pending': { text: '处理中', class: 'feedback-status-pending' },
                'resolved': { text: '已回复', class: 'feedback-status-resolved' },
                'closed': { text: '已解决', class: 'feedback-status-resolved' }
            };
            const categoryClassMap = {
                '账号注册': 'feedback-cat-account',
                '任务发布': 'feedback-cat-task',
                '接单配送': 'feedback-cat-delivery',
                '报酬结算': 'feedback-cat-payment',
                '账户安全': 'feedback-cat-security',
                '意见建议': 'feedback-cat-suggestion',
                '其他': 'feedback-cat-other'
            };
            const status = statusMap[fb.status] || statusMap['pending'];
            const categoryClass = categoryClassMap[fb.category] || 'feedback-cat-other';
            const isResolved = fb.status === 'resolved' || fb.status === 'closed';

            let replyHtml = '';
            if (isResolved) {
                const replyContent = fb.reply || '感谢你的反馈！我们已经收到并处理了你的问题，如有其他疑问欢迎继续反馈~';
                replyHtml = `
                    <div class="feedback-reply">
                        <div class="feedback-reply-label">客服回复：</div>
                        <div class="feedback-reply-content">${escapeHtml(replyContent)}</div>
                    </div>
                `;
            }

            const card = document.createElement('div');
            card.className = 'feedback-item';
            card.innerHTML = `
                <div class="feedback-item-header">
                    <span class="feedback-category ${categoryClass}">${escapeHtml(fb.category)}</span>
                    <span class="feedback-status ${status.class}">${status.text}</span>
                    <span class="feedback-date">${formatDate(fb.createdAt)}</span>
                </div>
                <div class="feedback-item-title">${escapeHtml(fb.title)}</div>
                <div class="feedback-item-desc">${escapeHtml(fb.description)}</div>
                ${replyHtml}
            `;
            elements.feedbackList.appendChild(card);
        });
    }

    function loadHelpCenter() {
        faqState.category = '全部';
        faqState.keyword = '';

        elements.faqCategoryPills.forEach(p => {
            p.classList.remove('active');
            if (p.dataset.faqCategory === '全部') p.classList.add('active');
        });

        if (elements.helpSearchInput) {
            elements.helpSearchInput.value = '';
        }

        elements.faqItems.forEach(item => {
            item.classList.remove('active');
            item.classList.remove('hidden');
            const questionEl = item.querySelector('.faq-question span');
            const answerEl = item.querySelector('.faq-answer');
            if (questionEl) removeHighlight(questionEl);
            if (answerEl) removeHighlight(answerEl);
        });
    }

    let stationsState = {
        view: 'map',
        sort: 'pending_desc',
        zoom: 1,
        activeStation: null,
        data: []
    };

    Object.assign(elements, {
        stationsSummary: document.getElementById('stations-summary'),
        stationMarkers: document.getElementById('station-markers'),
        stationsMapView: document.getElementById('stations-map-view'),
        stationsListView: document.getElementById('stations-list-view'),
        stationsViewToggles: document.querySelectorAll('[data-stations-view]'),
        stationsRefreshBtn: document.getElementById('stations-refresh-btn'),
        stationsSortSelect: document.getElementById('stations-sort-select'),
        stationsListGrid: document.getElementById('stations-list-grid'),
        stationsListCount: document.getElementById('stations-list-count'),
        stationPopup: document.getElementById('station-popup'),
        zoomIn: document.getElementById('zoom-in'),
        zoomReset: document.getElementById('zoom-reset'),
        zoomOut: document.getElementById('zoom-out'),
        campusMap: document.querySelector('.campus-map')
    });

    async function fetchStations() {
        try {
            const resp = await fetch('/api/stations');
            const stations = await resp.json();
            stationsState.data = stations;
            renderStations();
        } catch (err) {
            console.error('Failed to fetch stations:', err);
            showToast('加载驿站数据失败');
        }
    }

    function renderStations() {
        renderStationSummary();
        renderMapMarkers();
        renderStationList();
    }

    function getPendingLevel(count) {
        if (count >= 5) return 'hot';
        if (count >= 2) return 'medium';
        return 'cool';
    }

    function renderStationSummary() {
        if (!elements.stationsSummary) return;
        const stations = stationsState.data;

        if (!stations || stations.length === 0) {
            elements.stationsSummary.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; color:var(--text-muted); padding:20px;">
                    暂无驿站数据
                </div>`;
            return;
        }

        elements.stationsSummary.innerHTML = stations.map(s => {
            const level = getPendingLevel(s.pendingCount);
            return `
                <div class="summary-card" data-station-id="${s.id}">
                    <div class="summary-card-icon" style="background:${s.color}">
                        <i class="fas ${s.icon}"></i>
                    </div>
                    <div class="summary-card-info">
                        <div class="summary-card-name">${s.shortName}</div>
                        <div class="summary-card-count ${level}">${s.pendingCount}</div>
                    </div>
                </div>
            `;
        }).join('');

        elements.stationsSummary.querySelectorAll('.summary-card').forEach(card => {
            card.onclick = () => {
                const id = card.dataset.stationId;
                const station = stationsState.data.find(s => s.id === id);
                if (station) {
                    if (stationsState.view === 'map') {
                        focusStationOnMap(station);
                    }
                    showStationPopup(station, card);
                }
            };
        });
    }

    function renderMapMarkers() {
        if (!elements.stationMarkers) return;
        const stations = stationsState.data;

        if (!stations || stations.length === 0) {
            elements.stationMarkers.innerHTML = '';
            return;
        }

        elements.stationMarkers.innerHTML = stations.map(s => {
            const level = getPendingLevel(s.pendingCount);
            return `
                <div class="station-marker" data-station-id="${s.id}"
                     style="left:${s.mapX}%; top:${s.mapY}%;">
                    <div class="marker-pin" style="background:${s.color}">
                        <i class="fas ${s.icon}"></i>
                        ${s.pendingCount > 0 ? `<div class="marker-badge"><span>${s.pendingCount}</span></div>` : ''}
                    </div>
                    <div class="marker-label">${s.shortName}</div>
                </div>
            `;
        }).join('');

        elements.stationMarkers.querySelectorAll('.station-marker').forEach(marker => {
            marker.onclick = (e) => {
                e.stopPropagation();
                const id = marker.dataset.stationId;
                const station = stationsState.data.find(s => s.id === id);
                if (station) {
                    document.querySelectorAll('.station-marker').forEach(m => m.classList.remove('active'));
                    marker.classList.add('active');
                    stationsState.activeStation = id;
                    showStationPopup(station, marker);
                }
            };
        });
    }

    function focusStationOnMap(station) {
        if (!elements.campusMap) return;
        const allMarkers = document.querySelectorAll('.station-marker');
        allMarkers.forEach(m => {
            m.classList.remove('active');
            if (m.dataset.stationId === station.id) {
                m.classList.add('active');
            }
        });
    }

    function renderStationList() {
        if (!elements.stationsListGrid) return;
        let stations = [...stationsState.data];

        if (!stations || stations.length === 0) {
            elements.stationsListGrid.innerHTML = `
                <div class="stations-empty">
                    <i class="fas fa-store-slash"></i>
                    <h3>暂无驿站数据</h3>
                    <p>驿站信息加载中，请稍后...</p>
                </div>`;
            if (elements.stationsListCount) {
                elements.stationsListCount.innerHTML = '共 <strong>0</strong> 个驿站';
            }
            return;
        }

        switch (stationsState.sort) {
            case 'pending_desc':
                stations.sort((a, b) => b.pendingCount - a.pendingCount);
                break;
            case 'pending_asc':
                stations.sort((a, b) => a.pendingCount - b.pendingCount);
                break;
            case 'name_asc':
                stations.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
                break;
        }

        elements.stationsListGrid.innerHTML = stations.map(s => {
            const level = getPendingLevel(s.pendingCount);
            return `
                <div class="station-list-card" data-station-id="${s.id}" style="--card-color:${s.color}">
                    <div class="station-card-header">
                        <div class="station-card-icon" style="background:${s.color}">
                            <i class="fas ${s.icon}"></i>
                        </div>
                        <div class="station-card-title">
                            <div class="station-card-name">${escapeHtml(s.name)}</div>
                            <div class="station-card-gate">
                                <i class="fas fa-map-pin"></i> ${escapeHtml(s.gate)}
                            </div>
                        </div>
                        <div class="station-card-pending">
                            <div class="pending-num ${level}">${s.pendingCount}</div>
                            <div class="pending-label">待取任务</div>
                        </div>
                    </div>
                    <div class="station-card-body">
                        <div class="station-info-row">
                            <i class="fas fa-clock"></i>
                            <span class="station-info-label">营业时间</span>
                            <span class="station-info-value">${escapeHtml(s.hours)}</span>
                        </div>
                        <div class="station-info-row">
                            <i class="fas fa-phone"></i>
                            <span class="station-info-label">联系电话</span>
                            <span class="station-info-value">${escapeHtml(s.phone)}</span>
                        </div>
                    </div>
                    <div class="station-card-footer">
                        <button class="station-card-btn primary" onclick="viewStationTasks('${s.id}')">
                            <i class="fas fa-list-ul"></i> 查看任务
                        </button>
                        <button class="station-card-btn secondary" onclick="showStationCardPopup('${s.id}')">
                            <i class="fas fa-info-circle"></i> 详情
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        const styleEl = document.getElementById('station-card-style') || (() => {
            const el = document.createElement('style');
            el.id = 'station-card-style';
            document.head.appendChild(el);
            return el;
        })();
        styleEl.textContent = '.station-list-card::before{ background: var(--card-color, var(--primary)); }';

        if (elements.stationsListCount) {
            elements.stationsListCount.innerHTML = `共 <strong>${stations.length}</strong> 个驿站`;
        }
    }

    function showStationPopup(station, anchorEl) {
        if (!elements.stationPopup) return;
        const level = getPendingLevel(station.pendingCount);
        const levelText = level === 'hot' ? '🔥 任务火爆' : level === 'medium' ? '✨ 任务适中' : '🌿 任务较少';

        elements.stationPopup.innerHTML = `
            <div class="popup-header">
                <div class="popup-icon" style="background:${station.color}">
                    <i class="fas ${station.icon}"></i>
                </div>
                <div class="popup-title-info">
                    <div class="popup-name">${escapeHtml(station.name)}</div>
                    <div class="popup-gate">
                        <i class="fas fa-map-pin"></i> ${escapeHtml(station.gate)}
                    </div>
                </div>
                <button class="popup-close" onclick="hideStationPopup()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="popup-pending-bar">
                <span class="popup-pending-label">当前待取任务</span>
                <span class="popup-pending-count ${level}">
                    ${station.pendingCount} 单
                    <span style="font-size:0.75rem; font-weight:600; opacity:0.8;">${levelText}</span>
                </span>
            </div>
            <div class="popup-body">
                <div class="popup-info-row">
                    <i class="fas fa-clock"></i>
                    <span class="popup-info-label">营业时间</span>
                    <span class="popup-info-value">${escapeHtml(station.hours)}</span>
                </div>
                <div class="popup-info-row">
                    <i class="fas fa-phone"></i>
                    <span class="popup-info-label">联系电话</span>
                    <span class="popup-info-value">${escapeHtml(station.phone)}</span>
                </div>
                <div class="popup-info-row">
                    <i class="fas fa-location-dot"></i>
                    <span class="popup-info-label">位置区域</span>
                    <span class="popup-info-value">${escapeHtml(station.gate)}</span>
                </div>
            </div>
            <div class="popup-footer">
                <button class="popup-btn primary" onclick="viewStationTasks('${station.id}')">
                    <i class="fas fa-list-ul"></i> 查看该驿站任务
                </button>
                <button class="popup-btn secondary" onclick="hideStationPopup()">
                    关闭
                </button>
            </div>
        `;

        elements.stationPopup.classList.remove('hidden');
        positionPopup(anchorEl);
    }

    function positionPopup(anchorEl) {
        if (!elements.stationPopup || !anchorEl) return;

        const popup = elements.stationPopup;
        const rect = anchorEl.getBoundingClientRect();
        const popupRect = popup.getBoundingClientRect();

        let left = rect.left + rect.width / 2 - popupRect.width / 2;
        let top = rect.bottom + 12;

        if (left < 10) left = 10;
        if (left + popupRect.width > window.innerWidth - 10) {
            left = window.innerWidth - popupRect.width - 10;
        }
        if (top + popupRect.height > window.innerHeight - 10) {
            top = rect.top - popupRect.height - 12;
            if (top < 10) top = 10;
        }

        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;
    }

    window.hideStationPopup = () => {
        if (elements.stationPopup) {
            elements.stationPopup.classList.add('hidden');
        }
        document.querySelectorAll('.station-marker').forEach(m => m.classList.remove('active'));
        stationsState.activeStation = null;
    };

    window.showStationCardPopup = (stationId) => {
        const station = stationsState.data.find(s => s.id === stationId);
        if (station) {
            const card = document.querySelector(`.station-list-card[data-station-id="${stationId}"]`);
            showStationPopup(station, card || document.body);
        }
    };

    window.viewStationTasks = (stationId) => {
        const station = stationsState.data.find(s => s.id === stationId);
        if (!station) return;
        hideStationPopup();
        currentFilter = station.id === 'zt' ? '中通' :
                        station.id === 'cainiao' ? '菜鸟' :
                        station.id === 'sf' ? '顺丰' :
                        station.id === 'jd' ? '京东' : '';

        elements.filterPills.forEach(p => {
            p.classList.remove('active');
            if (p.dataset.filter === currentFilter || (currentFilter === '' && p.dataset.filter === '全部')) {
                p.classList.add('active');
            }
        });

        document.querySelector('[data-tab="dashboard"]').click();
        showToast(`已切换到「${station.shortName}」的待取任务`);
    };

    elements.stationsViewToggles.forEach(btn => {
        btn.onclick = () => {
            elements.stationsViewToggles.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            stationsState.view = btn.dataset.stationsView;
            hideStationPopup();

            if (stationsState.view === 'map') {
                elements.stationsMapView.classList.remove('hidden');
                elements.stationsListView.classList.add('hidden');
            } else {
                elements.stationsMapView.classList.add('hidden');
                elements.stationsListView.classList.remove('hidden');
            }
        };
    });

    if (elements.stationsRefreshBtn) {
        elements.stationsRefreshBtn.onclick = () => {
            const icon = elements.stationsRefreshBtn.querySelector('i');
            if (icon) icon.classList.add('fa-spin');
            fetchStations().finally(() => {
                if (icon) setTimeout(() => icon.classList.remove('fa-spin'), 500);
            });
            showToast('数据已刷新');
        };
    }

    if (elements.stationsSortSelect) {
        elements.stationsSortSelect.onchange = () => {
            stationsState.sort = elements.stationsSortSelect.value;
            renderStationList();
        };
    }

    function setMapZoom(zoom) {
        stationsState.zoom = Math.max(0.6, Math.min(1.8, zoom));
        if (elements.campusMap) {
            elements.campusMap.style.transform = `scale(${stationsState.zoom})`;
            elements.campusMap.style.transformOrigin = 'center center';
        }
    }

    if (elements.zoomIn) {
        elements.zoomIn.onclick = () => setMapZoom(stationsState.zoom + 0.2);
    }
    if (elements.zoomOut) {
        elements.zoomOut.onclick = () => setMapZoom(stationsState.zoom - 0.2);
    }
    if (elements.zoomReset) {
        elements.zoomReset.onclick = () => setMapZoom(1);
    }

    document.addEventListener('click', (e) => {
        if (elements.stationPopup && !elements.stationPopup.classList.contains('hidden')) {
            if (!elements.stationPopup.contains(e.target) &&
                !e.target.closest('.station-marker') &&
                !e.target.closest('.summary-card') &&
                !e.target.closest('.station-list-card') &&
                !e.target.closest('.station-card-btn')) {
                hideStationPopup();
            }
        }
    });

    window.addEventListener('resize', () => {
        if (elements.stationPopup && !elements.stationPopup.classList.contains('hidden') && stationsState.activeStation) {
            const marker = document.querySelector(`.station-marker[data-station-id="${stationsState.activeStation}"]`);
            if (marker) positionPopup(marker);
        }
    });

    // Init
    updateUIForLogin();
});
