/* app.js
   Single JS file for all pages.
   Uses localStorage keys:
     qp_users: array of users {id,username,email,password}
     qp_current: current user object or null
     qp_quizzes: object map id -> quiz {id,title,questions,creator,createdAt}
     qp_scores: array of results {quizId,participant,score,total,percent,date}
*/

const LS_KEYS = {
    USERS: 'qp_users',
    CURR: 'qp_current',
    QUIZZES: 'qp_quizzes',
    SCORES: 'qp_scores'
  };
  
  function lsGet(k, fallback) {
    try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch(e){ return fallback; }
  }
  function lsSet(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
  
  function initStorageDefaults(){
    if(!lsGet(LS_KEYS.USERS, null)) lsSet(LS_KEYS.USERS, []);
    if(!lsGet(LS_KEYS.QUIZZES, null)) lsSet(LS_KEYS.QUIZZES, {});
    if(!lsGet(LS_KEYS.SCORES, null)) lsSet(LS_KEYS.SCORES, []);
  }
  initStorageDefaults();
  
  /* ---------- Auth helpers ---------- */
  function registerUser({username,email,password}){
    const users = lsGet(LS_KEYS.USERS, []);
    if(users.some(u => u.email === email || u.username === username)){
      return {ok:false, msg:'Username or email already exists'};
    }
    const user = { id: Date.now().toString(), username, email, password };
    users.push(user);
    lsSet(LS_KEYS.USERS, users);
    lsSet(LS_KEYS.CURR, { id: user.id, username: user.username, email: user.email });
    return {ok:true, user};
  }
  function loginUser(identifier, password){
    const users = lsGet(LS_KEYS.USERS, []);
    const u = users.find(x => x.email === identifier || x.username === identifier);
    if(!u) return {ok:false, msg:'User not found'};
    if(u.password !== password) return {ok:false, msg:'Wrong password'};
    lsSet(LS_KEYS.CURR, { id: u.id, username: u.username, email: u.email });
    return {ok:true, user: u};
  }
  function logout(){
    localStorage.removeItem(LS_KEYS.CURR);
  }
  
  /* ---------- Quiz helpers ---------- */
  function getQuizzes(){ return lsGet(LS_KEYS.QUIZZES, {}); }
  function putQuizzes(q){ lsSet(LS_KEYS.QUIZZES, q); }
  function getScores(){ return lsGet(LS_KEYS.SCORES, []); }
  function putScores(s){ lsSet(LS_KEYS.SCORES, s); }
  
  /* ---------- Page detection ---------- */
  document.addEventListener('DOMContentLoaded', ()=> {
    const path = location.pathname.split('/').pop();
    if(path === '' || path === 'index.html') renderIndexPage();
    if(path === 'dashboard.html') renderDashboardPage();
    if(path === 'create-quiz.html') renderCreatePage();
    if(path === 'quiz.html') renderTakePage();
  });
  
  /* ---------- Index (login/register) ---------- */
  function renderIndexPage(){
    // tabs
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
  
    if(!tabLogin) return;
  
    tabLogin.addEventListener('click', ()=> { tabLogin.classList.add('active'); tabRegister.classList.remove('active'); loginForm.classList.remove('hidden'); regForm.classList.add('hidden'); });
    tabRegister.addEventListener('click', ()=> { tabRegister.classList.add('active'); tabLogin.classList.remove('active'); regForm.classList.remove('hidden'); loginForm.classList.add('hidden'); });
  
    // register
    regForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const username = document.getElementById('reg-username').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const msgEl = document.getElementById('reg-message');
  
      if(!username || !email || !password){ msgEl.textContent = 'All fields required'; msgEl.style.color='crimson'; return; }
      const r = registerUser({username,email,password});
      if(!r.ok){ msgEl.textContent = r.msg; msgEl.style.color='crimson'; return; }
      msgEl.textContent = 'Registered & logged in! Redirecting...'; msgEl.style.color='green';
      setTimeout(()=> location.href = 'dashboard.html', 600);
    });
  
    // login
    loginForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const id = document.getElementById('login-identifier').value.trim();
      const pw = document.getElementById('login-password').value;
      const msgEl = document.getElementById('login-message');
  
      if(!id || !pw){ msgEl.textContent = 'Both fields required'; msgEl.style.color='crimson'; return; }
      const r = loginUser(id,pw);
      if(!r.ok){ msgEl.textContent = r.msg; msgEl.style.color='crimson'; return; }
      msgEl.textContent = 'Login successful. Redirecting...'; msgEl.style.color='green';
      setTimeout(()=> location.href = 'dashboard.html', 400);
    });
  }
  
  /* ---------- Dashboard ---------- */
  function renderDashboardPage(){
    const current = lsGet(LS_KEYS.CURR, null);
    if(!current){ alert('Please log in first'); location.href='index.html'; return; }
  
    const userControls = document.getElementById('user-controls');
    if(userControls) userControls.innerHTML = `<span>${current.username}</span> <button id="logout-btn" class="btn ghost">Logout</button>`;
    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) logoutBtn.onclick = () => { logout(); location.href='index.html'; };
  
    const createBtn = document.getElementById('create-quiz-btn');
    createBtn.onclick = () => location.href = 'create-quiz.html';
  
    const myQuizzesDiv = document.getElementById('my-quizzes');
    const filterSelect = document.getElementById('filter-quiz');
    const sortSelect = document.getElementById('sort-results');
    const resultsTable = document.getElementById('results-table');
  
    const quizzes = getQuizzes();
    const allQuizzes = Object.values(quizzes).filter(q => q.creatorId === current.id);
  
    // Render my quizzes list
    if(allQuizzes.length === 0){
      myQuizzesDiv.innerHTML = '<p>No quizzes created yet. Click Create Quiz to add one.</p>';
    } else {
      myQuizzesDiv.innerHTML = allQuizzes.map(q=>{
        const link = `${location.origin}${location.pathname.replace(/[^\/]*$/,'')}quiz.html?id=${encodeURIComponent(q.id)}`;
        return `<div style="padding:10px;border-bottom:1px solid #eef2f7">
          <strong>${escapeHtml(q.title)}</strong>
          <div class="small">Created: ${new Date(q.createdAt).toLocaleString()}</div>
          <div style="margin-top:6px">
            <button class="btn" onclick="copyQuizLink('${q.id}')">Copy Link</button>
            <button class="btn" onclick="deleteQuiz('${q.id}')">Delete</button>
            <span class="small" style="margin-left:8px">id: ${q.id}</span>
          </div>
        </div>`;
      }).join('');
    }
  
    // populate filter select
    filterSelect.innerHTML = `<option value="">All</option>` + allQuizzes.map(q=>`<option value="${q.id}">${escapeHtml(q.title)}</option>`).join('');
  
    // results
    function renderResults(){
      const chosenQuiz = filterSelect.value;
      const scores = getScores().filter(s => (!chosenQuiz || s.quizId === chosenQuiz) && allQuizzes.some(q=>q.id===s.quizId));
      const sort = sortSelect.value;
      if(sort === 'newest') scores.sort((a,b)=> new Date(b.date) - new Date(a.date));
      if(sort === 'score-desc') scores.sort((a,b)=> b.score - a.score);
      if(sort === 'score-asc') scores.sort((a,b)=> a.score - b.score);
      if(sort === 'participant') scores.sort((a,b)=> a.participant.localeCompare(b.participant));
  
      if(scores.length === 0) { resultsTable.innerHTML = '<p>No results yet.</p>'; return; }
  
      resultsTable.innerHTML = `<table class="table"><thead><tr><th>Participant</th><th>Score</th><th>Percent</th><th>Quiz</th><th>Date</th></tr></thead><tbody>
        ${scores.map(s=>`<tr>
           <td>${escapeHtml(s.participant)}</td>
           <td>${s.score} / ${s.total}</td>
           <td>${s.percent}%</td>
           <td>${escapeHtml((quizzes[s.quizId]||{}).title || s.quizId)}</td>
           <td>${new Date(s.date).toLocaleString()}</td>
        </tr>`).join('')}
      </tbody></table>`;
    }
  
    // expose small helpers to global for buttons
    window.copyQuizLink = function(id){
      const link = `${location.origin}${location.pathname.replace(/[^\/]*$/,'')}quiz.html?id=${encodeURIComponent(id)}`;
      navigator.clipboard?.writeText(link).then(()=> alert('Link copied to clipboard'), ()=> prompt('Copy this link:', link));
    };
    window.deleteQuiz = function(id){
      if(!confirm('Delete this quiz? This will not remove existing results.')) return;
      const quizzes = getQuizzes();
      delete quizzes[id];
      putQuizzes(quizzes);
      location.reload();
    };
  
    filterSelect.onchange = renderResults;
    sortSelect.onchange = renderResults;
    renderResults();
  }
  
  /* ---------- Create Quiz ---------- */
  function renderCreatePage(){
    const current = lsGet(LS_KEYS.CURR, null);
    if(!current){ alert('Please log in first'); location.href='index.html'; return; }
  
    const userControls = document.getElementById('user-controls');
    if(userControls) userControls.innerHTML = `<span>${current.username}</span> <button id="logout-btn" class="btn ghost">Logout</button>`;
    const logoutBtn = document.getElementById('logout-btn');
    if(logoutBtn) logoutBtn.onclick = () => { logout(); location.href='index.html'; };
  
    const questionsWrapper = document.getElementById('questions-wrapper');
    const addBtn = document.getElementById('add-question');
    const saveBtn = document.getElementById('save-quiz');
    const titleInput = document.getElementById('quiz-title');
    const linkOutput = document.getElementById('link-output');
  
    let questions = [];
  
    function makeQuestionNode(qIndex, data){
      const div = document.createElement('div');
      div.className = 'question';
      div.dataset.index = qIndex;
      div.innerHTML = `
        <div class="small">Question ${qIndex+1}</div>
        <label>Question text
          <input class="q-text" value="${escapeHtmlAttr((data && data.text) || '')}" />
        </label>
        <label>Option A <input class="q-opt" data-opt="0" value="${escapeHtmlAttr((data && data.options && data.options[0])||'')}" /></label>
        <label>Option B <input class="q-opt" data-opt="1" value="${escapeHtmlAttr((data && data.options && data.options[1])||'')}" /></label>
        <label>Option C <input class="q-opt" data-opt="2" value="${escapeHtmlAttr((data && data.options && data.options[2])||'')}" /></label>
        <label>Option D <input class="q-opt" data-opt="3" value="${escapeHtmlAttr((data && data.options && data.options[3])||'')}" /></label>
        <label>Correct option (0-3)
          <input class="q-correct" value="${(data && data.correct !== undefined) ? data.correct : ''}" />
        </label>
        <div class="row">
          <button class="btn remove-q">Remove</button>
        </div>
      `;
      div.querySelector('.remove-q').onclick = () => {
        questions.splice(qIndex,1);
        renderAll();
      };
      return div;
    }
    function renderAll(){
      questionsWrapper.innerHTML = '';
      questions.forEach((q,i)=> questionsWrapper.appendChild(makeQuestionNode(i,q)));
    }
  
    addBtn.onclick = () => {
      questions.push({ text:'', options:['','','',''], correct:0 });
      renderAll();
    };
    // add one by default
    if(questions.length === 0) addBtn.click();
  
    saveBtn.onclick = () => {
      // sync DOM -> questions array
      const nodes = questionsWrapper.querySelectorAll('.question');
      const qs = [];
      for(const node of nodes){
        const text = node.querySelector('.q-text').value.trim();
        const opts = Array.from(node.querySelectorAll('.q-opt')).map(i=>i.value.trim());
        const correctRaw = node.querySelector('.q-correct').value.trim();
        const correct = parseInt(correctRaw);
        if(!text || opts.some(o=>o==='') || isNaN(correct) || correct < 0 || correct > 3){
          linkOutput.style.color='crimson';
          linkOutput.textContent = 'Fill all fields and set correct option as 0-3 for each question.';
          return;
        }
        qs.push({ text, options: opts, correct });
      }
      if(qs.length === 0){
        linkOutput.style.color='crimson';
        linkOutput.textContent = 'Add at least one question.';
        return;
      }
      const title = (titleInput.value.trim() || 'Untitled Quiz');
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
      const quizzes = getQuizzes();
      quizzes[id] = { id, title, questions: qs, creator: current.username, creatorId: current.id, createdAt: new Date().toISOString() };
      putQuizzes(quizzes);
  
      const link = `${location.origin}${location.pathname.replace(/[^\/]*$/,'')}quiz.html?id=${encodeURIComponent(id)}`;
      linkOutput.style.color='green';
      linkOutput.innerHTML = `Quiz saved! Share this link:<br/><input readonly style="width:100%;padding:8px;border-radius:8px" value="${link}" />`;
    };
  }
  
  /* ---------- Take quiz ---------- */
  function renderTakePage(){
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const card = document.getElementById('quiz-card');
  
    if(!id){ card.innerHTML = '<h2>Quiz not found</h2><p>No quiz id provided.</p>'; return; }
  
    const quizzes = getQuizzes();
    const quiz = quizzes[id];
    if(!quiz){ card.innerHTML = `<h2>Quiz not found</h2><p>Quiz id "${escapeHtml(id)}" does not exist.</p>`; return; }
  
    let idx = 0;
    const answers = Array(quiz.questions.length).fill(null);
  
    function showQuestion(i){
      const q = quiz.questions[i];
      card.innerHTML = `
        <h1>${escapeHtml(quiz.title)}</h1>
        <div class="small">Question ${i+1} / ${quiz.questions.length}</div>
        <div class="question"><p><strong>${escapeHtml(q.text)}</strong></p><div id="opts"></div></div>
        <div class="row" style="margin-top:12px">
          ${i>0?'<button id="prev" class="btn">Previous</button>':''}
          ${i < quiz.questions.length - 1 ? '<button id="next" class="btn">Next</button>' : '<button id="submit" class="btn primary">Submit Quiz</button>'}
        </div>
      `;
      const opts = document.getElementById('opts');
      q.options.forEach((opt, j) => {
        const checked = answers[i] === j ? 'checked' : '';
        opts.insertAdjacentHTML('beforeend', `<label style="display:block;margin:6px 0"><input type="radio" name="opt" value="${j}" ${checked}/> ${escapeHtml(opt)}</label>`);
      });
  
      opts.addEventListener('change', (e) => {
        if(e.target.name === 'opt') answers[i] = parseInt(e.target.value);
      });
  
      const prev = document.getElementById('prev');
      if(prev) prev.onclick = () => { idx--; showQuestion(idx); };
  
      const next = document.getElementById('next');
      if(next) next.onclick = () => { idx++; showQuestion(idx); };
  
      const submit = document.getElementById('submit');
      if(submit) submit.onclick = submitQuiz;
    }
  
    function submitQuiz(){
      if(answers.some(a => a === null)){
        alert('Please answer all questions before submitting.');
        return;
      }
      let score = 0;
      quiz.questions.forEach((q, i) => { if(answers[i] === q.correct) score++; });
      const percent = Math.round((score / quiz.questions.length) * 100);
      const participant = prompt('Enter your name (visible to quiz creator):', 'Anonymous') || 'Anonymous';
      const results = getScores();
      results.push({ quizId: quiz.id, participant, score, total: quiz.questions.length, percent, date: new Date().toISOString() });
      putScores(results);
  
      card.innerHTML = `<h1>Result</h1><p>You scored <strong>${score}</strong> / ${quiz.questions.length} (${percent}%).</p>
        <p>Thanks, ${escapeHtml(participant)}!</p>
        <p><a class="btn" href="index.html">Home</a></p>`;
    }
  
    showQuestion(0);
  }
  
  /* ---------- Utilities ---------- */
  function escapeHtml(str){
    if(!str) return '';
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }
  function escapeHtmlAttr(str){
    if(!str) return '';
    return String(str).replace(/["']/g, s => ({'"':'&quot;',"'":'&#39;'}[s]));
  }
  