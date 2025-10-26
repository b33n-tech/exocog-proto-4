// --- Sidebar toggle ---
const sidebar = document.getElementById("sidebar");
const toggleBtn = document.getElementById("toggleSidebar");
const mainContent = document.querySelector("main");
toggleBtn.addEventListener("click", () => {
  sidebar.style.transform = sidebar.style.transform === "translateX(-100%)" ? "translateX(0)" : "translateX(-100%)";
  mainContent.style.marginLeft = sidebar.style.transform === "translateX(0)" ? "240px" : "0";
});

// --- Stack 1 elements ---
const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const archiveBtn = document.getElementById("archiveBtn");
const clearBtn = document.getElementById("clearBtn");
const tasksContainer = document.getElementById("tasksContainer");
const promptsContainer = document.getElementById("promptsContainer");
const llmSelect = document.getElementById("llmSelect");
const jsonTextarea = document.getElementById("jsonTextarea");
const sendToStack2Btn = document.getElementById("sendToStack2Btn");

// Stack1 tasks
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

// --- Format date ---
function formatDate(iso){
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

// --- Render tasks ---
function renderTasks(){
  tasksContainer.innerHTML = "";
  tasks.forEach((t,i)=>{
    const li = document.createElement("li");
    li.className = "task-item";

    const span = document.createElement("span");
    span.className = "task-text";
    span.textContent = t.text;
    span.addEventListener("click", ()=>t.done = !t.done);

    const commentUl = document.createElement("ul");
    commentUl.className = "comment-list";
    (t.comments||[]).forEach(c=>{
      const cLi = document.createElement("li");
      cLi.textContent = `${formatDate(c.date)} : ${c.text}`;
      commentUl.appendChild(cLi);
    });

    const commentDiv = document.createElement("div");
    commentDiv.className = "comment-section";
    const commentInputDiv = document.createElement("div");
    commentInputDiv.className = "comment-input";

    const commentInput = document.createElement("input");
    commentInput.placeholder = "Ajouter un commentaire…";
    const commentBtn = document.createElement("button");
    commentBtn.textContent = "💬";
    commentBtn.addEventListener("click", ()=>{
      if(commentInput.value.trim()){
        t.comments = t.comments||[];
        t.comments.push({text: commentInput.value, date: new Date().toISOString()});
        commentInput.value="";
        renderTasks();
        saveTasks();
      }
    });

    commentInputDiv.appendChild(commentInput);
    commentInputDiv.appendChild(commentBtn);
    commentDiv.appendChild(commentUl);
    commentDiv.appendChild(commentInputDiv);

    li.appendChild(span);
    li.appendChild(commentDiv);
    tasksContainer.appendChild(li);
  });
}

// --- Save tasks ---
function saveTasks(){
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

// --- Buttons ---
addBtn.addEventListener("click", ()=>{
  if(taskInput.value.trim()){
    tasks.push({text:taskInput.value, done:false});
    taskInput.value="";
    renderTasks();
    saveTasks();
  }
});
archiveBtn.addEventListener("click", ()=>{
  tasks = tasks.filter(t=>!t.done);
  renderTasks();
  saveTasks();
});
clearBtn.addEventListener("click", ()=>{
  tasks=[];
  renderTasks();
  saveTasks();
});

// --- Prompts (example) ---
const samplePrompts = ["Résumé rapide", "Email formel", "Checklist"];
samplePrompts.forEach(p=>{
  const btn = document.createElement("button");
  btn.textContent = p;
  btn.addEventListener("click", ()=>{
    alert(`Prompt sélectionné : ${p}`);
  });
  promptsContainer.appendChild(btn);
});

// --- Stack2: modules ---
const jalonsList = document.getElementById("jalonsList");
const messagesTableBody = document.querySelector("#messagesTable tbody");
const rdvList = document.getElementById("rdvList");
const autresList = document.getElementById("autresList");
const livrablesList = document.getElementById("livrablesList");

const generateMailBtn = document.getElementById("generateMailBtn");
const mailPromptSelect = document.getElementById("mailPromptSelect");

const generateLivrableBtn = document.getElementById("generateLivrableBtn");
const livrablePromptSelect = document.getElementById("livrablePromptSelect");

const mailPrompts = {
  1: "Écris un email professionnel clair et concis pour :",
  2: "Écris un email amical et léger pour :"
};

const livrablePrompts = {
  1: "Génère un plan détaillé pour :",
  2: "Génère un résumé exécutif pour :",
  3: "Génère une checklist rapide pour :"
};

let llmData = null;

// --- Render modules ---
function renderModules(){
  if(!llmData) return;

  // Jalons
  jalonsList.innerHTML="";
  (llmData.jalons||[]).forEach(j=>{
    const li = document.createElement("li");
    li.innerHTML=`<strong>${j.titre}</strong> (${j.datePrévue})`;
    if(j.sousActions?.length){
      const subUl = document.createElement("ul");
      j.sousActions.forEach(s=>{
        const subLi = document.createElement("li");
        const cb = document.createElement("input");
        cb.type="checkbox";
        cb.checked = s.statut==="fait";
        cb.addEventListener("change", ()=>s.statut=cb.checked?"fait":"à faire");
        subLi.appendChild(cb);
        subLi.appendChild(document.createTextNode(s.texte));
        subUl.appendChild(subLi);
      });
      li.appendChild(subUl);
    }
    jalonsList.appendChild(li);
  });

  // Messages
  messagesTableBody.innerHTML="";
  (llmData.messages||[]).forEach(m=>{
    const tr = document.createElement("tr");
    const tdCheck = document.createElement("td");
    const cb = document.createElement("input");
    cb.type="checkbox";
    cb.checked=m.envoyé;
    cb.addEventListener("change",()=>m.envoyé=cb.checked);
    tdCheck.appendChild(cb);
    tr.appendChild(tdCheck);
    tr.appendChild(document.createElement("td")).textContent = m.destinataire;
    tr.appendChild(document.createElement("td")).textContent = m.sujet;
    tr.appendChild(document.createElement("td")).textContent = m.texte;
    messagesTableBody.appendChild(tr);
  });

  // RDV
  rdvList.innerHTML="";
  (llmData.rdv||[]).forEach(r=>{
    const li = document.createElement("li");
    li.innerHTML=`<strong>${r.titre}</strong> - ${r.date} (${r.durée}) - Participants: ${r.participants.join(", ")}`;
    rdvList.appendChild(li);
  });

  // Autres
  autresList.innerHTML="";
  (llmData.autresModules||[]).forEach(m=>{
    const li=document.createElement("li");
    li.innerHTML=`<strong>${m.titre}</strong>`;
    if(m.items?.length){
      const subUl = document.createElement("ul");
      m.items.forEach(it=>{
        const subLi = document.createElement("li");
        const a=document.createElement("a");
        a.href=it.lien;
        a.textContent=it.nom;
        a.target="_blank";
        subLi.appendChild(a);
        subUl.appendChild(subLi);
      });
      li.appendChild(subUl);
    }
    autresList.appendChild(li);
  });

  // Livrables
  livrablesList.innerHTML="";
  (llmData.livrables||[]).forEach(l=>{
    const li = document.createElement("li");
    const cb = document.createElement("input");
    cb.type="checkbox";
    cb.dataset.titre=l.titre;
    cb.dataset.type=l.type;
    li.appendChild(cb);
    li.appendChild(document.createTextNode(` ${l.titre} (${l.type})`));

    const note = document.createElement("textarea");
    note.className="livrable-note";
    note.placeholder="Ajouter une note ou commentaire...";
    note.dataset.titre=l.titre;
    li.appendChild(note);

    livrablesList.appendChild(li);
  });
}

// --- Send JSON from textarea to Stack2 + download ---
sendToStack2Btn.addEventListener("click", ()=>{
  try{
    llmData = JSON.parse(jsonTextarea.value);
    renderModules();

    // Download JSON
    const blob = new Blob([JSON.stringify(llmData,null,2)],{type:"application/json"});
    const a = document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download="llmData.json";
    a.click();

    alert("JSON envoyé à Stack2 et téléchargé !");
  }catch(e){
    alert("JSON invalide !");
  }
});

// --- Generate Mail ---
generateMailBtn.addEventListener("click", ()=>{
  if(!llmData?.messages) return;
  const selected = llmData.messages.filter(m=>m.envoyé);
  if(!selected.length){ alert("Coche au moins un message !"); return; }
  const promptTexte = mailPrompts[mailPromptSelect.value];
  const content = selected.map(m=>`À: ${m.destinataire}\nSujet: ${m.sujet}\nMessage: ${m.texte}`).join("\n\n");
  navigator.clipboard.writeText(`${promptTexte}\n\n${content}`).then(()=>alert("Prompt + messages copiés !"));
  window.open(llmSelect.value, "_blank")?.focus();
});

// --- Generate Livrables ---
generateLivrableBtn.addEventListener("click", ()=>{
  if(!llmData?.livrables) return;
  const selected = Array.from(livrablesList.querySelectorAll("li"))
    .filter(li=>li.querySelector("input[type=checkbox]").checked);
  if(!selected.length){ alert("Coche au moins un livrable !"); return; }
  const promptTexte = livrablePrompts[livrablePromptSelect.value];
  const content = selected.map(li=>{
    const cb = li.querySelector("input[type=checkbox]");
    const note = li.querySelector("textarea").value.trim();
    return note ? `${cb.dataset.titre} (${cb.dataset.type})\nNote: ${note}` : `${cb.dataset.titre} (${cb.dataset.type})`;
  }).join("\n\n");
  navigator.clipboard.writeText(`${promptTexte}\n\n${content}`).then(()=>alert("Prompt + livrables copiés !"));
  window.open(llmSelect.value,"_blank")?.focus();
});

// --- Init ---
renderTasks();
