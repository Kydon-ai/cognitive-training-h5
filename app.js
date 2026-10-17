(() => {
  const endpoint = '/api/v1/cognitive-training/tasks'
  const categories = [
    { value: 'memory', label: '记忆力', icon: '◈', color: 'violet' },
    { value: 'attention', label: '专注力', icon: '◎', color: 'mint' },
    { value: 'reasoning', label: '逻辑思维', icon: '⌘', color: 'peach' },
    { value: 'reaction', label: '快速反应', icon: '↗', color: 'blue' },
  ]
  const defaultSettings = { apiBase: 'http://127.0.0.1:8080', userId: 'user-123', token: 'apifox-test' }
  const state = {
    settings: readSettings(),
    tasks: [],
    filter: 'all',
    search: '',
    apiState: 'loading',
    loading: false,
    saving: false,
    errorMessage: '',
    toastTimer: null,
  }
  const app = document.querySelector('#app')

  function readSettings() {
    try { return { ...defaultSettings, ...JSON.parse(localStorage.getItem('mind-garden-api-settings') || '{}') } }
    catch { return { ...defaultSettings } }
  }
  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
  }
  function category(type) { return categories.find(item => item.value === type) || { label: type || '未分类', icon: '✧', color: 'violet' } }
  function formatDate(value) {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)
  }
  function showToast(message) {
    let toast = document.querySelector('.toast-message')
    if (!toast) {
      toast = document.createElement('div')
      toast.className = 'toast-message'
      toast.setAttribute('role', 'status')
      document.body.append(toast)
    }
    toast.textContent = `✦ ${message}`
    clearTimeout(state.toastTimer)
    state.toastTimer = setTimeout(() => toast.remove(), 2600)
  }
  function explainError(error) {
    if (error instanceof TypeError) return '无法连接接口。请确认 Go 服务已启动，并检查接口地址和跨域来源配置。'
    if (error.message.startsWith('health_check_failed')) return 'Go 服务健康检查未通过，请确认服务状态。'
    const messages = { unauthorized: 'Token 校验失败，请在接口配置中检查 Token。', task_not_found: '任务不存在或不属于当前用户。' }
    return messages[error.message] || error.message || '请求失败，请稍后重试。'
  }
  async function checkHealth() {
    const base = state.settings.apiBase.trim().replace(/\/+$/, '')
    try {
      const response = await fetch(new URL(`${base}/healthz`))
      if (!response.ok) throw new Error(`health_check_failed_${response.status}`)
      const data = await response.json()
      if (data.status !== 'ok') throw new Error('health_check_failed')
      state.apiState = 'online'
    } catch (error) {
      state.apiState = 'offline'
      throw error
    }
  }
  async function request(path, { method = 'GET', body, queryUser = false } = {}) {
    const base = state.settings.apiBase.trim().replace(/\/+$/, '')
    const url = new URL(base + path)
    if (queryUser) url.searchParams.set('userId', state.settings.userId.trim())
    const headers = { Authorization: `Bearer ${state.settings.token.trim()}` }
    const options = { method, headers }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      options.body = JSON.stringify({ userId: state.settings.userId.trim(), task: body })
    }
    const response = await fetch(url, options)
    if (response.status === 204) return null
    let data = {}
    try { data = await response.json() } catch { /* report the HTTP status below */ }
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)
    return data
  }
  function renderShell() {
    const today = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())
    app.innerHTML = `
      <aside class="sidebar">
        <a class="brand" href="#top"><span class="brand-mark">m</span><span class="brand-copy"><b>mind garden</b><small>COGNITIVE TRAINING</small></span></a>
        <div class="nav-caption">工作台</div>
        <nav class="side-nav" aria-label="主导航"><a class="active" href="#overview"><span class="nav-icon">▦</span>任务总览</a><a href="#tasks"><span class="nav-icon">✳</span>认知训练任务<span class="nav-count" id="nav-count">0</span></a><button data-action="settings"><span class="nav-icon">⚙</span>接口配置</button></nav>
        <div class="sidebar-spacer"></div>
        <div class="connection-card"><div><span class="status-dot loading"></span><b class="connection-label">正在连接</b></div><small class="api-address"></small><button data-action="refresh">重新检查 <span>↻</span></button></div>
        <div class="profile-button"><span class="avatar">林</span><span class="profile-copy"><b class="user-id"></b><small>当前用户</small></span><span class="profile-more">···</span></div>
      </aside>
        <main id="top" class="main-area">
        <header class="topbar"><div class="breadcrumb">Mind Garden <span>/</span> <b>任务总览</b></div><div class="top-actions"><span class="top-date">${escapeHTML(today)}</span><span class="connection-chip"><i class="status-dot loading"></i><span class="connection-label">连接中</span></span><button class="settings-button" data-action="settings">⚙ <span>接口配置</span></button></div></header>
        <section id="overview" class="welcome-row"><div><div class="eyebrow"><span class="sun-icon">☼</span> COGNITIVE TRAINING WORKSPACE <span class="app-variant-badge" aria-label="当前页面：纯 H5 版">纯 H5 版</span></div><h1>认知训练任务 <span class="welcome-star">✦</span></h1><p>安排、管理并追踪每一项脑力练习。</p></div><button class="primary-button" data-action="create"><span>＋</span> 新建任务</button></section>
        <section class="hero-card"><div class="hero-glow glow-one"></div><div class="hero-glow glow-two"></div><div class="hero-content"><div class="hero-label"><span class="hero-label-dot"></span> YOUR TRAINING PLAN <span class="hero-label-line"></span> MIND / GARDEN</div><h2>让每一次练习，<br />都成为成长的轨迹。</h2><p>创建认知训练任务，为记忆力、专注力和思维灵活度安排一份计划。</p><div class="hero-meta"><span>◈ 记忆训练</span><span>◎ 专注提升</span><span>⌘ 思维灵活</span></div></div><div class="hero-art" aria-hidden="true"><div class="orbit orbit-a"></div><div class="orbit orbit-b"></div><div class="orbit orbit-c"></div><div class="brain-orb"><span>✺</span></div><i class="hero-spark spark-a">✦</i><i class="hero-spark spark-b">✧</i><div class="float-tag tag-top">TASKS <b id="hero-count">00</b></div><div class="float-tag tag-bottom">思维活跃中 <span>✦</span></div></div></section>
        <section class="stats-grid" aria-label="任务概览"><article class="stat-card"><div class="stat-icon purple">✳</div><div><span>任务总数</span><strong><span id="task-total">0</span> <small>项</small></strong><em>已创建的训练计划</em></div><div class="stat-decoration">◈</div></article><article class="stat-card"><div class="stat-icon coral">◎</div><div><span>训练方向</span><strong><span id="category-total">0</span> <small>类</small></strong><em>覆盖不同认知能力</em></div><div class="stat-decoration coral-decoration">✧</div></article><article class="stat-card"><div class="stat-icon green">◷</div><div><span>最近创建</span><strong class="date-stat" id="latest-date">暂无</strong><em>任务列表按创建时间排列</em></div><div class="stat-decoration green-decoration">↗</div></article></section>
        <section id="tasks" class="task-section content-panel"><div class="section-heading"><div><div class="section-overline">YOUR TASK LIBRARY</div><h2>训练任务 <span class="heading-count" id="visible-count">0</span></h2><p>所有训练安排都在这里，可以随时查看和调整。</p></div><button class="refresh-button" data-action="refresh"><span class="refresh-icon">↻</span> 刷新列表</button></div>
          <div class="task-toolbar"><div class="filter-tabs"><button class="active" data-filter="all">全部任务 <span id="all-count">0</span></button>${categories.map(item => `<button data-filter="${item.value}">${item.label}</button>`).join('')}</div><label class="search-box"><span>⌕</span><input id="task-search" type="search" placeholder="搜索任务名称或说明" /></label></div>
          <div id="task-results"></div>
        </section>
        <footer class="page-footer"><span>© 2026 MIND GARDEN</span><span>让每一次思考，都有迹可循。 <i>✦</i></span><span>认知训练任务管理</span></footer>
      </main>
      <div id="modal-root"></div>`
    document.querySelectorAll('.api-address').forEach(element => { element.textContent = state.settings.apiBase })
    document.querySelectorAll('.user-id').forEach(element => { element.textContent = state.settings.userId })
    app.addEventListener('click', handleClick)
    document.querySelector('#task-search').addEventListener('input', event => { state.search = event.target.value; renderTasks() })
  }
  function updateConnection() {
    document.querySelectorAll('.status-dot').forEach(dot => { dot.className = `status-dot ${state.apiState}` })
    const labels = { online: ['接口已连接', '服务在线'], offline: ['接口未连接', '服务离线'], loading: ['正在连接', '连接中'] }
    document.querySelectorAll('.connection-label').forEach((element, index) => { element.textContent = labels[state.apiState][index === 0 && element.closest('.connection-card') ? 0 : 1] })
    document.querySelectorAll('.api-address').forEach(element => { element.textContent = state.settings.apiBase })
    document.querySelectorAll('.user-id').forEach(element => { element.textContent = state.settings.userId })
  }
  function renderTasks() {
    const filtered = state.tasks.filter(item => {
      const type = item.task?.type || ''
      const query = state.search.trim().toLowerCase()
      const matchesType = state.filter === 'all' || type === state.filter
      const text = [item.task?.title, item.task?.description, category(type).label].join(' ').toLowerCase()
      return matchesType && (!query || text.includes(query))
    })
    const typeCount = new Set(state.tasks.map(item => item.task?.type).filter(Boolean)).size
    document.querySelector('#nav-count').textContent = state.tasks.length
    document.querySelector('#hero-count').textContent = String(state.tasks.length).padStart(2, '0')
    document.querySelector('#task-total').textContent = state.tasks.length
    document.querySelector('#category-total').textContent = typeCount
    document.querySelector('#latest-date').textContent = state.tasks[0]?.createdAt ? new Date(state.tasks[0].createdAt).toLocaleDateString('zh-CN') : '暂无'
    document.querySelector('#visible-count').textContent = filtered.length
    document.querySelector('#all-count').textContent = state.tasks.length
    document.querySelectorAll('[data-filter]').forEach(button => button.classList.toggle('active', button.dataset.filter === state.filter))
    const results = document.querySelector('#task-results')
    if (state.errorMessage) {
      results.innerHTML = `<div class="api-error"><span>!</span><div><b>任务加载失败</b><small>${escapeHTML(state.errorMessage)}</small></div><button data-action="settings">检查接口配置</button></div>`
      return
    }
    if (state.loading && !state.tasks.length) {
      results.innerHTML = '<div class="loading-state"><span class="spinner"></span> 正在读取任务…</div>'
      return
    }
    if (!filtered.length) {
      const narrowed = state.search || state.filter !== 'all'
      results.innerHTML = `<div class="empty-state"><span class="empty-illustration">✳</span><b>${narrowed ? '没有找到匹配的任务' : '还没有训练任务'}</b><p>${narrowed ? '换个关键词或训练方向试试看。' : '创建第一项练习计划，开始整理你的认知训练。'}</p>${narrowed ? '' : '<button class="primary-button" data-action="create"><span>＋</span> 创建第一个任务</button>'}</div>`
      return
    }
    results.innerHTML = `<div class="task-grid">${filtered.map(renderTaskCard).join('')}</div>`
  }
  function renderTaskCard(item) {
    const data = item.task || {}
    const type = category(data.type)
    return `<article class="task-card"><div class="task-card-head"><span class="task-icon ${type.color}">${escapeHTML(type.icon)}</span><span class="task-category ${type.color}">${escapeHTML(type.label)}</span></div><h3>${escapeHTML(data.title || '未命名任务')}</h3><p class="task-description">${escapeHTML(data.description || '还没有添加任务说明。')}</p><div class="task-tags"><span>◷ ${escapeHTML(data.duration || 5)} 分钟</span><span>✧ ${escapeHTML(data.difficulty || '入门')}</span></div><div class="task-card-footer"><small>创建于 ${escapeHTML(formatDate(item.createdAt))}</small><div class="task-actions"><button data-action="detail" data-id="${escapeHTML(item.id)}">详情</button><button data-action="edit" data-id="${escapeHTML(item.id)}">编辑</button><button class="delete-action" data-action="delete" data-id="${escapeHTML(item.id)}">删除</button></div></div></article>`
  }
  async function loadTasks() {
    state.loading = true
    state.errorMessage = ''
    state.apiState = 'loading'
    updateConnection()
    renderTasks()
    try {
      await checkHealth()
      const data = await request(endpoint, { queryUser: true })
      state.tasks = Array.isArray(data.tasks) ? data.tasks : []
    } catch (error) {
      if (error instanceof TypeError || error.message.startsWith('health_check_failed')) state.apiState = 'offline'
      state.errorMessage = explainError(error)
    } finally {
      state.loading = false
      updateConnection()
      renderTasks()
    }
  }
  function openCreate() { openTaskForm(null) }
  function openEdit(item) { openTaskForm(item) }
  function openTaskForm(item) {
    const data = item?.task || {}
    const isEdit = Boolean(item)
    const modalRoot = document.querySelector('#modal-root')
    modalRoot.innerHTML = `<div class="modal-backdrop" data-backdrop><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="form-title"><button class="modal-close" data-close aria-label="关闭">×</button><div class="modal-kicker">TASK DETAILS</div><h2 id="form-title">${isEdit ? '编辑训练任务' : '新建训练任务'}</h2><p class="modal-subtitle">${isEdit ? '调整任务信息后保存，更新会同步到服务端。' : '填写训练安排，保存后会同步到服务端。'}</p><form class="task-form" data-task-form data-id="${escapeHTML(item?.id || '')}"><label>任务名称<input name="title" maxlength="100" required placeholder="例如：每日图案记忆练习" value="${escapeHTML(data.title || '')}" /></label><div class="form-row"><label>训练方向<select name="type">${categories.map(option => `<option value="${option.value}" ${data.type === option.value ? 'selected' : ''}>${option.label}</option>`).join('')}</select></label><label>难度<select name="difficulty">${['入门', '进阶', '挑战'].map(option => `<option ${data.difficulty === option ? 'selected' : ''}>${option}</option>`).join('')}</select></label></div><label>任务说明<textarea name="description" rows="3" maxlength="500" placeholder="写下训练目标或练习说明">${escapeHTML(data.description || '')}</textarea></label><label>预计时长（分钟）<input name="duration" type="number" min="1" max="120" required value="${escapeHTML(data.duration || 5)}" /></label><div class="modal-actions"><button type="button" class="secondary-button" data-close>取消</button><button class="primary-button" ${state.saving ? 'disabled' : ''}><span>✓</span>${state.saving ? '保存中' : '保存任务'}</button></div></form></section></div>`
    modalRoot.querySelector('[data-backdrop]').addEventListener('click', event => { if (event.target.matches('[data-backdrop]')) modalRoot.innerHTML = '' })
    modalRoot.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => { modalRoot.innerHTML = '' }))
    modalRoot.querySelector('[data-task-form]').addEventListener('submit', event => { event.preventDefault(); saveTask(event.currentTarget) })
    modalRoot.querySelector('input[name="title"]').focus()
  }
  async function saveTask(form) {
    if (state.saving) return
    const values = new FormData(form)
    const id = form.dataset.id
    const existing = state.tasks.find(item => item.id === id)
    const body = {
      ...(existing?.task || {}),
      title: String(values.get('title') || '').trim(),
      type: String(values.get('type') || 'memory'),
      description: String(values.get('description') || '').trim(),
      difficulty: String(values.get('difficulty') || '入门'),
      duration: Number(values.get('duration')),
    }
    state.saving = true
    const submit = form.querySelector('button[type="submit"],button:not([type])')
    if (submit) { submit.disabled = true; submit.textContent = '保存中…' }
    try {
      if (id) {
        await request(`${endpoint}/${encodeURIComponent(id)}`, { method: 'PUT', body })
        showToast('任务已更新')
      } else {
        await request(endpoint, { method: 'POST', body })
        showToast('新任务已创建')
      }
      document.querySelector('#modal-root').innerHTML = ''
      await loadTasks()
    } catch (error) { showToast(explainError(error)) }
    finally { state.saving = false }
  }
  async function showDetails(item) {
    try {
      const response = await request(`${endpoint}/${encodeURIComponent(item.id)}`, { queryUser: true })
      openDetail(response.task)
    } catch (error) { showToast(explainError(error)) }
  }
  function openDetail(item) {
    const data = item.task || {}
    const type = category(data.type)
    const root = document.querySelector('#modal-root')
    root.innerHTML = `<div class="modal-backdrop" data-backdrop><section class="modal-card detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title"><button class="modal-close" data-close aria-label="关闭">×</button><div class="modal-kicker">TASK OVERVIEW</div><span class="detail-icon ${type.color}">${escapeHTML(type.icon)}</span><h2 id="detail-title">${escapeHTML(data.title || '未命名任务')}</h2><p class="modal-subtitle">${escapeHTML(data.description || '暂无任务说明。')}</p><div class="detail-facts"><div><small>训练方向</small><b>${escapeHTML(type.label)}</b></div><div><small>难度等级</small><b>${escapeHTML(data.difficulty || '入门')}</b></div><div><small>预计时长</small><b>${escapeHTML(data.duration || 5)} 分钟</b></div><div><small>任务 ID</small><b class="detail-id">${escapeHTML(item.id)}</b></div><div><small>创建时间</small><b>${escapeHTML(formatDate(item.createdAt))}</b></div><div><small>更新时间</small><b>${escapeHTML(formatDate(item.updatedAt))}</b></div></div><div class="modal-actions"><button class="secondary-button" data-close>关闭</button><button class="primary-button" data-action="detail-edit" data-id="${escapeHTML(item.id)}"><span>✎</span>编辑任务</button></div></section></div>`
    root.querySelector('[data-backdrop]').addEventListener('click', event => { if (event.target.matches('[data-backdrop]')) root.innerHTML = '' })
    root.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => { root.innerHTML = '' }))
    root.querySelector('[data-action="detail-edit"]').addEventListener('click', () => openEdit(state.tasks.find(task => task.id === item.id) || item))
  }
  function openSettings() {
    const root = document.querySelector('#modal-root')
    root.innerHTML = `<div class="modal-backdrop" data-backdrop><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="settings-title"><button class="modal-close" data-close aria-label="关闭">×</button><div class="modal-kicker">API CONNECTION</div><h2 id="settings-title">接口配置</h2><p class="modal-subtitle">设置 Go 服务地址、用户标识和请求 Token。</p><form class="task-form" data-settings-form><label>接口基础地址<input name="apiBase" type="url" required value="${escapeHTML(state.settings.apiBase)}" placeholder="http://127.0.0.1:8080" /></label><label>用户 ID<input name="userId" maxlength="128" required value="${escapeHTML(state.settings.userId)}" placeholder="user-123" /></label><label>Bearer Token<input name="token" type="password" required value="${escapeHTML(state.settings.token)}" placeholder="apifox-test" autocomplete="off" /></label><div class="config-note"><span>i</span>测试模式使用任意非空 Token。生产环境请填写服务端配置的 COGNITIVE_API_TOKEN。</div><div class="modal-actions"><button type="button" class="secondary-button" data-close>取消</button><button class="primary-button"><span>↗</span>保存并测试连接</button></div></form></section></div>`
    root.querySelector('[data-backdrop]').addEventListener('click', event => { if (event.target.matches('[data-backdrop]')) root.innerHTML = '' })
    root.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => { root.innerHTML = '' }))
    root.querySelector('[data-settings-form]').addEventListener('submit', saveSettings)
    root.querySelector('input[name="apiBase"]').focus()
  }
  async function saveSettings(event) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const apiBase = String(values.get('apiBase') || '').trim().replace(/\/+$/, '')
    const userId = String(values.get('userId') || '').trim()
    const token = String(values.get('token') || '').trim()
    try { new URL(apiBase) } catch { showToast('接口地址格式不正确'); return }
    if (!apiBase || !userId || !token) { showToast('接口地址、用户 ID 和 Token 都不能为空'); return }
    state.settings = { apiBase, userId, token }
    localStorage.setItem('mind-garden-api-settings', JSON.stringify(state.settings))
    document.querySelector('#modal-root').innerHTML = ''
    await loadTasks()
    if (state.apiState === 'online' && state.errorMessage) showToast(`服务在线，但任务读取失败：${state.errorMessage}`)
    else if (state.apiState === 'online') showToast('接口配置已保存并连接成功')
    else showToast(state.errorMessage || '服务健康检查失败')
  }
  async function removeTask(item) {
    if (!window.confirm(`确定删除「${item.task?.title || '未命名任务'}」吗？删除后无法恢复。`)) return
    try {
      await request(`${endpoint}/${encodeURIComponent(item.id)}`, { method: 'DELETE', queryUser: true })
      showToast('任务已删除')
      await loadTasks()
    } catch (error) { showToast(explainError(error)) }
  }
  function handleClick(event) {
    const filterButton = event.target.closest('[data-filter]')
    if (filterButton) { state.filter = filterButton.dataset.filter; renderTasks(); return }
    const button = event.target.closest('[data-action]')
    if (!button) return
    const item = state.tasks.find(task => task.id === button.dataset.id)
    switch (button.dataset.action) {
      case 'create': openCreate(); break
      case 'settings': openSettings(); break
      case 'refresh': loadTasks(); break
      case 'detail': if (item) showDetails(item); break
      case 'edit': if (item) openEdit(item); break
      case 'delete': if (item) removeTask(item); break
    }
  }

  function openCreate() { openTaskForm(null) }
  function openEdit(item) { openTaskForm(item) }
  renderShell()
  updateConnection()
  renderTasks()
  loadTasks()
})()
