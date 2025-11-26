// --- FIREBASE INIT ---
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
    import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
    import { getFirestore, collection, addDoc, getDocs, doc, setDoc, getDoc, arrayUnion, arrayRemove, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

    const firebaseConfig = {
        apiKey: "AIzaSyBrObF62SabOPgu1K_BBHu02NbzPDq6Zp0",
        authDomain: "zona-gamer-3b24f.firebaseapp.com",
        projectId: "zona-gamer-3b24f",
        storageBucket: "zona-gamer-3b24f.firebasestorage.app",
        messagingSenderId: "669415129291",
        appId: "1:669415129291:web:88cdd544818f3f20a29b4e"
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const googleProvider = new GoogleAuthProvider();

    // --- ESTADO ---
    let juegos = [];
    let juegosFiltrados = [];
    let paginaActual = 1;
    const juegosPorPagina = 12;
    let usuarioActual = null;
    let esAdmin = false;
    let favoritos = JSON.parse(localStorage.getItem("favoritos") || "[]");
    let juegoSeleccionadoId = null; 
    let activeReqFilter = null;
    let currentGameOpen = null; 
    let pendingVote = 0;

    // --- DOM ---
    const gameList = document.getElementById('gameList');
    const loginScreen = document.getElementById('login-screen');
    const appContent = document.getElementById('app-content');
    const btnProfile = document.getElementById('btnProfile');
    const profileDropdown = document.getElementById('profileDropdown');
    const buscadorExpandido = document.getElementById('buscadorExpandido');
    const contextMenu = document.getElementById('contextMenu');
    const notifDropdown = document.getElementById('notifDropdown');
    const btnNotif = document.getElementById('btnNotif');
    const genresPopup = document.getElementById('genresListPopup');
    const searchInput = document.getElementById('searchInput');
    const autocompleteList = document.getElementById('autocomplete-list');

    // --- AUTH ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            usuarioActual = user;
            loginScreen.style.opacity = '0';
            setTimeout(() => {
                loginScreen.style.display = 'none';
                appContent.style.display = 'block';
            }, 500); 
            document.getElementById('user-email-display').innerText = user.displayName || user.email;
            
            // Pre-llenar contacto
            document.getElementById('contact-user-info').innerText = `Enviando como: ${user.email}`;
            document.getElementById('contact-email-hidden').value = user.email;
            document.getElementById('contact-name-hidden').value = user.displayName || "Usuario";

            try {
                const userDoc = await getDoc(doc(db, "usuarios", user.uid));
                if (userDoc.exists() && userDoc.data().rol === "admin") {
                    esAdmin = true;
                    document.getElementById('btnFloatingAdd').style.display = 'flex';
                } else {
                    esAdmin = false;
                    document.getElementById('btnFloatingAdd').style.display = 'none';
                }
            } catch (e) {}
            cargarJuegos();
        } else {
            loginScreen.style.display = 'flex';
            loginScreen.style.opacity = '1';
            appContent.style.display = 'none';
            usuarioActual = null;
            esAdmin = false;
        }
    });

    let modoRegistro = false;
    document.getElementById('btn-auth-submit').addEventListener('click', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const pass = document.getElementById('password').value;
        try {
            if(modoRegistro) {
                const cred = await createUserWithEmailAndPassword(auth, email, pass);
                await setDoc(doc(db, "usuarios", cred.user.uid), { email, rol: "user" });
                alert("¡Bienvenido! Cuenta creada.");
            } else {
                await signInWithEmailAndPassword(auth, email, pass);
            }
        } catch(e) { alert(e.message); }
    });

    document.getElementById('toggle-auth').onclick = () => {
        modoRegistro = !modoRegistro;
        document.getElementById('toggle-auth').innerText = modoRegistro ? "¿Ya tienes cuenta? Inicia Sesión" : "¿No tienes cuenta? Regístrate gratis";
        document.getElementById('btn-auth-submit').innerText = modoRegistro ? "CREAR CUENTA" : "INGRESAR";
    };

    document.getElementById('btn-google-login').onclick = async () => {
        try {
            const res = await signInWithPopup(auth, googleProvider);
            const ref = doc(db, "usuarios", res.user.uid);
            const snap = await getDoc(ref);
            if(!snap.exists()) await setDoc(ref, { email: res.user.email, rol: "user" });
        } catch(e) { console.error(e); }
    };

    document.getElementById('btnLogout').onclick = () => signOut(auth);

    // TOGGLE MENUS CON CAMBIO DE COLOR ACTIVO
    window.toggleMenu = (btn, id) => {
        const el = document.getElementById(id);
        // Cerrar otros primero
        document.querySelectorAll('.profile-dropdown, .notif-dropdown').forEach(d => {
            if(d.id !== id) d.style.display='none';
        });
        document.querySelectorAll('#menuClosed button').forEach(b => b.classList.remove('active-menu'));

        if (el.style.display === 'block') {
            el.style.display = 'none';
            btn.classList.remove('active-menu');
        } else {
            el.style.display = 'block';
            btn.classList.add('active-menu');
        }
    };

    window.onclick = (e) => { 
        if (!e.target.closest('#btnProfile') && !e.target.closest('#btnNotif')) {
            document.querySelectorAll('.profile-dropdown, .notif-dropdown').forEach(d => d.style.display='none');
            document.querySelectorAll('#menuClosed button').forEach(b => b.classList.remove('active-menu'));
        }
        if (!e.target.closest('#buscadorExpandido') && !e.target.closest('#btnLupa')) {
            buscadorExpandido.classList.remove('visible');
            document.getElementById('btnLupa').classList.remove('active-menu');
        }
        if (!e.target.closest('#contextMenu')) contextMenu.style.display = 'none';
        if (!e.target.closest('.genres-dropdown-container')) genresPopup.style.display = 'none';
        
        autocompleteList.style.display = 'none';
        document.getElementById('contact-autocomplete-list').style.display = 'none';
        
        // Cerrar modales al tocar fuera
        if(e.target.classList.contains('modal')) {
            if(e.target.id === 'modalAdmin' || e.target.id === 'modalEdit') {
                if(confirm("¿Estás seguro? Se perderán los datos si sales.")) e.target.style.display = 'none';
            } else {
                e.target.style.display = 'none';
            }
        }
    };
    
    window.cerrarModalConConfirmacion = (id) => {
        if(confirm("¿Estás seguro? Se perderán los datos si sales.")) document.getElementById(id).style.display = 'none';
    };

    // --- FILTROS ---
    window.toggleGenresPopup = () => {
        const btn = document.getElementById('btnGenresToggle');
        if (genresPopup.style.display === 'grid') {
            genresPopup.style.display = 'none';
        } else {
            genresPopup.style.display = 'grid';
        }
    };

    document.querySelectorAll('.filter-genre-chk').forEach(chk => chk.addEventListener('change', aplicarFiltrosGlobales));
    
    // Autocomplete Search
    searchInput.addEventListener('input', function() {
        const val = this.value.toLowerCase();
        aplicarFiltrosGlobales();
        
        if (!val) { autocompleteList.style.display = 'none'; return; }
        
        const matches = juegos.filter(j => j.titulo.toLowerCase().includes(val)).slice(0, 5);
        autocompleteList.innerHTML = '';
        
        if (matches.length > 0) {
            matches.forEach(j => {
                const div = document.createElement('div');
                div.className = 'autocomplete-item';
                div.innerText = j.titulo;
                div.onclick = () => {
                    searchInput.value = j.titulo;
                    aplicarFiltrosGlobales();
                    autocompleteList.style.display = 'none';
                };
                autocompleteList.appendChild(div);
            });
            autocompleteList.style.display = 'block';
        } else {
            autocompleteList.style.display = 'none';
        }
    });

    window.toggleReq = (btn, req) => {
        const isActive = btn.classList.contains('activo');
        document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('activo'));
        if (isActive) activeReqFilter = null;
        else {
            btn.classList.add('activo');
            activeReqFilter = req;
        }
        aplicarFiltrosGlobales();
    };

    function aplicarFiltrosGlobales() {
        const texto = document.getElementById('searchInput').value.toLowerCase();
        const selectedGenres = Array.from(document.querySelectorAll('.filter-genre-chk:checked')).map(c => c.value.toLowerCase());

        juegosFiltrados = juegos.filter(j => {
            const matchText = j.titulo.toLowerCase().includes(texto);
            let matchReq = true;
            if (activeReqFilter) matchReq = (j.requisito || "").includes(activeReqFilter);
            let matchGenres = true;
            if (selectedGenres.length > 0) {
                const gameGenres = (j.generos || []).map(g => g.toLowerCase());
                matchGenres = selectedGenres.every(sel => gameGenres.includes(sel));
            }
            return matchText && matchReq && matchGenres;
        });
        paginaActual = 1;
        renderizarJuegos();
    }

    // --- CORE ---
    async function cargarJuegos() {
        const snap = await getDocs(collection(db, "juegos"));
        juegos = [];
        snap.forEach(d => juegos.push({id: d.id, ...d.data()}));
        juegosFiltrados = [...juegos];
        renderizarJuegos();
    }

    function getAvgRating(juego) {
        const ratings = juego.puntuaciones || {};
        const values = Object.values(ratings);
        const count = values.length;
        if(count===0) return 0;
        const sum = values.reduce((a,b) => a+b, 0);
        return (sum / count).toFixed(1);
    }

    function renderizarJuegos() {
        gameList.innerHTML = "";
        const inicio = (paginaActual - 1) * juegosPorPagina;
        const fin = inicio + juegosPorPagina;
        const pagina = juegosFiltrados.slice(inicio, fin);

        if(pagina.length === 0) {
            gameList.innerHTML = "<h3 style='grid-column: 1/-1; text-align:center; color:#666;'>No se encontraron juegos.</h3>";
            return;
        }

        pagina.forEach(juego => {
            const card = document.createElement('div');
            card.className = "game";
            const esFav = favoritos.includes(juego.titulo);
            const heartClass = esFav ? "fa-solid fa-heart fav" : "fa-regular fa-heart";
            const rating = getAvgRating(juego);

            card.onclick = (e) => { if(!e.target.closest('.heart')) abrirDescargas(juego); };
            card.oncontextmenu = (e) => {
                if(esAdmin) {
                    e.preventDefault();
                    juegoSeleccionadoId = juego.id;
                    contextMenu.style.top = `${e.pageY}px`;
                    contextMenu.style.left = `${e.pageX}px`;
                    contextMenu.style.display = 'block';
                }
            };

            let ratingHtml = rating > 0 ? `<div class="card-rating"><i class="fa-solid fa-star"></i> ${rating}</div>` : '';

            card.innerHTML = `
                <img src="${juego.imagen}" alt="${juego.titulo}" onerror="this.src='https://via.placeholder.com/220x320?text=Sin+Imagen'">
                ${ratingHtml}
                <div class="title-overlay">${juego.titulo}</div>
                <div class="heart" onclick="window.toggleFav('${juego.titulo}', this); event.stopPropagation();">
                    <i class="${heartClass}"></i>
                </div>
            `;
            gameList.appendChild(card);
        });

        document.getElementById('pageIndicator').innerText = `Página ${paginaActual}`;
        document.getElementById('btnPrevPage').disabled = paginaActual === 1;
        document.getElementById('btnNextPage').disabled = fin >= juegosFiltrados.length;
    }

    window.accionContexto = async (accion) => {
        if(!juegoSeleccionadoId && accion !== 'agregar') return;
        contextMenu.style.display = 'none';
        if(accion === 'editar') window.abrirEditar(juegoSeleccionadoId);
        else if(accion === 'borrar') {
            if(confirm("¿Seguro que quieres borrar este juego?")) {
                try { await deleteDoc(doc(db, "juegos", juegoSeleccionadoId)); cargarJuegos(); } catch(e) { alert("Error"); }
            }
        }
    };
    
    window.abrirModalAgregar = () => {
        document.getElementById('modalAdmin').style.display = 'flex';
        document.getElementById('form-add-game').reset();
        document.getElementById('new-links-container').innerHTML = '';
        window.agregarInputLink('new-links-container');
    };

    function cargarNotificaciones() {
        const lista = document.getElementById('notif-list');
        lista.innerHTML = "";
        const ultimos = [...juegos].sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 5);
        if(ultimos.length === 0) lista.innerHTML = "<div style='padding:10px; color:#aaa'>No hay novedades.</div>";
        ultimos.forEach(j => {
            const div = document.createElement('div');
            div.className = "notif-item";
            div.onclick = () => abrirDescargas(j);
            const fecha = j.fecha ? new Date(j.fecha).toLocaleDateString() : "Reciente";
            div.innerHTML = `<div style="font-weight:bold;">${j.titulo}</div><span class="notif-date"><i class="fa-regular fa-clock"></i> ${fecha}</span>`;
            lista.appendChild(div);
        });
    }

    window.abrirJuegoAleatorio = () => {
        if(juegos.length === 0) return;
        const random = juegos[Math.floor(Math.random() * juegos.length)];
        abrirDescargas(random);
    };

    // --- VIDEO, RATINGS & DOWNLOADS ---
    function getYoutubeId(url) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    window.preVote = (val) => {
        pendingVote = val;
        renderStars(val);
        document.getElementById('btn-send-vote').style.display = 'block';
        document.getElementById('btn-send-vote').innerText = `Manda (${val})`;
    };

    window.submitVote = async () => {
        if(!usuarioActual) { alert("Debes iniciar sesión para votar."); return; }
        if(!currentGameOpen || pendingVote === 0) return;
        
        const gameRef = doc(db, "juegos", currentGameOpen.id);
        const key = `puntuaciones.${usuarioActual.uid}`;
        try {
            await updateDoc(gameRef, { [key]: pendingVote });
            const updatedSnap = await getDoc(gameRef);
            const updatedGame = {id: updatedSnap.id, ...updatedSnap.data()};
            const idx = juegos.findIndex(j => j.id === currentGameOpen.id);
            if(idx !== -1) juegos[idx] = updatedGame;
            currentGameOpen = updatedGame;
            updateRatingDisplay(updatedGame);
            document.getElementById('btn-send-vote').innerText = "¡Guardado!";
            setTimeout(() => document.getElementById('btn-send-vote').style.display = 'none', 2000);
            renderizarJuegos(); // Actualizar tarjeta
        } catch(e) { console.error(e); }
    };

    function updateRatingDisplay(juego) {
        const ratings = juego.puntuaciones || {};
        const values = Object.values(ratings);
        const count = values.length;
        const sum = values.reduce((a,b) => a+b, 0);
        const avg = count > 0 ? (sum / count).toFixed(1) : "0.0";
        document.getElementById('rating-score').innerText = avg;
        document.getElementById('rating-count').innerText = `(${count} votos)`;
        const myVote = ratings[usuarioActual?.uid] || 0;
        renderStars(myVote);
    }

    function renderStars(score) {
        const stars = document.querySelectorAll('#star-rating-display i');
        stars.forEach((star, index) => {
            if (index < score) {
                star.classList.remove('fa-regular');
                star.classList.add('fa-solid', 'gold');
            } else {
                star.classList.remove('fa-solid', 'gold');
                star.classList.add('fa-regular');
            }
        });
    }

    function abrirDescargas(juego) {
        currentGameOpen = juego;
        const modal = document.getElementById('modalDownloads');
        const list = document.getElementById('download-buttons-list');
        const meta = document.getElementById('game-meta-info');
        const trailerDiv = document.getElementById('trailer-container');
        document.getElementById('download-title').innerText = juego.titulo;
        const ytId = juego.trailerUrl ? getYoutubeId(juego.trailerUrl) : null;
        if (ytId) {
            trailerDiv.style.display = 'block';
            trailerDiv.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        } else {
            trailerDiv.style.display = 'none';
            trailerDiv.innerHTML = '';
        }
        const generosStr = (juego.generos || []).join(' • ') || "Varios";
        meta.innerHTML = `<div><i class="fa-solid fa-calendar"></i> ${juego.fechaSalida || 'N/A'} &nbsp;|&nbsp; <i class="fa-solid fa-hard-drive"></i> ${juego.peso || 'N/A'}</div><div style="margin-top:5px; color:var(--primary);">${generosStr}</div>`;
        updateRatingDisplay(juego);
        list.innerHTML = "";
        const enlaces = juego.enlaces || (juego.link ? [{servidor: "Descarga", url: juego.link, nota: "Link Directo"}] : []);
        if(enlaces.length === 0) list.innerHTML = "<p style='color:#aaa; grid-column:1/-1;'>No hay enlaces disponibles.</p>";
        enlaces.forEach(link => {
            let icon = "fa-solid fa-download";
            let serverName = link.servidor.toLowerCase();
            if(serverName.includes("mediafire")) icon = "fa-solid fa-fire";
            else if(serverName.includes("mega")) icon = "fa-solid fa-cloud";
            else if(serverName.includes("drive") || serverName.includes("google")) icon = "fa-brands fa-google-drive";
            else if(serverName.includes("torrent")) icon = "fa-solid fa-magnet";
            const a = document.createElement('a');
            a.className = "dl-btn-card";
            a.href = link.url; a.target = "_blank";
            const notaHtml = link.nota ? `<span class="dl-note">${link.nota}</span>` : '';
            a.innerHTML = `<i class="${icon} dl-server-icon"></i><span class="dl-server-name">${link.servidor}</span>${notaHtml}`;
            list.appendChild(a);
        });
        modal.style.display = 'flex';
    }

    // --- ADMIN ---
    window.agregarInputLink = (contId, srv='Mediafire', url='', nota='') => {
        const div = document.createElement('div');
        div.className = "link-row";
        div.innerHTML = `
            <select class="srv-in" style="width:30%">
                <option value="Mediafire" ${srv==='Mediafire'?'selected':''}>Mediafire</option>
                <option value="Mega" ${srv==='Mega'?'selected':''}>Mega</option>
                <option value="Google Drive" ${srv==='Google Drive'?'selected':''}>Google Drive</option>
                <option value="Torrent" ${srv==='Torrent'?'selected':''}>Torrent</option>
                <option value="Otro" ${!['Mediafire','Mega','Google Drive','Torrent'].includes(srv)?'selected':''}>Otro</option>
            </select>
            <input type="text" placeholder="Etiqueta" class="note-in" style="width:20%" value="${nota}">
            <input type="url" placeholder="URL" class="url-in" style="width:40%" value="${url}">
            <button type="button" class="btn-remove" onclick="this.parentElement.remove()"><i class="fa-solid fa-trash"></i></button>
        `;
        document.getElementById(contId).appendChild(div);
    };

    const getLinks = (id) => Array.from(document.querySelectorAll(`#${id} .link-row`)).map(r => ({
        servidor: r.querySelector('.srv-in').value,
        url: r.querySelector('.url-in').value,
        nota: r.querySelector('.note-in').value
    })).filter(l => l.url);
    
    const getGens = (cls) => Array.from(document.querySelectorAll(`.${cls}:checked`)).map(c => c.value);

    document.getElementById('form-add-game').addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!esAdmin) return;
        const newGame = {
            titulo: document.getElementById('new-title').value,
            imagen: document.getElementById('new-image').value,
            trailerUrl: document.getElementById('new-trailer').value,
            fechaSalida: document.getElementById('new-date').value,
            peso: document.getElementById('new-size').value,
            requisito: document.getElementById('new-req').value, 
            generos: getGens('chk-genre'),
            enlaces: getLinks('new-links-container'),
            fecha: new Date().toISOString(),
            puntuaciones: {} 
        };
        try {
            await addDoc(collection(db, "juegos"), newGame);
            alert("¡Juego Publicado!");
            document.getElementById('modalAdmin').style.display = 'none';
            cargarJuegos();
        } catch(e) { alert("Error: " + e.message); }
    });

    window.abrirEditar = (id) => {
        const j = juegos.find(x => x.id === id);
        if(!j) return;
        document.getElementById('edit-id').value = id;
        document.getElementById('edit-title').value = j.titulo;
        document.getElementById('edit-image').value = j.imagen;
        document.getElementById('edit-trailer').value = j.trailerUrl || "";
        document.getElementById('edit-date').value = j.fechaSalida || "";
        document.getElementById('edit-size').value = j.peso || "";
        document.getElementById('edit-req').value = j.requisito || "medios";
        document.querySelectorAll('.chk-genre-edit').forEach(c => c.checked = (j.generos || []).includes(c.value));
        const cont = document.getElementById('edit-links-container');
        cont.innerHTML = "";
        const links = j.enlaces || (j.link ? [{servidor:"Mediafire", url:j.link, nota: "Descarga"}] : []);
        links.forEach(l => window.agregarInputLink('edit-links-container', l.servidor, l.url, l.nota || ""));
        if(links.length===0) window.agregarInputLink('edit-links-container');
        document.getElementById('modalEdit').style.display = 'flex';
    };

    document.getElementById('form-edit-game').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const upd = {
            titulo: document.getElementById('edit-title').value,
            imagen: document.getElementById('edit-image').value,
            trailerUrl: document.getElementById('edit-trailer').value,
            fechaSalida: document.getElementById('edit-date').value,
            peso: document.getElementById('edit-size').value,
            requisito: document.getElementById('edit-req').value,
            generos: getGens('chk-genre-edit'),
            enlaces: getLinks('edit-links-container')
        };
        try {
            await updateDoc(doc(db, "juegos", id), upd);
            alert("Editado correctamente");
            document.getElementById('modalEdit').style.display = 'none';
            cargarJuegos();
        } catch(e) { alert(e.message); }
    });

    // --- UTILS ---
    window.toggleFav = (t, btn) => {
        if(favoritos.includes(t)) favoritos = favoritos.filter(x => x !== t);
        else favoritos.push(t);
        localStorage.setItem("favoritos", JSON.stringify(favoritos));
        renderizarJuegos();
    };
    
    window.toggleMostrarFavoritos = (btn) => {
        if(gameList.classList.contains('solo-favs')) {
            gameList.classList.remove('solo-favs');
            btn.classList.remove('active-menu');
            juegosFiltrados = [...juegos];
        } else {
            gameList.classList.add('solo-favs');
            btn.classList.add('active-menu');
            juegosFiltrados = juegos.filter(j => favoritos.includes(j.titulo));
        }
        paginaActual = 1; renderizarJuegos();
    };
    
    window.abrirModalCorreo = () => document.getElementById('modalCorreo').style.display='flex';
    
    window.toggleBuscador = (btn) => {
        buscadorExpandido.classList.toggle('visible');
        if(buscadorExpandido.classList.contains('visible')) btn.classList.add('active-menu');
        else btn.classList.remove('active-menu');
    };
    
    window.toggleModo = () => {
        document.body.classList.toggle('light');
    };

    document.getElementById('btnPrevPage').onclick = () => { paginaActual--; renderizarJuegos(); window.scrollTo(0,0); };
    document.getElementById('btnNextPage').onclick = () => { paginaActual++; renderizarJuegos(); window.scrollTo(0,0); };

    window.toggleGameInput = () => {
        const val = document.getElementById('contact-reason').value;
        const grp = document.getElementById('game-input-group');
        if(val === 'Link Caído' || val === 'Juego Roto') grp.style.display = 'block'; else grp.style.display = 'none';
    };

    document.getElementById('contact-game-name').addEventListener('input', function() {
        const val = this.value.toLowerCase();
        const list = document.getElementById('contact-autocomplete-list');
        if(!val) { list.style.display='none'; return; }
        const matches = juegos.filter(j => j.titulo.toLowerCase().includes(val)).slice(0,3);
        list.innerHTML='';
        if(matches.length>0) {
            matches.forEach(j=>{
                const div=document.createElement('div');
                div.className='autocomplete-item';
                div.innerText=j.titulo;
                div.onclick=()=>{ document.getElementById('contact-game-name').value=j.titulo; list.style.display='none'; }
                list.appendChild(div);
            });
            list.style.display='block';
        } else list.style.display='none';
    });

    window.hacermeAdmin = async () => {
        if(usuarioActual) {
            await updateDoc(doc(db, "usuarios", usuarioActual.uid), {rol: "admin"});
            alert("Ahora eres Admin. Recarga la página.");
        }
    };