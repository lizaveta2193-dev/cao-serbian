
const C=window.CAO_COURSE,items=C.items,lessons=C.lessons,dialogs=C.dialogs||[],modes=C.modes||[],errorRules=C.errorRules||[];
const $=s=>document.querySelector(s),app=$("#app");
let state={xp:0,streak:1,completed:[],mistakes:[],srs:{},lastStudy:null,...JSON.parse(localStorage.getItem("cao_v81")||"{}")};
let route="home",activeLesson=null,currentSet=[],qIndex=0,assembled=[],dialogIndex=0,activeMode=null;
const save=()=>localStorage.setItem("cao_v81",JSON.stringify(state));
const clean=s=>String(s||"").trim().replace(/[.!?]+$/,"").replace(/\s+/g," ");
const wc=s=>clean(s).split(/\s+/).filter(Boolean).length;
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),1800)}
function header(t,s=""){return `<div class="header"><div><h1>${t}</h1>${s?`<p>${s}</p>`:""}</div><div class="stats"><div class="stat">🔥 ${state.streak}</div><div class="stat">💎 ${state.xp}</div></div></div>`}
function nav(){document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.route===route))}
function go(r){route=r;render();nav();scrollTo({top:0,behavior:"smooth"})}
document.querySelectorAll(".bottom-nav button").forEach(b=>b.onclick=()=>go(b.dataset.route));

let voice=null;
function loadVoices(){const v=speechSynthesis.getVoices();voice=v.find(x=>/^sr/i.test(x.lang))||v.find(x=>/^hr|^bs/i.test(x.lang))||null}
if("speechSynthesis"in window){loadVoices();speechSynthesis.onvoiceschanged=loadVoices}
function speak(t){if(!("speechSynthesis"in window)){toast("Озвучка недоступна");return}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(clean(t));u.lang=voice?.lang||"sr-RS";if(voice)u.voice=voice;u.rate=.78;speechSynthesis.speak(u)}
function spk(t){return `<button class="speaker-btn" data-speak="${encodeURIComponent(t)}" aria-label="Прослушать">🔊</button>`}
function bindSpeakers(root=document){root.querySelectorAll("[data-speak]").forEach(b=>b.onclick=e=>{e.stopPropagation();speak(decodeURIComponent(b.dataset.speak))})}

function updateStreak(){const today=new Date().toISOString().slice(0,10);if(!state.lastStudy){state.lastStudy=today;save();return}if(state.lastStudy===today)return;const d=Math.round((new Date(today)-new Date(state.lastStudy))/86400000);state.streak=d===1?state.streak+1:1;state.lastStudy=today;save()}
function schedule(key,ok){const c=state.srs[key]||{reps:0,interval:0,ease:2.3};if(ok){c.reps++;c.interval=c.reps===1?1:c.reps===2?3:Math.round(Math.max(4,c.interval*c.ease));c.ease=Math.min(2.8,c.ease+.05)}else{c.reps=0;c.interval=1;c.ease=Math.max(1.4,c.ease-.2)}c.due=Date.now()+c.interval*86400000;state.srs[key]=c;save()}
function dueItems(){const now=Date.now();return Object.entries(state.srs).filter(([k,v])=>!v.due||v.due<=now).map(([k])=>items.find(x=>x.sr===k)).filter(Boolean)}

function pool(l){let p=items.filter(x=>(x.theme===l.poolFilter||x.theme===l.category)&&wc(x.sr)>=2&&wc(x.ru)>=2);if(p.length<20)p=items.filter(x=>["fixed_phrase","phrase","grammar_example","colloquial"].includes(x.kind)&&wc(x.sr)>=2&&wc(x.ru)>=2);return p}
function translationQs(l,n=5){const p=[...pool(l)].sort(()=>Math.random()-.5),out=[];for(const it of p){const d=p.filter(x=>x.sr!==it.sr&&x.ru!==it.ru&&Math.abs(wc(x.ru)-wc(it.ru))<=1&&Math.abs(x.ru.length-it.ru.length)<30).sort(()=>Math.random()-.5).slice(0,3);if(d.length===3){const o=[it.ru,...d.map(x=>x.ru)].sort(()=>Math.random()-.5);out.push({type:"translation",phrase:it.sr,audio:it.sr,options:o,answer:o.indexOf(it.ru),correct:it.ru});if(out.length===n)break}}return out}
function assemblyQs(l,n=2){return pool(l).filter(x=>wc(x.sr)>=3&&wc(x.sr)<=9).sort(()=>Math.random()-.5).slice(0,n).map(x=>({type:"assemble",prompt:`Собери: ${x.ru}`,tokens:clean(x.sr).split(" "),answer:clean(x.sr).split(" "),audio:x.sr}))}
function typingQs(l,n=2){return pool(l).filter(x=>wc(x.sr)>=3&&wc(x.sr)<=8).sort(()=>Math.random()-.5).slice(0,n).map(x=>({type:"typing",prompt:`Переведи на сербский: ${x.ru}`,answerText:x.sr,audio:x.sr}))}
function questions(l){return [...translationQs(l,6),...assemblyQs(l,2),...typingQs(l,2)].sort(()=>Math.random()-.5)}

function renderHome(){
 const next=lessons.find(l=>!state.completed.includes(l.id))||lessons[0];
 app.innerHTML=header("Ćao! — сербский",`${C.meta.version} · курс для русскоязычных`)+
 `<div class="version-banner"><span>Максимальная текущая сборка</span><b>${C.meta.version}</b><small>Build ${C.meta.build}</small></div>`+
 `<div class="hero"><small>ПРОДОЛЖИТЬ КУРС</small><h2>${next.title}</h2><p>${next.description}</p><button id="startNext" class="btn white">Начать урок</button></div>`+
 `<div class="section"><h3>Практические режимы</h3><span>${modes.length}</span></div>`+
 `<div class="mode-grid">${modes.map(m=>`<button class="mode-card" data-mode="${m.id}"><span>${m.icon}</span><h3>${m.title}</h3><p>${m.description}</p></button>`).join("")}</div>`+
 `<div class="section"><h3>Курс</h3><span>${state.completed.length} завершено</span></div>`+
 lessons.filter(l=>l.kind!=="grammar").slice(0,45).map(l=>`<div class="lesson" data-id="${l.id}"><div class="icon">${state.completed.includes(l.id)?"✅":"📚"}</div><div><h4>${l.title}</h4><p>${l.description}</p></div><b>›</b></div>`).join("");
 $("#startNext").onclick=()=>startLesson(next.id);
 document.querySelectorAll(".lesson").forEach(e=>e.onclick=()=>startLesson(e.dataset.id));
 document.querySelectorAll(".mode-card").forEach(e=>e.onclick=()=>{activeMode=modes.find(m=>m.id===e.dataset.mode);route="mode";renderMode();nav()});
}
function renderMode(){
 const matching=lessons.filter(l=>activeMode.themes.includes(l.category)||activeMode.themes.includes(l.poolFilter));
 app.innerHTML=header(`${activeMode.icon} ${activeMode.title}`,activeMode.description)+
 `<div class="card"><p class="small">Этот режим собирает только релевантные уроки, фразы и диалоги без случайных сочетаний.</p></div>`+
 `<div class="section"><h3>Уроки режима</h3><span>${matching.length}</span></div>`+
 matching.map(l=>`<div class="lesson" data-id="${l.id}"><div class="icon">🎯</div><div><h4>${l.title}</h4><p>${l.description}</p></div><b>›</b></div>`).join("");
 document.querySelectorAll(".lesson").forEach(e=>e.onclick=()=>startLesson(e.dataset.id));
}
function startLesson(id){activeLesson=lessons.find(l=>l.id===id);currentSet=questions(activeLesson);qIndex=0;route="lesson";renderLesson();nav()}
function renderLesson(){
 const q=currentSet[qIndex];assembled=[];let body="";
 if(q.type==="translation")body=`<div class="question-head"><div><div class="kicker">Выбери правильный перевод всей фразы</div><div class="question">${q.phrase}</div></div>${spk(q.audio)}</div><div class="answers">${q.options.map((o,i)=>`<button class="answer" data-i="${i}">${o}</button>`).join("")}</div>`;
 if(q.type==="assemble")body=`<div class="question-head"><div><div class="kicker">Порядок слов</div><div class="question">${q.prompt}</div></div>${spk(q.audio)}</div><div id="assembled" class="assembled-zone">Нажимай слова в правильном порядке</div><div class="token-bank">${[...q.tokens].sort(()=>Math.random()-.5).map(t=>`<button class="token" data-token="${encodeURIComponent(t)}">${t}</button>`).join("")}</div><button id="checkAssembly" class="btn purple full">Проверить</button>`;
 if(q.type==="typing")body=`<div class="question-head"><div><div class="kicker">Самостоятельный перевод</div><div class="question">${q.prompt}</div></div>${spk(q.audio)}</div><input id="typed" class="search" placeholder="Напиши предложение по-сербски"><button id="checkTyping" class="btn purple full">Проверить</button>`;
 app.innerHTML=header(activeLesson.title,`${qIndex+1} из ${currentSet.length}`)+`<div class="card"><div class="progress"><div style="width:${(qIndex+1)/currentSet.length*100}%"></div></div>${body}<div id="fb" class="feedback"></div><button id="next" class="btn green next">Дальше</button></div>`;
 bindSpeakers(app);
 if(q.type==="translation")document.querySelectorAll(".answer").forEach(b=>b.onclick=()=>choose(+b.dataset.i,b));
 if(q.type==="assemble"){document.querySelectorAll(".token-bank .token").forEach(b=>b.onclick=()=>addToken(b));$("#checkAssembly").onclick=checkAssembly}
 if(q.type==="typing")$("#checkTyping").onclick=checkTyping;
 $("#next").onclick=nextQ;
}
function locked(){return $("#next").style.display==="block"}
function findRule(text){const t=clean(text).toLowerCase();return errorRules.find(r=>r.match.some(m=>t.includes(m.toLowerCase())))}
function feedback(ok,correct,key,user=""){
 const f=$("#fb");f.style.display="block";f.style.background=ok?"#edfff7":"#fff0f0";
 if(ok)f.innerHTML="Верно! +10 XP";
 else{const rule=findRule(user);f.innerHTML=`Правильно: <b>${correct}</b>${rule?`<div class="smart-error"><strong>${rule.title}</strong><p>${rule.explanation}</p><div>✅ ${rule.correct}</div></div>`:""}`}
 if(ok)state.xp+=10;else state.mistakes.push(correct);schedule(key||correct,ok);save();$("#next").style.display="block";
}
function choose(i,b){if(locked())return;const q=currentSet[qIndex],bs=[...document.querySelectorAll(".answer")];bs[q.answer].classList.add("correct");if(i!==q.answer)b.classList.add("wrong");feedback(i===q.answer,q.correct,q.phrase)}
function addToken(b){if(locked()||b.classList.contains("used"))return;b.classList.add("used");assembled.push({t:decodeURIComponent(b.dataset.token),b});drawAssembly()}
function drawAssembly(){const z=$("#assembled");z.innerHTML=assembled.length?assembled.map((x,i)=>`<button class="token chosen" data-i="${i}">${x.t}</button>`).join(""):"Нажимай слова в правильном порядке";z.querySelectorAll(".chosen").forEach(b=>b.onclick=()=>{const x=assembled.splice(+b.dataset.i,1)[0];x.b.classList.remove("used");drawAssembly()})}
function checkAssembly(){if(locked())return;const q=currentSet[qIndex],u=assembled.map(x=>x.t).join(" "),c=q.answer.join(" ");feedback(clean(u).toLowerCase()===clean(c).toLowerCase(),c,q.audio,u)}
function checkTyping(){if(locked())return;const q=currentSet[qIndex],u=$("#typed").value;feedback(clean(u).toLowerCase()===clean(q.answerText).toLowerCase(),q.answerText,q.audio,u)}
function nextQ(){qIndex++;if(qIndex>=currentSet.length){if(!state.completed.includes(activeLesson.id))state.completed.push(activeLesson.id);state.xp+=50;updateStreak();save();app.innerHTML=header("Урок завершён! 🎉","Результаты добавлены в повторение")+`<div class="card finish-card"><div>🏆</div><h2>${activeLesson.title}</h2><p>+50 XP</p><button id="back" class="btn purple full">К курсу</button></div>`;$("#back").onclick=()=>go("home")}else renderLesson()}

function renderGrammar(){
 const list=lessons.filter(l=>l.kind==="grammar");
 app.innerHTML=header("Грамматика","Объяснения для русскоязычных")+
 list.map(l=>`<div class="lesson" data-id="${l.id}"><div class="icon">📘</div><div><h4>${l.title}</h4><p>${l.description}</p></div><b>›</b></div>`).join("");
 document.querySelectorAll(".lesson").forEach(e=>e.onclick=()=>{activeLesson=lessons.find(x=>x.id===e.dataset.id);route="grammar_article";renderGrammarArticle(activeLesson);nav()});
}
function renderGrammarArticle(l){
 const g=l.grammar;
 app.innerHTML=header(g.title,`${g.level} · логика через русский язык`)+`<div class="card grammar-article"><div class="grammar-summary"><b>Главная мысль</b><p>${g.summary}</p></div>${g.sections.map(s=>`<section class="rule-section"><h3>${s.heading}</h3><p>${s.body}</p></section>`).join("")}<section class="rule-section"><h3>Типичные ошибки</h3>${g.mistakes.map(m=>`<div class="mistake-item">⚠️ ${m}</div>`).join("")}</section><section class="rule-section"><h3>Примеры</h3>${g.examples.map(e=>`<div class="example-item"><div><b>${e[0]}</b><span>${e[1]}</span></div>${spk(e[0])}</div>`).join("")}</section><button id="practice" class="btn purple full">Перейти к упражнениям</button></div>`;
 bindSpeakers(app);$("#practice").onclick=()=>startLesson(l.id);
}
function renderReview(){
 const due=dueItems();
 app.innerHTML=header("Повторение",`${due.length} карточек на сегодня`)+(due.length?`<div class="word-grid">${due.slice(0,80).map(x=>`<div class="word-row"><div><b>${x.sr}</b><small>${x.ru}</small></div>${spk(x.sr)}</div>`).join("")}</div>`:`<div class="card empty-card"><div>✅</div><h3>На сегодня всё</h3><p>Новые карточки появятся после уроков.</p></div>`);
 bindSpeakers(app);
}
function renderDialogs(){
 const d=dialogs[dialogIndex%dialogs.length];
 app.innerHTML=header("Диалоги",`${dialogIndex+1} из ${dialogs.length} · ${d.level}`)+`<div class="card"><h2>${d.title}</h2><div class="dialog-list">${d.lines.map((l,i)=>`<div class="dialog-line ${i%2?"right":"left"}"><div><b>${l[0]}</b><span>${l[1]}</span></div>${spk(l[0])}</div>`).join("")}</div><div class="row"><button id="prev" class="btn">← Назад</button><button id="nextDialog" class="btn purple">Дальше →</button></div></div>`;
 bindSpeakers(app);$("#prev").onclick=()=>{dialogIndex=(dialogIndex-1+dialogs.length)%dialogs.length;renderDialogs()};$("#nextDialog").onclick=()=>{dialogIndex=(dialogIndex+1)%dialogs.length;renderDialogs()};
}
function renderProfile(){
 app.innerHTML=header("Прогресс",`${C.meta.version} · Build ${C.meta.build}`)+`<div class="card"><div class="profile-item"><span>XP</span><b>${state.xp}</b></div><div class="profile-item"><span>Уроков завершено</span><b>${state.completed.length}/${lessons.length}</b></div><div class="profile-item"><span>Карточек SRS</span><b>${Object.keys(state.srs).length}</b></div><div class="profile-item"><span>Диалогов</span><b>${dialogs.length}</b></div><div class="profile-item"><span>Практических режимов</span><b>${modes.length}</b></div><div class="profile-item"><span>Версия</span><b>${C.meta.version}</b></div></div><div class="section"><h3>Что нового</h3></div>${C.meta.changelog.map(v=>`<div class="card changelog-card"><div class="changelog-head"><h3>${v.version}</h3><span>${v.date}</span></div>${v.changes.map(c=>`<div>✓ ${c}</div>`).join("")}</div>`).join("")}`;
}
function render(){if(route==="home")renderHome();else if(route==="mode")renderMode();else if(route==="grammar")renderGrammar();else if(route==="grammar_article")renderGrammarArticle(activeLesson);else if(route==="review")renderReview();else if(route==="dialogs")renderDialogs();else if(route==="lesson")renderLesson();else renderProfile()}
updateStreak();render();nav();
if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js"));
