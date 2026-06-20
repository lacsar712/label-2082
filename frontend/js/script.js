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
    let walletState = {
        type: 'all',
        month: ''
    };
    let expandedTxnIds = new Set();
    let templatesState = {
        sort: 'default',
        keyword: '',
        allTemplates: []
    };
    let selTplSearchTimer = null;
    let tplSearchTimer = null;
    let previousBadgeKeys = new Set();
    let allBadgesData = [];

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
        feedbackList: document.getElementById('feedback-list'),
        walletBalance: document.getElementById('wallet-balance'),
        walletTotalIncome: document.getElementById('wallet-total-income'),
        walletTotalExpense: document.getElementById('wallet-total-expense'),
        walletMonthIncome: document.getElementById('wallet-month-income'),
        walletMonthExpense: document.getElementById('wallet-month-expense'),
        walletTxnList: document.getElementById('wallet-txn-list'),
        walletMonthFilter: document.getElementById('wallet-month-filter'),
        walletTypeBtns: document.querySelectorAll('.wallet-type-btn'),
        walletTab: document.querySelector('[data-tab="wallet"]'),
        profileWalletCard: document.querySelector('.profile-wallet-card'),
        pkgUseBalance: document.getElementById('pkg-use-balance'),
        pkgBalanceAvailable: document.getElementById('pkg-balance-available'),
        btnFromTemplate: document.getElementById('btn-from-template'),
        btnSaveTemplate: document.getElementById('btn-save-template'),
        saveTemplateModal: document.getElementById('save-template-modal'),
        saveTemplateForm: document.getElementById('save-template-form'),
        stName: document.getElementById('st-name'),
        tpPackage: document.getElementById('tp-package'),
        tpPickup: document.getElementById('tp-pickup'),
        tpDelivery: document.getElementById('tp-delivery'),
        tpReward: document.getElementById('tp-reward'),
        selectTemplateModal: document.getElementById('select-template-modal'),
        selectTemplateList: document.getElementById('select-template-list'),
        selTplSearch: document.getElementById('sel-tpl-search'),
        editTemplateModal: document.getElementById('edit-template-modal'),
        editTemplateForm: document.getElementById('edit-template-form'),
        etId: document.getElementById('et-id'),
        etName: document.getElementById('et-name'),
        etPackage: document.getElementById('et-package'),
        etPickup: document.getElementById('et-pickup'),
        etDelivery: document.getElementById('et-delivery'),
        etReward: document.getElementById('et-reward'),
        createTemplateModal: document.getElementById('create-template-modal'),
        createTemplateForm: document.getElementById('create-template-form'),
        templatesGrid: document.getElementById('templates-grid'),
        templatesSearchInput: document.getElementById('templates-search-input'),
        templatesSortSelect: document.getElementById('templates-sort-select'),
        btnCreateTemplateFromLib: document.getElementById('btn-create-template-from-lib'),
        defaultTemplateBanner: document.getElementById('default-template-banner'),
        defaultTemplateName: document.getElementById('default-template-name'),
        navAdminReports: document.getElementById('nav-admin-reports'),
        reportModal: document.getElementById('report-modal'),
        reportForm: document.getElementById('report-form'),
        reportOrderId: document.getElementById('report-order-id'),
        reportTargetUser: document.getElementById('report-target-user'),
        reportDescription: document.getElementById('report-description'),
        myReportsList: document.getElementById('my-reports-list'),
        adminReportsList: document.getElementById('admin-reports-list'),
        adminReportsSummary: document.getElementById('reports-summary-cards'),
        adminReportStatusFilter: document.getElementById('admin-report-status-filter'),
        adminReportTypeFilter: document.getElementById('admin-report-type-filter'),
        adminReportRefreshBtn: document.getElementById('admin-reports-refresh'),
        adminReportModal: document.getElementById('admin-report-modal'),
        adminReportForm: document.getElementById('admin-report-form'),
        adminReportId: document.getElementById('admin-report-id'),
        adminReportDetailId: document.getElementById('ari-id'),
        adminReportDetailType: document.getElementById('ari-type'),
        adminReportDetailReporter: document.getElementById('ari-reporter'),
        adminReportDetailTarget: document.getElementById('ari-target'),
        adminReportDetailOrder: document.getElementById('ari-order'),
        adminReportDetailTime: document.getElementById('ari-time'),
        adminReportDetailDesc: document.getElementById('ari-desc'),
        adminReportStatus: document.getElementById('admin-report-status'),
        adminReportHandlerNote: document.getElementById('admin-report-note'),
        shareCodeInput: document.getElementById('share-code-input'),
        shareCodeSearchBtn: document.getElementById('share-code-search-btn'),
        shareCodeModal: document.getElementById('share-code-modal'),
        shareCodeDisplayText: document.getElementById('share-code-display-text'),
        shareCodeExpiry: document.getElementById('share-code-expiry'),
        shareCodeCopyBtn: document.getElementById('share-code-copy-btn'),
        shareCodeGenerateBtn: document.getElementById('share-code-generate-btn'),
        shareCodeShareText: document.getElementById('share-code-share-text'),
        shareCodeCopyShareBtn: document.getElementById('share-code-copy-share-btn')
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

            const statBalance = document.getElementById('stat-balance');
            if (statBalance) {
                statBalance.textContent = (currentUser.balance || 0).toFixed(2);
            }
            if (elements.pkgBalanceAvailable) {
                elements.pkgBalanceAvailable.textContent = (currentUser.balance || 0).toFixed(2);
            }

            startNotificationPolling();
            fetchUnreadCount();

            if (currentUser.username === 'admin' && elements.navAdminReports) {
                elements.navAdminReports.classList.remove('hidden');
            } else if (elements.navAdminReports) {
                elements.navAdminReports.classList.add('hidden');
            }

            document.querySelector('[data-tab="dashboard"]').click();
        } else {
            stopNotificationPolling();
            elements.authOverlay.classList.remove('hidden');
            elements.mainApp.classList.add('hidden');
            if (elements.navAdminReports) elements.navAdminReports.classList.add('hidden');
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
                loadUserReports();
            }
            if (tab === 'admin-reports') {
                fetchAdminReports();
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
            if (tab === 'wallet') {
                loadWalletSummary();
                loadWalletTransactions();
            }
            if (tab === 'templates') {
                fetchTemplates();
            }
            if (tab === 'post-task') {
                applyDefaultTemplateIfAny();
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
            card.dataset.orderId = order.id;

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
                    `<div style="display: flex; gap: 8px; width: 100%;">
                        <button class="order-share-btn" onclick="openShareCodeModal(${order.id})" style="flex: 1;"><i class="fas fa-share-alt"></i> 分享口令</button>
                        <button class="btn-outline" style="color: #ef4444; flex: 1;" onclick="updateStatus(${order.id}, 'cancelled')"><i class="fas fa-undo"></i> 撤回发布</button>
                    </div>` : ''}

                    ${order.status !== 'pending' && order.creator !== currentUser.username ?
                    `<button class="order-report-btn" onclick="openReportModal(${order.id}, '${order.creator}')"><i class="fas fa-flag"></i> 举报</button>` : ''}
                    ${isMyOrders && myOrdersView === 'created' && (order.status === 'accepted' || order.status === 'delivered' || order.status === 'completed') && order.worker ?
                    `<button class="order-report-btn" onclick="openReportModal(${order.id}, '${order.worker}')"><i class="fas fa-flag"></i> 举报</button>` : ''}
                    ${isMyOrders && myOrdersView === 'accepted' && (order.status === 'delivered' || order.status === 'completed') ?
                    `<button class="order-report-btn" onclick="openReportModal(${order.id}, '${order.creator}')"><i class="fas fa-flag"></i> 举报</button>` : ''}
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
        const useBalance = document.getElementById('pkg-use-balance').checked;
        const reward = parseFloat(document.getElementById('pkg-reward').value) || 0;
        
        if (useBalance && reward > (currentUser.balance || 0)) {
            showToast('余额不足，无法使用余额抵扣');
            return;
        }
        
        const payload = {
            package: document.getElementById('pkg-name').value,
            pickup: document.getElementById('pkg-pickup').value,
            delivery: document.getElementById('pkg-delivery').value,
            reward: document.getElementById('pkg-reward').value,
            creator: currentUser.username,
            useBalanceDeduction: useBalance
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

            if (status === 'completed' || status === 'delivered') {
                loadBadges();
            }
        } catch (err) { showToast('操作失败'); }
    };

    // --- Share Code ---
    let currentShareCodeOrderId = null;
    let highlightTimer = null;

    async function generateShareCode(orderId) {
        try {
            const resp = await fetch('/api/share_code/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ creator: currentUser.username, orderId: orderId })
            });
            const data = await resp.json();
            if (data.status === 'success') {
                return data.code;
            } else {
                showToast(data.message || '生成分享口令失败');
                return null;
            }
        } catch (err) {
            showToast('生成分享口令失败');
            return null;
        }
    }

    async function verifyShareCode(code) {
        try {
            const resp = await fetch('/api/share_code/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: code.toUpperCase() })
            });
            const data = await resp.json();
            if (data.status === 'success') {
                return { success: true, orderId: data.orderId, message: data.message };
            } else {
                return { success: false, message: data.message };
            }
        } catch (err) {
            return { success: false, message: '验证失败，请重试' };
        }
    }

    function copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                return successful ? Promise.resolve() : Promise.reject();
            } catch (err) {
                document.body.removeChild(textArea);
                return Promise.reject(err);
            }
        }
    }

    function formatTimeRemaining(seconds) {
        if (seconds <= 0) return '已过期';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}小时${minutes}分钟`;
        } else {
            return `${minutes}分钟`;
        }
    }

    function generateShareText(orderInfo, code) {
        if (!orderInfo) {
            return `我在「校递快跑」发布了一个悬赏任务，分享口令：${code}，打开校递快跑输入口令即可快速找到并接单~`;
        }
        return `我在「校递快跑」发布了一个悬赏任务：${orderInfo.package}\n悬赏：${orderInfo.reward}\n取件：${orderInfo.pickup}\n送达：${orderInfo.delivery}\n分享口令：${code}\n打开校递快跑输入口令即可快速找到并接单~`;
    }

    async function getOrderById(orderId) {
        try {
            const resp = await fetch('/api/orders');
            const orders = await resp.json();
            return orders.find(o => o.id === orderId) || null;
        } catch (err) {
            return null;
        }
    }

    async function openShareCodeModal(orderId) {
        currentShareCodeOrderId = orderId;
        elements.shareCodeModal.classList.remove('hidden');
        elements.shareCodeDisplayText.textContent = '生成中...';
        elements.shareCodeShareText.textContent = '加载中...';

        const orderInfo = await getOrderById(orderId);
        const code = await generateShareCode(orderId);

        if (code) {
            elements.shareCodeDisplayText.textContent = code;
            const shareText = generateShareText(orderInfo, code);
            elements.shareCodeShareText.textContent = shareText;

            try {
                const resp = await fetch(`/api/share_code?creator=${encodeURIComponent(currentUser.username)}&orderId=${orderId}`);
                const data = await resp.json();
                if (data.exists && data.expiresInSeconds) {
                    elements.shareCodeExpiry.innerHTML = `<i class="fas fa-clock"></i> 有效期：${formatTimeRemaining(data.expiresInSeconds)}`;
                }
            } catch (e) {
                elements.shareCodeExpiry.innerHTML = '<i class="fas fa-clock"></i> 有效期：24小时';
            }
        } else {
            elements.shareCodeDisplayText.textContent = '------';
            elements.shareCodeShareText.textContent = '生成失败，请重试';
        }
    }

    window.openShareCodeModal = openShareCodeModal;

    async function searchByShareCode() {
        const code = elements.shareCodeInput.value.trim();
        if (!code || code.length !== 6) {
            showToast('请输入6位分享口令');
            return;
        }

        const result = await verifyShareCode(code);
        if (result.success) {
            document.querySelector('[data-tab="dashboard"]').click();
            setTimeout(() => {
                scrollToAndHighlightOrder(result.orderId);
            }, 300);
            showToast('口令验证成功，已定位到目标订单');
        } else {
            showToast(result.message || '口令无效');
        }
    }

    function scrollToAndHighlightOrder(orderId) {
        const card = document.querySelector(`.order-card[data-order-id="${orderId}"]`);
        if (!card) {
            fetchOrders().then(() => {
                const newCard = document.querySelector(`.order-card[data-order-id="${orderId}"]`);
                if (newCard) {
                    doHighlight(newCard);
                }
            });
            return;
        }
        doHighlight(card);
    }

    function doHighlight(card) {
        if (highlightTimer) {
            clearTimeout(highlightTimer);
            document.querySelectorAll('.order-card.highlight').forEach(c => c.classList.remove('highlight'));
        }

        card.scrollIntoView({ behavior: 'smooth', block: 'center' });

        setTimeout(() => {
            card.classList.add('highlight');
        }, 300);

        highlightTimer = setTimeout(() => {
            card.classList.remove('highlight');
            highlightTimer = null;
        }, 5000);
    }

    elements.shareCodeSearchBtn.onclick = searchByShareCode;
    elements.shareCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchByShareCode();
        }
    });
    elements.shareCodeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

    elements.shareCodeCopyBtn.onclick = async () => {
        const code = elements.shareCodeDisplayText.textContent;
        if (code && code !== '------' && code !== '生成中...') {
            try {
                await copyToClipboard(code);
                showToast('口令已复制到剪贴板');
            } catch (err) {
                showToast('复制失败，请手动复制');
            }
        }
    };

    elements.shareCodeGenerateBtn.onclick = async () => {
        if (currentShareCodeOrderId) {
            elements.shareCodeDisplayText.textContent = '生成中...';
            const code = await generateShareCode(currentShareCodeOrderId);
            if (code) {
                elements.shareCodeDisplayText.textContent = code;
                const orderInfo = await getOrderById(currentShareCodeOrderId);
                const shareText = generateShareText(orderInfo, code);
                elements.shareCodeShareText.textContent = shareText;
                showToast('新口令已生成');
            }
        }
    };

    elements.shareCodeCopyShareBtn.onclick = async () => {
        const text = elements.shareCodeShareText.textContent;
        if (text && text !== '加载中...' && text !== '生成失败，请重试') {
            try {
                await copyToClipboard(text);
                showToast('分享文案已复制');
            } catch (err) {
                showToast('复制失败，请手动复制');
            }
        }
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
            
            // Update balance display
            const statBalance = document.getElementById('stat-balance');
            if (statBalance) {
                statBalance.textContent = (currentUser.balance || 0).toFixed(2);
            }
        } catch (err) {
            console.error('Failed to load profile stats:', err);
        }

        loadBadges();
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

    // --- Badge Wall ---
    async function loadBadges() {
        if (!currentUser) return;
        try {
            const resp = await fetch(`/api/badges?username=${currentUser.username}`);
            const badges = await resp.json();
            allBadgesData = badges;

            const newlyUnlocked = [];
            badges.forEach(b => {
                if (b.unlocked && !previousBadgeKeys.has(b.key)) {
                    newlyUnlocked.push(b);
                }
            });

            renderBadgeWall(badges, newlyUnlocked);

            previousBadgeKeys.clear();
            badges.forEach(b => {
                if (b.unlocked) previousBadgeKeys.add(b.key);
            });

            if (newlyUnlocked.length > 0) {
                triggerBadgeCelebration(newlyUnlocked);
            }
        } catch (err) {
            console.error('Failed to load badges:', err);
        }
    }

    function renderBadgeWall(badges, newlyUnlocked) {
        const grid = document.getElementById('badge-wall-grid');
        if (!grid) return;

        const unlockedCount = badges.filter(b => b.unlocked).length;
        const countLabel = document.getElementById('badge-count-label');
        if (countLabel) {
            countLabel.textContent = `${unlockedCount}/${badges.length} 已解锁`;
        }

        grid.innerHTML = badges.map(b => {
            const isNew = newlyUnlocked && newlyUnlocked.some(n => n.key === b.key);
            return `
                <div class="badge-item ${b.unlocked ? 'unlocked' : 'locked'} ${isNew ? 'just-unlocked' : ''}"
                     data-badge-key="${b.key}" onclick="window._showBadgeDetail('${b.key}')">
                    ${isNew ? '<span class="badge-new-tag">NEW</span>' : ''}
                    <div class="badge-icon-wrap" style="${b.unlocked ? `background: ${b.color}; color: white;` : ''}">
                        <i class="fas ${b.icon}"></i>
                    </div>
                    <span class="badge-name">${b.name}</span>
                    ${b.unlocked
                        ? `<span class="badge-unlock-date">${formatBadgeDate(b.unlockedAt)}</span>`
                        : `<span class="badge-condition">${b.conditionDesc}</span>`
                    }
                </div>
            `;
        }).join('');
    }

    function formatBadgeDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    }

    function triggerBadgeCelebration(newBadges) {
        const overlay = document.createElement('div');
        overlay.className = 'badge-celebration-overlay';
        document.body.appendChild(overlay);

        const colors = ['#f43f5e', '#6366f1', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6'];
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'badge-confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.top = Math.random() * 30 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            confetti.style.animationDuration = (1 + Math.random()) + 's';
            confetti.style.width = (6 + Math.random() * 8) + 'px';
            confetti.style.height = (6 + Math.random() * 8) + 'px';
            overlay.appendChild(confetti);
        }

        const badgeNames = newBadges.map(b => b.name).join('、');
        showToast(`🎉 解锁新勋章：${badgeNames}！`);

        setTimeout(() => {
            overlay.remove();
        }, 2500);
    }

    window._showBadgeDetail = async function(badgeKey) {
        const badge = allBadgesData.find(b => b.key === badgeKey);
        if (!badge) return;

        const modal = document.getElementById('badge-detail-modal');
        const body = document.getElementById('badge-detail-body');

        let relatedOrders = [];
        try {
            const resp = await fetch(`/api/orders?worker=${currentUser.username}`);
            const orders = await resp.json();
            relatedOrders = orders.filter(o => o.status === 'completed');
        } catch (err) {
            console.error('Failed to fetch related orders:', err);
        }

        let ordersHtml = '';
        if (badge.unlocked && relatedOrders.length > 0) {
            const displayOrders = relatedOrders.slice(0, 5);
            ordersHtml = `
                <div class="badge-detail-orders-title">关联订单（最近${displayOrders.length}单）</div>
                ${displayOrders.map(o => `
                    <div class="badge-detail-order-item">
                        <span class="order-pkg">#${o.id} ${o.package}</span>
                        <span class="order-date">${o.createdAt ? o.createdAt.substring(0, 10) : ''}</span>
                    </div>
                `).join('')}
            `;
        }

        body.innerHTML = `
            <div class="badge-detail-icon-wrap ${badge.unlocked ? '' : 'locked'}" style="${badge.unlocked ? `background: ${badge.color}; color: white;` : ''}">
                <i class="fas ${badge.icon}"></i>
            </div>
            <div class="badge-detail-name">${badge.name}</div>
            <span class="badge-detail-status ${badge.unlocked ? 'unlocked' : 'locked'}">
                ${badge.unlocked ? '已解锁' : '未解锁'}
            </span>
            <div class="badge-detail-condition">${badge.conditionDesc}</div>
            ${badge.unlocked ? `
                <div class="badge-detail-unlock-info">
                    <div class="badge-detail-unlock-row">
                        <span class="label">解锁时间</span>
                        <span class="value">${badge.unlockedAt || '-'}</span>
                    </div>
                    <div class="badge-detail-unlock-row">
                        <span class="label">勋章类型</span>
                        <span class="value">成就勋章</span>
                    </div>
                </div>
                ${ordersHtml}
            ` : `
                <div class="badge-detail-unlock-info" style="text-align: center; color: #94a3b8; padding: 20px;">
                    <i class="fas fa-lock" style="font-size: 1.5rem; margin-bottom: 8px; display: block;"></i>
                    继续努力，完成条件即可自动解锁此勋章
                </div>
            `}
        `;

        modal.classList.remove('hidden');
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
                    <div class="podium-stat">
                        <span class="podium-stat-val">${runner.weekActivity}</span>
                        <span class="podium-stat-lab">近7日</span>
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

    // --- Wallet Logic ---
    async function loadWalletSummary() {
        try {
            const resp = await fetch(`/api/wallet/summary?username=${encodeURIComponent(currentUser.username)}`);
            if (!resp.ok) return;
            const data = await resp.json();
            elements.walletBalance.textContent = data.balance.toFixed(2);
            elements.walletTotalIncome.textContent = data.totalIncome.toFixed(2);
            elements.walletTotalExpense.textContent = data.totalExpense.toFixed(2);
            elements.walletMonthIncome.textContent = data.monthIncome.toFixed(2);
            elements.walletMonthExpense.textContent = data.monthExpense.toFixed(2);
            
            currentUser.balance = data.balance;
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            const statBalance = document.getElementById('stat-balance');
            if (statBalance) {
                statBalance.textContent = data.balance.toFixed(2);
            }
            if (elements.pkgBalanceAvailable) {
                elements.pkgBalanceAvailable.textContent = data.balance.toFixed(2);
            }
        } catch (err) {
            console.error('Failed to load wallet summary:', err);
        }
    }

    async function loadWalletTransactions() {
        try {
            let url = `/api/wallet/transactions?username=${encodeURIComponent(currentUser.username)}`;
            if (walletState.type !== 'all') {
                url += `&type=${walletState.type}`;
            }
            if (walletState.month) {
                url += `&month=${walletState.month}`;
            }
            
            const resp = await fetch(url);
            if (!resp.ok) return;
            const transactions = await resp.json();
            renderWalletTransactions(transactions);
            populateMonthFilter(transactions);
        } catch (err) {
            console.error('Failed to load wallet transactions:', err);
        }
    }

    function renderWalletTransactions(transactions) {
        if (!transactions || transactions.length === 0) {
            elements.walletTxnList.innerHTML = `
                <div class="wallet-empty">
                    <i class="fas fa-wallet"></i>
                    <h3>暂无流水记录</h3>
                    <p>您的钱包还没有交易记录</p>
                </div>
            `;
            return;
        }

        elements.walletTxnList.innerHTML = transactions.map(txn => {
            const isExpanded = expandedTxnIds.has(txn.id);
            const typeClass = txn.type === 'income' ? 'income' : 'expense';
            const icon = txn.type === 'income' ? 'fa-arrow-down' : 'fa-arrow-up';
            const sign = txn.type === 'income' ? '+' : '-';
            
            return `
                <div class="wallet-txn-item ${typeClass} ${isExpanded ? 'expanded' : ''}" data-txn-id="${txn.id}">
                    <div class="wallet-txn-icon"><i class="fas ${icon}"></i></div>
                    <div class="wallet-txn-info">
                        <div class="wallet-txn-desc">${txn.description}</div>
                        <div class="wallet-txn-time">${txn.createdAt}</div>
                    </div>
                    <div class="wallet-txn-amount">${sign}${txn.amount.toFixed(2)}</div>
                    <div class="wallet-txn-expand"><i class="fas fa-chevron-down"></i></div>
                </div>
                <div class="wallet-txn-detail" style="${isExpanded ? 'max-height: 200px; padding-bottom: 12px; padding-left: 60px; padding-right: 16px;' : ''}">
                    <div class="wallet-txn-detail-row">
                        <span class="wallet-txn-detail-label">交易类型</span>
                        <span class="wallet-txn-detail-value">${txn.type === 'income' ? '收入' : '支出'}</span>
                    </div>
                    <div class="wallet-txn-detail-row">
                        <span class="wallet-txn-detail-label">关联订单号</span>
                        <span class="wallet-txn-detail-value">${txn.orderId || '-'}</span>
                    </div>
                    <div class="wallet-txn-detail-row">
                        <span class="wallet-txn-detail-label">备注</span>
                        <span class="wallet-txn-detail-value">${txn.remark || '-'}</span>
                    </div>
                </div>
            `;
        }).join('');

        elements.walletTxnList.querySelectorAll('.wallet-txn-item').forEach(item => {
            item.onclick = () => {
                const txnId = parseInt(item.dataset.txnId);
                if (expandedTxnIds.has(txnId)) {
                    expandedTxnIds.delete(txnId);
                } else {
                    expandedTxnIds.add(txnId);
                }
                item.classList.toggle('expanded');
                const detail = item.nextElementSibling;
                if (detail && detail.classList.contains('wallet-txn-detail')) {
                    if (item.classList.contains('expanded')) {
                        detail.style.maxHeight = '200px';
                        detail.style.paddingBottom = '12px';
                        detail.style.paddingLeft = '60px';
                        detail.style.paddingRight = '16px';
                    } else {
                        detail.style.maxHeight = '0';
                        detail.style.paddingBottom = '0';
                        detail.style.paddingLeft = '60px';
                        detail.style.paddingRight = '16px';
                    }
                }
            };
        });
    }

    function populateMonthFilter(transactions) {
        if (!transactions || transactions.length === 0) return;
        
        const months = new Set();
        transactions.forEach(txn => {
            if (txn.createdAt && txn.createdAt.length >= 7) {
                months.add(txn.createdAt.substring(0, 7));
            }
        });
        
        const sortedMonths = Array.from(months).sort().reverse();
        
        const currentValue = walletState.month;
        elements.walletMonthFilter.innerHTML = '<option value="">全部时间</option>' + 
            sortedMonths.map(m => `<option value="${m}" ${m === currentValue ? 'selected' : ''}>${m.replace('-', '年')}月</option>`).join('');
    }

    if (elements.walletTypeBtns) {
        elements.walletTypeBtns.forEach(btn => {
            btn.onclick = () => {
                elements.walletTypeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                walletState.type = btn.dataset.type;
                loadWalletTransactions();
            };
        });
    }

    if (elements.walletMonthFilter) {
        elements.walletMonthFilter.onchange = () => {
            walletState.month = elements.walletMonthFilter.value;
            loadWalletTransactions();
        };
    }

    if (elements.profileWalletCard) {
        elements.profileWalletCard.onclick = () => {
            document.querySelector('[data-tab="wallet"]').click();
        };
    }

    // --- Template Library Logic ---
    async function fetchTemplates() {
        try {
            const resp = await fetch(`/api/templates?creator=${encodeURIComponent(currentUser.username)}`);
            const templates = await resp.json();
            templatesState.allTemplates = templates;
            renderTemplates();
        } catch (err) {
            console.error('Failed to fetch templates:', err);
            showToast('加载模板库失败');
        }
    }

    function sortTemplates(templates) {
        const sorted = [...templates];
        switch (templatesState.sort) {
            case 'newest':
                sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'updated':
                sorted.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
                break;
            case 'name':
                sorted.sort((a, b) => a.templateName.localeCompare(b.templateName, 'zh'));
                break;
            case 'default':
            default:
                sorted.sort((a, b) => (b.isDefault - a.isDefault) || (new Date(b.createdAt) - new Date(a.createdAt)));
                break;
        }
        return sorted;
    }

    function filterTemplates(templates) {
        if (!templatesState.keyword) return templates;
        const kw = templatesState.keyword.toLowerCase();
        return templates.filter(t =>
            t.templateName.toLowerCase().includes(kw) ||
            t.package.toLowerCase().includes(kw) ||
            t.pickup.toLowerCase().includes(kw) ||
            t.delivery.toLowerCase().includes(kw)
        );
    }

    function renderTemplates() {
        if (!elements.templatesGrid) return;

        let templates = filterTemplates(templatesState.allTemplates);
        templates = sortTemplates(templates);

        if (templates.length === 0) {
            const isSearch = templatesState.keyword || templatesState.allTemplates.length === 0;
            elements.templatesGrid.innerHTML = `
                <div class="templates-empty" style="grid-column: 1/-1;">
                    <i class="fas fa-folder-open"></i>
                    <h3>${isSearch && templatesState.allTemplates.length > 0 ? '未找到匹配的模板' : '还没有任何模板'}</h3>
                    <p>${isSearch && templatesState.allTemplates.length > 0 ? '尝试调整搜索关键词' : '点击右上角"新建模板"或在发布页将常用路线保存为模板'}</p>
                    ${templatesState.allTemplates.length === 0 ? `<button class="btn-primary" style="margin-top:16px;" onclick="document.getElementById('btn-create-template-from-lib').click()"><i class="fas fa-plus"></i> 创建第一个模板</button>` : ''}
                </div>
            `;
            return;
        }

        elements.templatesGrid.innerHTML = templates.map(tpl => {
            const stationIconMap = {
                '菜鸟': 'fa-box',
                '顺丰': 'fa-truck-fast',
                '京东': 'fa-store',
                '中通': 'fa-parachute-box'
            };
            let stationIcon = 'fa-box';
            for (const [k, v] of Object.entries(stationIconMap)) {
                if (tpl.pickup.includes(k)) { stationIcon = v; break; }
            }

            return `
                <div class="template-card ${tpl.isDefault ? 'default' : ''}" data-id="${tpl.id}">
                    <div class="template-card-header">
                        <div class="template-card-title">
                            ${tpl.isDefault ? `<span class="tpl-default-badge"><i class="fas fa-star"></i> 默认</span>` : ''}
                            <h3 class="tpl-name">${escapeHtml(tpl.templateName)}</h3>
                        </div>
                        <div class="template-card-menu">
                            <button class="tpl-menu-btn" title="更多操作" onclick="toggleTplMenu(${tpl.id}, event)">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <div class="tpl-dropdown" data-menu-id="${tpl.id}">
                                <button class="tpl-dropdown-item" onclick="editTemplate(${tpl.id})">
                                    <i class="fas fa-edit"></i> 编辑
                                </button>
                                <button class="tpl-dropdown-item" onclick="renameTemplate(${tpl.id})">
                                    <i class="fas fa-pen"></i> 重命名
                                </button>
                                ${!tpl.isDefault ? `<button class="tpl-dropdown-item" onclick="setDefaultTemplate(${tpl.id})">
                                    <i class="fas fa-star"></i> 设为默认
                                </button>` : `<button class="tpl-dropdown-item" onclick="unsetDefaultTemplate(${tpl.id})">
                                    <i class="fas fa-star-half-alt"></i> 取消默认
                                </button>`}
                                <button class="tpl-dropdown-item danger" onclick="deleteTemplate(${tpl.id})">
                                    <i class="fas fa-trash"></i> 删除
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="template-card-body">
                        <div class="tpl-info-row">
                            <div class="tpl-info-icon"><i class="fas fa-tag"></i></div>
                            <div class="tpl-info-content">
                                <span class="tpl-info-label">简称</span>
                                <span class="tpl-info-value">${escapeHtml(tpl.package || '-')}</span>
                            </div>
                        </div>
                        <div class="tpl-info-row">
                            <div class="tpl-info-icon pickup"><i class="fas ${stationIcon}"></i></div>
                            <div class="tpl-info-content">
                                <span class="tpl-info-label">驿站</span>
                                <span class="tpl-info-value">${escapeHtml(tpl.pickup || '-')}</span>
                            </div>
                        </div>
                        <div class="tpl-info-row">
                            <div class="tpl-info-icon delivery"><i class="fas fa-door-open"></i></div>
                            <div class="tpl-info-content">
                                <span class="tpl-info-label">送达宿舍</span>
                                <span class="tpl-info-value">${escapeHtml(tpl.delivery || '-')}</span>
                            </div>
                        </div>
                    </div>
                    <div class="template-card-footer">
                        <div class="tpl-reward">
                            <i class="fas fa-coins" style="color:#f59e0b;"></i>
                            <span class="tpl-reward-value">${escapeHtml(tpl.reward || '-')}</span>
                        </div>
                        <div class="tpl-actions">
                            <button class="tpl-use-btn" onclick="useTemplate(${tpl.id})">
                                <i class="fas fa-clone"></i> 使用
                            </button>
                        </div>
                    </div>
                    <div class="tpl-meta">
                        <span>创建：${formatDate(tpl.createdAt)}</span>
                        ${tpl.updatedAt !== tpl.createdAt ? `<span>更新：${formatDate(tpl.updatedAt)}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        document.addEventListener('click', closeAllTplMenus);
    }

    function closeAllTplMenus() {
        document.querySelectorAll('.tpl-dropdown.show').forEach(dd => dd.classList.remove('show'));
    }

    window.toggleTplMenu = (id, e) => {
        e.stopPropagation();
        const menu = document.querySelector(`.tpl-dropdown[data-menu-id="${id}"]`);
        if (!menu) return;
        const isShow = menu.classList.contains('show');
        closeAllTplMenus();
        if (!isShow) menu.classList.add('show');
    };

    function fillOrderFormWithTemplate(tpl) {
        document.getElementById('pkg-name').value = tpl.package || '';
        document.getElementById('pkg-pickup').value = tpl.pickup || document.getElementById('pkg-pickup').options[0].value;
        document.getElementById('pkg-delivery').value = tpl.delivery || '';
        document.getElementById('pkg-reward').value = tpl.reward || '';
    }

    window.useTemplate = async (id) => {
        const tpl = templatesState.allTemplates.find(t => t.id === id);
        if (!tpl) return;
        fillOrderFormWithTemplate(tpl);
        document.querySelector('[data-tab="post-task"]').click();
        showToast(`已使用模板「${tpl.templateName}」`);
    };

    window.editTemplate = async (id) => {
        closeAllTplMenus();
        const tpl = templatesState.allTemplates.find(t => t.id === id);
        if (!tpl) return;
        elements.etId.value = tpl.id;
        elements.etName.value = tpl.templateName;
        elements.etPackage.value = tpl.package;
        elements.etPickup.value = tpl.pickup;
        elements.etDelivery.value = tpl.delivery;
        elements.etReward.value = tpl.reward;
        elements.editTemplateModal.classList.remove('hidden');
    };

    window.renameTemplate = async (id) => {
        closeAllTplMenus();
        const tpl = templatesState.allTemplates.find(t => t.id === id);
        if (!tpl) return;
        const newName = prompt('请输入新的模板名称：', tpl.templateName);
        if (!newName || !newName.trim() || newName === tpl.templateName) return;

        try {
            const resp = await fetch('/api/templates_update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id, creator: currentUser.username,
                    templateName: newName.trim()
                })
            });
            const data = await resp.json();
            if (resp.ok && data.status === 'success') {
                showToast('模板已重命名');
                fetchTemplates();
            } else {
                showToast(data.message || '重命名失败');
            }
        } catch (err) {
            showToast('重命名失败');
        }
    };

    window.setDefaultTemplate = async (id) => {
        closeAllTplMenus();
        try {
            const resp = await fetch('/api/templates_default', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, creator: currentUser.username })
            });
            const data = await resp.json();
            if (resp.ok && data.status === 'success') {
                showToast('已设为默认模板');
                fetchTemplates();
            } else {
                showToast(data.message || '设置失败');
            }
        } catch (err) {
            showToast('设置失败');
        }
    };

    window.unsetDefaultTemplate = async (id) => {
        closeAllTplMenus();
        try {
            const resp = await fetch('/api/templates_default', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: -1, creator: currentUser.username })
            });
            const data = await resp.json();
            if (resp.ok && data.status === 'success') {
                showToast('已取消默认模板');
                fetchTemplates();
            } else {
                showToast(data.message || '操作失败');
            }
        } catch (err) {
            showToast('操作失败');
        }
    };

    window.deleteTemplate = async (id) => {
        closeAllTplMenus();
        if (!confirm('确定要删除这个模板吗？此操作不可撤销。')) return;
        try {
            const resp = await fetch('/api/templates_delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, creator: currentUser.username })
            });
            const data = await resp.json();
            if (resp.ok && data.status === 'success') {
                showToast('模板已删除');
                fetchTemplates();
            } else {
                showToast(data.message || '删除失败');
            }
        } catch (err) {
            showToast('删除失败');
        }
    };

    if (elements.templatesSortSelect) {
        elements.templatesSortSelect.onchange = () => {
            templatesState.sort = elements.templatesSortSelect.value;
            renderTemplates();
        };
    }

    if (elements.templatesSearchInput) {
        elements.templatesSearchInput.oninput = () => {
            clearTimeout(tplSearchTimer);
            tplSearchTimer = setTimeout(() => {
                templatesState.keyword = elements.templatesSearchInput.value.trim();
                renderTemplates();
            }, 300);
        };
    }

    if (elements.btnCreateTemplateFromLib) {
        elements.btnCreateTemplateFromLib.onclick = () => {
            elements.createTemplateForm.reset();
            elements.createTemplateModal.classList.remove('hidden');
        };
    }

    if (elements.createTemplateForm) {
        elements.createTemplateForm.onsubmit = async (e) => {
            e.preventDefault();
            const payload = {
                creator: currentUser.username,
                templateName: document.getElementById('ct-name').value.trim(),
                package: document.getElementById('ct-package').value.trim(),
                pickup: document.getElementById('ct-pickup').value,
                delivery: document.getElementById('ct-delivery').value.trim(),
                reward: document.getElementById('ct-reward').value.trim()
            };
            if (!payload.templateName || !payload.package || !payload.delivery || !payload.reward) {
                showToast('请填写所有必填字段');
                return;
            }
            try {
                const resp = await fetch('/api/templates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await resp.json();
                if (resp.ok && data.status === 'success') {
                    showToast('模板创建成功！');
                    elements.createTemplateModal.classList.add('hidden');
                    elements.createTemplateForm.reset();
                    fetchTemplates();
                } else {
                    showToast(data.message || '创建失败');
                }
            } catch (err) {
                showToast('创建失败');
            }
        };
    }

    if (elements.editTemplateForm) {
        elements.editTemplateForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = parseInt(elements.etId.value);
            const payload = {
                id,
                creator: currentUser.username,
                templateName: elements.etName.value.trim(),
                package: elements.etPackage.value.trim(),
                pickup: elements.etPickup.value,
                delivery: elements.etDelivery.value.trim(),
                reward: elements.etReward.value.trim()
            };
            if (!payload.templateName || !payload.package || !payload.delivery || !payload.reward) {
                showToast('请填写所有必填字段');
                return;
            }
            try {
                const resp = await fetch('/api/templates_update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await resp.json();
                if (resp.ok && data.status === 'success') {
                    showToast('模板已更新！');
                    elements.editTemplateModal.classList.add('hidden');
                    fetchTemplates();
                } else {
                    showToast(data.message || '更新失败');
                }
            } catch (err) {
                showToast('更新失败');
            }
        };
    }

    // --- Post Task Page Template Integration ---
    async function applyDefaultTemplateIfAny() {
        try {
            const resp = await fetch(`/api/templates?creator=${encodeURIComponent(currentUser.username)}`);
            const templates = await resp.json();
            const defaultTpl = templates.find(t => t.isDefault);
            if (defaultTpl) {
                const nameEl = document.getElementById('pkg-name');
                if (nameEl && !nameEl.value) {
                    fillOrderFormWithTemplate(defaultTpl);
                    if (elements.defaultTemplateBanner) {
                        elements.defaultTemplateName.textContent = `「${defaultTpl.templateName}」`;
                        elements.defaultTemplateBanner.classList.remove('hidden');
                    }
                }
            }
        } catch (err) {
            console.error('Failed to apply default template:', err);
        }
    }

    if (elements.btnSaveTemplate) {
        elements.btnSaveTemplate.onclick = () => {
            const pkgName = document.getElementById('pkg-name').value.trim();
            const pkgPickup = document.getElementById('pkg-pickup').value;
            const pkgDelivery = document.getElementById('pkg-delivery').value.trim();
            const pkgReward = document.getElementById('pkg-reward').value.trim();

            if (!pkgName || !pkgDelivery || !pkgReward) {
                showToast('请先填写完整的表单内容');
                return;
            }

            elements.stName.value = '';
            elements.tpPackage.textContent = pkgName;
            elements.tpPickup.textContent = pkgPickup;
            elements.tpDelivery.textContent = pkgDelivery;
            elements.tpReward.textContent = pkgReward;
            elements.saveTemplateModal.classList.remove('hidden');
        };
    }

    if (elements.saveTemplateForm) {
        elements.saveTemplateForm.onsubmit = async (e) => {
            e.preventDefault();
            const payload = {
                creator: currentUser.username,
                templateName: elements.stName.value.trim(),
                package: document.getElementById('pkg-name').value.trim(),
                pickup: document.getElementById('pkg-pickup').value,
                delivery: document.getElementById('pkg-delivery').value.trim(),
                reward: document.getElementById('pkg-reward').value.trim()
            };
            if (!payload.templateName) {
                showToast('请输入模板名称');
                return;
            }
            try {
                const resp = await fetch('/api/templates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await resp.json();
                if (resp.ok && data.status === 'success') {
                    showToast('模板保存成功！可在模板库中管理');
                    elements.saveTemplateModal.classList.add('hidden');
                    elements.saveTemplateForm.reset();
                } else {
                    showToast(data.message || '保存失败');
                }
            } catch (err) {
                showToast('保存失败');
            }
        };
    }

    if (elements.btnFromTemplate) {
        elements.btnFromTemplate.onclick = async () => {
            await openSelectTemplateModal();
        };
    }

    async function openSelectTemplateModal() {
        try {
            const resp = await fetch(`/api/templates?creator=${encodeURIComponent(currentUser.username)}`);
            const templates = await resp.json();
            if (elements.selTplSearch) elements.selTplSearch.value = '';
            renderSelectTemplateList(templates);
            elements.selectTemplateModal.classList.remove('hidden');
        } catch (err) {
            console.error('Failed to load templates for select:', err);
            showToast('加载模板列表失败');
        }
    }

    function renderSelectTemplateList(templates, keyword = '') {
        if (!elements.selectTemplateList) return;

        let filtered = templates;
        if (keyword) {
            const kw = keyword.toLowerCase();
            filtered = templates.filter(t =>
                t.templateName.toLowerCase().includes(kw) ||
                t.package.toLowerCase().includes(kw) ||
                t.pickup.toLowerCase().includes(kw) ||
                t.delivery.toLowerCase().includes(kw)
            );
        }

        filtered.sort((a, b) => (b.isDefault - a.isDefault) || (new Date(b.createdAt) - new Date(a.createdAt)));

        if (filtered.length === 0) {
            elements.selectTemplateList.innerHTML = `
                <div class="sel-tpl-empty">
                    <i class="fas fa-inbox"></i>
                    <h3>${keyword ? '没有匹配的模板' : '还没有任何模板'}</h3>
                    <p>${keyword ? '尝试其他关键词' : '先去发布页保存常用路线为模板吧'}</p>
                </div>
            `;
            return;
        }

        elements.selectTemplateList.innerHTML = filtered.map(tpl => `
            <div class="sel-tpl-item ${tpl.isDefault ? 'default' : ''}" onclick="applySelectedTemplate(${tpl.id})">
                ${tpl.isDefault ? `<div class="sel-tpl-default-tag"><i class="fas fa-star"></i> 默认</div>` : ''}
                <div class="sel-tpl-main">
                    <div class="sel-tpl-name">${escapeHtml(tpl.templateName)}</div>
                    <div class="sel-tpl-info">
                        <span><i class="fas fa-tag"></i> ${escapeHtml(tpl.package || '-')}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(tpl.pickup || '-')}</span>
                        <span><i class="fas fa-door-open"></i> ${escapeHtml(tpl.delivery || '-')}</span>
                    </div>
                </div>
                <div class="sel-tpl-reward">${escapeHtml(tpl.reward || '-')}</div>
            </div>
        `).join('');

        window._selTemplates = templates;
    }

    if (elements.selTplSearch) {
        elements.selTplSearch.oninput = () => {
            clearTimeout(selTplSearchTimer);
            selTplSearchTimer = setTimeout(() => {
                renderSelectTemplateList(window._selTemplates || [], elements.selTplSearch.value.trim());
            }, 250);
        };
    }

    window.applySelectedTemplate = (id) => {
        const tpl = (window._selTemplates || []).find(t => t.id === id);
        if (!tpl) return;
        fillOrderFormWithTemplate(tpl);
        elements.selectTemplateModal.classList.add('hidden');
        showToast(`已使用模板「${tpl.templateName}」`);
    };

    // --- Reports (投诉与举报工单) Logic ---

    window.openReportModal = (orderId, targetUser) => {
        if (!elements.reportModal) return;
        elements.reportForm.reset();
        if (elements.reportOrderId) elements.reportOrderId.value = orderId || '';
        if (elements.reportTargetUser) elements.reportTargetUser.value = targetUser || '';
        const orderDisplay = document.getElementById('report-order-display');
        if (orderDisplay && orderId) orderDisplay.value = `订单 #${orderId}`;
        else if (orderDisplay) orderDisplay.value = '';
        elements.reportModal.classList.remove('hidden');
    };

    if (elements.reportModal) {
        const closeBtns = elements.reportModal.querySelectorAll('[data-close-modal]');
        closeBtns.forEach(btn => {
            btn.onclick = () => elements.reportModal.classList.add('hidden');
        });
        elements.reportModal.onclick = (e) => {
            if (e.target === elements.reportModal) elements.reportModal.classList.add('hidden');
        };
    }

    if (elements.reportForm) {
        elements.reportForm.onsubmit = async (e) => {
            e.preventDefault();
            const typeRadio = document.querySelector('input[name="reportType"]:checked');
            if (!typeRadio) {
                showToast('请选择举报类型');
                return;
            }
            const description = elements.reportDescription ? elements.reportDescription.value.trim() : '';
            if (!description) {
                showToast('请填写详细描述');
                return;
            }

            const payload = {
                reporter: currentUser.username,
                report_type: typeRadio.value,
                description: description,
                order_id: elements.reportOrderId ? elements.reportOrderId.value : '',
                target_user: elements.reportTargetUser ? elements.reportTargetUser.value : ''
            };

            try {
                const resp = await fetch('/api/reports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await resp.json();
                if (resp.ok && data.status === 'success') {
                    showToast(`举报提交成功！工单号：${data.report_id}`);
                    elements.reportModal.classList.add('hidden');
                    elements.reportForm.reset();
                    if (!document.getElementById('profile-tab').classList.contains('hidden')) {
                        loadUserReports();
                    }
                } else {
                    showToast(data.message || '举报提交失败');
                }
            } catch (err) {
                showToast('举报提交失败');
            }
        };
    }

    async function loadUserReports() {
        if (!elements.myReportsList || !currentUser) return;
        try {
            const resp = await fetch(`/api/reports?reporter=${encodeURIComponent(currentUser.username)}`);
            const reports = await resp.json();
            renderMyReports(reports);
        } catch (err) {
            console.error('Failed to load user reports:', err);
        }
    }

    function renderMyReports(reports) {
        if (!elements.myReportsList) return;

        if (!reports || reports.length === 0) {
            elements.myReportsList.innerHTML = `
                <div style="text-align:center; padding:30px 20px; color:#94a3b8;">
                    <i class="fas fa-inbox" style="font-size:2rem; margin-bottom:10px;"></i>
                    <div>暂无举报记录</div>
                </div>
            `;
            return;
        }

        const typeTextMap = {
            'fake': '虚假订单',
            'attitude': '态度恶劣',
            'damaged': '物品损坏',
            'other': '其他'
        };
        const statusTextMap = {
            'pending': '待处理',
            'processing': '处理中',
            'resolved': '已处理',
            'rejected': '已驳回'
        };

        elements.myReportsList.innerHTML = reports.map(r => `
            <div class="my-report-item">
                <div class="my-report-header">
                    <div class="my-report-title">
                        <span class="report-badge ${r.report_type}">${typeTextMap[r.report_type] || r.report_type}</span>
                        <span class="my-report-id">#${r.id}</span>
                    </div>
                    <span class="report-status ${r.status}">${statusTextMap[r.status] || r.status}</span>
                </div>
                <div class="my-report-desc">${escapeHtml(r.description)}</div>
                <div class="my-report-meta">
                    <span><i class="fas fa-hashtag"></i> 订单号: ${r.order_id || '-'}</span>
                    <span><i class="fas fa-user"></i> 被举报: ${escapeHtml(r.target_user || '-')}</span>
                    <span><i class="far fa-clock"></i> ${formatDate(r.created_at)}</span>
                </div>
                ${r.handler_note ? `
                <div class="my-report-handler-note">
                    <div class="mhrn-label"><i class="fas fa-comment-dots"></i> 处理备注</div>
                    <div class="mhrn-content">${escapeHtml(r.handler_note)}</div>
                    ${r.handled_at ? `<div class="mhrn-time">处理时间: ${formatDate(r.handled_at)}</div>` : ''}
                </div>
                ` : ''}
            </div>
        `).join('');
    }

    async function fetchAdminReports() {
        if (!elements.adminReportsList) return;
        try {
            const params = new URLSearchParams();
            if (elements.adminReportStatusFilter && elements.adminReportStatusFilter.value) {
                params.append('status', elements.adminReportStatusFilter.value);
            }
            if (elements.adminReportTypeFilter && elements.adminReportTypeFilter.value) {
                params.append('type', elements.adminReportTypeFilter.value);
            }
            params.append('username', currentUser.username);

            const resp = await fetch(`/api/reports/all?${params.toString()}`);
            if (!resp.ok) {
                const err = await resp.json();
                showToast(err.message || '加载工单失败');
                return;
            }
            const reports = await resp.json();
            renderAdminReports(reports);
            updateAdminReportStats(reports);
        } catch (err) {
            console.error('Failed to fetch admin reports:', err);
            showToast('加载工单失败');
        }
    }

    function updateAdminReportStats(reports) {
        if (!elements.adminReportsSummary) return;

        const total = reports.length;
        const pending = reports.filter(r => r.status === 'pending').length;
        const processing = reports.filter(r => r.status === 'processing').length;
        const resolved = reports.filter(r => r.status === 'resolved' || r.status === 'rejected').length;

        elements.adminReportsSummary.innerHTML = `
            <div class="reports-summary-card all">
                <div class="rsc-icon"><i class="fas fa-clipboard-list"></i></div>
                <div class="rsc-info">
                    <div class="rsc-value">${total}</div>
                    <div class="rsc-label">工单总数</div>
                </div>
            </div>
            <div class="reports-summary-card pending">
                <div class="rsc-icon"><i class="fas fa-clock"></i></div>
                <div class="rsc-info">
                    <div class="rsc-value">${pending}</div>
                    <div class="rsc-label">待处理</div>
                </div>
            </div>
            <div class="reports-summary-card processing">
                <div class="rsc-icon"><i class="fas fa-spinner fa-spin"></i></div>
                <div class="rsc-info">
                    <div class="rsc-value">${processing}</div>
                    <div class="rsc-label">处理中</div>
                </div>
            </div>
            <div class="reports-summary-card resolved">
                <div class="rsc-icon"><i class="fas fa-check-circle"></i></div>
                <div class="rsc-info">
                    <div class="rsc-value">${resolved}</div>
                    <div class="rsc-label">已处理</div>
                </div>
            </div>
        `;
    }

    function renderAdminReports(reports) {
        if (!elements.adminReportsList) return;

        if (!reports || reports.length === 0) {
            elements.adminReportsList.innerHTML = `
                <div style="text-align:center; padding:50px 20px; color:#94a3b8;">
                    <i class="fas fa-inbox" style="font-size:3rem; margin-bottom:15px;"></i>
                    <h3>暂无工单</h3>
                    <p>当前筛选条件下没有工单</p>
                </div>
            `;
            return;
        }

        const typeTextMap = {
            'fake': '虚假订单',
            'attitude': '态度恶劣',
            'damaged': '物品损坏',
            'other': '其他'
        };
        const statusTextMap = {
            'pending': '待处理',
            'processing': '处理中',
            'resolved': '已处理',
            'rejected': '已驳回'
        };

        elements.adminReportsList.innerHTML = reports.map(r => `
            <div class="admin-report-item">
                <div class="admin-report-header">
                    <div class="admin-report-title-row">
                        <span class="report-badge ${r.report_type}">${typeTextMap[r.report_type] || r.report_type}</span>
                        <span class="admin-report-id">#${r.id}</span>
                    </div>
                    <span class="report-status ${r.status}">${statusTextMap[r.status] || r.status}</span>
                </div>
                <div class="admin-report-info">
                    <div class="ari-row">
                        <span class="ari-label">举报人</span>
                        <span class="ari-value">${escapeHtml(r.reporter)}</span>
                    </div>
                    <div class="ari-row">
                        <span class="ari-label">被举报</span>
                        <span class="ari-value">${escapeHtml(r.target_user || '-')}</span>
                    </div>
                    <div class="ari-row">
                        <span class="ari-label">关联订单</span>
                        <span class="ari-value">#${r.order_id || '-'}</span>
                    </div>
                    <div class="ari-row">
                        <span class="ari-label">提交时间</span>
                        <span class="ari-value">${formatDate(r.created_at)}</span>
                    </div>
                </div>
                <div class="admin-report-desc">
                    <div class="ard-label">举报详情</div>
                    <div class="ard-content">${escapeHtml(r.description)}</div>
                </div>
                ${r.handler_note ? `
                <div class="admin-report-handler-note">
                    <div class="ard-label">处理备注</div>
                    <div class="ard-content">${escapeHtml(r.handler_note)}</div>
                    ${r.handled_at ? `<div class="ard-time">处理于 ${formatDate(r.handled_at)}</div>` : ''}
                </div>
                ` : ''}
                <div class="admin-report-actions">
                    <button class="btn-primary" onclick='openAdminReportModal(${JSON.stringify(r).replace(/'/g, "&#39;")})'>
                        <i class="fas fa-edit"></i> 处理工单
                    </button>
                </div>
            </div>
        `).join('');
    }

    window.openAdminReportModal = (report) => {
        if (!elements.adminReportModal || !report) return;

        const typeTextMap = {
            'fake': '虚假订单',
            'attitude': '态度恶劣',
            'damaged': '物品损坏',
            'other': '其他'
        };

        if (elements.adminReportId) elements.adminReportId.value = report.id;
        if (elements.adminReportDetailId) elements.adminReportDetailId.textContent = `#${report.id}`;
        if (elements.adminReportDetailReporter) elements.adminReportDetailReporter.textContent = report.reporter;
        if (elements.adminReportDetailTarget) elements.adminReportDetailTarget.textContent = report.target_user || '-';
        if (elements.adminReportDetailType) elements.adminReportDetailType.textContent = typeTextMap[report.report_type] || report.report_type;
        if (elements.adminReportDetailOrder) elements.adminReportDetailOrder.textContent = report.order_id ? `#${report.order_id}` : '-';
        if (elements.adminReportDetailDesc) elements.adminReportDetailDesc.textContent = report.description;
        if (elements.adminReportDetailTime) elements.adminReportDetailTime.textContent = formatDate(report.created_at);
        if (elements.adminReportStatus) elements.adminReportStatus.value = report.status;
        if (elements.adminReportHandlerNote) elements.adminReportHandlerNote.value = report.handler_note || '';

        elements.adminReportModal.classList.remove('hidden');
    };

    if (elements.adminReportModal) {
        const closeBtns = elements.adminReportModal.querySelectorAll('[data-close-modal]');
        closeBtns.forEach(btn => {
            btn.onclick = () => elements.adminReportModal.classList.add('hidden');
        });
        elements.adminReportModal.onclick = (e) => {
            if (e.target === elements.adminReportModal) elements.adminReportModal.classList.add('hidden');
        };
    }

    if (elements.adminReportForm) {
        elements.adminReportForm.onsubmit = async (e) => {
            e.preventDefault();
            const id = parseInt(elements.adminReportId.value);
            const status = elements.adminReportStatus ? elements.adminReportStatus.value : '';
            const handler_note = elements.adminReportHandlerNote ? elements.adminReportHandlerNote.value.trim() : '';

            if (!status) {
                showToast('请选择处理状态');
                return;
            }

            try {
                const resp = await fetch('/api/reports_update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, status, handler_note, username: currentUser.username })
                });
                const data = await resp.json();
                if (resp.ok && data.status === 'success') {
                    showToast('工单处理成功');
                    elements.adminReportModal.classList.add('hidden');
                    fetchAdminReports();
                } else {
                    showToast(data.message || '处理失败');
                }
            } catch (err) {
                showToast('处理失败');
            }
        };
    }

    if (elements.adminReportStatusFilter) {
        elements.adminReportStatusFilter.onchange = () => fetchAdminReports();
    }
    if (elements.adminReportTypeFilter) {
        elements.adminReportTypeFilter.onchange = () => fetchAdminReports();
    }
    if (elements.adminReportRefreshBtn) {
        elements.adminReportRefreshBtn.onclick = () => fetchAdminReports();
    }

    // Init
    updateUIForLogin();
});
