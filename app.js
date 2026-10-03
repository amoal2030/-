/**
 * «حوّلها» - منطق التطبيق التفاعلي (JavaScript Vanilla)
 * App Logic & DOM Controller for "Hawwilha"
 */

import { generateOpportunities } from './ai.js';

// ==========================================================================
// مفاتيح التخزين المحلي (LocalStorage Keys)
// ==========================================================================
const STORAGE_KEYS = {
  THEME: 'hawwilha_theme',
  SAVED_IDEAS: 'hawwilha_saved_ideas'
};

// ==========================================================================
// حالة التطبيق (Application State)
// ==========================================================================
const state = {
  theme: localStorage.getItem(STORAGE_KEYS.THEME) || 'light',
  currentOpportunities: [],
  currentModalOpportunity: null,
  savedOpportunities: getSavedOpportunitiesFromStorage(),
  lastUserInput: null,
  activeView: 'home' // 'home' | 'results' | 'saved'
};

// ==========================================================================
// عناصر واجهة المستخدم (DOM Elements)
// ==========================================================================
const DOM = {
  html: document.documentElement,
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeIcon: document.getElementById('themeIcon'),
  
  navHomeBtn: document.getElementById('navHomeBtn'),
  navSavedBtn: document.getElementById('navSavedBtn'),
  savedBadgeCount: document.getElementById('savedBadgeCount'),

  // أقسام الواجهة
  heroSection: document.getElementById('heroSection'),
  formSection: document.getElementById('formSection'),
  loadingSection: document.getElementById('loadingSection'),
  resultsSection: document.getElementById('resultsSection'),
  savedSection: document.getElementById('savedSection'),

  // حقول الإدخال
  resourceInput: document.getElementById('resourceInput'),
  hoursSelect: document.getElementById('hoursSelect'),
  budgetSelect: document.getElementById('budgetSelect'),
  goalSelect: document.getElementById('goalSelect'),
  levelSelect: document.getElementById('levelSelect'),
  discoverBtn: document.getElementById('discoverBtn'),
  alertBox: document.getElementById('alertBox'),
  alertText: document.getElementById('alertText'),
  inspirationChips: document.querySelectorAll('.chip-btn'),

  // شاشة التحميل
  loadingStepMsg: document.getElementById('loadingStepMsg'),
  loadingProgressBar: document.getElementById('loadingProgressBar'),

  // عرض النتائج
  opportunitiesGrid: document.getElementById('opportunitiesGrid'),
  resultsSummaryMeta: document.getElementById('resultsSummaryMeta'),
  btnEditInput: document.getElementById('btnEditInput'),
  btnReanalyze: document.getElementById('btnReanalyze'),
  btnCopyAllResults: document.getElementById('btnCopyAllResults'),

  // صفحة المحفوظات
  savedGrid: document.getElementById('savedGrid'),
  emptySavedState: document.getElementById('emptySavedState'),
  btnDiscoverFromSaved: document.getElementById('btnDiscoverFromSaved'),

  // المودال (خطة التنفيذ)
  planModal: document.getElementById('planModal'),
  modalCloseBtn: document.getElementById('modalCloseBtn'),
  modalTitle: document.getElementById('modalTitle'),
  modalTypeBadge: document.getElementById('modalTypeBadge'),
  modalBodyContent: document.getElementById('modalBodyContent'),
  modalSaveBtn: document.getElementById('modalSaveBtn'),
  modalCopyBtn: document.getElementById('modalCopyBtn'),
  modalShareBtn: document.getElementById('modalShareBtn'),

  // الإشعارات
  toastContainer: document.getElementById('toastContainer')
};

// ==========================================================================
// تهيئة التطبيق عند تحميل الصفحة
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initEventListeners();
  updateSavedBadge();
});

// ==========================================================================
// إدارة الوضع الداكن / الفاتح (Theme Management)
// ==========================================================================
function initTheme() {
  // فحص تفضيل النظام إن لم يكن محفوظًا
  if (!localStorage.getItem(STORAGE_KEYS.THEME)) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    state.theme = prefersDark ? 'dark' : 'light';
  }
  applyTheme(state.theme);
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem(STORAGE_KEYS.THEME, state.theme);
  applyTheme(state.theme);
}

function applyTheme(theme) {
  DOM.html.setAttribute('data-theme', theme);
  if (theme === 'dark') {
    DOM.themeIcon.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>`;
    DOM.themeToggleBtn.setAttribute('title', 'التحويل إلى الوضع الفاتح');
  } else {
    DOM.themeIcon.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>`;
    DOM.themeToggleBtn.setAttribute('title', 'التحويل إلى الوضع الليلي');
  }
}

// ==========================================================================
// تسجيل الأحداث والتفاعل (Event Listeners)
// ==========================================================================
function initEventListeners() {
  // تبديل الثيم
  DOM.themeToggleBtn.addEventListener('click', toggleTheme);

  // التنقل
  DOM.navHomeBtn.addEventListener('click', () => switchView('home'));
  DOM.navSavedBtn.addEventListener('click', () => switchView('saved'));
  if (DOM.btnDiscoverFromSaved) {
    DOM.btnDiscoverFromSaved.addEventListener('click', () => switchView('home'));
  }

  // رقائق الإلهام السريعة
  DOM.inspirationChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.getAttribute('data-text');
      if (text) {
        DOM.resourceInput.value = text;
        DOM.resourceInput.focus();
        hideAlert();
        showToast('تم إدراج المثال في مربع الوصف');
      }
    });
  });

  // زر اكتشاف الفرص
  DOM.discoverBtn.addEventListener('click', handleDiscoverOpportunities);

  // أزرار النتائج
  DOM.btnEditInput.addEventListener('click', () => {
    switchView('home');
    DOM.resourceInput.focus();
  });

  DOM.btnReanalyze.addEventListener('click', () => {
    if (state.lastUserInput) {
      executeAnalysis(state.lastUserInput);
    }
  });

  DOM.btnCopyAllResults.addEventListener('click', handleCopyAllResults);

  // أحداث المودال
  DOM.modalCloseBtn.addEventListener('click', closeModal);
  DOM.planModal.addEventListener('click', (e) => {
    if (e.target === DOM.planModal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && DOM.planModal.classList.contains('active')) {
      closeModal();
    }
  });

  DOM.modalCopyBtn.addEventListener('click', handleCopyModalPlan);
  DOM.modalSaveBtn.addEventListener('click', handleToggleSaveCurrentModal);
  DOM.modalShareBtn.addEventListener('click', handleShareCurrentModal);
}

// ==========================================================================
// إدارة التنقل بين المشاهد (View Switching)
// ==========================================================================
function switchView(viewName) {
  state.activeView = viewName;

  // إخفاء كل المشاهد
  DOM.loadingSection.classList.remove('active');
  DOM.resultsSection.classList.remove('active');
  DOM.savedSection.classList.remove('active');

  // تحديث أزرار التنقل
  DOM.navHomeBtn.classList.toggle('active', viewName === 'home' || viewName === 'results');
  DOM.navSavedBtn.classList.toggle('active', viewName === 'saved');

  if (viewName === 'home') {
    DOM.heroSection.style.display = 'block';
    DOM.formSection.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (viewName === 'results') {
    DOM.heroSection.style.display = 'none';
    DOM.formSection.style.display = 'none';
    DOM.resultsSection.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (viewName === 'saved') {
    DOM.heroSection.style.display = 'none';
    DOM.formSection.style.display = 'none';
    DOM.savedSection.classList.add('active');
    renderSavedOpportunities();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ==========================================================================
// معالجة اكتشاف الفرص وتفاعل التحميل
// ==========================================================================
async function handleDiscoverOpportunities() {
  const description = DOM.resourceInput.value.trim();

  // التحقق من المدخلات
  if (!description) {
    showAlert('يرجى كتابة وصف لما تملكه أو مهاراتك أو أوقاتك المتاحة أولاً.');
    DOM.resourceInput.focus();
    return;
  }

  hideAlert();

  const userInput = {
    description,
    hours: DOM.hoursSelect.value,
    budget: DOM.budgetSelect.value,
    goal: DOM.goalSelect.value,
    level: DOM.levelSelect.value
  };

  state.lastUserInput = userInput;
  await executeAnalysis(userInput);
}

async function executeAnalysis(userInput) {
  // تجهيز شاشة التحميل
  DOM.formSection.style.display = 'none';
  DOM.heroSection.style.display = 'none';
  DOM.resultsSection.classList.remove('active');
  DOM.loadingSection.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // خطوات التحميل الحركية
  const loadingSteps = [
    { msg: 'نحلل مواردك وإمكاناتك المتاحة...', progress: '25%' },
    { msg: 'نبحث عن فرص ملائمة لطبيعة مقتنياتك...', progress: '55%' },
    { msg: 'نرتب الأفكار حسب الميزانية والوقت المطلوب...', progress: '80%' },
    { msg: 'نجهز خطط التنفيذ المخصصة وخطوات البدء...', progress: '98%' }
  ];

  let stepIndex = 0;
  const stepInterval = setInterval(() => {
    if (stepIndex < loadingSteps.length) {
      DOM.loadingStepMsg.textContent = loadingSteps[stepIndex].msg;
      DOM.loadingProgressBar.style.width = loadingSteps[stepIndex].progress;
      stepIndex++;
    }
  }, 450);

  try {
    const opportunities = await generateOpportunities(userInput);
    clearInterval(stepInterval);

    state.currentOpportunities = opportunities;
    DOM.loadingProgressBar.style.width = '100%';

    setTimeout(() => {
      DOM.loadingSection.classList.remove('active');
      renderResults(opportunities, userInput);
      switchView('results');
      showToast(`تم اكتشاف ${opportunities.length} فرص مخصصة لإمكاناتك!`);
    }, 400);

  } catch (error) {
    clearInterval(stepInterval);
    DOM.loadingSection.classList.remove('active');
    DOM.formSection.style.display = 'block';
    DOM.heroSection.style.display = 'block';
    showAlert(error.message || 'حدث خطأ أثناء معالجة البيانات، يرجى المحاولة ثانية.');
  }
}

// ==========================================================================
// عرض نتائج الفرص (Render Opportunities)
// ==========================================================================
function renderResults(opportunities, userInput) {
  // تحديث بيانات الملخص
  DOM.resultsSummaryMeta.innerHTML = `
    <span><strong>الهدف:</strong> ${escapeHTML(userInput.goal)}</span> • 
    <span><strong>الوقت المتاح:</strong> ${escapeHTML(userInput.hours)} ساعات يوميًا</span> • 
    <span><strong>الميزانية:</strong> ${escapeHTML(userInput.budget)}</span>
  `;

  // بناء بطاقات الفرص
  DOM.opportunitiesGrid.innerHTML = '';

  opportunities.forEach(opp => {
    const card = createOpportunityCard(opp, false);
    DOM.opportunitiesGrid.appendChild(card);
  });
}

function createOpportunityCard(opp, isSavedView = false) {
  const card = document.createElement('div');
  card.className = 'opportunity-card';
  card.id = `card-${opp.id}`;

  const isSaved = isOpportunitySaved(opp.id);
  const typeKey = opp.type || 'دخل';

  card.innerHTML = `
    <div class="card-top-row">
      <span class="badge-type badge-${typeKey}">${escapeHTML(opp.typeLabel || opp.type)}</span>
      <button class="card-favorite-btn ${isSaved ? 'saved' : ''}" title="${isSaved ? 'محفوظة في المفضلة' : 'حفظ الفكرة'}" aria-label="حفظ الفكرة">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
    </div>

    <h3 class="opportunity-title">${escapeHTML(opp.title)}</h3>
    <p class="opportunity-desc">${escapeHTML(opp.description)}</p>

    <div class="opportunity-why-fit">
      <strong>لماذا تلائمك هذه الفكرة؟</strong>
      ${escapeHTML(opp.whyFit)}
    </div>

    <div class="card-stats-grid">
      <div class="stat-box">
        <span class="stat-label">مستوى الصعوبة</span>
        <span class="stat-value">${escapeHTML(opp.difficulty)}</span>
      </div>
      <div class="stat-box">
        <span class="stat-label">التكلفة المتوقعة</span>
        <span class="stat-value">${escapeHTML(opp.cost)}</span>
      </div>
      <div class="stat-box">
        <span class="stat-label">أول دخل متوقع</span>
        <span class="stat-value">${escapeHTML(opp.timeToIncome)}</span>
      </div>
      <div class="stat-box">
        <span class="stat-label">إمكانية التوسع</span>
        <span class="stat-value">${escapeHTML(opp.scalability)}</span>
      </div>
    </div>

    <div class="income-estimate-box">
      <div class="income-estimate-header">
        <span>التقدير التقريبي للدخل</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
      </div>
      <div class="income-estimate-num">${escapeHTML(opp.estimatedIncome)}</div>
      <div class="income-estimate-note">* مجرد تقدير تقريبي استرشادي وليس ضمانًا للأرباح</div>
    </div>

    <button class="btn-view-plan" data-id="${opp.id}">
      <span>اعرض خطة التنفيذ</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
    </button>
  `;

  // أحداث الزر والمفضلة
  const favBtn = card.querySelector('.card-favorite-btn');
  favBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSaveOpportunity(opp);
    const updatedSaved = isOpportunitySaved(opp.id);
    favBtn.classList.toggle('saved', updatedSaved);
    favBtn.querySelector('svg').setAttribute('fill', updatedSaved ? 'currentColor' : 'none');
    favBtn.setAttribute('title', updatedSaved ? 'محفوظة في المفضلة' : 'حفظ الفكرة');
    
    if (isSavedView && !updatedSaved) {
      renderSavedOpportunities();
    }
  });

  const planBtn = card.querySelector('.btn-view-plan');
  planBtn.addEventListener('click', () => {
    openModal(opp);
  });

  return card;
}

// ==========================================================================
// إدارة المودال وعرض خطة التنفيذ
// ==========================================================================
function openModal(opp) {
  state.currentModalOpportunity = opp;
  const isSaved = isOpportunitySaved(opp.id);

  DOM.modalTitle.textContent = opp.title;
  DOM.modalTypeBadge.textContent = opp.typeLabel || opp.type;
  DOM.modalTypeBadge.className = `badge-type badge-${opp.type || 'دخل'}`;

  updateModalSaveButtonState(isSaved);

  const plan = opp.plan || {};

  // تجهيز جدول خطة 7 أيام
  const sevenDayHtml = (plan.sevenDayPlan || []).map(item => `
    <div class="day-item">
      <span class="day-badge">اليوم ${item.day}</span>
      <span class="day-text">${escapeHTML(item.task)}</span>
    </div>
  `).join('');

  // تجهيز خطوات البدء
  const startingStepsHtml = (plan.startingSteps || []).map(step => `
    <li>${escapeHTML(step)}</li>
  `).join('');

  // تجهيز الأدوات
  const toolsHtml = (plan.tools || []).map(tool => `
    <li>${escapeHTML(tool)}</li>
  `).join('');

  DOM.modalBodyContent.innerHTML = `
    <!-- نبذة والجمهور المستهدف -->
    <div class="plan-section">
      <h4 class="plan-section-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        الجمهور المستهدف
      </h4>
      <p style="color: var(--text-secondary); line-height: 1.6;">${escapeHTML(plan.targetAudience || 'المهتمون والجمهور المحلي')}</p>
    </div>

    <!-- الأدوات والموارد المطلوبة -->
    <div class="plan-section">
      <h4 class="plan-section-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
        الأدوات والمتطلبات المطلوبة
      </h4>
      <ul class="plan-list">
        ${toolsHtml}
      </ul>
    </div>

    <!-- خطوات البدء من الصفر -->
    <div class="plan-section">
      <h4 class="plan-section-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
        خطوات البدء من الصفر
      </h4>
      <ol class="plan-list" style="padding-right: 1.4rem;">
        ${startingStepsHtml}
      </ol>
    </div>

    <!-- خطة 7 أيام تفصيلية -->
    <div class="plan-section">
      <h4 class="plan-section-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        خطة العمل لـ 7 أيام
      </h4>
      <div class="days-timeline">
        ${sevenDayHtml}
      </div>
    </div>

    <!-- استراتيجية العميل الأول -->
    <div class="plan-section">
      <h4 class="plan-section-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        طريقة الحصول على أول عميل
      </h4>
      <p style="color: var(--text-secondary); line-height: 1.6;">${escapeHTML(plan.firstClientStrategy || '')}</p>
    </div>

    <!-- نص إعلان جاهز للنشر -->
    <div class="plan-section">
      <h4 class="plan-section-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 11 18-5v12L3 14v-3z"></path><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"></path></svg>
        نص إعلان تسويقي جاهز للنشر
      </h4>
      <div class="ad-copy-box">
        <div class="ad-copy-text" id="adCopyText">${escapeHTML(plan.adCopy || '')}</div>
        <button class="btn-copy-ad" id="btnCopySingleAd">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          نسخ الإعلان
        </button>
      </div>
    </div>

    <!-- السعر المقترح والمخاطر والتنبيهات -->
    <div class="plan-section">
      <h4 class="plan-section-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
        التسعير المقترح
      </h4>
      <p style="color: var(--primary); font-weight: 700; margin-bottom: 1rem;">${escapeHTML(plan.pricing || 'حسب الاتفاق ونوع الخدمة')}</p>

      <div class="plan-warning-box">
        <strong>⚠️ التنبيهات والمخاطر:</strong>
        <p style="margin-top: 0.3rem;">${escapeHTML(plan.risksAndPrecautions || 'التأكد من مطابقة الأنظمة والشفافية التامة مع العملاء.')}</p>
      </div>
    </div>
  `;

  // زر نسخ الإعلان المنفصل
  const btnCopySingleAd = document.getElementById('btnCopySingleAd');
  if (btnCopySingleAd) {
    btnCopySingleAd.addEventListener('click', () => {
      copyTextToClipboard(plan.adCopy || '', 'تم نسخ نص الإعلان التسويقي بنجاح!');
    });
  }

  DOM.planModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  DOM.planModal.classList.remove('active');
  document.body.style.overflow = '';
  state.currentModalOpportunity = null;
}

function updateModalSaveButtonState(isSaved) {
  DOM.modalSaveBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
    <span>${isSaved ? 'محفوظة في المفضلة' : 'حفظ الفكرة'}</span>
  `;
}

// ==========================================================================
// إدارة الحفظ والمفضلة (LocalStorage Persistence)
// ==========================================================================
function getSavedOpportunitiesFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_IDEAS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('خطأ في استرجاع الأفكار المحفوظة:', e);
    return [];
  }
}

function saveOpportunitiesToStorage(list) {
  try {
    localStorage.setItem(STORAGE_KEYS.SAVED_IDEAS, JSON.stringify(list));
    state.savedOpportunities = list;
    updateSavedBadge();
  } catch (e) {
    console.error('خطأ في حفظ الأفكار:', e);
  }
}

function isOpportunitySaved(id) {
  return state.savedOpportunities.some(item => item.id === id);
}

function toggleSaveOpportunity(opp) {
  let list = [...state.savedOpportunities];
  const index = list.findIndex(item => item.id === opp.id);

  if (index >= 0) {
    list.splice(index, 1);
    saveOpportunitiesToStorage(list);
    showToast('تمت إزالة الفكرة من المحفوظات');
  } else {
    list.unshift(opp);
    saveOpportunitiesToStorage(list);
    showToast('تم حفظ الفكرة في أفكاري المحفوظة!');
  }

  // تحديث البطاقات المفتوحة
  const cardFavBtn = document.querySelector(`#card-${opp.id} .card-favorite-btn`);
  if (cardFavBtn) {
    const isSavedNow = isOpportunitySaved(opp.id);
    cardFavBtn.classList.toggle('saved', isSavedNow);
    cardFavBtn.querySelector('svg').setAttribute('fill', isSavedNow ? 'currentColor' : 'none');
  }
}

function handleToggleSaveCurrentModal() {
  if (!state.currentModalOpportunity) return;
  toggleSaveOpportunity(state.currentModalOpportunity);
  updateModalSaveButtonState(isOpportunitySaved(state.currentModalOpportunity.id));
}

function updateSavedBadge() {
  const count = state.savedOpportunities.length;
  DOM.savedBadgeCount.textContent = count;
  DOM.savedBadgeCount.style.display = count > 0 ? 'inline-block' : 'none';
}

function renderSavedOpportunities() {
  const saved = state.savedOpportunities;

  if (!saved || saved.length === 0) {
    DOM.emptySavedState.style.display = 'block';
    DOM.savedGrid.style.display = 'none';
    return;
  }

  DOM.emptySavedState.style.display = 'none';
  DOM.savedGrid.style.display = 'grid';
  DOM.savedGrid.innerHTML = '';

  saved.forEach(opp => {
    const card = createOpportunityCard(opp, true);
    DOM.savedGrid.appendChild(card);
  });
}

// ==========================================================================
// النسخ والمشاركة (Clipboard & Web Share API)
// ==========================================================================
function handleCopyModalPlan() {
  if (!state.currentModalOpportunity) return;
  const opp = state.currentModalOpportunity;
  const plan = opp.plan || {};

  const fullPlanText = `🌟 خطة تنفيذ فكرة: ${opp.title} (${opp.typeLabel || opp.type})
--------------------------------------------------
📌 نبذة عن الفكرة:
${opp.description}

🎯 لماذا تلائمك؟
${opp.whyFit}

👥 الجمهور المستهدف:
${plan.targetAudience || ''}

🛠️ الأدوات المطلوبة:
${(plan.tools || []).map(t => '• ' + t).join('\n')}

🚀 خطوات البدء من الصفر:
${(plan.startingSteps || []).map((s, i) => `${i + 1}. ${s}`).join('\n')}

📅 خطة العمل لـ 7 أيام:
${(plan.sevenDayPlan || []).map(d => `• اليوم ${d.day}: ${d.task}`).join('\n')}

🤝 طريقة الحصول على أول عميل:
${plan.firstClientStrategy || ''}

📢 نص إعلان جاهز للنشر:
${plan.adCopy || ''}

💰 التسعير المقترح:
${plan.pricing || ''}

⚠️ التنبيهات والمخاطر:
${plan.risksAndPrecautions || ''}
--------------------------------------------------
تم إنشاؤها عبر تطبيق «حوّلها» - مساعدك الذكي لتحويل الموارد إلى فرص.`;

  copyTextToClipboard(fullPlanText, 'تم نسخ خطة التنفيذ بالكامل إلى الحافظة!');
}

function handleCopyAllResults() {
  if (!state.currentOpportunities || state.currentOpportunities.length === 0) return;

  const text = `🎯 الفرص المقترحة من تطبيق «حوّلها» لتحويل الموارد:
--------------------------------------------------
${state.currentOpportunities.map((opp, idx) => `
${idx + 1}. ${opp.title} (${opp.typeLabel || opp.type})
• الوصف: ${opp.description}
• التكلفة: ${opp.cost} | أول دخل: ${opp.timeToIncome}
• الدخل التقريبي: ${opp.estimatedIncome}
`).join('\n--------------------------------------------------\n')}

تطبيق «حوّلها»: ما تملكه اليوم قد يكون فرصتك للغد!`;

  copyTextToClipboard(text, 'تم نسخ ملخص جميع الفرص إلى الحافظة!');
}

async function handleShareCurrentModal() {
  if (!state.currentModalOpportunity) return;
  const opp = state.currentModalOpportunity;

  const shareData = {
    title: `فكرة مشروع: ${opp.title}`,
    text: `وجدت فكرة ممتازة لتحويل الموارد عبر تطبيق «حوّلها»: ${opp.title} - ${opp.description}`,
    url: window.location.href
  };

  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
      showToast('تمت مشاركة الفكرة بنجاح');
    } catch (err) {
      if (err.name !== 'AbortError') {
        copyTextToClipboard(`${shareData.text}\n${shareData.url}`, 'تم نسخ رابط وملخص الفكرة للمشاركة!');
      }
    }
  } else {
    copyTextToClipboard(`${shareData.text}\n${shareData.url}`, 'تم نسخ تفاصيل الفكرة لمشاركتها مع أصدقائك!');
  }
}

function copyTextToClipboard(text, successMsg = 'تم النسخ إلى الحافظة') {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg);
    }).catch(() => {
      fallbackCopyText(text, successMsg);
    });
  } else {
    fallbackCopyText(text, successMsg);
  }
}

function fallbackCopyText(text, successMsg) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand('copy');
    showToast(successMsg);
  } catch (err) {
    showToast('تعذر النسخ تلقائيًا، يرجى النسخ يدويًا');
  }
  document.body.removeChild(textArea);
}

// ==========================================================================
// رسائل التنبيه والإشعارات (Alerts & Toasts)
// ==========================================================================
function showAlert(msg) {
  DOM.alertText.textContent = msg;
  DOM.alertBox.style.display = 'flex';
}

function hideAlert() {
  DOM.alertBox.style.display = 'none';
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
    <span>${escapeHTML(message)}</span>
  `;

  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px) scale(0.9)';
    setTimeout(() => {
      if (DOM.toastContainer.contains(toast)) {
        DOM.toastContainer.removeChild(toast);
      }
    }, 300);
  }, 3200);
}

// ==========================================================================
// حماية من XSS (Sanitization Helper)
// ==========================================================================
function escapeHTML(str) {
  if (typeof str !== 'string') return str || '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
