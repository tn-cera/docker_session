(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ================= storage (everything lives in this browser) =================
  const KEYS = { tasks: 'cdac_tasks', profile: 'cdac_profile', theme: 'cdac_theme', view: 'cdac_view' };

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { toast('Could not save - browser storage is blocked'); }
  }

  // ================= helpers =================
  const STATUSES = [
    { id: 'todo', label: 'To Do', icon: '📋' },
    { id: 'progress', label: 'In Progress', icon: '🚀' },
    { id: 'done', label: 'Done', icon: '✅' }
  ];
  const STATUS_IDS = STATUSES.map(s => s.id);
  const PRIORITIES = ['low', 'medium', 'high'];
  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
  const AVATARS = ['🎓', '🧑‍💻', '👩‍💻', '🚀', '🦉', '🐼', '🦊', '🌟', '🔥', '🎯'];
  const PRAISE = ['Nice work! 🎉', 'Task crushed! 💪', 'Great job! 🌟', 'One step closer! 🚀', 'Boom! Done! ✅'];

  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const pad = n => String(n).padStart(2, '0');
  const toStr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayStr = () => toStr(new Date());
  const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return toStr(d); };
  const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const fmtDate = s => parseDate(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function dueInfo(t) {
    if (!t.due) return null;
    if (t.status === 'done') return { text: fmtDate(t.due), cls: '' };
    const diff = Math.round((parseDate(t.due) - parseDate(todayStr())) / 86400000);
    if (diff < 0) return { text: `Overdue ${-diff}d`, cls: 'overdue' };
    if (diff === 0) return { text: 'Due today', cls: 'today' };
    if (diff === 1) return { text: 'Due tomorrow', cls: 'soon' };
    if (diff <= 7) return { text: `In ${diff} days`, cls: 'soon' };
    return { text: fmtDate(t.due), cls: '' };
  }
  const isOverdue = t => t.status !== 'done' && t.due && t.due < todayStr();

  // ================= state =================
  const firstVisit = localStorage.getItem(KEYS.tasks) === null;
  let tasks = load(KEYS.tasks, []).map(t => ({ ...t, status: t.status || (t.done ? 'done' : 'todo') }));
  let profile = load(KEYS.profile, { name: '', email: '', course: '', bio: '', avatar: '' });
  let view = load(KEYS.view, 'board');
  let prioFilter = 'all';
  let query = '';
  let editingId = null;
  let presetStatus = 'todo';
  let tempAvatar = '';
  let justAdded = null;

  if (firstVisit) {
    tasks = [
      { id: newId(), title: 'Welcome to CDAC Kharghar Task Manager 👋', description: 'Drag this card to "In Progress" or "Done".', priority: 'medium', due: todayStr(), status: 'todo', createdAt: new Date().toISOString() },
      { id: newId(), title: 'Set up your profile', description: 'Click your name at the top right and pick an avatar.', priority: 'high', due: addDays(1), status: 'todo', createdAt: new Date().toISOString() },
      { id: newId(), title: 'Try the keyboard shortcuts', description: 'N = new task, / = search, V = switch view, T = theme.', priority: 'low', due: '', status: 'progress', createdAt: new Date().toISOString() }
    ];
    save(KEYS.tasks, tasks);
  }
  const persist = () => save(KEYS.tasks, tasks);

  // ================= toast =================
  let toastTimer;
  function toast(msg, opts = {}) {
    $('#toastMsg').textContent = msg;
    const b = $('#toastAction');
    if (opts.action) {
      b.textContent = opts.action;
      b.classList.remove('hidden');
      b.onclick = () => { opts.fn(); hideToast(); };
    } else {
      b.classList.add('hidden');
      b.onclick = null;
    }
    const el = $('#toast');
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, opts.action ? 5000 : 2200);
  }
  function hideToast() { $('#toast').classList.add('hidden'); }

  // ================= confetti =================
  function confetti() {
    if (reduceMotion) return;
    const c = $('#confetti');
    const ctx = c.getContext('2d');
    c.width = innerWidth; c.height = innerHeight;
    const colors = ['#2563eb', '#7c3aed', '#16a34a', '#f59e0b', '#ef4444', '#06b6d4'];
    const ps = Array.from({ length: 140 }, () => ({
      x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * 0.35,
      vx: (Math.random() - .5) * 14, vy: Math.random() * -12 - 3,
      s: Math.random() * 7 + 4, r: Math.random() * 6.28, vr: (Math.random() - .5) * .4,
      c: colors[Math.floor(Math.random() * colors.length)]
    }));
    let frame = 0;
    (function tick() {
      ctx.clearRect(0, 0, c.width, c.height);
      ps.forEach(p => {
        p.vy += .35; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6);
        ctx.restore();
      });
      if (++frame < 110) requestAnimationFrame(tick); else ctx.clearRect(0, 0, c.width, c.height);
    })();
  }

  // ================= rendering =================
  function setNum(el, n) {
    const from = Number(el.dataset.v || 0);
    el.dataset.v = n;
    if (from === n || reduceMotion) { el.textContent = n; return; }
    const t0 = performance.now();
    const step = now => {
      const p = Math.min((now - t0) / 350, 1);
      el.textContent = Math.round(from + (n - from) * p);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function renderStats() {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    setNum($('#statTotal'), total);
    setNum($('#statProgress'), tasks.filter(t => t.status === 'progress').length);
    setNum($('#statDone'), done);
    setNum($('#statOverdue'), tasks.filter(isOverdue).length);
    const pct = total ? Math.round((done / total) * 100) : 0;
    $('#ringPct').textContent = pct + '%';
    $('#ringFg').style.strokeDashoffset = 213.6 * (1 - pct / 100);
    $('#ringFg').style.stroke = pct === 100 && total ? 'var(--green)' : 'var(--primary)';
  }

  function visibleTasks() {
    const q = query.toLowerCase();
    return tasks
      .filter(t => prioFilter === 'all' || t.priority === prioFilter)
      .filter(t => !q || t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q))
      .sort((a, b) =>
        (a.due || '9999').localeCompare(b.due || '9999') ||
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }

  function cardHTML(t, { draggable, showStatus }) {
    const due = dueInfo(t);
    const st = STATUSES.find(s => s.id === t.status);
    const done = t.status === 'done';
    return `
      <article class="card prio-${t.priority} ${done ? 'is-done' : ''} ${t.id === justAdded ? 'new' : ''}"
               data-id="${t.id}" ${draggable ? 'draggable="true"' : ''}>
        <button class="check" data-act="toggle" aria-label="Toggle done" title="${done ? 'Mark as not done' : 'Mark as done'}">${done ? '✓' : ''}</button>
        <div class="card-body">
          <h4>${esc(t.title)}</h4>
          ${t.description ? `<p>${esc(t.description)}</p>` : ''}
          <div class="meta">
            <span class="badge ${t.priority}">${cap(t.priority)}</span>
            ${showStatus ? `<span class="badge status ${t.status}">${st.icon} ${st.label}</span>` : ''}
            ${due ? `<span class="badge due ${due.cls}">📅 ${due.text}</span>` : ''}
          </div>
        </div>
        <div class="card-actions">
          <button class="icon-btn" data-act="next" title="${done ? 'Reopen' : 'Move to next stage'}">${done ? '↩' : '➜'}</button>
          <button class="icon-btn" data-act="edit" title="Edit">✏️</button>
          <button class="icon-btn" data-act="delete" title="Delete">🗑️</button>
        </div>
      </article>`;
  }

  function renderBoard() {
    const board = $('#board');
    const list = visibleTasks();
    board.classList.toggle('list-mode', view === 'list');

    if (view === 'list') {
      board.innerHTML = list.length
        ? `<div class="cards">${list.map(t => cardHTML(t, { draggable: false, showStatus: true })).join('')}</div>`
        : emptyHTML();
    } else {
      board.innerHTML = STATUSES.map(s => {
        const items = list.filter(t => t.status === s.id);
        return `
          <div class="column" data-status="${s.id}">
            <div class="col-head">
              <div class="col-title">${s.icon} ${s.label} <span class="count">${items.length}</span></div>
              <button class="col-add" data-add="${s.id}" title="Add task here">＋</button>
            </div>
            <div class="cards">
              ${items.length ? items.map(t => cardHTML(t, { draggable: true, showStatus: false })).join('')
                             : '<div class="drop-hint">Drop tasks here</div>'}
            </div>
          </div>`;
      }).join('');
    }
    justAdded = null;
  }

  function emptyHTML() {
    const filtered = query || prioFilter !== 'all';
    return `<div class="empty">
      <div class="big">${filtered ? '🔎' : '📝'}</div>
      <h3>${filtered ? 'No matching tasks' : 'No tasks yet'}</h3>
      <p>${filtered ? 'Try a different search or filter.' : 'Press N or click "New Task" to add your first one.'}</p>
    </div>`;
  }

  function render() { renderStats(); renderBoard(); }

  function renderProfile() {
    const name = profile.name || '';
    $('#avatar').textContent = profile.avatar || (name ? name.trim()[0].toUpperCase() : '🎓');
    $('#chipName').textContent = name || 'Set up profile';
    const h = new Date().getHours();
    const hello = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    const first = name.split(' ')[0];
    $('#greeting').textContent = first ? `${hello}, ${first}! 👋` : `${hello}! 👋`;
    $('#tagline').textContent = profile.course ? `${profile.course} · let's get things done.` : 'Plan your assignments, labs and project deadlines.';
    $('#today').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // ================= theme & view =================
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    $('#themeBtn').textContent = t === 'dark' ? '☀️' : '🌙';
  }
  function toggleTheme() {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    save(KEYS.theme, next);
  }
  function setView(v) {
    view = v;
    save(KEYS.view, v);
    $$('#viewToggle button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    renderBoard();
  }

  // ================= task actions =================
  function setStatus(id, status) {
    const t = tasks.find(x => x.id === id);
    if (!t || t.status === status) return;
    const was = t.status;
    t.status = status;
    persist();
    render();
    if (status === 'done' && was !== 'done') {
      confetti();
      toast(PRAISE[Math.floor(Math.random() * PRAISE.length)]);
    }
  }

  function deleteTask(id) {
    const idx = tasks.findIndex(t => t.id === id);
    if (idx < 0) return;
    const [removed] = tasks.splice(idx, 1);
    persist();
    render();
    toast('Task deleted', {
      action: 'Undo',
      fn: () => { tasks.splice(idx, 0, removed); persist(); render(); }
    });
  }

  // ================= modals =================
  const anyModalOpen = () => $$('.modal').some(m => !m.classList.contains('hidden'));
  const closeAll = () => $$('.modal').forEach(m => m.classList.add('hidden'));

  function openTaskModal(task, status) {
    editingId = task ? task.id : null;
    presetStatus = status || 'todo';
    $('#taskModalTitle').textContent = task ? 'Edit Task' : 'New Task';
    $('#tTitle').value = task ? task.title : '';
    $('#tDesc').value = task ? task.description || '' : '';
    $('#tDue').value = task ? task.due || '' : '';
    $('#tStatus').value = task ? task.status : presetStatus;
    const prio = task ? task.priority : 'medium';
    $$('input[name=prio]').forEach(r => { r.checked = r.value === prio; });
    $('#taskModal').classList.remove('hidden');
    setTimeout(() => $('#tTitle').focus(), 30);
  }

  function renderAvatarPicker() {
    $('#avatarPicker').innerHTML = AVATARS.map(a =>
      `<button type="button" class="avatar-opt ${a === tempAvatar ? 'selected' : ''}" data-avatar="${a}">${a}</button>`).join('');
  }

  function openProfileModal() {
    $('#pName').value = profile.name || '';
    $('#pEmail').value = profile.email || '';
    $('#pCourse').value = profile.course || '';
    $('#pBio').value = profile.bio || '';
    tempAvatar = profile.avatar || '';
    renderAvatarPicker();
    $('#profileModal').classList.remove('hidden');
    setTimeout(() => $('#pName').focus(), 30);
  }

  // ================= events =================
  $('#addBtn').addEventListener('click', () => openTaskModal(null));
  $('#profileBtn').addEventListener('click', openProfileModal);
  $('#themeBtn').addEventListener('click', toggleTheme);

  $$('[data-close]').forEach(b => b.addEventListener('click', closeAll));
  $$('.modal').forEach(m => m.addEventListener('mousedown', e => { if (e.target === m) closeAll(); }));

  $('#viewToggle').addEventListener('click', e => {
    const b = e.target.closest('button[data-view]');
    if (b) setView(b.dataset.view);
  });

  $('#prioChips').addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    prioFilter = b.dataset.prio;
    $$('#prioChips .chip').forEach(c => c.classList.toggle('active', c === b));
    renderBoard();
  });

  $('#search').addEventListener('input', e => { query = e.target.value.trim(); renderBoard(); });

  // quick date chips inside the task modal
  $('.quick-dates').addEventListener('click', e => {
    const b = e.target.closest('[data-days]');
    if (!b) return;
    $('#tDue').value = b.dataset.days === 'clear' ? '' : addDays(Number(b.dataset.days));
  });

  $('#taskForm').addEventListener('submit', e => {
    e.preventDefault();
    const title = $('#tTitle').value.trim();
    if (!title) return;
    const data = {
      title: title.slice(0, 120),
      description: $('#tDesc').value.trim().slice(0, 500),
      priority: ($('input[name=prio]:checked') || { value: 'medium' }).value,
      due: $('#tDue').value,
      status: $('#tStatus').value
    };
    if (editingId) {
      tasks = tasks.map(t => (t.id === editingId ? { ...t, ...data } : t));
      toast('Task updated ✏️');
    } else {
      const t = { id: newId(), ...data, createdAt: new Date().toISOString() };
      tasks.push(t);
      justAdded = t.id;
      toast('Task added ✅');
    }
    persist();
    closeAll();
    render();
  });

  $('#avatarPicker').addEventListener('click', e => {
    const b = e.target.closest('[data-avatar]');
    if (!b) return;
    tempAvatar = tempAvatar === b.dataset.avatar ? '' : b.dataset.avatar;
    renderAvatarPicker();
  });

  $('#profileForm').addEventListener('submit', e => {
    e.preventDefault();
    profile = {
      name: $('#pName').value.trim(),
      email: $('#pEmail').value.trim(),
      course: $('#pCourse').value.trim(),
      bio: $('#pBio').value.trim(),
      avatar: tempAvatar
    };
    save(KEYS.profile, profile);
    renderProfile();
    closeAll();
    toast('Profile saved 🎉');
  });

  // board / list interactions (event delegation)
  const boardEl = $('#board');

  boardEl.addEventListener('click', e => {
    const add = e.target.closest('[data-add]');
    if (add) { openTaskModal(null, add.dataset.add); return; }

    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = btn.closest('.card').dataset.id;
    const t = tasks.find(x => x.id === id);
    if (!t) return;

    if (btn.dataset.act === 'toggle') setStatus(id, t.status === 'done' ? 'todo' : 'done');
    else if (btn.dataset.act === 'next') setStatus(id, STATUS_IDS[(STATUS_IDS.indexOf(t.status) + 1) % STATUS_IDS.length]);
    else if (btn.dataset.act === 'edit') openTaskModal(t);
    else if (btn.dataset.act === 'delete') deleteTask(id);
  });

  boardEl.addEventListener('dblclick', e => {
    const card = e.target.closest('.card');
    if (!card || e.target.closest('[data-act]')) return;
    const t = tasks.find(x => x.id === card.dataset.id);
    if (t) openTaskModal(t);
  });

  // drag & drop between columns
  let dragId = null;
  boardEl.addEventListener('dragstart', e => {
    const card = e.target.closest('.card');
    if (!card) return;
    dragId = card.dataset.id;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragId);
  });
  boardEl.addEventListener('dragend', () => {
    dragId = null;
    $$('.dragging, .over', boardEl).forEach(el => el.classList.remove('dragging', 'over'));
  });
  boardEl.addEventListener('dragover', e => {
    const col = e.target.closest('.column');
    if (!col || !dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    $$('.column.over', boardEl).forEach(c => { if (c !== col) c.classList.remove('over'); });
    col.classList.add('over');
  });
  boardEl.addEventListener('dragleave', e => {
    const col = e.target.closest('.column');
    if (col && !col.contains(e.relatedTarget)) col.classList.remove('over');
  });
  boardEl.addEventListener('drop', e => {
    const col = e.target.closest('.column');
    if (!col || !dragId) return;
    e.preventDefault();
    const id = dragId;
    dragId = null;
    setStatus(id, col.dataset.status);
  });

  // backup: export / import / clear
  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ app: 'cdac-kharghar-taskmanager', tasks, profile }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'cdac-taskmanager-backup.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Backup downloaded ⬇');
  });

  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.tasks)) throw new Error('bad file');
        if (!confirm('Replace your current tasks with this backup?')) return;
        tasks = data.tasks
          .filter(t => t && typeof t.title === 'string' && t.title.trim())
          .map(t => ({
            id: typeof t.id === 'string' && t.id ? t.id : newId(),
            title: t.title.trim().slice(0, 120),
            description: String(t.description || '').slice(0, 500),
            priority: PRIORITIES.includes(t.priority) ? t.priority : 'medium',
            due: /^\d{4}-\d{2}-\d{2}$/.test(t.due || '') ? t.due : '',
            status: STATUS_IDS.includes(t.status) ? t.status : (t.done ? 'done' : 'todo'),
            createdAt: t.createdAt || new Date().toISOString()
          }));
        if (data.profile && typeof data.profile === 'object') {
          profile = {
            name: String(data.profile.name || '').slice(0, 60),
            email: String(data.profile.email || '').slice(0, 100),
            course: String(data.profile.course || '').slice(0, 80),
            bio: String(data.profile.bio || '').slice(0, 200),
            avatar: AVATARS.includes(data.profile.avatar) ? data.profile.avatar : ''
          };
          save(KEYS.profile, profile);
        }
        persist();
        closeAll();
        renderProfile();
        render();
        toast('Backup imported ✅');
      } catch (err) {
        toast('That file is not a valid backup');
      }
    };
    reader.readAsText(file);
  });

  $('#clearBtn').addEventListener('click', () => {
    if (!confirm('Delete ALL tasks and your profile from this browser?')) return;
    tasks = [];
    profile = { name: '', email: '', course: '', bio: '', avatar: '' };
    persist();
    save(KEYS.profile, profile);
    closeAll();
    renderProfile();
    render();
    toast('Everything cleared');
  });

  // keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeAll();
      if (document.activeElement === $('#search')) $('#search').blur();
      return;
    }
    const typing = /^(input|textarea|select)$/i.test(e.target.tagName);
    if (typing || anyModalOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'n') { e.preventDefault(); openTaskModal(null); }
    else if (e.key === '/') { e.preventDefault(); $('#search').focus(); }
    else if (k === 'v') setView(view === 'board' ? 'list' : 'board');
    else if (k === 't') toggleTheme();
  });

  // ================= init =================
  const savedTheme = load(KEYS.theme, null);
  applyTheme(savedTheme || document.documentElement.getAttribute('data-theme') || 'light');
  $$('#viewToggle button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  renderProfile();
  render();
  if (firstVisit && !profile.name) setTimeout(openProfileModal, 400);
})();
