document.addEventListener("DOMContentLoaded", () => {

  // === Sidebar toggle ===
  const sidebar = document.getElementById("sidebar");
  const toggleSidebarBtn = document.getElementById("toggleSidebar");
  toggleSidebarBtn.addEventListener("click", () => sidebar.classList.toggle("hidden"));

  // === Stack 1 elements ===
  const taskInput = document.getElementById("taskInput");
  const addBtn = document.getElementById("addBtn");
  const archiveBtn = document.getElementById("archiveBtn");
  const tasksContainer = document.getElementById("tasksContainer");

  const jsonInput = document.getElementById("jsonInput");
  const sendToStack2Btn = document.getElementById("sendToStack2Btn");
  const copiedMsg = document.getElementById("copiedMsg");

  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

  function renderTasks() {
    tasksContainer.innerHTML = "";
    tasks.forEach(t => {
      const li = document.createElement("li");
      li.textContent = t.text;
      tasksContainer.appendChild(li);
    });
  }

  addBtn.addEventListener("click", ()=>{
    const text = taskInput.value.trim();
    if(!text) return;
    tasks.push({text,date:new Date().toISOString()});
    localStorage.setItem("tasks", JSON.stringify(tasks));
    taskInput.value="";
    renderTasks();
  });

  archiveBtn.addEventListener("click", ()=>{
    if(!tasks.length) return;
    const blob = new Blob([JSON.stringify(tasks,null,2)], {type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `taches_${new Date().toISOString().slice(0,19).replace(/:/g,"-")}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  renderTasks();

  // === Stack 2 elements ===
  const jalonsList = document.getElementById("jalonsList");
  const messagesTableBody = document.querySelector("#messagesTable tbody");
  const rdvList = document.getElementById("rdvList");
  const autresList = document.getElementById("autresList");
  const livrablesList = document.getElementById("livrablesList");

  const generateMailBtn = document.getElementById("generateMailBtn");
  const mailPromptSelect = document.getElementById("mailPromptSelect");

  const generateLivrableBtn = document.getElementById("generateLivrableBtn");
  const livrablePromptSelect = document.getElementById("livrablePromptSelect");

  const mailPrompts = {1:"Écris un email professionnel clair et concis pour :",2:"Écris un email amical et léger pour :"};
  const livrablePrompts = {1:"Génère un plan détaillé pour :",2:"Génère un résumé exécutif pour :",3:"Génère une checklist rapide pour :"};

  let llmData = null;

  function renderModules() {
    if(!llmData) return;

    // Jalons
    jalonsList.innerHTML="";
    (llmData.jalons||[]).forEach(j=>{
      const li=document.createElement("li");
      li.innerHTML=`<strong>${j.titre}</strong> (${j.datePrévue})`;
      if(j.sousActions?.length){
        const subUl=document.createElement("ul");
        j.sousActions.forEach(s=>{
          const subLi=document.createElement("li");
          const cb=document.createElement("input");
          cb.type="checkbox";
          cb.checked = s.statut==="fait";
          cb.addEventListener("change", ()=>s.statut = cb.checked?"fait":"à faire");
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
      const tr=document.createElement("tr");
      const tdCheck=document.createElement("td");
      const cb=document.createElement("input");
      cb.type="checkbox";
      cb.checked=m.envoyé;
      cb.addEventListener("change", ()=>m.envoyé=cb.checked);
      tdCheck.appendChild(cb);
      tr.appendChild(tdCheck);
      tr.appendChild(document.createElement("td")).textContent=m.destinataire;
      tr.appendChild(document.createElement("td")).textContent=m.sujet;
      tr.appendChild(document.createElement("td")).textContent=m.texte;
      messagesTableBody.appendChild(tr);
    });

    // RDV
    rdvList.innerHTML="";
    (llmData.rdv||[]).forEach(r=>{
      const li=document.createElement("li");
      li.innerHTML=`<strong>${r.titre}</strong> - ${r.date} (${r.durée}) - Participants: ${r.participants.join(", ")}`;
      rdvList.appendChild(li);
    });

    // Autres ressources
    autresList.innerHTML="";
    (llmData.autresModules||[]).forEach(m=>{
      const li=document.createElement("li");
      li.innerHTML=`<strong>${m.titre}</strong>`;
      if(m.items?.length){
        const subUl=document.createElement("ul");
        m.items.forEach(it=>{
          const subLi=document.createElement("li");
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
      const li=document.createElement("li");
      const cb=document.createElement("input");
      cb.type="checkbox";
      cb.dataset.titre=l.titre;
      cb.dataset.type=l.type;
      li.appendChild(cb);
      li.appendChild(document.createTextNode(` ${l.titre} (${l.type})`));
      const note=document.createElement("textarea");
      note.className="livrable-note";
      note.placeholder="Ajouter une note ou commentaire...";
      note.dataset.titre=l.titre;
      li.appendChild(note);
      livrablesList.appendChild(li);
    });
  }

  // === Envoi JSON Stack 1 → Stack 2 + téléchargement ===
  sendToStack2Btn.addEventListener("click", ()=>{
    const text=jsonInput.value.trim();
    if(!text) return alert("Colle un JSON valide !");
    try{
      llmData=JSON.parse(text);
      renderModules();

      // Download automatique
      const blob=new Blob([JSON.stringify(llmData,null,2)],{type:"application/json"});
      const a=document.createElement("a");
      a.href=URL.createObjectURL(blob);
      a.download=`stack2_${new Date().toISOString().slice(0,19).replace(/:/g,"-")}.json`;
      a.click();
      URL.revokeObjectURL(a.href);

      copiedMsg.style.display="block";
      setTimeout(()=>copiedMsg.style.display="none",2000);

    }catch(err){console.error(err);alert("JSON invalide !");}
  });

  // === Génération Mail GPT ===
  generateMailBtn.addEventListener("click", ()=>{
    if(!llmData?.messages) return;
    const selected=llmData.messages.filter(m=>m.envoyé);
    if(!selected.length) return alert("Coche au moins un message !");
    const promptTexte=mailPrompts[mailPromptSelect.value];
    const content=selected.map(m=>`À: ${m.destinataire}\nSujet: ${m.sujet}\nMessage: ${m.texte}`).join("\n\n");
    navigator.clipboard.writeText(`${promptTexte}\n\n${content}`).then(()=>alert("Prompt + messages copiés dans le presse-papiers !"));
    const newWindow=window.open("https://chat.openai.com/","_blank");
    if(newWindow) newWindow.focus();
  });

  // === Génération Livrables ===
  generateLivrableBtn.addEventListener("click", ()=>{
    if(!llmData?.livrables) return;
    const selected=Array.from(livrablesList.querySelectorAll("li"))
      .filter(li=>li.querySelector("input[type=checkbox]").checked);
    if(!selected.length) return alert("Coche au moins un livrable !");
    const promptTexte=livrablePrompts[livrablePromptSelect.value];
    const content=selected.map(li=>{
      const cb=li.querySelector("input[type=checkbox]");
      const note=li.querySelector("textarea").value.trim();
      return note?`${cb.dataset.titre} (${cb.dataset.type})\nNote: ${note}`:`${cb.dataset.titre} (${cb.dataset.type})`;
    }).join("\n\n");
    navigator.clipboard.writeText(`${promptTexte}\n\n${content}`).then(()=>alert("Prompt + livrables copiés dans le presse-papiers !"));
    const newWindow=window.open("https://chat.openai.com/","_blank");
    if(newWindow) newWindow.focus();
  });

});
