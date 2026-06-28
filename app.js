import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection, onSnapshot,
  addDoc, deleteDoc, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";
import { firebaseConfig } from "./firebase-config.js?v=2";

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

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

let tasks = seedTasks;
let expenses = seedExpenses;
let contacts = [];
let saleDocuments = [];
let movingBoxes = [];
let currentStatus = "all";
let currentBudgetType = "all";
let currentBoxStatus = "all";
let activeHouseholdId = null;
let activeUser = null;
let authMode = "login";
let profileCreationInProgress = false;
let unsubscribeTasks = null;
let unsubscribeExpenses = null;
let unsubscribeContacts = null;
let unsubscribeDocuments = null;
let unsubscribeBoxes = null;
let deferredInstallPrompt = null;

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const setSyncing = value => document.body.classList.toggle("syncing", value);
const formatMoney = n => new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
const formatDate = d => d ? new Intl.DateTimeFormat("fr-FR",{day:"numeric",month:"short"}).format(new Date(`${d}T12:00:00`)) : "Sans date";
const esc = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const safeUrl = value => /^https?:\/\//i.test(value||"") ? esc(value) : "";
const isOverdue = task => !task.done && task.deadline && new Date(`${task.deadline}T23:59:59`) < new Date();

function taskRow(t, full=false) {
  const overdue=isOverdue(t);
  return `<div class="task-row ${full?"full":""} ${t.done?"completed":""} ${overdue?"overdue":""}" data-id="${t.id}">
    <button class="check ${t.done?"done":""}" aria-label="${t.done?"Rouvrir":"Terminer"} la tâche">${t.done?"✓":""}</button>
    <div><span class="task-name">${esc(t.title)}${t.notes?'<span class="note-indicator" title="Cette tâche contient des notes">●</span>':""}</span><span class="task-meta">${esc(t.category)} · ${overdue?"En retard · ":""}${formatDate(t.deadline)}</span></div>
    <span class="person-pill ${t.assignee}">${esc(t.assignee)}</span>
    ${full?`<b class="status ${t.done?"done":t.status}">${t.done?"Terminée":t.status==="doing"?"En cours":"À faire"}</b>`:""}
    <button class="edit-task" aria-label="Modifier ${esc(t.title)}"><span>✎</span> Modifier</button>
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
  const priorities=tasks.filter(t=>!t.done&&(t.priority==="high"||isOverdue(t))).sort((a,b)=>(a.deadline||"9999").localeCompare(b.deadline||"9999")).slice(0,5);
  $("#priorityList").innerHTML=priorities.map(t=>taskRow(t)).join("") || `<p class="empty-state">Tout est sous contrôle 🌿</p>`;
  const upcoming=tasks.filter(t=>!t.done&&t.deadline).sort((a,b)=>a.deadline.localeCompare(b.deadline))[0];
  if(upcoming){
    const date=new Date(`${upcoming.deadline}T12:00:00`);
    $("#nextDeadlineDay").textContent=date.getDate();
    $("#nextDeadlineMonth").textContent=new Intl.DateTimeFormat("fr-FR",{month:"long"}).format(date).toUpperCase();
    $("#nextDeadlineTitle").textContent=upcoming.title;
  } else {
    $("#nextDeadlineDay").textContent="—";$("#nextDeadlineMonth").textContent="À VENIR";$("#nextDeadlineTitle").textContent="Aucune échéance";
  }
  const steps=[
    ["1","Préparer la maison","Tri et nettoyage"],
    ["2","Vendre la maison","Agence, diagnostics, notaire"],
    ["3","Trouver notre nouveau nid","Dossier et visites"],
    ["4","Organiser le départ","Cartons et transport"],
    ["5","S’installer","Nouvelles habitudes"]
  ];
  const stepCategories=[["Tri","Façade","Salon","Chambre","Cave"],["Vente de la maison"],["Nouveau logement"],["Déménagement","Administratif"],[]];
  $("#stepsList").innerHTML=steps.map((s,i)=>{
    const list=i===4?movingBoxes.filter(box=>box.status==="unpacked"):tasks.filter(task=>stepCategories[i].some(category=>task.category.includes(category)));
    const complete=list.length&&list.every(item=>item.done||item.status==="unpacked");
    const started=list.some(item=>item.done||item.status==="doing"||item.status==="ready"||item.status==="moved");
    return `<div class="step ${!started&&!complete?"future":""}"><span class="step-number">${complete?"✓":s[0]}</span><div><strong>${s[1]}</strong><span>${s[2]}</span></div><b>${complete?"Terminé":started?"En cours":"À venir"}</b></div>`;
  }).join("");
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
  const filtered=tasks.filter(t=>(currentStatus==="all"||(currentStatus==="done"?t.done:currentStatus==="overdue"?isOverdue(t):!t.done&&t.status===currentStatus))&&(person==="all"||t.assignee===person)&&(t.title.toLowerCase().includes(query)||t.category.toLowerCase().includes(query)||(t.notes||"").toLowerCase().includes(query)))
    .sort((a,b)=>a.done-b.done||(a.deadline||"9999").localeCompare(b.deadline||"9999")||a.title.localeCompare(b.title));
  const grouped=Object.groupBy ? Object.groupBy(filtered,t=>t.category) : filtered.reduce((a,t)=>((a[t.category]??=[]).push(t),a),{});
  $("#taskGroups").innerHTML=Object.keys(grouped).length?Object.entries(grouped).sort().map(([category,list])=>`<section class="panel task-group"><h3>${esc(category)} · ${list.length}</h3>${list.map(t=>taskRow(t,true)).join("")}</section>`).join(""):`<div class="empty-state">Aucune tâche ne correspond à ces filtres.</div>`;
}

function renderSale() {
  const sale=tasks.filter(t=>t.category==="Vente de la maison").sort((a,b)=>(a.deadline||"9999").localeCompare(b.deadline||"9999"));
  $("#saleTimeline").innerHTML=sale.map((t,i)=>`<div class="timeline-item"><span class="timeline-dot">${t.done?"✓":i+1}</span><div><strong>${esc(t.title)}</strong><span>${t.assignee} · ${formatDate(t.deadline)}</span></div><b class="status ${t.done?"done":t.status}">${t.done?"Terminé":t.status==="doing"?"En cours":"À faire"}</b><button class="edit-task edit-sale-task" data-task-id="${t.id}"><span>✎</span> Modifier</button></div>`).join("")||`<div class="empty-contact">Ajoutez une tâche dans la catégorie « Vente de la maison ».</div>`;
  $("#contactList").innerHTML=contacts.length?contacts.sort((a,b)=>a.type.localeCompare(b.type)).map(contact=>`<article class="contact-card" data-contact-id="${contact.id}"><span class="contact-icon">${contact.type==="Notaire"?"§":contact.type==="Agence immobilière"?"⌂":"●"}</span><div><strong>${esc(contact.name)}</strong><small>${esc(contact.type)}${contact.contactName?` · ${esc(contact.contactName)}`:""}</small><div class="contact-links">${contact.phone?`<a href="tel:${esc(contact.phone)}">${esc(contact.phone)}</a>`:""}${contact.email?`<a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a>`:""}</div></div><button class="edit-task edit-contact"><span>✎</span> Modifier</button></article>`).join(""):`<div class="empty-contact">Aucun interlocuteur enregistré.<br>Ajoutez l’agence, le notaire ou le diagnostiqueur.</div>`;
  $("#documentList").innerHTML=saleDocuments.length?saleDocuments.sort((a,b)=>(a.deadline||"9999").localeCompare(b.deadline||"9999")).map(item=>`<div class="document-row" data-document-id="${item.id}"><span>▤</span><div><strong>${esc(item.name)}</strong><small>${item.notes?esc(item.notes):formatDate(item.deadline)}</small></div><span>${safeUrl(item.url)?`<a href="${safeUrl(item.url)}" target="_blank" rel="noopener">Ouvrir ↗</a>`:""}</span><b class="status ${item.status}">${item.status==="done"?"Prêt":item.status==="doing"?"En cours":"À obtenir"}</b><button class="edit-task edit-document"><span>✎</span> Modifier</button></div>`).join(""):`<div class="empty-contact">Aucun document suivi pour le moment.</div>`;
}

function renderBudget() {
  const planned=expenses.reduce((s,e)=>s+Number(e.planned),0), spent=expenses.reduce((s,e)=>s+Number(e.spent),0);
  const overrun=expenses.reduce((s,e)=>s+Math.max(0,Number(e.spent)-Number(e.planned)),0);
  $("#budgetTotal").textContent=formatMoney(planned);
  $("#budgetSpent").textContent=`${formatMoney(spent)} dépensés`;
  $("#budgetBar").style.width=`${Math.min(100,planned?spent/planned*100:0)}%`;
  $("#budgetPageTotal").textContent=formatMoney(planned);
  $("#budgetPageSpent").textContent=formatMoney(spent);
  $("#budgetRemaining").textContent=formatMoney(planned-spent);
  $("#budgetOverrun").textContent=formatMoney(overrun);
  const filtered=expenses.filter(item=>currentBudgetType==="all"||(item.type||"expense")===currentBudgetType);
  $("#expenseList").innerHTML=filtered.map(e=>{
    const delta=Number(e.planned)-Number(e.spent),over=delta<0,status=e.status||"planned";
    return `<div class="expense-row ${over?"over-budget":""}" data-expense="${e.id}"><div><strong>${esc(e.label)}</strong><small>${esc(e.category)} · ${esc(e.assignee||"Commun")} · ${status==="paid"?"Payé":status==="ordered"?"Commandé":"À prévoir"}</small></div><span class="budget-kind ${(e.type||"expense")==="purchase"?"purchase":""}">${(e.type||"expense")==="purchase"?"Achat":"Dépense"}</span><b>${formatMoney(e.planned)} prévus</b><b class="spent-col">${formatMoney(e.spent)} dépensés</b><span class="expense-delta ${over?"negative":""}">${over?"Dépassement ":"Reste "}${formatMoney(Math.abs(delta))}</span><button class="edit-task edit-expense"><span>✎</span> Modifier</button></div>`;
  }).join("") || `<div class="empty-state">Aucun élément dans cette vue.</div>`;
  const byCategory=expenses.reduce((acc,item)=>{const key=item.category||"Autre";acc[key]??={planned:0,spent:0};acc[key].planned+=Number(item.planned);acc[key].spent+=Number(item.spent);return acc;},{});
  const maxCategory=Math.max(1,...Object.values(byCategory).map(value=>value.planned));
  $("#categoryBreakdown").innerHTML=Object.entries(byCategory).sort((a,b)=>b[1].planned-a[1].planned).map(([category,value])=>`<div class="category-item"><header><strong>${esc(category)}</strong><span>${formatMoney(value.planned)}</span></header><div class="progress"><span style="width:${Math.round(value.planned/maxCategory*100)}%"></span></div><small>${formatMoney(value.spent)} dépensés</small></div>`).join("")||`<div class="empty-state">Le graphique apparaîtra avec les premières dépenses.</div>`;
}

function renderMove(){
  $("#boxTotal").textContent=movingBoxes.length;
  $("#boxReady").textContent=movingBoxes.filter(box=>box.status==="ready").length;
  $("#boxMoved").textContent=movingBoxes.filter(box=>box.status==="moved").length;
  $("#boxUnpacked").textContent=movingBoxes.filter(box=>box.status==="unpacked").length;
  const filtered=movingBoxes.filter(box=>currentBoxStatus==="all"||box.status===currentBoxStatus).sort((a,b)=>String(a.number).localeCompare(String(b.number),undefined,{numeric:true}));
  $("#boxList").innerHTML=filtered.map(box=>`<article class="box-card" data-box-id="${box.id}"><span class="box-number">${esc(box.number)}</span><div><strong>${esc(box.room)}${box.fragile?" · Fragile":""}</strong><small>${esc(box.contents)} · ${box.status==="unpacked"?"Déballé":box.status==="moved"?"Transporté":box.status==="ready"?"Prêt":"À préparer"}</small></div><span class="person-pill ${box.assignee||"Commun"}">${esc(box.assignee||"Commun")}</span><button class="edit-task edit-box"><span>✎</span> Modifier</button></article>`).join("")||`<div class="empty-state">Aucun carton dans cette vue.</div>`;
  const transport=expenses.filter(item=>item.category==="Transport");
  $("#transportSummary").innerHTML=`<div class="summary-line"><span>Budget prévu</span><strong>${formatMoney(transport.reduce((sum,item)=>sum+Number(item.planned),0))}</strong></div><div class="summary-line"><span>Déjà dépensé</span><strong>${formatMoney(transport.reduce((sum,item)=>sum+Number(item.spent),0))}</strong></div><div class="summary-line"><span>Éléments suivis</span><strong>${transport.length}</strong></div>`;
  const address=tasks.filter(task=>task.category==="Administratif").slice(0,6);
  $("#addressTasks").innerHTML=address.map(task=>`<div class="compact-task ${task.done?"done":""}"><button class="check ${task.done?"done":""}" data-compact-task="${task.id}">${task.done?"✓":""}</button><span>${esc(task.title)}</span></div>`).join("")||`<div class="empty-contact">Aucune démarche enregistrée.</div>`;
}

function renderAll(){renderDashboard();renderTasks();renderSale();renderBudget();renderMove();}
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2300);}
async function sendDeadlineReminder(){
  if(!("Notification" in window)||Notification.permission!=="granted"||!("serviceWorker" in navigator))return;
  const today=new Date().toISOString().slice(0,10);
  if(localStorage.getItem("capMontagneReminderDate")===today)return;
  const limit=new Date();limit.setDate(limit.getDate()+3);
  const urgent=tasks.filter(task=>!task.done&&task.deadline&&new Date(`${task.deadline}T23:59:59`)<=limit).sort((a,b)=>a.deadline.localeCompare(b.deadline));
  if(!urgent.length)return;
  const registration=await navigator.serviceWorker.ready;
  registration.active?.postMessage({type:"SHOW_REMINDER",title:`${urgent.length} échéance${urgent.length>1?"s":""} à surveiller`,body:`${urgent[0].title} · ${formatDate(urgent[0].deadline)}`});
  localStorage.setItem("capMontagneReminderDate",today);
}
function goTo(view){
  $$(".view").forEach(v=>v.classList.remove("active"));$(`#${view}View`).classList.add("active");
  $$(".nav-item[data-view]").forEach(n=>n.classList.toggle("active",n.dataset.view===view));
  $("#sidebar").classList.remove("open");window.scrollTo({top:0,behavior:"smooth"});
}
function openTask(task=null){
  const form=$("#taskForm"),editing=Boolean(task);
  form.reset();form.dataset.editing=editing?String(task.id):"";
  $("#taskDialogTitle").textContent=editing?"Modifier la tâche":"Ajouter une tâche";
  $("#taskDialogEyebrow").textContent=editing?"DÉTAILS DE LA TÂCHE":"NOUVELLE ÉTAPE";
  $("#saveTaskButton").textContent=editing?"Enregistrer":"Ajouter la tâche";
  $("#deleteTaskButton").hidden=!editing;$("#taskStatusField").hidden=!editing;
  if(editing){
    form.elements.title.value=task.title||"";
    form.elements.category.value=task.category||"Déménagement";
    if(!form.elements.category.value) form.elements.category.add(new Option(task.category,task.category,true,true));
    form.elements.assignee.value=task.assignee||"Commun";
    form.elements.deadline.value=task.deadline||"";
    form.elements.priority.value=task.priority||"normal";
    form.elements.status.value=task.done?"done":task.status||"todo";
    form.elements.notes.value=task.notes||"";
  }
  $("#taskDialog").showModal();setTimeout(()=>form.elements.title.focus(),50);
}

function openContact(contact=null){
  const form=$("#contactForm"),editing=Boolean(contact);form.reset();form.dataset.editing=editing?contact.id:"";
  $("#contactDialogTitle").textContent=editing?"Modifier le contact":"Ajouter un contact";
  $("#deleteContactButton").hidden=!editing;
  if(editing) ["type","name","contactName","phone","email","notes"].forEach(key=>form.elements[key].value=contact[key]||"");
  $("#contactDialog").showModal();
}

function openDocument(item=null){
  const form=$("#documentForm"),editing=Boolean(item);form.reset();form.dataset.editing=editing?item.id:"";
  $("#documentDialogTitle").textContent=editing?"Modifier le document":"Ajouter un document";
  $("#deleteDocumentButton").hidden=!editing;
  if(editing) ["name","status","deadline","url","notes"].forEach(key=>form.elements[key].value=item[key]||"");
  $("#documentDialog").showModal();
}

function openExpense(item=null){
  const form=$("#expenseForm"),editing=Boolean(item);form.reset();form.dataset.editing=editing?item.id:"";
  $("#expenseDialogTitle").textContent=editing?"Modifier l’élément":"Ajouter une dépense";
  $("#saveExpenseButton").textContent=editing?"Enregistrer":"Ajouter";
  $("#deleteExpenseButton").hidden=!editing;
  if(editing){
    ["label","planned","spent","category","type","status","assignee","notes"].forEach(key=>form.elements[key].value=item[key]??({type:"expense",status:"planned",assignee:"Commun",notes:""}[key]||""));
    if(!form.elements.category.value)form.elements.category.add(new Option(item.category,item.category,true,true));
  }
  $("#expenseDialog").showModal();
}

function openBox(box=null){
  const form=$("#boxForm"),editing=Boolean(box);form.reset();form.dataset.editing=editing?box.id:"";
  $("#boxDialogTitle").textContent=editing?"Modifier le carton":"Ajouter un carton";
  $("#deleteBoxButton").hidden=!editing;
  if(editing)["number","room","contents","status","assignee"].forEach(key=>form.elements[key].value=box[key]||"");
  if(editing)form.elements.fragile.value=String(Boolean(box.fragile));
  $("#boxDialog").showModal();
}

function firebaseMessage(error) {
  const messages = {
    "auth/email-already-in-use": "Cette adresse possède déjà un compte.",
    "auth/invalid-credential": "Adresse e-mail ou mot de passe incorrect.",
    "auth/invalid-email": "Cette adresse e-mail n’est pas valide.",
    "auth/weak-password": "Choisissez un mot de passe d’au moins 6 caractères.",
    "auth/too-many-requests": "Trop de tentatives. Réessayez dans quelques minutes.",
    "permission-denied": "Accès refusé. Vérifiez les règles Firestore."
  };
  return messages[error.code] || error.message || "Une erreur inattendue est survenue.";
}

async function joinHousehold(user, displayName, rawCode) {
  const code=rawCode.trim().toUpperCase();
  const householdRef=doc(db,"households",code);
  const household=await getDoc(householdRef);
  if(!household.exists()) throw new Error("Ce code de foyer n’existe pas.");
  await updateDoc(householdRef,{
    [`members.${user.uid}`]:true,
    [`memberNames.${user.uid}`]:displayName,
    updatedAt:serverTimestamp()
  });
  await setDoc(doc(db,"users",user.uid),{
    displayName,email:user.email,householdId:code,createdAt:serverTimestamp()
  });
  return code;
}

async function attachAuthorizedUser(user) {
  const households=await getDocs(collection(db,"households"));
  if(households.size!==1) throw new Error("Le foyer partagé n’est pas configuré.");
  const emailName=(user.email||"").split("@")[0].toLowerCase();
  const displayName=user.displayName
    || (emailName.includes("marion")?"Marion":emailName.includes("fife")?"Philippe":emailName);
  await updateProfile(user,{displayName});
  await joinHousehold(user,displayName,households.docs[0].id);
}

function stopSubscriptions() {
  if(unsubscribeTasks) unsubscribeTasks();
  if(unsubscribeExpenses) unsubscribeExpenses();
  if(unsubscribeContacts) unsubscribeContacts();
  if(unsubscribeDocuments) unsubscribeDocuments();
  if(unsubscribeBoxes) unsubscribeBoxes();
  unsubscribeTasks=null; unsubscribeExpenses=null;unsubscribeContacts=null;unsubscribeDocuments=null;unsubscribeBoxes=null;
}

function subscribeToHousehold(householdId) {
  stopSubscriptions();
  const householdRef=doc(db,"households",householdId);
  unsubscribeTasks=onSnapshot(collection(householdRef,"tasks"),snapshot=>{
    tasks=snapshot.docs.map(item=>({id:item.id,...item.data()}));
    renderAll();sendDeadlineReminder();setSyncing(false);
  },error=>{setSyncing(false);toast(firebaseMessage(error));});
  unsubscribeExpenses=onSnapshot(collection(householdRef,"expenses"),snapshot=>{
    expenses=snapshot.docs.map(item=>({id:item.id,...item.data()}));
    renderAll(); setSyncing(false);
  },error=>{setSyncing(false);toast(firebaseMessage(error));});
  unsubscribeContacts=onSnapshot(collection(householdRef,"contacts"),snapshot=>{
    contacts=snapshot.docs.map(item=>({id:item.id,...item.data()}));
    renderSale();setSyncing(false);
  },error=>toast(firebaseMessage(error)));
  unsubscribeDocuments=onSnapshot(collection(householdRef,"documents"),snapshot=>{
    saleDocuments=snapshot.docs.map(item=>({id:item.id,...item.data()}));
    renderSale();setSyncing(false);
  },error=>toast(firebaseMessage(error)));
  unsubscribeBoxes=onSnapshot(collection(householdRef,"movingBoxes"),snapshot=>{
    movingBoxes=snapshot.docs.map(item=>({id:item.id,...item.data()}));
    renderMove();renderDashboard();setSyncing(false);
  },error=>toast(firebaseMessage(error)));
}

async function openSession(user) {
  const profileSnap=await getDoc(doc(db,"users",user.uid));
  if(!profileSnap.exists()) return;
  const profile=profileSnap.data();
  activeUser=user;
  activeHouseholdId=profile.householdId;
  $("#currentUserLabel").textContent=profile.displayName || user.email;
  $("#accountEmail").textContent=user.email;
  $("#householdCode").textContent=activeHouseholdId;
  const householdSnap=await getDoc(doc(db,"households",activeHouseholdId));
  if(householdSnap.exists()) $("#householdLabel").textContent=householdSnap.data().name || "Notre foyer";
  $("#authGate").classList.add("hidden");
  setSyncing(true);
  subscribeToHousehold(activeHouseholdId);
}

function showAuth() {
  stopSubscriptions();
  activeUser=null; activeHouseholdId=null;
  $("#authGate").classList.remove("hidden");
}

function showLogin() {
  authMode="login";
  $("#loginFields").hidden=false;
  $("#authForm [name='email']").required=true;$("#authForm [name='password']").required=true;
  $("#authTitle").textContent="Se connecter";
  $("#authIntro").textContent="Utilisez le compte créé dans Firebase pour accéder à votre foyer.";
  $(".auth-submit").textContent="Se connecter";
  $("#authError").textContent="";
  showAuth();
}

$$(".nav-item[data-view]").forEach(b=>b.addEventListener("click",()=>goTo(b.dataset.view)));
$$("[data-go]").forEach(b=>b.addEventListener("click",()=>goTo(b.dataset.go)));
$("#addTaskButton").addEventListener("click",()=>openTask());
$$(".add-task-secondary").forEach(b=>b.addEventListener("click",()=>openTask()));
$$(".close-dialog").forEach(b=>b.addEventListener("click",()=>$("#taskDialog").close()));
$$(".close-expense").forEach(b=>b.addEventListener("click",()=>$("#expenseDialog").close()));
$("#addExpenseButton").addEventListener("click",()=>openExpense());
$("#addContactButton").addEventListener("click",()=>openContact());
$("#addDocumentButton").addEventListener("click",()=>openDocument());
$("#addBoxButton").addEventListener("click",()=>openBox());
$$(".close-contact").forEach(button=>button.addEventListener("click",()=>$("#contactDialog").close()));
$$(".close-document").forEach(button=>button.addEventListener("click",()=>$("#documentDialog").close()));
$$(".close-box").forEach(button=>button.addEventListener("click",()=>$("#boxDialog").close()));
$("#menuButton").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#settingsButton").addEventListener("click",()=>toast("Les paramètres arriveront dans la prochaine version."));
$("#taskForm").addEventListener("submit",async e=>{
  e.preventDefault(); const data=new FormData(e.currentTarget);
  if(!activeHouseholdId) return;
  const editingId=e.currentTarget.dataset.editing;
  const status=data.get("status")||"todo";
  const taskData={
    title:data.get("title").trim(),category:data.get("category"),assignee:data.get("assignee"),
    deadline:data.get("deadline"),priority:data.get("priority"),status,done:status==="done",
    notes:data.get("notes").trim(),updatedAt:serverTimestamp()
  };
  setSyncing(true);
  try {
    if(editingId) await updateDoc(doc(db,"households",activeHouseholdId,"tasks",editingId),taskData);
    else await addDoc(collection(db,"households",activeHouseholdId,"tasks"),{...taskData,status:"todo",done:false,createdAt:serverTimestamp()});
    e.currentTarget.reset();e.currentTarget.dataset.editing="";$("#taskDialog").close();toast(editingId?"Tâche mise à jour !":"Tâche ajoutée !");
  } catch(error) { setSyncing(false);toast(firebaseMessage(error)); }
});
$("#expenseForm").addEventListener("submit",async e=>{
  e.preventDefault();const data=new FormData(e.currentTarget);
  if(!activeHouseholdId) return;
  const id=e.currentTarget.dataset.editing;
  const payload={label:data.get("label").trim(),category:data.get("category"),planned:Number(data.get("planned")),spent:Number(data.get("spent")),type:data.get("type"),status:data.get("status"),assignee:data.get("assignee"),notes:data.get("notes").trim(),updatedAt:serverTimestamp()};
  setSyncing(true);
  try {
    if(id)await updateDoc(doc(db,"households",activeHouseholdId,"expenses",id),payload);
    else await addDoc(collection(db,"households",activeHouseholdId,"expenses"),{...payload,createdAt:serverTimestamp()});
    e.currentTarget.reset();$("#expenseDialog").close();toast(id?"Élément mis à jour !":"Élément ajouté !");
  } catch(error) { setSyncing(false);toast(firebaseMessage(error)); }
});
$("#contactForm").addEventListener("submit",async event=>{
  event.preventDefault();if(!activeHouseholdId)return;
  const form=event.currentTarget,data=new FormData(form),id=form.dataset.editing;
  const payload={type:data.get("type"),name:data.get("name").trim(),contactName:data.get("contactName").trim(),phone:data.get("phone").trim(),email:data.get("email").trim(),notes:data.get("notes").trim(),updatedAt:serverTimestamp()};
  setSyncing(true);
  try{
    if(id)await updateDoc(doc(db,"households",activeHouseholdId,"contacts",id),payload);
    else await addDoc(collection(db,"households",activeHouseholdId,"contacts"),{...payload,createdAt:serverTimestamp()});
    $("#contactDialog").close();toast(id?"Contact mis à jour !":"Contact ajouté !");
  }catch(error){setSyncing(false);toast(firebaseMessage(error));}
});
$("#documentForm").addEventListener("submit",async event=>{
  event.preventDefault();if(!activeHouseholdId)return;
  const form=event.currentTarget,data=new FormData(form),id=form.dataset.editing;
  const existing=saleDocuments.find(item=>String(item.id)===id);
  const payload={name:data.get("name").trim(),status:data.get("status"),deadline:data.get("deadline"),url:data.get("url").trim(),notes:data.get("notes").trim(),storagePath:existing?.storagePath||"",fileName:existing?.fileName||"",updatedAt:serverTimestamp()};
  const file=form.elements.file.files[0];
  setSyncing(true);
  try{
    if(file){
      if(file.size>10*1024*1024)throw new Error("Le fichier dépasse 10 Mo.");
      if(file.type!=="application/pdf"&&!file.type.startsWith("image/"))throw new Error("Seuls les PDF et les images sont acceptés.");
      if(existing?.storagePath)await deleteObject(storageRef(storage,existing.storagePath)).catch(()=>{});
      const cleanName=file.name.replace(/[^a-zA-Z0-9._-]/g,"-");
      payload.storagePath=`households/${activeHouseholdId}/documents/${Date.now()}-${cleanName}`;
      const uploaded=await uploadBytes(storageRef(storage,payload.storagePath),file,{contentType:file.type});
      payload.url=await getDownloadURL(uploaded.ref);payload.fileName=file.name;
    }
    if(id)await updateDoc(doc(db,"households",activeHouseholdId,"documents",id),payload);
    else await addDoc(collection(db,"households",activeHouseholdId,"documents"),{...payload,createdAt:serverTimestamp()});
    $("#documentDialog").close();toast(id?"Document mis à jour !":"Document ajouté !");
  }catch(error){setSyncing(false);toast(firebaseMessage(error));}
});
$("#boxForm").addEventListener("submit",async event=>{
  event.preventDefault();if(!activeHouseholdId)return;
  const form=event.currentTarget,data=new FormData(form),id=form.dataset.editing;
  const payload={number:data.get("number").trim(),room:data.get("room"),contents:data.get("contents").trim(),status:data.get("status"),assignee:data.get("assignee"),fragile:data.get("fragile")==="true",updatedAt:serverTimestamp()};
  setSyncing(true);try{if(id)await updateDoc(doc(db,"households",activeHouseholdId,"movingBoxes",id),payload);else await addDoc(collection(db,"households",activeHouseholdId,"movingBoxes"),{...payload,createdAt:serverTimestamp()});$("#boxDialog").close();toast(id?"Carton mis à jour !":"Carton ajouté !");}catch(error){setSyncing(false);toast(firebaseMessage(error));}
});
document.addEventListener("click",async e=>{
  const boxEdit=e.target.closest(".edit-box");
  if(boxEdit){
    const id=boxEdit.closest("[data-box-id]").dataset.boxId,item=movingBoxes.find(box=>String(box.id)===id);
    if(item)openBox(item);return;
  }
  const compactCheck=e.target.closest("[data-compact-task]");
  if(compactCheck){
    const id=compactCheck.dataset.compactTask,task=tasks.find(item=>String(item.id)===id);
    if(task&&activeHouseholdId){const done=!task.done;await updateDoc(doc(db,"households",activeHouseholdId,"tasks",id),{done,status:done?"done":"todo",updatedAt:serverTimestamp()});}
    return;
  }
  const expenseEdit=e.target.closest(".edit-expense");
  if(expenseEdit){
    const id=expenseEdit.closest("[data-expense]").dataset.expense;
    const item=expenses.find(expense=>String(expense.id)===id);
    if(item)openExpense(item);return;
  }
  const saleEdit=e.target.closest(".edit-sale-task");
  if(saleEdit){
    const task=tasks.find(item=>String(item.id)===saleEdit.dataset.taskId);
    if(task)openTask(task);return;
  }
  const contactEdit=e.target.closest(".edit-contact");
  if(contactEdit){
    const id=contactEdit.closest("[data-contact-id]").dataset.contactId;
    const contact=contacts.find(item=>String(item.id)===id);
    if(contact)openContact(contact);return;
  }
  const documentEdit=e.target.closest(".edit-document");
  if(documentEdit){
    const id=documentEdit.closest("[data-document-id]").dataset.documentId;
    const item=saleDocuments.find(docItem=>String(docItem.id)===id);
    if(item)openDocument(item);return;
  }
  const edit=e.target.closest(".edit-task");
  if(edit){
    const row=edit.closest("[data-id]");if(!row)return;
    const id=row.dataset.id,task=tasks.find(t=>String(t.id)===id);
    if(task)openTask(task);
    return;
  }
  const check=e.target.closest(".check");
  if(check){
    const id=check.closest("[data-id]").dataset.id,task=tasks.find(t=>String(t.id)===id);
    if(!task||!activeHouseholdId)return;
    const done=!task.done;setSyncing(true);
    try{await updateDoc(doc(db,"households",activeHouseholdId,"tasks",id),{done,status:done?"done":"todo",updatedAt:serverTimestamp()});toast(done?"Bravo, une étape de plus !":"Tâche rouverte.");}
    catch(error){setSyncing(false);toast(firebaseMessage(error));}
  }
});
$("#deleteTaskButton").addEventListener("click",async()=>{
  const id=$("#taskForm").dataset.editing;
  if(!id||!activeHouseholdId||!window.confirm("Supprimer définitivement cette tâche ?"))return;
  setSyncing(true);
  try{await deleteDoc(doc(db,"households",activeHouseholdId,"tasks",id));$("#taskDialog").close();toast("Tâche supprimée.");}
  catch(error){setSyncing(false);toast(firebaseMessage(error));}
});
$("#deleteContactButton").addEventListener("click",async()=>{
  const id=$("#contactForm").dataset.editing;
  if(!id||!activeHouseholdId||!window.confirm("Supprimer définitivement ce contact ?"))return;
  setSyncing(true);try{await deleteDoc(doc(db,"households",activeHouseholdId,"contacts",id));$("#contactDialog").close();toast("Contact supprimé.");}catch(error){setSyncing(false);toast(firebaseMessage(error));}
});
$("#deleteDocumentButton").addEventListener("click",async()=>{
  const id=$("#documentForm").dataset.editing;
  if(!id||!activeHouseholdId||!window.confirm("Supprimer définitivement ce document ?"))return;
  const item=saleDocuments.find(documentItem=>String(documentItem.id)===id);
  setSyncing(true);try{if(item?.storagePath)await deleteObject(storageRef(storage,item.storagePath)).catch(()=>{});await deleteDoc(doc(db,"households",activeHouseholdId,"documents",id));$("#documentDialog").close();toast("Document supprimé.");}catch(error){setSyncing(false);toast(firebaseMessage(error));}
});
$("#deleteExpenseButton").addEventListener("click",async()=>{
  const id=$("#expenseForm").dataset.editing;
  if(!id||!activeHouseholdId||!window.confirm("Supprimer définitivement cet élément du budget ?"))return;
  setSyncing(true);try{await deleteDoc(doc(db,"households",activeHouseholdId,"expenses",id));$("#expenseDialog").close();toast("Élément supprimé.");}catch(error){setSyncing(false);toast(firebaseMessage(error));}
});
$("#deleteBoxButton").addEventListener("click",async()=>{
  const id=$("#boxForm").dataset.editing;
  if(!id||!activeHouseholdId||!window.confirm("Supprimer définitivement ce carton ?"))return;
  setSyncing(true);try{await deleteDoc(doc(db,"households",activeHouseholdId,"movingBoxes",id));$("#boxDialog").close();toast("Carton supprimé.");}catch(error){setSyncing(false);toast(firebaseMessage(error));}
});
$("#statusFilters").querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{currentStatus=b.dataset.status;$("#statusFilters").querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x===b));renderTasks();}));
$("#budgetFilters").querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{currentBudgetType=b.dataset.budgetType;$("#budgetFilters").querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x===b));renderBudget();}));
$("#boxFilters").querySelectorAll(".filter").forEach(b=>b.addEventListener("click",()=>{currentBoxStatus=b.dataset.boxStatus;$("#boxFilters").querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x===b));renderMove();}));
$("#personFilter").addEventListener("change",renderTasks);
$("#globalSearch").addEventListener("input",()=>{renderTasks();if($("#globalSearch").value)goTo("tasks");});
$("#authForm").addEventListener("submit",async event=>{
  event.preventDefault();
  const form=event.currentTarget,data=new FormData(form),submit=$(".auth-submit");
  $("#authError").textContent="";submit.disabled=true;
  try {
    await signInWithEmailAndPassword(auth,data.get("email"),data.get("password"));
  } catch(error) {
    profileCreationInProgress=false;
    $("#authError").textContent=firebaseMessage(error);
  } finally { submit.disabled=false; }
});
$("#userMenuButton").addEventListener("click",()=>$("#accountDialog").showModal());
$(".close-account").addEventListener("click",()=>$("#accountDialog").close());
$("#copyCodeButton").addEventListener("click",async()=>{
  await navigator.clipboard.writeText(activeHouseholdId || "");
  toast("Code du foyer copié !");
});
$("#notificationButton").addEventListener("click",async()=>{
  if(!("Notification" in window)){toast("Les notifications ne sont pas disponibles sur cet appareil.");return;}
  const permission=await Notification.requestPermission();
  if(permission==="granted"){localStorage.removeItem("capMontagneReminderDate");await sendDeadlineReminder();toast("Les rappels sont activés.");}
  else toast("Les notifications n’ont pas été autorisées.");
});
$("#installAppButton").addEventListener("click",async()=>{
  if(!deferredInstallPrompt)return;
  deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$("#installAppButton").hidden=true;
});
$("#logoutButton").addEventListener("click",async()=>{
  $("#accountDialog").close();
  await signOut(auth);
});

const now=new Date();
$("#todayLabel").textContent=new Intl.DateTimeFormat("fr-FR",{weekday:"long",day:"numeric",month:"long"}).format(now);
renderAll();
onAuthStateChanged(auth,async user=>{
  if(profileCreationInProgress)return;
  if(!user){showLogin();return;}
  try {
    const profile=await getDoc(doc(db,"users",user.uid));
    if(profile.exists()) await openSession(user);
    else {
      profileCreationInProgress=true;
      await attachAuthorizedUser(user);
      profileCreationInProgress=false;
      await openSession(user);
      toast("Votre compte a été reconnu automatiquement.");
    }
  } catch(error){profileCreationInProgress=false;showAuth();$("#authError").textContent=firebaseMessage(error);}
});

if("serviceWorker" in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
window.addEventListener("beforeinstallprompt",event=>{
  event.preventDefault();deferredInstallPrompt=event;$("#installAppButton").hidden=false;
});
