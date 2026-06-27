const seedTasks = [
  ["Nettoyer les PVC de la façade","Façade","Commun","todo","",false,"normal"],
  ["Nettoyer les vitres","Façade","Commun","todo","",false,"normal"],
  ["Balayer et enlever les plantes","Façade","Commun","todo","",false,"normal"],
  ["Vérifier les rebords de fenêtre","Façade","Commun","todo","",false,"normal"],
  ["Trier les chaussures","Couloir","Commun","done","",true,"normal"],
  ["Dépoussiérer le couloir","Couloir","Commun","todo","",false,"normal"],
  ["Nettoyer les PVC et le sol","Chambre du bas","Marion","done","",true,"normal"],
  ["Mettre le clic-clac","Chambre du bas","Commun","todo","",false,"normal"],
  ["Installer la poignée de porte","Chambre","Philippe","todo","",false,"normal"],
  ["Trier la chambre","Chambre","Commun","doing","",false,"normal"],
  ["Trier la cave","Cave","Commun","todo","",false,"normal"],
  ["Balayer et dépoussiérer","Cave","Commun","todo","",false,"normal"],
  ["Trier les meubles de la maison","Tri & dons","Commun","todo","",false,"normal"],
  ["Détartrer la douche","Salle de bain","Commun","todo","",false,"normal"],
  ["Trier les affaires de Philippe","Salle de bain","Philippe","todo","",false,"normal"],
  ["Trier les affaires de Marion","Salle de bain","Marion","todo","",false,"normal"],
  ["Préparer les dons associatifs","Salle de bain","Commun","todo","",false,"normal"],
  ["Ranger le meuble gris","Salon","Commun","todo","",false,"normal"],
  ["Nettoyer les traces de scotch sur les PVC","Salon","Commun","todo","",false,"normal"],
  ["Trier les livres","Salon","Commun","todo","",false,"normal"],
  ["Trier la cuisine et le placard blanc","Salon","Commun","todo","",false,"normal"],
  ["Trier les affaires dans la véranda","Véranda","Commun","doing","",false,"normal"],
  ["Laver le sol et les boiseries","Véranda","Commun","todo","",false,"normal"],
  ["Faire un passage à la déchetterie","Véranda","Philippe","todo","",false,"high"],
  ["Passer le Kärcher sur la terrasse","Extérieur","Philippe","todo","",false,"normal"],
  ["Changer la table basse","Extérieur","Commun","todo","",false,"normal"],
  ["Trier le cabanon : prêts et dons","Cabanon","Commun","todo","",false,"normal"],
  ["Prendre rendez-vous pour l’estimation","Vente de la maison","Philippe","doing","2026-07-03",false,"high"],
  ["Mettre la maison en vente","Vente de la maison","Philippe","doing","2026-07-10",false,"high"],
  ["Compléter le dossier du notaire","Vente de la maison","Philippe","doing","2026-07-15",false,"high"],
  ["Programmer les diagnostics","Vente de la maison","Philippe","doing","2026-07-08",false,"high"],
  ["Envoyer un mail aux agences de Chambéry","Nouveau logement","Marion","doing","",false,"high"],
  ["Préparer le dossier de location","Nouveau logement","Commun","doing","",false,"high"],
  ["Programmer les visites en août","Nouveau logement","Marion","todo","2026-08-01",false,"normal"],
  ["Faire l’inventaire des cartons","Déménagement","Commun","todo","",false,"normal"],
  ["Demander trois devis de déménagement","Déménagement","Marion","todo","",false,"high"],
  ["Signaler le changement d’adresse","Administratif","Commun","todo","",false,"normal"]
].map((t,i)=>({id:i+1,title:t[0],category:t[1],assignee:t[2],status:t[3],deadline:t[4],done:t[5],priority:t[6]}));

const seedExpenses = [
  {id:1,label:"Location du camion",category:"Transport",planned:850,spent:0},
  {id:2,label:"Cartons et protections",category:"Cartons",planned:180,spent:65},
  {id:3,label:"Diagnostics immobiliers",category:"Administratif",planned:520,spent:0},
  {id:4,label:"Petits travaux avant vente",category:"Travaux",planned:900,spent:240},
  {id:5,label:"Achats pour le nouveau logement",category:"Achats",planned:1500,spent:0}
];

let tasks = JSON.parse(localStorage.getItem("capMontagneTasks")) || seedTasks;
let expenses = JSON.parse(localStorage.getItem("capMontagneExpenses")) || seedExpenses;
let currentStatus = "all";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const save = () => {
  localStorage.setItem("capMontagneTasks", JSON.stringify(tasks));
  localStorage.setItem("capMontagneExpenses", JSON.stringify(expenses));
};
const formatMoney = n => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
const formatDate = d => d ? new Intl.DateTimeFormat("fr-FR",{day:"numeric",month:"short"}).format(new Date(`${d}T12:00:00`)) : "Sans date";
const esc = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

function taskRow(t, full=false) {
  return `<div class="task-row ${t.done?"completed":""}" data-id="${t.id}">
    <button class="check ${t.done?"done":""}" aria-label="${t.done?"Rouvrir":"Terminer"} la tâche">${t.done?"✓":""}</button>
    <div><span class="task-name">${esc(t.title)}</span><span class="task-meta">${esc(t.category)} · ${formatDate(t.deadline)}</span></div>
    <span class="person-pill ${t.assignee}">${esc(t.assignee)}</span>
    ${full?`<b class="status ${t.done?"done":t.status}">${t.done?"Terminée":t.status==="doing"?"En cours":"À faire"}</b>`:""}
  </div>`;
}

function renderDashboard() {
  const done = tasks.filter(t=>t.done).length;
  const left = tasks.length-done;
  const percent = Math.round(done/tasks.length*100) || 0;
  $("#progressPercent").textContent=`${percent}%`;
  $("#progressCaption").textContent=`${done} tâche${done>1?"s":""} terminée${done>1?"s":""}`;
  $("#progressBar").style.width=`${percent}%`;
  $("#todoCount").textContent=left;
  $("#navTaskCount").textContent=left;
  $("#marionCount").textContent=`${tasks.filter(t=>!t.done&&(t.assignee==="Marion"||t.assignee==="Commun")).length} pour Marion`;
  $("#philippeCount").textContent=`${tasks.filter(t=>!t.done&&(t.assignee==="Philippe"||t.assignee==="Commun")).length} pour Philippe`;
  const priorities=tasks.filter(t=>!t.done&&t.priority==="high").slice(0,5);
  $("#priorityList").innerHTML=priorities.map(t=>taskRow(t)).join("") || `<p class="empty-state">Tout est sous contrôle 🌿</p>`;
  const steps=[
    ["1","Préparer la maison","Tri et nettoyage"],
    ["2","Vendre la maison","Agence, diagnostics, notaire"],
    ["3","Trouver notre nouveau nid","Dossier et visites"],
    ["4","Organiser le départ","Cartons et transport"],
    ["5","S’installer","Nouvelles habitudes"]
  ];
  $("#stepsList").innerHTML=steps.map((s,i)=>`<div class="step ${i>1?"future":""}"><span class="step-number">${s[0]}</span><div><strong>${s[1]}</strong><span>${s[2]}</span></div><b>${i===0?"En cours":i===1?"À suivre":"À venir"}</b></div>`).join("");
  const roomNames=["Façade","Salon","Chambre","Véranda","Cave"];
  $("#roomCards").innerHTML=roomNames.map(name=>{
    const list=tasks.filter(t=>t.category.includes(name));
    const p=list.length?Math.round(list.filter(t=>t.done).length/list.length*100):0;
    return `<div class="room-card"><div><strong>${name}</strong><span>${p}%</span></div><div class="progress"><span style="width:${p}%"></span></div></div>`;
  }).join("");
}

function renderTasks() {
  const person=$("#personFilter").value;
  const query=$("#globalSearch").value.toLowerCase().trim();
  const filtered=tasks.filter(t=>(currentStatus==="all"||(currentStatus==="done"?t.done:!t.done&&t.status===currentStatus))&&(person==="all"||t.assignee===person)&&(t.title.toLowerCase().includes(query)||t.category.toLowerCase().includes(query)));
  const grouped=Object.groupBy ? Object.groupBy(filtered,t=>t.category) : filtered.reduce((a,t)=>((a[t.category]??=[]).push(t),a),{});
  $("#taskGroups").innerHTML=Object.keys(grouped).length?Object.entries(grouped).sort().map(([category,list])=>`<section class="panel task-group"><h3>${esc(category)} · ${list.length}</h3>${list.map(t=>taskRow(t,true)).join("")}</section>`).join(""):`<div class="empty-state">Aucune tâche ne correspond à ces filtres.</div>`;
}

function renderSale() {
  const sale=tasks.filter(t=>t.category==="Vente de la maison");
  $("#saleTimeline").innerHTML=sale.map((t,i)=>`<div class="timeline-item"><span class="timeline-dot">${t.done?"✓":i+1}</span><div><strong>${esc(t.title)}</strong><span>${t.assignee} · ${formatDate(t.deadline)}</span></div><b class="status ${t.done?"done":t.status}">${t.done?"Terminé":t.status==="doing"?"En cours":"À faire"}</b></div>`).join("");
}

function renderBudget() {
  const planned=expenses.reduce((s,e)=>s+Number(e.planned),0), spent=expenses.reduce((s,e)=>s+Number(e.spent),0);
  $("#budgetTotal").textContent=formatMoney(planned);
  $("#budgetSpent").textContent=`${formatMoney(spent)} dépensés`;
  $("#budgetBar").style.width=`${Math.min(100,planned?spent/planned*100:0)}%`;
  $("#budgetPageTotal").textContent=formatMoney(planned);
  $("#budgetPageSpent").textContent=formatMoney(spent);
  $("#budgetRemaining").textContent=formatMoney(planned-spent);
  $("#expenseList").innerHTML=expenses.map(e=>`<div class="expense-row" data-expense="${e.id}"><div><strong>${esc(e.label)}</strong><small>${esc(e.category)}</small></div><b>${formatMoney(e.planned)} prévus</b><b class="spent-col">${formatMoney(e.spent)} dépensés</b><button class="delete-button" aria-label="Supprimer">×</button></div>`).join("") || `<div class="empty-state">Aucune dépense enregistrée.</div>`;
}

function renderAll(){renderDashboard();renderTasks();renderSale();renderBudget();}
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2300);}
function goTo(view){
  $$(".view").forEach(v=>v.classList.remove("active"));$(`#${view}View`).classList.add("active");
  $$(".nav-item[data-view]").forEach(n=>n.classList.toggle("active",n.dataset.view===view));
  $("#sidebar").classList.remove("open");window.scrollTo({top:0,behavior:"smooth"});
}
function openTask(){ $("#taskDialog").showModal(); setTimeout(()=>$("#taskForm input").focus(),50); }

$$(".nav-item[data-view]").forEach(b=>b.addEventListener("click",()=>goTo(b.dataset.view)));
$$("[data-go]").forEach(b=>b.addEventListener("click",()=>goTo(b.dataset.go)));
$("#addTaskButton").addEventListener("click",openTask);
$$(".add-task-secondary").forEach(b=>b.addEventListener("click",openTask));
$$(".close-dialog").forEach(b=>b.addEventListener("click",()=>$("#taskDialog").close()));
$$(".close-expense").forEach(b=>b.addEventListener("click",()=>$("#expenseDialog").close()));
$("#addExpenseButton").addEventListener("click",()=>$("#expenseDialog").showModal());
$("#menuButton").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#settingsButton").addEventListener("click",()=>toast("Les paramètres arriveront dans la prochaine version."));
$("#taskForm").addEventListener("submit",e=>{
  e.preventDefault(); const data=new FormData(e.currentTarget);
  tasks.unshift({id:Date.now(),title:data.get("title"),category:data.get("category"),assignee:data.get("assignee"),deadline:data.get("deadline"),priority:data.get("priority"),status:"todo",done:false});
  save();renderAll();e.currentTarget.reset();$("#taskDialog").close();toast("Tâche ajoutée !");
});
$("#expenseForm").addEventListener("submit",e=>{
  e.preventDefault();const data=new FormData(e.currentTarget);
  expenses.push({id:Date.now(),label:data.get("label"),category:data.get("category"),planned:Number(data.get("planned")),spent:Number(data.get("spent"))});
  save();renderAll();e.currentTarget.reset();$("#expenseDialog").close();toast("Dépense ajoutée !");
});
document.addEventListener("click",e=>{
  const check=e.target.closest(".check");
  if(check){const id=Number(check.closest("[data-id]").dataset.id),task=tasks.find(t=>t.id===id);task.done=!task.done;task.status=task.done?"done":"todo";save();renderAll();toast(task.done?"Bravo, une étape de plus !":"Tâche rouverte.");}
  const del=e.target.closest(".delete-button");
  if(del){const id=Number(del.closest("[data-expense]").dataset.expense);expenses=expenses.filter(x=>x.id!==id);save();renderAll();toast("Dépense supprimée.");}
});
$$(".filter").forEach(b=>b.addEventListener("click",()=>{currentStatus=b.dataset.status;$$(".filter").forEach(x=>x.classList.toggle("active",x===b));renderTasks();}));
$("#personFilter").addEventListener("change",renderTasks);
$("#globalSearch").addEventListener("input",()=>{renderTasks();if($("#globalSearch").value)goTo("tasks");});

const now=new Date();
$("#todayLabel").textContent=new Intl.DateTimeFormat("fr-FR",{weekday:"long",day:"numeric",month:"long"}).format(now);
renderAll();
