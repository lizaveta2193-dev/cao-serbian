
const C=window.CAO_COURSE, items=C.items, lessons=C.lessons, $=s=>document.querySelector(s), app=$("#app");
let state={xp:0,streak:1,completed:[],mistakes:[],lastDate:null,...JSON.parse(localStorage.getItem("cao3000")||"{}")};
let route="home", filter="Все", activeLesson=null, qIndex=0, currentSet=[], shown=60;
const save=()=>localStorage.setItem("cao3000",JSON.stringify(state));
function toast(t){const el=$("#toast");el.textContent=t;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),1800)}
function header(t,s=""){return `<div class="header"><div><h1>${t}</h1>${s?`<p>${s}</p>`:""}</div><div class="stats"><div class="stat">🔥 ${state.streak}</div><div class="stat">💎 ${state.xp}</div></div></div>`}
function nav(){document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.route===route))}
function go(r){route=r;shown=60;render();nav();scrollTo({top:0,behavior:"smooth"})}
document.querySelectorAll(".bottom-nav button").forEach(b=>b.onclick=()=>go(b.dataset.route));
function categories(){return ["Все",...new Set(lessons.filter(l=>l.kind!=="grammar").map(l=>l.category))]}
function renderHome(){
 const done=state.completed.length,next=lessons.find(l=>!state.completed.includes(l.id))||lessons[0];
 let h=header("Ćao, Lizaveta! 👋",`${C.meta.itemsCount} слов и фраз · ${C.meta.lessonsCount} уроков`);
 h+=`<div class="hero"><small>СЛЕДУЮЩИЙ УРОК · ${next.level}</small><h2>${next.title}</h2><p>${next.description}</p><button class="btn white" id="startNext">Начать</button></div>`;
 h+=`<div class="tabs">${categories().map(c=>`<button class="chip ${c===filter?"active":""}" data-c="${c}">${c}</button>`).join("")}</div>`;
 const list=lessons.filter(l=>l.kind!=="grammar"&&(filter==="Все"||l.category===filter));
 h+=`<div class="section"><h3>Уроки</h3><span>${done} завершено</span></div>`;
 h+=list.slice(0,shown).map((l,i)=>`<div class="lesson ${state.completed.includes(l.id)?"done":""}" data-id="${l.id}">
 <div class="icon">${state.completed.includes(l.id)?"✅":l.kind==="colloquial"?"💬":l.kind==="phrases"?"🔗":"📚"}</div>
 <div><h4>${l.title}</h4><p>${l.description}</p></div><strong>›</strong></div>`).join("");
 if(list.length>shown)h+=`<button class="btn purple loadmore" id="more">Показать ещё</button>`;
 app.innerHTML=h;
 $("#startNext").onclick=()=>start(next.id);
 document.querySelectorAll(".chip").forEach(b=>b.onclick=()=>{filter=b.dataset.c;renderHome()});
 document.querySelectorAll(".lesson").forEach(e=>e.onclick=()=>start(e.dataset.id));
 if($("#more"))$("#more").onclick=()=>{shown+=60;renderHome()};
}
function poolFor(l){
 let pool=items.filter(x=>x.theme===l.poolFilter||x.theme===l.category);
 if(pool.length<20)pool=items.filter(x=>x.kind===l.kind||x.theme.includes(l.category));
 if(pool.length<20)pool=items;
 return pool;
}
function makeQuestions(l){
 const pool=[...poolFor(l)].sort(()=>Math.random()-.5).slice(0,12);
 return pool.map((it,idx)=>{
   const distract=items.filter(x=>x.ru!==it.ru).sort(()=>Math.random()-.5).slice(0,3).map(x=>x.ru);
   const options=[it.ru,...distract].sort(()=>Math.random()-.5);
   return {item:it,prompt:`Переведи: ${it.sr}`,options,answer:options.indexOf(it.ru)};
 });
}
function start(id){
 activeLesson=lessons.find(l=>l.id===id);qIndex=0;currentSet=makeQuestions(activeLesson);route="lesson";renderLesson();nav();
}
function renderLesson(){
 const q=currentSet[qIndex];
 app.innerHTML=`${header(activeLesson.title,`${qIndex+1} из ${currentSet.length}`)}
 <div class="card">${activeLesson.grammar?`<div class="grammar-box"><b>${activeLesson.grammar.title}</b><br>${activeLesson.grammar.text}</div>`:""}
 <div class="progress"><div style="width:${(qIndex+1)/currentSet.length*100}%"></div></div>
 <div class="kicker">Выбери правильный перевод</div><div class="question">${q.prompt}</div>
 <div class="answers">${q.options.map((o,i)=>`<button class="answer" data-i="${i}">${o}</button>`).join("")}</div>
 <div id="fb" class="feedback"></div><button id="next" class="btn green next">Дальше</button></div>`;
 document.querySelectorAll(".answer").forEach(b=>b.onclick=()=>answer(Number(b.dataset.i),b));
 $("#next").onclick=nextQ;
}
function answer(i,b){
 if($("#next").style.display==="block")return;
 const q=currentSet[qIndex],btns=[...document.querySelectorAll(".answer")];
 btns[q.answer].classList.add("correct");if(i!==q.answer)b.classList.add("wrong");
 const ok=i===q.answer,fb=$("#fb");fb.style.display="block";fb.style.background=ok?"#edfff7":"#fff0f0";fb.textContent=ok?"Верно! +10 XP":`Правильно: ${q.item.ru}`;
 if(ok)state.xp+=10;else state.mistakes.push(q.item.sr);save();$("#next").style.display="block";
}
function nextQ(){
 qIndex++;
 if(qIndex>=currentSet.length){
   if(!state.completed.includes(activeLesson.id))state.completed.push(activeLesson.id);
   state.xp+=50;save();
   app.innerHTML=`${header("Урок завершён! 🎉","Odlično!")}
   <div class="card" style="text-align:center"><div style="font-size:64px">🏆</div><h2>${activeLesson.title}</h2><p class="small">+50 XP за завершение урока</p><button class="btn purple" id="homeBtn" style="width:100%">К курсу</button></div>`;
   $("#homeBtn").onclick=()=>go("home");
 }else renderLesson();
}
function renderGrammar(){
 const list=lessons.filter(l=>l.kind==="grammar");
 app.innerHTML=header("Грамматика",`${list.length} отдельных тем от A1 до B1`)+
 `<div class="card"><p class="small">Каждая тема содержит краткое правило и упражнения на примерах.</p></div>`+
 `<div class="section"><h3>Темы</h3><span>${list.length}</span></div>`+
 list.map(l=>`<div class="lesson" data-id="${l.id}"><div class="icon">📘</div><div><h4>${l.title}</h4><p>${l.description}</p></div><strong>›</strong></div>`).join("");
 document.querySelectorAll(".lesson").forEach(e=>e.onclick=()=>start(e.dataset.id));
}
function renderReview(){
 const unique=[...new Set(state.mistakes)].slice(-100);
 const reviewItems=unique.map(s=>items.find(x=>x.sr===s)).filter(Boolean);
 app.innerHTML=header("Повторение",`${reviewItems.length} слов и фраз требуют внимания`)+
 `<div class="word-grid">${reviewItems.length?reviewItems.map(x=>`<div class="word-row"><b>${x.sr}</b><span>${x.ru}</span></div>`).join(""):`<div class="card" style="text-align:center"><div style="font-size:52px">🧠</div><h3>Ошибок пока нет</h3><p class="small">После уроков здесь появится персональное повторение.</p></div>`}</div>`;
}
function renderDictionary(){
 app.innerHTML=header("Словарь",`${C.meta.itemsCount} слов, фраз и словосочетаний`)+
 `<input class="search" id="search" placeholder="Поиск по-сербски или по-русски">`+
 `<div class="tabs">${["Все","word","phrase","collocation","colloquial","grammar_example"].map((c,i)=>`<button class="chip ${i===0?"active":""}" data-kind="${c}">${c==="Все"?"Все":c}</button>`).join("")}</div>`+
 `<div id="dict"></div>`;
 let kind="Все";
 const draw=()=>{
   const q=$("#search").value.trim().toLowerCase();
   let list=items.filter(x=>(kind==="Все"||x.kind===kind)&&(!q||x.sr.toLowerCase().includes(q)||x.ru.toLowerCase().includes(q)));
   $("#dict").innerHTML=`<div class="section"><h3>Результаты</h3><span>${list.length}</span></div><div class="word-grid">${list.slice(0,shown).map(x=>`<div class="word-row"><div><b>${x.sr}</b><div class="small">${x.theme}</div></div><span>${x.ru}</span></div>`).join("")}</div>${list.length>shown?'<button class="btn purple loadmore" id="moreDict">Показать ещё</button>':""}`;
   if($("#moreDict"))$("#moreDict").onclick=()=>{shown+=100;draw()};
 };
 $("#search").oninput=()=>{shown=60;draw()};
 document.querySelectorAll(".chip").forEach(b=>b.onclick=()=>{kind=b.dataset.kind;shown=60;document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));b.classList.add("active");draw()});
 draw();
}
function renderProfile(){
 app.innerHTML=header("Мой прогресс","Персональная статистика")+
 `<div class="card"><div class="profile-item"><span>💎 XP</span><strong>${state.xp}</strong></div>
 <div class="profile-item"><span>✅ Уроков завершено</span><strong>${state.completed.length} / ${lessons.length}</strong></div>
 <div class="profile-item"><span>📚 Слов и фраз</span><strong>${C.meta.itemsCount}</strong></div>
 <div class="profile-item"><span>📘 Грамматических тем</span><strong>${C.meta.grammarLessons}</strong></div>
 <div class="profile-item"><span>💬 Разговорных модулей</span><strong>${C.meta.colloquialLessons}</strong></div>
 <div class="profile-item"><span>🧠 Ошибок</span><strong>${state.mistakes.length}</strong></div></div>`;
}
function render(){if(route==="home")renderHome();else if(route==="grammar")renderGrammar();else if(route==="review")renderReview();else if(route==="dictionary")renderDictionary();else if(route==="lesson")renderLesson();else renderProfile()}
render();nav();
if("serviceWorker"in navigator)addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js"));
