let rules = [
    { src: '192.168.1.0/24', dst: '0.0.0.0/0', port: '443', action: 'Allow', hits: 4520 },
    { src: 'Any', dst: '10.0.0.50', port: '22', action: 'Deny', hits: 1205 }
];

let trafficChart = null;

const ui = {
    list: document.getElementById('rule-list-body'),
    modal: document.getElementById('ruleModal'),
    form: document.getElementById('policyForm'),
    themeBtn: document.getElementById('theme-switch'),

    init() {
        this.loadTheme();
        this.render();
        this.initChart();
        this.setupDragging();
        this.bindEvents();
        lucide.createIcons();
    },

    bindEvents() {
        this.themeBtn.addEventListener('click', () => this.toggleTheme());
    },

    loadTheme() {
        const saved = localStorage.getItem('netguard-theme') || 'light';
        document.documentElement.setAttribute('data-theme', saved);
        this.updateThemeIcon(saved);
    },

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('netguard-theme', next);
        this.updateThemeIcon(next);
        this.updateChartTheme();
    },

    updateThemeIcon(theme) {
        const icon = theme === 'dark' ? 'moon' : 'sun';
        this.themeBtn.innerHTML = `<i data-lucide="${icon}"></i>`;
        lucide.createIcons();
    },

    render() {
        this.list.innerHTML = '';
        rules.forEach((rule, idx) => {
            const row = document.createElement('div');
            row.className = 'row draggable';
            row.draggable = true;
            row.dataset.index = idx;
            row.innerHTML = `
                <div class="cell drag"><i data-lucide="grip-vertical" size="14"></i></div>
                <div class="cell id">${idx + 1}</div>
                <div class="cell"><code>${rule.src}</code></div>
                <div class="cell"><code>${rule.dst}</code></div>
                <div class="cell port">${rule.port}</div>
                <div class="cell action"><span class="tag ${rule.action.toLowerCase()}">${rule.action.toUpperCase()}</span></div>
                <div class="cell manage">
                    <button onclick="ui.editRule(${idx})" class="btn-text"><i data-lucide="edit-3" size="14"></i></button>
                    <button onclick="ui.deleteRule(${idx})" class="btn-text"><i data-lucide="trash-2" size="14"></i></button>
                </div>
            `;
            this.list.appendChild(row);
        });
        this.updateAnalytics();
        lucide.createIcons();
    },

    updateChartTheme() {
        if (!trafficChart) return;
        const theme = document.documentElement.getAttribute('data-theme');
        const color = theme === 'dark' ? '#94a3b8' : '#64748b';
        trafficChart.options.plugins.legend.labels.color = color;
        trafficChart.update();
    },

    initChart() {
        const ctx = document.getElementById('trafficChart').getContext('2d');
        const theme = document.documentElement.getAttribute('data-theme');
        const color = theme === 'dark' ? '#94a3b8' : '#64748b';

        trafficChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Allowed', 'Blocked'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: { 
                maintainAspectRatio: false, 
                plugins: { 
                    legend: { position: 'bottom', labels: { color: color } } 
                }, 
                cutout: '75%' 
            }
        });
        this.updateAnalytics();
    },

    // ... (rest of CRUD and Dragging logic remains exactly as optimized before)
    openModal(idx = null) {
        this.modal.style.display = 'flex';
        if (idx !== null) {
            const r = rules[idx];
            document.getElementById('editIndex').value = idx;
            document.getElementById('inp-src').value = r.src;
            document.getElementById('inp-dst').value = r.dst;
            document.getElementById('inp-port').value = r.port;
            document.getElementById('inp-action').value = r.action;
            document.getElementById('modalTitle').innerText = 'Edit Rule #' + (idx + 1);
        } else {
            this.form.reset();
            document.getElementById('editIndex').value = '';
            document.getElementById('modalTitle').innerText = 'New Rule Configuration';
        }
    },
    closeModal() { this.modal.style.display = 'none'; },
    deleteRule(idx) {
        if (confirm('Remove this rule? Policy priority will shift.')) {
            rules.splice(idx, 1);
            this.render();
        }
    },
    editRule(idx) { this.openModal(idx); },
    updateAnalytics() {
        const allowed = rules.filter(r => r.action === 'Allow').reduce((s, r) => s + r.hits, 0);
        const denied = rules.filter(r => r.action === 'Deny').reduce((s, r) => s + r.hits, 0) + 850;
        document.getElementById('count-allow').innerText = allowed.toLocaleString();
        document.getElementById('count-deny').innerText = denied.toLocaleString();
        if (trafficChart) {
            trafficChart.data.datasets[0].data = [allowed, denied];
            trafficChart.update();
        }
    },
    setupDragging() {
        this.list.addEventListener('dragstart', e => e.target.classList.add('dragging'));
        this.list.addEventListener('dragend', e => {
            e.target.classList.remove('dragging');
            const rows = [...this.list.querySelectorAll('.draggable')];
            rules = rows.map(row => rules[row.dataset.index]);
            this.render();
        });
        this.list.addEventListener('dragover', e => {
            e.preventDefault();
            const dragging = document.querySelector('.dragging');
            const afterElement = [...this.list.querySelectorAll('.draggable:not(.dragging)')].find(el => {
                return e.clientY <= el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2;
            });
            if (afterElement) this.list.insertBefore(dragging, afterElement);
            else this.list.appendChild(dragging);
        });
    }
};

ui.form.onsubmit = (e) => {
    e.preventDefault();
    const idx = document.getElementById('editIndex').value;
    const ruleData = {
        src: document.getElementById('inp-src').value,
        dst: document.getElementById('inp-dst').value,
        port: document.getElementById('inp-port').value,
        action: document.getElementById('inp-action').value,
        hits: idx !== '' ? rules[idx].hits : Math.floor(Math.random() * 2000)
    };
    if (idx !== '') rules[idx] = ruleData;
    else rules.push(ruleData);
    ui.closeModal();
    ui.render();
};
window.onload = () => ui.init();
