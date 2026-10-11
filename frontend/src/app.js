// Circo Frontend Client Application — Minimalist Edition

const state = {
  user: JSON.parse(localStorage.getItem('circo_user') || 'null'),
  token: localStorage.getItem('circo_token') || '',
  activeCircle: null,
  myCircles: [],
  currentCategory: 'All',
  searchQuery: '',
  resources: [],
  members: [],
  socket: null,
};

// DOM References
const buildNumberEl = document.getElementById('buildNumber');
const footerBuildTagEl = document.getElementById('footerBuildTag');
const userNameDisplay = document.getElementById('userNameDisplay');
const userCircleDisplay = document.getElementById('userCircleDisplay');
const userAvatar = document.getElementById('userAvatar');
const resourcesFeed = document.getElementById('resourcesFeed');
const membersList = document.getElementById('membersList');
const circleMembersCount = document.getElementById('circleMembersCount');
const activityFeed = document.getElementById('activityFeed');
const socketStatusIndicator = document.getElementById('socketStatusIndicator');

// Dedicated Production Auth Elements
const authPageContainer = document.getElementById('authPageContainer');
const appWorkspace = document.getElementById('appWorkspace');
const authTabSignIn = document.getElementById('authTabSignIn');
const authTabSignUp = document.getElementById('authTabSignUp');
const authAlertBanner = document.getElementById('authAlertBanner');
const authPageLoginForm = document.getElementById('authPageLoginForm');
const authPageRegisterForm = document.getElementById('authPageRegisterForm');
const pageLoginEmail = document.getElementById('pageLoginEmail');
const pageLoginPassword = document.getElementById('pageLoginPassword');
const pageLoginSubmitBtn = document.getElementById('pageLoginSubmitBtn');
const pageRegUsername = document.getElementById('pageRegUsername');
const pageRegEmail = document.getElementById('pageRegEmail');
const pageRegDisplayName = document.getElementById('pageRegDisplayName');
const pageRegCircleCode = document.getElementById('pageRegCircleCode');
const pageRegPassword = document.getElementById('pageRegPassword');
const pageRegSubmitBtn = document.getElementById('pageRegSubmitBtn');
const logoutBtn = document.getElementById('logoutBtn');

// Circle Management Elements
const currentCircleTitle = document.getElementById('currentCircleTitle');
const currentCircleDesc = document.getElementById('currentCircleDesc');
const circleCodeDisplay = document.getElementById('circleCodeDisplay');
const myCircleRole = document.getElementById('myCircleRole');
const copyCodeBtn = document.getElementById('copyCodeBtn');
const circleSelect = document.getElementById('circleSelect');
const feedCircleScopeName = document.getElementById('feedCircleScopeName');
const uploadTargetCircleName = document.getElementById('uploadTargetCircleName');
const inviteCodeCard = document.getElementById('inviteCodeCard');

// Modals
const uploadModal = document.getElementById('uploadModal');
const createCircleModal = document.getElementById('createCircleModal');
const joinCircleModal = document.getElementById('joinCircleModal');

const openUploadModalBtn = document.getElementById('openUploadModalBtn');
const closeUploadModalBtn = document.getElementById('closeUploadModalBtn');
const cancelUploadBtn = document.getElementById('cancelUploadBtn');

const openCreateCircleModalBtn = document.getElementById('openCreateCircleModalBtn');
const closeCreateCircleModalBtn = document.getElementById('closeCreateCircleModalBtn');
const cancelCreateCircleBtn = document.getElementById('cancelCreateCircleBtn');

const openJoinCircleModalBtn = document.getElementById('openJoinCircleModalBtn');
const closeJoinCircleModalBtn = document.getElementById('closeJoinCircleModalBtn');
const cancelJoinCircleBtn = document.getElementById('cancelJoinCircleBtn');

// Auth View Helpers
function showAuthScreen() {
  if (authPageContainer) authPageContainer.classList.remove('hidden');
  if (appWorkspace) appWorkspace.classList.add('hidden');
}

function showWorkspace() {
  if (authPageContainer) authPageContainer.classList.add('hidden');
  if (appWorkspace) appWorkspace.classList.remove('hidden');
}

function showAuthAlert(msg, type = 'error') {
  if (!authAlertBanner) return;
  authAlertBanner.textContent = msg;
  authAlertBanner.className = `auth-alert ${type}`;
}

function hideAuthAlert() {
  if (authAlertBanner) {
    authAlertBanner.className = 'auth-alert hidden';
    authAlertBanner.textContent = '';
  }
}

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  fetchHealthChecks();
  setInterval(fetchHealthChecks, 15000);

  if (state.user && state.token) {
    showWorkspace();
    renderUserInfo();
    initSocketIO();
    await fetchActiveCircle();
    await fetchMyCircles();
    await fetchResources();
  } else {
    showAuthScreen();
  }
});

// Render user profile details
function renderUserInfo() {
  if (state.user) {
    if (userNameDisplay) userNameDisplay.textContent = state.user.display_name || state.user.username;
    if (userCircleDisplay) {
      userCircleDisplay.textContent = (state.activeCircle && state.activeCircle.name)
        ? state.activeCircle.name
        : (state.myCircles && state.myCircles.length > 0 ? state.myCircles[0].name : (state.user.circle_name || 'No Circle'));
    }
    if (userAvatar) userAvatar.src = state.user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${state.user.username}`;
  }
}

// Service Health Monitoring
async function fetchHealthChecks() {
  let allHealthy = true;
  const checkService = async (url, elId) => {
    const el = document.getElementById(elId);
    if (!el) return;
    const dot = el.querySelector('.indicator-dot');
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
      clearTimeout(timer);
      if (res.ok) {
        if (dot) dot.className = 'indicator-dot online';
      } else {
        if (dot) dot.className = 'indicator-dot offline';
        allHealthy = false;
      }
    } catch {
      if (dot) dot.className = 'indicator-dot offline';
      allHealthy = false;
    }
  };

  await Promise.all([
    checkService('/proxy-health', 'healthProxy'),
    checkService('/api/auth/health', 'healthAuth'),
    checkService('/api/resources/health', 'healthResource'),
    checkService('/api/realtime/health', 'healthRealtime'),
    checkService('/api/resources/health', 'healthDb')
  ]);

  const statusLabel = document.getElementById('systemStatusLabel');
  const statusTriggerDot = document.querySelector('.system-status-pill .status-dot');
  if (statusLabel) {
    statusLabel.textContent = allHealthy ? 'All Systems Operational' : 'Degraded Performance';
  }
  if (statusTriggerDot) {
    statusTriggerDot.className = allHealthy ? 'status-dot online' : 'status-dot offline';
  }
}

// Socket.io Real-time connection
function initSocketIO() {
  try {
    if (typeof io !== 'undefined') {
      state.socket = io({
        path: '/socket.io',
        reconnectionAttempts: 3,
        timeout: 2500,
      });

      state.socket.on('connect', () => {
        if (socketStatusIndicator) {
          socketStatusIndicator.innerHTML = '<span class="live-dot pulse"></span><span>Live</span>';
          socketStatusIndicator.className = 'live-status-chip';
        }

        const healthRealtime = document.getElementById('healthRealtime');
        if (healthRealtime) {
          const dot = healthRealtime.querySelector('.indicator-dot');
          if (dot) dot.className = 'indicator-dot online';
        }

        // Join active circle room
        if (state.activeCircle && state.activeCircle.id) {
          state.socket.emit('join_circle', state.activeCircle.id);
        }
        addActivityItem('Connected to real-time notification engine.');
      });

      state.socket.on('connect_error', () => {
        if (socketStatusIndicator) {
          socketStatusIndicator.innerHTML = '<span class="live-dot" style="background:#ef4444;"></span><span>Offline</span>';
        }
      });

      state.socket.on('disconnect', () => {
        if (socketStatusIndicator) {
          socketStatusIndicator.innerHTML = '<span class="live-dot" style="background:#64748b;"></span><span>Offline</span>';
        }
      });

      state.socket.on('resource:created', (data) => {
        addActivityItem(`📄 New resource shared: <strong>${escapeHtml(data.resource.title)}</strong> by @${escapeHtml(data.author)}`);
        fetchResources();
      });

      state.socket.on('note:added', (data) => {
        addActivityItem(`💬 Note added to resource #${data.resourceId} by @${escapeHtml(data.author)}`);
        fetchResources();
      });

      state.socket.on('resource:deleted', (data) => {
        addActivityItem(`🗑 Resource #${data.resourceId} was deleted.`);
        fetchResources();
      });

      state.socket.on('pong', (data) => {
        const latency = Date.now() - data.time;
        addActivityItem(`🏓 Pong received (${latency}ms latency)`);
      });
    } else {
      if (socketStatusIndicator) {
        socketStatusIndicator.innerHTML = '<span class="live-dot" style="background:#ef4444;"></span><span>Disconnected</span>';
      }
    }
  } catch (err) {
    console.warn('Socket.io initialization error:', err);
  }
}

// Add item to right live activity feed
function addActivityItem(htmlMessage) {
  if (!activityFeed) return;
  const item = document.createElement('div');
  item.className = 'activity-item';
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  item.innerHTML = `<span class="activity-time">${time}</span><p>${htmlMessage}</p>`;
  activityFeed.prepend(item);

  if (activityFeed.children.length > 25) {
    activityFeed.removeChild(activityFeed.lastChild);
  }
}

// Fetch Active Circle Details & Members
async function fetchActiveCircle() {
  try {
    const headers = state.token ? { Authorization: `Bearer ${state.token}` } : {};
    const res = await fetch('/api/auth/circles/active', { headers });
    if (res.status === 401) {
      logout();
      return;
    }
    if (res.ok) {
      const circle = await res.json();
      state.activeCircle = circle;

      // Update UI elements
      if (currentCircleTitle) currentCircleTitle.textContent = circle.name;
      if (currentCircleDesc) currentCircleDesc.textContent = circle.description || 'Shared collaborative workspace.';
      if (circleCodeDisplay) circleCodeDisplay.textContent = circle.code;
      if (feedCircleScopeName) feedCircleScopeName.textContent = circle.name;
      if (uploadTargetCircleName) uploadTargetCircleName.textContent = circle.name;
      if (userCircleDisplay) userCircleDisplay.textContent = circle.name;
      if (inviteCodeCard) inviteCodeCard.style.display = '';
      if (openUploadModalBtn) openUploadModalBtn.style.display = '';

      // Determine user role in this circle
      const currentUserMember = (circle.members || []).find(m => state.user && (m.id === state.user.id || m.username === state.user.username));
      const roleText = currentUserMember ? currentUserMember.role.toUpperCase() : 'MEMBER';
      if (myCircleRole) myCircleRole.textContent = roleText;

      // Render members
      state.members = circle.members || [];
      if (circleMembersCount) circleMembersCount.textContent = `${state.members.length} members`;
      renderMembers();

      // Ensure socket room is joined
      if (state.socket && state.socket.connected) {
        state.socket.emit('join_circle', circle.id);
      }
    } else {
      state.activeCircle = null;
      if (currentCircleTitle) currentCircleTitle.textContent = 'No Circle Selected';
      if (currentCircleDesc) currentCircleDesc.textContent = 'Create a new circle or join one using an invite code.';
      if (circleCodeDisplay) circleCodeDisplay.textContent = '—';
      if (myCircleRole) myCircleRole.textContent = 'NONE';
      if (circleMembersCount) circleMembersCount.textContent = '0 members';
      if (feedCircleScopeName) feedCircleScopeName.textContent = 'None';
      if (uploadTargetCircleName) uploadTargetCircleName.textContent = 'None';
      if (userCircleDisplay) userCircleDisplay.textContent = 'No Circle';
      if (inviteCodeCard) inviteCodeCard.style.display = 'none';
      if (openUploadModalBtn) openUploadModalBtn.style.display = 'none';
      state.members = [];
      renderMembers();
    }
  } catch (e) {
    console.warn('Failed to load active circle:', e);
  }
}

// Fetch All Circles User Belongs To
async function fetchMyCircles() {
  try {
    const headers = state.token ? { Authorization: `Bearer ${state.token}` } : {};
    const res = await fetch('/api/auth/circles', { headers });
    if (res.status === 401) {
      logout();
      return;
    }
    if (res.ok) {
      state.myCircles = await res.json();
      renderCircleDropdown();
    }
  } catch (e) {
    console.warn('Failed to load user circles:', e);
  }
}

// Render Circle Dropdown
function renderCircleDropdown() {
  if (!circleSelect) return;
  if (!state.myCircles || state.myCircles.length === 0) {
    circleSelect.innerHTML = `<option value="">No Circles Joined</option>`;
    return;
  }

  const activeId = state.activeCircle ? state.activeCircle.id : null;
  circleSelect.innerHTML = state.myCircles.map(c => `
    <option value="${c.id}" ${c.id === activeId ? 'selected' : ''}>
      ${escapeHtml(c.name)} (${escapeHtml(c.code)})
    </option>
  `).join('');
}

// Switch User's Active Circle
async function switchCircle(targetCircleId) {
  try {
    const prevCircleId = state.activeCircle ? state.activeCircle.id : null;
    const headers = {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
    };

    const res = await fetch('/api/auth/circles/switch', {
      method: 'POST',
      headers,
      body: JSON.stringify({ circleId: targetCircleId })
    });

    if (res.status === 401) {
      logout();
      return;
    }

    if (res.ok) {
      const data = await res.json();
      if (state.socket && prevCircleId) {
        state.socket.emit('leave_circle', prevCircleId);
      }
      addActivityItem(`🔄 Switched to circle: <strong>${escapeHtml(data.circle.name)}</strong>`);
      await fetchActiveCircle();
      await fetchMyCircles();
      await fetchResources();
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to switch circle');
    }
  } catch (e) {
    alert('Error switching circle: ' + e.message);
  }
}

// Render Circle Members in sidebar
function renderMembers() {
  if (!membersList) return;
  if (!state.members || state.members.length === 0) {
    membersList.innerHTML = `<div style="color: #64748b; font-size: 0.82rem; padding: 0.5rem 0;">No circle members to display.</div>`;
    return;
  }
  membersList.innerHTML = state.members.map(m => `
    <div class="member-row">
      <img src="${m.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.username}`}" alt="${escapeHtml(m.display_name)}">
      <div class="member-details">
        <span class="member-name-text">
          ${escapeHtml(m.display_name)}
          ${m.role === 'admin' ? '<span class="badge-mini-admin">ADMIN</span>' : ''}
        </span>
        <span class="member-bio-text">${escapeHtml(m.bio || '@' + m.username)}</span>
      </div>
    </div>
  `).join('');
}

// Fetch resources for active circle
async function fetchResources() {
  try {
    if (!state.activeCircle) {
      resourcesFeed.innerHTML = `
        <div class="loading-state">
          No Circle Selected.<br>
          <small style="color: #64748b;">Create a new circle or join one with an invite code to share study materials.</small>
        </div>
      `;
      return;
    }

    let url = '/api/resources/';
    const params = new URLSearchParams();
    if (state.activeCircle && state.activeCircle.id) {
      params.append('circleId', state.activeCircle.id);
    }
    if (state.currentCategory && state.currentCategory !== 'All') {
      params.append('category', state.currentCategory);
    }
    if (state.searchQuery) {
      params.append('search', state.searchQuery);
    }
    if (params.toString()) {
      url += '?' + params.toString();
    }

    const headers = state.token ? { Authorization: `Bearer ${state.token}` } : {};
    const res = await fetch(url, { headers });

    if (res.status === 401) {
      logout();
      return;
    }

    if (res.status === 403) {
      resourcesFeed.innerHTML = `
        <div class="loading-state" style="color: #ef4444;">
          🔒 Access Restricted: You are not a member of this circle.<br>
          <small style="color: #94a3b8;">Join with the circle invite code to view and share materials.</small>
        </div>
      `;
      return;
    }

    if (res.ok) {
      state.resources = await res.json();
      renderResources();
    } else {
      resourcesFeed.innerHTML = `<div class="loading-state">Error loading resources. Check backend status.</div>`;
    }
  } catch (err) {
    resourcesFeed.innerHTML = `<div class="loading-state">Error connecting to resource service.</div>`;
  }
}

// Render resources
async function renderResources() {
  if (state.resources.length === 0) {
    resourcesFeed.innerHTML = `
      <div class="loading-state">
        No resources found in this category.<br>
        <small style="color: #64748b;">Share an assignment, study guide, or asset above.</small>
      </div>
    `;
    return;
  }

  const cardsHtml = await Promise.all(state.resources.map(async (r) => {
    let notesHtml = '';
    try {
      const headers = state.token ? { Authorization: `Bearer ${state.token}` } : {};
      const fullRes = await fetch(`/api/resources/${r.id}`, { headers });
      if (fullRes.ok) {
        const detailed = await fullRes.json();
        const notes = detailed.notes || [];
        notesHtml = `
          <div class="notes-wrapper">
            <div class="notes-stream" id="notesList-${r.id}">
              ${notes.map(n => `
                <div class="note-bubble">
                  <div class="note-top-info">
                    <span class="note-author">${escapeHtml(n.author_name || 'Member')}</span>
                    <span>${formatTime(n.created_at)}</span>
                  </div>
                  <div class="note-text">${escapeHtml(n.content)}</div>
                </div>
              `).join('')}
            </div>
            <div class="note-form-row">
              <input type="text" id="noteInput-${r.id}" placeholder="Write a note on this resource...">
              <button class="btn btn-primary btn-xs" onclick="submitNote(${r.id})">Post</button>
            </div>
          </div>
        `;
      }
    } catch {}

    const hasFile = r.file_name && r.file_name !== 'Resource-Note.txt';
    const downloadTokenParam = state.token ? `?token=${encodeURIComponent(state.token)}` : '';
    const downloadBtn = hasFile
      ? `<a href="/api/resources/download/${r.id}${downloadTokenParam}" class="btn-download" download>
           <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
           Download (${formatBytes(r.file_size)})
         </a>`
      : '';

    // Minimal SVG icon for file type
    let iconSvg = '';
    const catLower = (r.category || 'General').toLowerCase();
    if (r.file_name && r.file_name.endsWith('.pdf')) {
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
    } else if (hasFile) {
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`;
    } else {
      iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
    }

    return `
      <div class="resource-card" id="res-card-${r.id}">
        <div class="res-header">
          <div class="res-title-group">
            <div class="file-type-icon">${iconSvg}</div>
            <div class="res-title-text">
              <h3>${escapeHtml(r.title)}</h3>
              <div class="res-meta-line">
                <span>${escapeHtml(r.author_name || 'Author')}</span>
                <span class="meta-dot">·</span>
                <span>${formatDate(r.created_at)}</span>
                ${hasFile ? `<span class="meta-dot">·</span><span>${formatBytes(r.file_size)}</span>` : ''}
              </div>
            </div>
          </div>
          <span class="res-category-badge cat-${catLower}">${escapeHtml(r.category || 'General')}</span>
        </div>
        <p class="res-desc-text">${escapeHtml(r.description || 'No description provided.')}</p>
        <div class="res-footer-actions">
          <div>${downloadBtn}</div>
          <button class="btn-delete-ghost" onclick="deleteResource(${r.id})">Delete</button>
        </div>
        ${notesHtml}
      </div>
    `;
  }));

  resourcesFeed.innerHTML = cardsHtml.join('');
}

// Post Note
window.submitNote = async function(resourceId) {
  const input = document.getElementById(`noteInput-${resourceId}`);
  if (!input || !input.value.trim()) return;

  const content = input.value.trim();
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

    const res = await fetch(`/api/resources/${resourceId}/notes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content })
    });

    if (res.ok) {
      input.value = '';
      fetchResources();
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to post note');
    }
  } catch (err) {
    alert('Failed to post note: ' + err.message);
  }
};

// Delete Resource
window.deleteResource = async function(resourceId) {
  if (!confirm('Are you sure you want to delete this resource?')) return;
  try {
    const headers = state.token ? { Authorization: `Bearer ${state.token}` } : {};
    const res = await fetch(`/api/resources/${resourceId}`, {
      method: 'DELETE',
      headers,
    });
    if (res.ok) {
      fetchResources();
      addActivityItem(`🗑 Resource #${resourceId} deleted`);
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to delete resource');
    }
  } catch (err) {
    alert('Failed to delete resource: ' + err.message);
  }
};

// Perform Real API Login
async function performLogin(emailOrUser, password) {
  const identifier = emailOrUser.trim();
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: identifier, password })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Invalid username or password');
  }

  state.user = data.user;
  state.token = data.token;
  localStorage.setItem('circo_user', JSON.stringify(data.user));
  localStorage.setItem('circo_token', data.token);

  showWorkspace();
  renderUserInfo();
  initSocketIO();
  await fetchActiveCircle();
  await fetchMyCircles();
  await fetchResources();
  addActivityItem(`👤 Signed in as @${escapeHtml(data.user.username)}`);
}

// Perform Real API Registration
async function performRegister(payload) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Registration failed');
  }

  state.user = data.user;
  state.token = data.token;
  localStorage.setItem('circo_user', JSON.stringify(data.user));
  localStorage.setItem('circo_token', data.token);

  showWorkspace();
  renderUserInfo();
  initSocketIO();
  await fetchActiveCircle();
  await fetchMyCircles();
  await fetchResources();
  addActivityItem(`🎉 Welcome @${escapeHtml(data.user.username)}!`);
}

// Sign Out of Application
function logout() {
  localStorage.removeItem('circo_user');
  localStorage.removeItem('circo_token');
  state.user = null;
  state.token = '';
  state.activeCircle = null;
  state.myCircles = [];
  state.resources = [];
  state.members = [];

  if (state.socket) {
    try {
      state.socket.disconnect();
    } catch {}
    state.socket = null;
  }

  showAuthScreen();
  hideAuthAlert();
  if (pageLoginEmail) pageLoginEmail.value = '';
  if (pageLoginPassword) pageLoginPassword.value = '';
  if (pageRegUsername) pageRegUsername.value = '';
  if (pageRegEmail) pageRegEmail.value = '';
  if (pageRegDisplayName) pageRegDisplayName.value = '';
  if (pageRegCircleCode) pageRegCircleCode.value = '';
  if (pageRegPassword) pageRegPassword.value = '';
}
window.logout = logout;

// 1-Click Demo Login for Instructor / Evaluator
window.demoSignIn = async function(username) {
  hideAuthAlert();
  if (pageLoginEmail) pageLoginEmail.value = `${username}@circle.io`;
  if (pageLoginPassword) pageLoginPassword.value = 'password123';

  if (pageLoginSubmitBtn) {
    pageLoginSubmitBtn.disabled = true;
    pageLoginSubmitBtn.textContent = 'Authenticating...';
  }

  try {
    await performLogin(`${username}@circle.io`, 'password123');
  } catch (err) {
    showAuthAlert('Demo sign in failed: ' + err.message, 'error');
  } finally {
    if (pageLoginSubmitBtn) {
      pageLoginSubmitBtn.disabled = false;
      pageLoginSubmitBtn.textContent = 'Sign In to Workspace';
    }
  }
};
window.quickLogin = window.demoSignIn;

// Event Listeners setup
function setupEventListeners() {
  // Circle Dropdown Switcher
  if (circleSelect) {
    circleSelect.addEventListener('change', (e) => {
      const selectedId = parseInt(e.target.value, 10);
      if (selectedId) {
        switchCircle(selectedId);
      }
    });
  }

  // Copy Circle Join Code Button
  if (copyCodeBtn) {
    copyCodeBtn.addEventListener('click', () => {
      const code = circleCodeDisplay ? circleCodeDisplay.textContent.trim() : '';
      if (!code || code === '—') return;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
          showCopySuccess();
        }).catch(() => fallbackCopy(code));
      } else {
        fallbackCopy(code);
      }
    });
  }

  function showCopySuccess() {
    const orig = copyCodeBtn.textContent;
    copyCodeBtn.textContent = 'Copied! ✓';
    copyCodeBtn.style.color = '#10b981';
    setTimeout(() => {
      copyCodeBtn.textContent = orig;
      copyCodeBtn.style.color = '';
    }, 2000);
  }

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showCopySuccess();
    } catch {}
    document.body.removeChild(textarea);
  }

  // Create Circle Modal Handlers
  if (openCreateCircleModalBtn) openCreateCircleModalBtn.addEventListener('click', () => createCircleModal.classList.add('open'));
  if (closeCreateCircleModalBtn) closeCreateCircleModalBtn.addEventListener('click', () => createCircleModal.classList.remove('open'));
  if (cancelCreateCircleBtn) cancelCreateCircleBtn.addEventListener('click', () => createCircleModal.classList.remove('open'));

  const createCircleForm = document.getElementById('createCircleForm');
  if (createCircleForm) {
    createCircleForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('newCircleName').value.trim();
      const description = document.getElementById('newCircleDesc').value.trim();

      try {
        const headers = {
          'Content-Type': 'application/json',
          ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
        };
        const res = await fetch('/api/auth/circles', {
          method: 'POST',
          headers,
          body: JSON.stringify({ name, description })
        });
        const data = await res.json();
        if (res.ok) {
          createCircleModal.classList.remove('open');
          createCircleForm.reset();
          addActivityItem(`🎉 Created new circle <strong>${escapeHtml(data.circle.name)}</strong> (Invite Code: <code>${data.circle.code}</code>)`);
          await fetchActiveCircle();
          await fetchMyCircles();
          await fetchResources();
        } else {
          alert(data.error || 'Failed to create circle');
        }
      } catch (err) {
        alert('Error creating circle: ' + err.message);
      }
    });
  }

  // Join Circle Modal Handlers
  if (openJoinCircleModalBtn) openJoinCircleModalBtn.addEventListener('click', () => joinCircleModal.classList.add('open'));
  if (closeJoinCircleModalBtn) closeJoinCircleModalBtn.addEventListener('click', () => joinCircleModal.classList.remove('open'));
  if (cancelJoinCircleBtn) cancelJoinCircleBtn.addEventListener('click', () => joinCircleModal.classList.remove('open'));

  const joinCircleForm = document.getElementById('joinCircleForm');
  if (joinCircleForm) {
    joinCircleForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = document.getElementById('joinCircleCode').value.trim().toUpperCase();

      try {
        const headers = {
          'Content-Type': 'application/json',
          ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
        };
        const res = await fetch('/api/auth/circles/join', {
          method: 'POST',
          headers,
          body: JSON.stringify({ code })
        });
        const data = await res.json();
        if (res.ok) {
          joinCircleModal.classList.remove('open');
          joinCircleForm.reset();
          addActivityItem(`🔑 Successfully joined circle: <strong>${escapeHtml(data.circle.name)}</strong>`);
          await fetchActiveCircle();
          await fetchMyCircles();
          await fetchResources();
        } else {
          alert(data.error || 'Failed to join circle');
        }
      } catch (err) {
        alert('Error joining circle: ' + err.message);
      }
    });
  }

  // Category tabs
  const tabs = document.querySelectorAll('.category-tabs .tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentCategory = tab.dataset.cat;
      fetchResources();
    });
  });

  // Search input debounced
  let searchTimeout = null;
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.searchQuery = e.target.value.trim();
        fetchResources();
      }, 250);
    });
  }

  if (openUploadModalBtn) {
    openUploadModalBtn.addEventListener('click', () => {
      if (!state.activeCircle) {
        alert('Please create or join a circle before sharing resources.');
        return;
      }
      uploadModal.classList.add('open');
    });
  }
  if (closeUploadModalBtn) closeUploadModalBtn.addEventListener('click', () => uploadModal.classList.remove('open'));
  if (cancelUploadBtn) cancelUploadBtn.addEventListener('click', () => uploadModal.classList.remove('open'));

  const uploadForm = document.getElementById('uploadForm');
  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(uploadForm);
      if (state.activeCircle && state.activeCircle.id) {
        formData.append('circleId', state.activeCircle.id);
      }
      const headers = state.token ? { Authorization: `Bearer ${state.token}` } : {};

      try {
        const res = await fetch('/api/resources/upload', {
          method: 'POST',
          headers,
          body: formData,
        });

        if (res.ok) {
          uploadModal.classList.remove('open');
          uploadForm.reset();
          fetchResources();
        } else {
          const err = await res.json();
          alert(err.error || 'Upload failed');
        }
      } catch (err) {
        alert('Upload failed: ' + err.message);
      }
    });
  }

  // Dedicated Production Auth Page Handlers
  if (authTabSignIn && authTabSignUp) {
    authTabSignIn.addEventListener('click', () => {
      authTabSignIn.classList.add('active');
      authTabSignUp.classList.remove('active');
      if (authPageLoginForm) authPageLoginForm.classList.remove('hidden');
      if (authPageRegisterForm) authPageRegisterForm.classList.add('hidden');
      hideAuthAlert();
    });

    authTabSignUp.addEventListener('click', () => {
      authTabSignUp.classList.add('active');
      authTabSignIn.classList.remove('active');
      if (authPageRegisterForm) authPageRegisterForm.classList.remove('hidden');
      if (authPageLoginForm) authPageLoginForm.classList.add('hidden');
      hideAuthAlert();
    });
  }

  if (authPageLoginForm) {
    authPageLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailOrUser = pageLoginEmail ? pageLoginEmail.value.trim() : '';
      const password = pageLoginPassword ? pageLoginPassword.value : '';

      if (!emailOrUser || !password) {
        showAuthAlert('Please enter both your email/username and password.', 'error');
        return;
      }

      if (pageLoginSubmitBtn) {
        pageLoginSubmitBtn.disabled = true;
        pageLoginSubmitBtn.textContent = 'Signing in...';
      }
      hideAuthAlert();

      try {
        await performLogin(emailOrUser, password);
      } catch (err) {
        showAuthAlert(err.message || 'Login failed. Please check credentials.', 'error');
      } finally {
        if (pageLoginSubmitBtn) {
          pageLoginSubmitBtn.disabled = false;
          pageLoginSubmitBtn.textContent = 'Sign In to Workspace';
        }
      }
    });
  }

  if (authPageRegisterForm) {
    authPageRegisterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = pageRegUsername ? pageRegUsername.value.trim() : '';
      const email = pageRegEmail ? pageRegEmail.value.trim() : '';
      const displayName = pageRegDisplayName ? pageRegDisplayName.value.trim() : '';
      const circleCode = pageRegCircleCode ? pageRegCircleCode.value.trim() : '';
      const password = pageRegPassword ? pageRegPassword.value : '';

      if (!username || !email || !password) {
        showAuthAlert('Username, email, and password are required.', 'error');
        return;
      }

      if (password.length < 6) {
        showAuthAlert('Password must be at least 6 characters long.', 'error');
        return;
      }

      if (pageRegSubmitBtn) {
        pageRegSubmitBtn.disabled = true;
        pageRegSubmitBtn.textContent = 'Creating account...';
      }
      hideAuthAlert();

      try {
        await performRegister({ username, email, displayName, circleCode, password });
      } catch (err) {
        showAuthAlert(err.message || 'Registration failed.', 'error');
      } finally {
        if (pageRegSubmitBtn) {
          pageRegSubmitBtn.disabled = false;
          pageRegSubmitBtn.textContent = 'Create Account & Enter';
        }
      }
    });
  }

  // Logout button in top nav
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  // Ping socket button
  const pingSocketBtn = document.getElementById('pingSocketBtn');
  if (pingSocketBtn) {
    pingSocketBtn.addEventListener('click', () => {
      if (state.socket && state.socket.connected) {
        state.socket.emit('ping');
      } else {
        addActivityItem('⚠️ Socket not connected to realtime service.');
      }
    });
  }
}

// Helpers
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
