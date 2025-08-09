// Shared app state & helpers
const appState = (() => {
    const USERS_KEY = 'qp_users';
    const QUIZZES_KEY = 'qp_quizzes';
    const SCORES_KEY = 'qp_scores';
    const CUR_USER_KEY = 'qp_current_user';
  
    function load(k){ return JSON.parse(localStorage.getItem(k)||'null'); }
    function save(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
  
    function getUsers(){ return load(USERS_KEY) || []; }
    function putUsers(u){ save(USERS_KEY,u); }
  
    function getQuizzes(){ return load(QUIZZES_KEY) || {}; }
    function putQuizzes(q){ save(QUIZZES_KEY,q); }
  
    function getScores(){ return load(SCORES_KEY) || []; }
    function putScores(s){ save(SCORES_KEY,s); }
  
    function setCurrentUser(user){
      localStorage.setItem(CUR_USER_KEY, JSON.stringify(user));
    }
    function getCurrentUser(){ return JSON.parse(localStorage.getItem(CUR_USER_KEY)||'null'); }
    function logout(){ localStorage.removeItem(CUR_USER_KEY); }
  
    function registerUser({username,email,password}){
      const users = getUsers();
      if(users.some(u=>u.email===email || u.username===username)) return {ok:false, msg:'User/email already exists'};
      users.push({id:Date.now().toString(), username, email, password});
      putUsers(users);
      return {ok:true};
    }
    function login(identifier, password){
      const users = getUsers();
      const u = users.find(x => x.email===identifier || x.username===identifier);
      if(!u) return {ok:false,msg:'No user found'};
      if(u.password !== password) return {ok:false,msg:'Wrong password'};
      setCurrentUser(u);
      return {ok:true, user:u};
    }
  
    return { getUsers, putUsers, getQuizzes, putQuizzes, getScores, putScores, registerUser, login, setCurrentUser, getCurrentUser, logout };
  })();
  
  /* -------------------------
     UI functions for index.html
     ------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    // attach tab logic if elements exist
    const showLogin = document.getElementById('show-login');
    const showRegister = document.getElementById('show-register');
    if(showLogin && showRegister){
      const loginForm = document.getElementById('login-form');
      const regForm = document.getElementById('register-form');
      showLogin.addEventListener('click', ()=>{ showLogin.classList.add('active'); showRegister.classList.remove('active'); loginForm.classList.remove('hidden'); regForm.classList.add('hidden'); });
      showRegister.addEventListener('click', ()=>{ showRegister.classList.add('active'); showLogin.classList.remove('active'); regForm.classList.remove('hidden'); loginForm.classList.add('hidden'); });
  
      // register
      regForm.onsubmit = (e) => {
        e.preventDefault();
        const user = {
          username: document.getElementById('reg-username').value.trim(),
          email: document.getElementById('reg-email').value.trim(),
          password: document.getElementById('reg-password').value
        };
        const r = appState.registerUser(user);
        const msg = document.getElementById('reg-message');
        if(!r.ok){ msg.textContent = r.msg; msg.style.color='crimson'; return; }
        msg.style.color='green'; msg.textContent = 'Registered! Redirecting to dashboard…';
        appState.setCurrentUser({username:user.username, email:user.email});
        setTimeout(()=> window.location.href='dashboard.html',600);
      };
  
      // login
      loginForm.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('login-identifier').value.trim();
        const pw = document.getElementById('login-password').value;
        const r = appState.login(id,pw);
        const msg = document.getElementById('login-message');
        if(!r.ok){ msg.style.color='crimson'; msg.textContent=r.msg; return; }
        msg.style.color='green'; msg.textContent='Login successful! Redirecting…';
        setTimeout(()=> window.location.href='dashboard.html', 400);
      };
    }
  });
  
  /* -------------------------
     Page helper functions
     ------------------------- */
  function ensureLoggedIn() {
    const user = appState.getCurrentUser();
    if(!user) {
      alert('Please login first.');
      window.location.href = 'index.html';
      throw new Error('not logged in');
    }
  }
  
  function ensureLoggedInOrGuest(){ // used on create: if not logged in, allow "guest" creator
    const container = document.getElementById('user-controls');
    if(!container) return;
    const user = appState.getCurrentUser();
    if(user){
      container.innerHTML = `<span>${user.username}</span> <button id="logout-btn" class="btn ghost">Logout</button>`;
      document.getElementById('logout-btn').onclick = () => { appState.logout(); window.location.href='index.html'; };
    } else {
      container.innerHTML = `<a href="index.html" class="btn">Login</a>`;
    }
  }
  
  /* -------------------------
     Create page logic
     ------------------------- */
  function renderCreatePage(){
    const questionsWrapper = document.getElementById('questions-wrapper');
    const addBtn = document.getElementById('add-question');
    const saveBtn = document.getElementById('save-quiz');
    const titleInput = document.getElementById('quiz-title');
    const linkOutput = document.getElementById('link-output');
  
    let questions = [];
  
    function makeQuestionForm(qIndex, data){
      const qDiv = document.createElement('div');
      qDiv.className = 'question';
      qDiv.dataset.index = qIndex;
      qDiv.innerHTML = `
        <div class="small">Question ${qIndex+1}</div>
        <label>Question text
          <input class="q-text" placeholder="e.g., Which tag for scripts?" value="${(data && data.text) || ''}" />
        </label>
        <label>Option A
          <input class="q-opt" data-opt="0" value="${(data && data.options && data.options[0])||''}" />
        </label>
        <label>Option B
          <input class="q-opt" data-opt="1" value="${(data && data.options && data.options[1])||''}" />
        </label>
        <label>Option C
          <input class="q-opt" data-opt="2" value="${(data && data.options && data.options[2])||''}" />
        </label>
        <label>Option D
          <input class="q-opt" data-opt="3" value="${(data && data.options && data.options[3])||''}" />
        </label>
        <label>Correct option (0-3)
          <input class="q-correct" value="${(data && data.correct !== undefined) ? data.correct : ''}" />
        </label>
        <div class="row">
          <button class="btn small remove-q">Remove</button>
        </div>
      `;
      // attach remove handler
      qDiv.querySelector('.remove-q').onclick = () => {
        questions.splice(qIndex,1);
        renderAll();
      };
      return qDiv;
    }
  
    function renderAll(){
      questionsWrapper.innerHTML = '';
      questions.forEach((q,i)=>{
        const node = makeQuestionForm(i,q);
        questionsWrapper.appendChild(node);
      });
      // update remove handlers (already set)
    }
  
    addBtn.onclick = () => {
      questions.push({text:'', options:['','','',''], correct:0});
      renderAll();
    };
  
    saveBtn.onclick = () => {
      // gather data from DOM
      const t = titleInput.value.trim() || 'Untitled Quiz';
      const qNodes = questionsWrapper.querySelectorAll('.question');
      const qs = [];
      for(const node of qNodes){
        const text = node.querySelector('.q-text').value.trim();
        const opts = Array.from(node.querySelectorAll('.q-opt')).map(i=>i.value.trim());
        const correctRaw = node.querySelector('.q-correct').value.trim();
        const correct = parseInt(correctRaw);
        if(!text || opts.some(o=>o==='') || isNaN(correct) || correct<0 || correct>3){
          linkOutput.style.color = 'crimson';
          linkOutput.textContent = 'Please fill all questions and options, and set correct option (0-3).';
          return;
        }
        qs.push({text, options:opts, correct});
      }
      if(qs.length === 0){ linkOutput.style.color='crimson'; linkOutput.textContent='Add at least one question.'; return; }
  
      // store quiz
      const quizzes = appState.getQuizzes();
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
      const currentUser = appState.getCurrentUser();
      const creator = currentUser ? currentUser.username : 'guest';
      quizzes[id] = { id, title: t, questions: qs, creator, createdAt: new Date().toISOString() };
      appState.putQuizzes(quizzes);
  
      // generate link (use relative path)
      const link = `${location.origin}${location.pathname.replace(/[^\/]*$/, '')}take.html?id=${encodeURIComponent(id)}`;
      linkOutput.style.color = 'green';
      linkOutput.innerHTML = `Quiz saved! Share this link: <input readonly style="width:100%;padding:8px;border-radius:8px" value="${link}" /> <div class="small">Creator: ${creator} | Quiz id: ${id}</div>`;
    };
  
    // If no questions initially, add one
    if(questions.length === 0) addBtn.click();
  
    // update dynamic changes on blur so questions array reflects DOM
    questionsWrapper.addEventListener('blur', () => {
      // sync DOM to questions[]
      const qNodes = questionsWrapper.querySelectorAll('.question');
      const newQ = [];
      qNodes.forEach(node=>{
        const text = node.querySelector('.q-text').value.trim();
        const opts = Array.from(node.querySelectorAll('.q-opt')).map(i=>i.value.trim());
        const correct = parseInt(node.querySelector('.q-correct').value.trim() || '0');
        newQ.push({text, options:opts, correct});
      });
      questions = newQ;
    }, true);
  }
  
  /* -------------------------
     Take quiz logic
     ------------------------- */
  function renderTakePage(){
    const card = document.getElementById('quiz-card');
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if(!id){ card.innerHTML = '<h2>Quiz not found</h2><p>No quiz ID provided in URL.</p>'; return; }
    const quizzes = appState.getQuizzes();
    const quiz = quizzes[id];
    if(!quiz){ card.innerHTML = `<h2>Quiz not found</h2><p>Quiz ID "${id}" does not exist.</p>`; return; }
  
    let currentIndex = 0;
    const answers = [];
  
    function showQuestion(i){
      const q = quiz.questions[i];
      card.innerHTML = `
        <h1>${quiz.title}</h1>
        <div class="small">Question ${i+1} / ${quiz.questions.length}</div>
        <div class="question">
          <p><strong>${q.text}</strong></p>
          <div id="opts"></div>
        </div>
        <div class="row">
          ${i>0?'<button id="prev" class="btn">Previous</button>':''}
          ${i<quiz.questions.length-1?'<button id="next" class="btn">Next</button>':'<button id="submit" class="btn primary">Submit Quiz</button>'}
        </div>
      `;
      const optsDiv = document.getElementById('opts');
      q.options.forEach((opt, idx)=>{
        const idOpt = `opt-${idx}`;
        const checked = answers[i] === idx ? 'checked' : '';
        const html = `<label style="display:block;margin:6px 0"><input type="radio" name="opt" value="${idx}" ${checked}/> ${opt}</label>`;
        optsDiv.insertAdjacentHTML('beforeend', html);
      });
  
      // restore selection
      optsDiv.addEventListener('change', (e)=>{
        const v = parseInt(e.target.value);
        answers[i] = v;
      });
  
      // nav
      const prev = document.getElementById('prev');
      if(prev) prev.onclick = ()=>{ currentIndex--; showQuestion(currentIndex); };
      const next = document.getElementById('next');
      if(next) next.onclick = ()=>{ currentIndex++; showQuestion(currentIndex); };
      const submitBtn = document.getElementById('submit');
      if(submitBtn) submitBtn.onclick = submitQuiz;
    }
  
    function submitQuiz(){
      // ensure every question answered
      if(answers.length !== quiz.questions.length || answers.some(a=>a===undefined || a===null)){
        alert('Please answer all questions before submitting.');
        return;
      }
      let score = 0;
      quiz.questions.forEach((q,i)=>{
        if(answers[i] === q.correct) score++;
      });
      const percent = Math.round((score / quiz.questions.length) * 100);
  
      // ask participant name
      const participant = prompt('Enter your name for the result (will be visible to quiz creator):', 'Anonymous') || 'Anonymous';
      const scores = appState.getScores();
      scores.push({ quizId: quiz.id, participant, score, total: quiz.questions.length, percent, date: new Date().toISOString() });
      appState.putScores(scores);
  
      card.innerHTML = `<h1>Result</h1>
        <p>You scored <strong>${score}</strong> / ${quiz.questions.length} (${percent}%)</p>
        <p>Thank you, ${participant}!</p>
        <p><a href="index.html" class="btn">Home</a></p>`;
    }
  
    showQuestion(0);
  }
  
  /* -------------------------
     Dashboard logic
     ------------------------- */
  function renderDashboard(){
    const user = appState.getCurrentUser();
    const myQuizzesDiv = document.getElementById('my-quizzes');
    const resultsTable = document.getElementById('results-table');
    const filterSelect = document.getElementById('filter-quiz');
    const sortSelect = document.getElementById('sort-results');
    const userControls = document.getElementById('user-controls');
  
    if(userControls){
      userControls.innerHTML = `<span>${user.username}</span> <button id="logout-btn" class="btn ghost">Logout</button>`;
      document.getElementById('logout-btn').onclick = () => { appState.logout(); window.location.href='index.html'; };
    }
  
    const quizzes = appState.getQuizzes();
    const scores = appState.getScores();
  
    // list quizzes created by current user
    const myQuizList = Object.values(quizzes).filter(q => q.creator === user.username);
    myQuizzesDiv.innerHTML = myQuizList.length ? myQuizList.map(q=>`
      <div style="padding:8px;border-bottom:1px solid #eef2f7;">
        <strong>${q.title}</strong>
        <div class="small">Created: ${new Date(q.createdAt).toLocaleString()}</div>
        <div style="margin-top:6px">
          <a class="btn" href="create.html">Edit</a>
          <button class="btn" onclick="copyLink('${q.id}')">Copy Link</button>
          <span class="small" style="margin-left:8px">id: ${q.id}</span>
        </div>
      </div>`).join('') : '<p>No quizzes yet. Create one!</p>';
  
    // populate filter select
    filterSelect.innerHTML = `<option value="">All quizzes</option>` + myQuizList.map(q=>`<option value="${q.id}">${q.title}</option>`).join('');
  
    function copyLink(id){
      const link = `${location.origin}${location.pathname.replace(/[^\/]*$/, '')}take.html?id=${encodeURIComponent(id)}`;
      navigator.clipboard?.writeText(link).then(()=> alert('Link copied to clipboard'), ()=> alert('Copy failed, manually copy: ' + link));
    }
    window.copyLink = copyLink;
  
    function renderResults(){
      const chosenQuiz = filterSelect.value;
      let list = scores.filter(s => !chosenQuiz || s.quizId === chosenQuiz);
      // only show results for quizzes the user created
      const myIds = new Set(myQuizList.map(q=>q.id));
      list = list.filter(s => myIds.has(s.quizId));
  
      // sort
      const sort = sortSelect.value;
      if(sort === 'newest') list.sort((a,b)=> new Date(b.date) - new Date(a.date));
      if(sort === 'score-desc') list.sort((a,b)=> b.score - a.score);
      if(sort === 'score-asc') list.sort((a,b)=> a.score - b.score);
      if(sort === 'name') list.sort((a,b)=> a.participant.localeCompare(b.participant));
  
      if(list.length === 0){ resultsTable.innerHTML = '<p>No results yet.</p>'; return; }
  
      resultsTable.innerHTML = `<table class="table"><thead><tr><th>Participant</th><th>Score</th><th>Percent</th><th>Quiz</th><th>Date</th></tr></thead><tbody>
        ${list.map(r=>`<tr>
           <td>${r.participant}</td>
           <td>${r.score} / ${r.total}</td>
           <td>${r.percent}%</td>
           <td>${quizzes[r.quizId] ? quizzes[r.quizId].title : r.quizId}</td>
           <td>${new Date(r.date).toLocaleString()}</td>
        </tr>`).join('')}
      </tbody></table>`;
    }
  
    filterSelect.onchange = renderResults;
    sortSelect.onchange = renderResults;
    renderResults();
  }
  