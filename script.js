import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, getDoc, arrayUnion, arrayRemove, updateDoc, deleteDoc, deleteField, increment, query, orderBy, where, collectionGroup, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

let juegos = [];
let juegosFiltrados = [];
let paginaActual = 1;
const juegosPorPagina = 42; 

let usuarioActual = null;
let userData = null; 
let currentUserRole = "user"; 
let esAdmin = false;
let esDios = false; 
let esInvitado = false;
let usuarioBaneado = false;
let favoritos = JSON.parse(localStorage.getItem("favoritos") || "[]");
let juegoSeleccionadoId = null; 
let usuarioSeleccionadoUid = null;
let currentGameOpen = null; 
let pendingVote = 0;
let allUsersCache = []; 
let respondingToId = null;
let currentCommentLimit = 30; 
let paginaGuardadaAntesDeBusqueda = 1; 
let paginaGuardadaAntesDeFavs = 1;
let isViewingFavs = false;
let listaGeneros = []; 

// Para el carrusel y su evento de arrastre
window.carouselInterval = null;
window.isDraggingCarousel = false;

const malasPalabras = ["estupido", "mierda", "puto", "idiota", "imbecil", "carajo", "verga", "pendejo", "concha", "bobo", "pelotudo","tarado","berga",];

const gameList = document.getElementById('gameList');
const loginScreen = document.getElementById('login-screen');
const loadingScreen = document.getElementById('loading-screen');
const appContent = document.getElementById('app-content');
const btnProfile = document.getElementById('btnProfile');
const profileDropdown = document.getElementById('profileDropdown');
const contextMenu = document.getElementById('contextMenu');
const notifDropdown = document.getElementById('notifDropdown');
const btnNotif = document.getElementById('btnNotif');
const searchInput = document.getElementById('searchInput');
const autocompleteList = document.getElementById('autocomplete-list');
const favsExitContainer = document.getElementById('favs-exit-container');

window.showToast = (msg, type = 'info') => {
    const container = document.getElementById('toast-container');
    const div = document.createElement('div');
    div.className = `toast ${type}`;
    div.innerHTML = type === 'success' ? `<i class="fa-solid fa-check-circle"></i> ${msg}` : `<i class="fa-solid fa-info-circle"></i> ${msg}`;
    container.appendChild(div);
    setTimeout(() => { div.style.opacity='0'; setTimeout(()=>div.remove(), 300); }, 3000);
};

window.onpopstate = (event) => {
    if (event.state && event.state.page) {
        paginaActual = event.state.page;
        renderizarJuegos();
    }
};

const iconosPosibles = ['fa-gamepad', 'fa-desktop', 'fa-ghost', 'fa-dragon', 'fa-chess-knight', 'fa-puzzle-piece', 'fa-headset', 'fa-microchip', 'fa-bolt', 'fa-fire'];
const palabrasRandom = ["GAME OVER", "PRESS START", "LEVEL UP", "FATALITY", "WINS", "LOADING...", "INSERT COIN","codigo konami"];

for(let i=0; i<20; i++) {
    const icon = document.createElement('i');
    icon.classList.add('fa-solid', iconosPosibles[Math.floor(Math.random() * iconosPosibles.length)], 'floating-element');
    icon.style.left = Math.random() * 100 + 'vw';
    icon.style.top = Math.random() * 100 + 'vh';
    icon.style.fontSize = (Math.random() * 30 + 10) + 'px';
    icon.animate([
        { transform: `translate(0, 0) rotate(0deg)` },
        { transform: `translate(${Math.random()*100 - 50}px, ${Math.random()*100 - 50}px) rotate(360deg)` }
    ], {
        duration: 3000,
        iterations: Infinity,
        direction: 'alternate'
    });
    loadingScreen.appendChild(icon);
}
for(let i=0; i<10; i++) {
    const span = document.createElement('span');
    span.innerText = palabrasRandom[Math.floor(Math.random() * palabrasRandom.length)];
    span.classList.add('floating-element');
    span.style.left = Math.random() * 80 + 'vw';
    span.style.top = Math.random() * 80 + 'vh';
    span.style.fontSize = (Math.random() * 1 + 0.5) + 'rem';
    span.style.opacity = '0.3';
    loadingScreen.appendChild(span);
}

function formatearFecha(fechaStr) {
    if(!fechaStr) return "Sin fecha";
    try {
        if(fechaStr.includes('T')) {
            const d = new Date(fechaStr);
            return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
        }
        const parts = fechaStr.split('-');
        if(parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    } catch(e) { return fechaStr; }
    return fechaStr;
}

function normalizarTexto(txt) {
    return txt ? txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
}

function censurarTexto(texto) {
    let textoLimpio = texto;
    malasPalabras.forEach(palabra => {
        const regex = new RegExp(`\\b${palabra}\\b`, "gi");
        textoLimpio = textoLimpio.replace(regex, "****");
    });
    return textoLimpio;
}

document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") { 
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); 
        if (document.getElementById('game-details-page').style.display === 'block') {
            window.cerrarGameDetails();
        }
    }
    if (e.key === "/" && !document.querySelector('input:focus') && !document.querySelector('textarea:focus')) { e.preventDefault(); document.getElementById('searchInput').focus(); }
    if (e.key === "ArrowRight" && document.getElementById('app-content').style.display !== 'none') {
        const total = Math.ceil(juegosFiltrados.length / juegosPorPagina);
        if(paginaActual < total) { paginaActual++; renderizarJuegos(); window.scrollTo(0,0); }
    }
    if (e.key === "ArrowLeft" && document.getElementById('app-content').style.display !== 'none') {
        if(paginaActual > 1) { paginaActual--; renderizarJuegos(); window.scrollTo(0,0); }
    }
});

document.getElementById('new-comment-text').addEventListener('keydown', (e) => {
    if(e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        enviarComentario();
    }
});

document.getElementById('btn-guest-login').onclick = () => {
    esInvitado = true;
    usuarioActual = null;
    esAdmin = false;
    esDios = false;
    usuarioBaneado = false;
    
    loadingScreen.style.opacity = '0';
    loginScreen.style.opacity = '0';
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('login-screen').style.display = 'none';
        appContent.style.display = 'block';
    }, 500);

    document.getElementById('user-email-display').innerText = "Invitado (Local)";
    document.getElementById('user-role-display').innerText = "USUARIO";
    document.getElementById('contact-user-info').innerText = "Modo Invitado (Sin envio)";
    document.getElementById('btnApelar').style.display = 'none';
    document.getElementById('btnAdminTools').style.display = 'none';
    document.getElementById('btnAdminNotes').style.display = 'none';
    
    cargarJuegos();
};

onAuthStateChanged(auth, async (user) => {
    setTimeout(async () => {
        if (user) {
            esInvitado = false;
            usuarioActual = user;
            
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loading-screen').style.display = 'none';
                document.getElementById('login-screen').style.display = 'none'; 
                appContent.style.display = 'block';
                setTimeout(() => {
                    const push = document.getElementById('push-donation');
                    push.classList.add('show');
                    setTimeout(() => push.classList.remove('show'), 6000);
                }, 2000);
            }, 500); 

            document.getElementById('user-email-display').innerText = user.displayName || user.email;
            document.getElementById('contact-user-info').innerText = `Enviando como: ${user.email}`;
            document.getElementById('contact-email-hidden').value = user.email;
            document.getElementById('contact-name-hidden').value = user.displayName || "Usuario";
            
            if(user.photoURL) {
                document.getElementById('btnProfile').innerHTML = `<img src="${user.photoURL}" alt="P">`;
            } else {
                document.getElementById('btnProfile').innerHTML = `<i class="fa-solid fa-user-astronaut"></i>`;
            }

            try {
                const userDoc = await getDoc(doc(db, "usuarios", user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    userData = data; 
                    currentUserRole = data.rol || "user";
                    
                    if (data.favoritos && Array.isArray(data.favoritos)) {
                        favoritos = data.favoritos;
                        localStorage.setItem("favoritos", JSON.stringify(favoritos));
                    }
                    
                    document.getElementById('user-role-display').innerText = currentUserRole.toUpperCase();

                    if (data.rol === "dios") {
                        esDios = true; esAdmin = true;
                        document.getElementById('btnAdminTools').style.display = 'block';
                        document.getElementById('btnAdminNotes').style.display = 'block';
                        document.getElementById('spam-warning').style.display = 'none';
                    } else if (data.rol === "admin") {
                        esAdmin = true; esDios = false;
                        document.getElementById('btnAdminTools').style.display = 'block';
                        document.getElementById('btnAdminNotes').style.display = 'block';
                        document.getElementById('spam-warning').style.display = 'none';
                    } else {
                        esAdmin = false; esDios = false;
                        document.getElementById('btnAdminTools').style.display = 'none';
                        document.getElementById('btnAdminNotes').style.display = 'none';
                        document.getElementById('spam-warning').style.display = 'block';
                    }

                    if (data.baneado) {
                        usuarioBaneado = true;
                        document.getElementById('btnApelar').style.display = 'block';
                        showToast("Has sido baneado por mal comportamiento.", "error");
                    } else {
                        usuarioBaneado = false;
                        document.getElementById('btnApelar').style.display = 'none';
                    }

                    if(!userData.visitedGames) await updateDoc(doc(db, "usuarios", user.uid), { visitedGames: 0 });
                } else {
                    await setDoc(doc(db, "usuarios", user.uid), { email: user.email, rol: "user", insultos: 0, baneado: false, visitedGames: 0 });
                    userData = { visitedGames: 0 };
                    document.getElementById('user-role-display').innerText = "USUARIO";
                }
            } catch (e) {console.error(e)}
            
            cargarJuegos();
            
        } else if (!esInvitado) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loading-screen').style.display = 'none';
                document.getElementById('login-screen').style.display = 'flex';
                document.getElementById('login-screen').style.opacity = '1';
                appContent.style.display = 'none';
            }, 500);
            usuarioActual = null;
            esAdmin = false;
            esDios = false;
        }
    }, 3000); 
});

document.getElementById('btn-google-login').onclick = async () => {
    try {
        const res = await signInWithPopup(auth, googleProvider);
        const ref = doc(db, "usuarios", res.user.uid);
        const snap = await getDoc(ref);
        if(!snap.exists()) await setDoc(ref, { email: res.user.email, rol: "user", insultos: 0, baneado: false, visitedGames: 0 });
    } catch(e) { console.error(e); }
};

document.getElementById('btnLogout').onclick = () => {
    if(esInvitado) window.location.reload(); else signOut(auth);
};

window.toggleMenu = (btn, id) => {
    const el = document.getElementById(id);
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

btnProfile.onclick = (e) => { e.stopPropagation(); window.toggleMenu(btnProfile, 'profileDropdown'); };
btnNotif.onclick = (e) => { e.stopPropagation(); window.toggleMenu(btnNotif, 'notifDropdown'); window.cargarNotificaciones(); };

window.onclick = (e) => { 
    if (!e.target.closest('#btnProfile') && !e.target.closest('#btnNotif')) {
        document.querySelectorAll('.profile-dropdown, .notif-dropdown').forEach(d => d.style.display='none');
        document.querySelectorAll('#menuClosed button').forEach(b => b.classList.remove('active-menu'));
    }
    if (!e.target.closest('#contextMenu')) contextMenu.style.display = 'none';
    if (!e.target.closest('.search-input-wrapper')) autocompleteList.style.display = 'none';
    
    document.getElementById('contact-autocomplete-list').style.display = 'none';
    document.getElementById('admin-autocomplete-list').style.display = 'none';
    
    if(e.target.classList.contains('modal')) {
        if(e.target.id === 'modalAdmin' || e.target.id === 'modalEdit') {
            if(confirm("Estas seguro? Se perderan los datos si sales.")) {
                e.target.style.display = 'none';
                document.body.classList.remove('no-scroll');
            }
        } else {
            e.target.style.display = 'none';
            document.body.classList.remove('no-scroll');
        }
    }
};

document.addEventListener('contextmenu', (e) => {
    if(e.target.classList.contains('user-name-span')) return;

    if (esAdmin) {
        e.preventDefault();
        e.stopPropagation();
        
        contextMenu.style.top = `${e.pageY}px`;
        contextMenu.style.left = `${e.pageX}px`;
        contextMenu.style.display = 'block';

        if (e.target.closest('.game')) {
            juegoSeleccionadoId = null; 
            document.getElementById('ctx-game-actions').style.display = 'block';
            document.getElementById('ctx-global-actions').style.display = 'none';
            document.getElementById('ctx-user-actions').style.display = 'none';
        } else if (e.target.closest('#menuClosed') || e.target.closest('.modal')) {
            contextMenu.style.display = 'none';
        } else {
            document.getElementById('ctx-game-actions').style.display = 'none';
            document.getElementById('ctx-global-actions').style.display = 'block'; 
            document.getElementById('ctx-user-actions').style.display = 'none';
        }
    }
});

window.cerrarModalConConfirmacion = (id) => {
    if(confirm("Estas seguro? Se perderan los datos si sales.")) {
        document.getElementById(id).style.display = 'none';
        document.body.classList.remove('no-scroll');
    }
};

searchInput.addEventListener('input', function() {
    const val = normalizarTexto(this.value);
    
    if(val.length > 0 && paginaActual !== 1 && paginaGuardadaAntesDeBusqueda === 1) {
         paginaGuardadaAntesDeBusqueda = paginaActual;
    }
    
    if(val.length === 0) {
        if(paginaGuardadaAntesDeBusqueda !== 1) {
            paginaActual = paginaGuardadaAntesDeBusqueda;
            paginaGuardadaAntesDeBusqueda = 1; 
        }
    } else {
        paginaActual = 1;
    }

    window.aplicarFiltrosGlobales();
    if (!val) { autocompleteList.style.display = 'none'; return; }
    const matches = juegos.filter(j => normalizarTexto(j.titulo).includes(val)).slice(0, 5);
    autocompleteList.innerHTML = '';
    if (matches.length > 0) {
        matches.forEach(j => {
            const div = document.createElement('div');
            div.className = 'autocomplete-item';
            div.innerText = j.titulo;
            div.onclick = () => {
                abrirDescargas(j);
                autocompleteList.style.display = 'none';
            };
            autocompleteList.appendChild(div);
        });
        autocompleteList.style.display = 'block';
    } else {
        autocompleteList.style.display = 'none';
    }
});


window.toggleMultiSelect = (id) => {
    const el = document.getElementById(id);
    const isVisible = el.style.display === 'flex';
    document.querySelectorAll('.select-options').forEach(opt => opt.style.display = 'none');
    if(!isVisible) el.style.display = 'flex';
};

window.aplicarFiltrosGlobales = () => {
    const texto = normalizarTexto(document.getElementById('searchInput').value);
    const selectedGenres = Array.from(document.querySelectorAll('.adv-genre-chk:checked')).map(c => c.value.toLowerCase());
    const selectedReqs = Array.from(document.querySelectorAll('.adv-req-chk:checked')).map(c => c.value.toLowerCase());
    const sortMode = document.querySelector('input[name="adv_sort"]:checked')?.value || 'date_release_new';

    let juegosBase = isViewingFavs ? juegos.filter(j => favoritos.includes(j.titulo)) : juegos;

    juegosFiltrados = juegosBase.filter(j => {
        let matchText = normalizarTexto(j.titulo).includes(texto);
        
        let matchGenres = true;
        if (selectedGenres.length > 0) {
            const gameGenres = (j.generos || []).map(g => g.toLowerCase());
            matchGenres = selectedGenres.every(sel => gameGenres.includes(sel));
        }
        
        let matchReqs = true;
        if (selectedReqs.length > 0) {
            matchReqs = selectedReqs.includes((j.requisito || "").toLowerCase());
        }
        
        return matchText && matchGenres && matchReqs;
    });

    if (sortMode === 'rating') {
        juegosFiltrados.sort((a, b) => parseFloat(getAvgRating(b)) - parseFloat(getAvgRating(a)));
    } else if (sortMode === 'date_new') {
        juegosFiltrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    } else if (sortMode === 'date_old') {
        juegosFiltrados.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    } else if (sortMode === 'date_release_new') {
        juegosFiltrados.sort((a, b) => new Date(b.fechaSalida || 0) - new Date(a.fechaSalida || 0));
    } else if (sortMode === 'date_release_old') {
        juegosFiltrados.sort((a, b) => new Date(a.fechaSalida || 0) - new Date(b.fechaSalida || 0));
    } else if (sortMode === 'alpha_az') {
        juegosFiltrados.sort((a, b) => a.titulo.localeCompare(b.titulo));
    } else if (sortMode === 'alpha_za') {
        juegosFiltrados.sort((a, b) => b.titulo.localeCompare(a.titulo));
    }

    renderizarJuegos();
};


async function cargarGenerosGlobales() {
    try {
        const docRef = doc(db, "config", "generos");
        const snap = await getDoc(docRef);
        if(snap.exists() && snap.data().lista) {
            listaGeneros = snap.data().lista;
        } else {
            listaGeneros = ["2D", "Accion", "Anime", "Aventura", "Carreras", "Deportes", "Estrategia", "Guerra", "Indie", "Multijugador", "Pantalla Dividida", "Peleas", "Plataformas", "Rol/RPG", "Shooter", "Supervivencia", "Terror", "Zombies"];
            await setDoc(docRef, { lista: listaGeneros });
        }
        renderizarChecksGenerosAvanzados();
        renderizarChecksGeneros('new');
        renderizarChecksGeneros('edit');
        renderizarListaGenerosAdmin();
    } catch(e) { console.error(e); }
}

function renderizarChecksGenerosAvanzados() {
    const cont = document.getElementById('adv-genres-list');
    if(!cont) return;
    cont.innerHTML = "";
    listaGeneros.forEach(g => {
        cont.innerHTML += `<label><input type="checkbox" value="${g}" class="adv-genre-chk" onchange="aplicarFiltrosGlobales()"> ${g}</label>`;
    });
}

function renderizarChecksGeneros(mode) {
    const cls = mode === 'new' ? 'chk-genre' : 'chk-genre-edit';
    const cont = document.getElementById(mode === 'new' ? 'add-genre-grid' : 'edit-genre-grid');
    if(!cont) return;
    cont.innerHTML = "";
    listaGeneros.forEach(g => {
        const extraStyle = (g === 'Multijugador' || g === 'Pantalla Dividida') ? 'style="accent-color:#00ff00;"' : '';
        cont.innerHTML += `<div class="genre-item"><label><input type="checkbox" value="${g}" class="${cls}" ${extraStyle}> ${g}</label></div>`;
    });
}

function renderizarListaGenerosAdmin() {
    const cont = document.getElementById('admin-genres-list');
    if(!cont) return;
    cont.innerHTML = "";
    listaGeneros.forEach(g => {
        cont.innerHTML += `<div style="display:flex; justify-content:space-between; background:#333; padding:10px; border-radius:5px; align-items:center;">
            <span>${g}</span>
            <button onclick="borrarGenero('${g}')" style="background:#ff4444; border:none; padding:5px 10px; border-radius:3px; color:white; cursor:pointer;">X</button>
        </div>`;
    });
}

window.agregarGeneroNuevo = async () => {
    const input = document.getElementById('nuevo-genero-input');
    const val = input.value.trim();
    if(!val) return;
    if(listaGeneros.includes(val)) { showToast("El genero ya existe", "error"); return; }
    
    listaGeneros.push(val);
    listaGeneros.sort();
    
    try {
        await updateDoc(doc(db, "config", "generos"), { lista: listaGeneros });
        input.value = "";
        showToast("Genero agregado", "success");
        renderizarChecksGenerosAvanzados();
        renderizarChecksGeneros('new');
        renderizarChecksGeneros('edit');
        renderizarListaGenerosAdmin();
    } catch(e) { showToast("Error", "error"); }
};

window.borrarGenero = async (g) => {
    if(!confirm("Borrar genero " + g + "?")) return;
    listaGeneros = listaGeneros.filter(x => x !== g);
    try {
        await updateDoc(doc(db, "config", "generos"), { lista: listaGeneros });
        showToast("Genero borrado", "success");
        renderizarChecksGenerosAvanzados();
        renderizarChecksGeneros('new');
        renderizarChecksGeneros('edit');
        renderizarListaGenerosAdmin();
    } catch(e) { showToast("Error", "error"); }
};


async function cargarJuegos() {
    const snap = await getDocs(collection(db, "juegos"));
    juegos = [];
    snap.forEach(d => {
        const data = d.data();
        if(!data.softDeleted) juegos.push({id: d.id, ...data});
    });
    
    juegos.sort((a,b) => new Date(b.fechaSalida || b.fecha) - new Date(a.fechaSalida || a.fecha));
    
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = parseInt(urlParams.get('page'));
    if(pageParam) paginaActual = pageParam;

    juegosFiltrados = [...juegos];
    renderizarJuegos();

    const gameId = urlParams.get('game');
    if(gameId) {
        const targetGame = juegos.find(j => j.id === gameId);
        if(targetGame) {
            setTimeout(() => abrirDescargas(targetGame), 500);
        }
    }
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
        const fechaFormateada = formatearFecha(juego.fechaSalida || juego.fecha);
        const views = juego.views || 0;

        card.onclick = (e) => { if(!e.target.closest('.heart')) abrirDescargas(juego); };
        
        card.oncontextmenu = (e) => {
            if(esAdmin) {
                e.preventDefault();
                e.stopPropagation(); 
                juegoSeleccionadoId = juego.id;
                
                document.getElementById('ctx-game-actions').style.display = 'block';
                document.getElementById('ctx-global-actions').style.display = 'none';
                document.getElementById('ctx-user-actions').style.display = 'none';

                contextMenu.style.top = `${e.pageY}px`;
                contextMenu.style.left = `${e.pageX}px`;
                contextMenu.style.display = 'block';
            }
        };

        let ratingHtml = rating > 0 ? 
            `<div class="card-rating">
                <i class="fa-solid fa-star"></i> ${rating}
                <div class="view-count-icon"><i class="fa-solid fa-eye"></i> ${views}</div>
             </div>` 
            : `<div class="card-rating"><div class="view-count-icon" style="margin-left:0"><i class="fa-solid fa-eye"></i> ${views}</div></div>`;

        card.innerHTML = `
            <img src="${juego.imagen}" alt="${juego.titulo}" loading="lazy" onerror="this.src='https://via.placeholder.com/220x320?text=Sin+Imagen'">
            ${ratingHtml}
            <div class="top-icons">
                <div class="heart" onclick="window.toggleFav('${juego.titulo}', this); event.stopPropagation();">
                    <i class="${heartClass}"></i>
                </div>
            </div>
            <div class="title-overlay">
                <div>${juego.titulo}</div>
                <div style="font-size:0.9rem; color:#aaa; margin-top:3px; font-weight:normal;">${fechaFormateada}</div>
            </div>
        `;
        gameList.appendChild(card);
    });

    renderPaginationControls();
}

function renderPaginationControls() {
    const container = document.getElementById('pagination-wrapper');
    container.innerHTML = "";
    
    const totalPaginas = Math.ceil(juegosFiltrados.length / juegosPorPagina);
    if(totalPaginas <= 1) return;

    const btnPrev = document.createElement('button');
    btnPrev.innerHTML = '<i class="fa-solid fa-chevron-left"></i> Anterior';
    if(paginaActual === 1) {
        btnPrev.disabled = true; 
        btnPrev.style.opacity = "0.5"; 
        btnPrev.style.cursor="not-allowed";
    } else {
        btnPrev.onclick = () => { paginaActual--; history.pushState({page: paginaActual}, "", `?page=${paginaActual}`); renderizarJuegos(); window.scrollTo(0,0); };
    }
    container.appendChild(btnPrev);

    let pagesToShow = [];
    for (let i = paginaActual; i <= paginaActual + 2; i++) {
        if(i <= totalPaginas) pagesToShow.push(i);
    }
    if (pagesToShow[pagesToShow.length - 1] < totalPaginas) {
        if(pagesToShow[pagesToShow.length - 1] < totalPaginas - 1) {
            pagesToShow.push('...');
        }
        pagesToShow.push(totalPaginas);
    }
    if(paginaActual > 1 && !pagesToShow.includes(1)) {
        if(pagesToShow[0] > 2) pagesToShow.unshift('...');
        pagesToShow.unshift(1);
    }

    pagesToShow.forEach(p => {
        const btn = document.createElement('button');
        btn.innerText = p;
        if(p === paginaActual) btn.classList.add('active');
        
        if (p === '...') {
            btn.disabled = true;
            btn.style.cursor = 'default';
            btn.style.background = 'transparent'; 
            btn.style.border = 'none';
        } else {
            btn.onclick = () => {
                paginaActual = p;
                history.pushState({page: p}, "", `?page=${p}`);
                window.scrollTo(0,0);
                renderizarJuegos();
            };
        }
        container.appendChild(btn);
    });

    const btnNext = document.createElement('button');
    btnNext.innerHTML = 'Siguiente <i class="fa-solid fa-chevron-right"></i>';
    if(paginaActual === totalPaginas) {
        btnNext.disabled = true; 
        btnNext.style.opacity="0.5"; 
        btnNext.style.cursor="not-allowed";
    } else {
        btnNext.onclick = () => { paginaActual++; history.pushState({page: paginaActual}, "", `?page=${paginaActual}`); renderizarJuegos(); window.scrollTo(0,0); };
    }
    container.appendChild(btnNext);
}

window.accionContexto = async (accion) => {
    if(!juegoSeleccionadoId && accion !== 'agregar') return;
    contextMenu.style.display = 'none';
    if(accion === 'editar') window.abrirEditar(juegoSeleccionadoId);
    else if(accion === 'borrar') {
        if(confirm("Mover a papelera? (Se borrara en 30 dias)")) {
            try { 
                await updateDoc(doc(db, "juegos", juegoSeleccionadoId), { softDeleted: true, deletedAt: new Date().toISOString() }); 
                showToast("Juego movido a papelera", "success");
                cargarJuegos(); 
            } catch(e) { showToast("Error al borrar", "error"); }
        }
    }
};

window.accionUsuario = async (accion) => {
    if(!usuarioSeleccionadoUid) return;
    contextMenu.style.display = 'none';
    
    if(accion === 'banear') {
        const targetSnap = await getDoc(doc(db, "usuarios", usuarioSeleccionadoUid));
        if(targetSnap.exists() && (targetSnap.data().rol === 'admin' || targetSnap.data().rol === 'dios')) {
            showToast("PROTECCION ADMIN: No puedes banear a un Administrador.", "error");
            return;
        }

        if(confirm("Banear a este usuario?")) {
            await updateDoc(doc(db, "usuarios", usuarioSeleccionadoUid), { baneado: true });
            showToast("Usuario baneado.", "success");
        }
    } else if(accion === 'desbanear') {
        if(confirm("Desbanear usuario y borrar historial (Desvanecer)?")) {
            const comentariosRef = query(collectionGroup(db, 'comentarios'), where('uid', '==', usuarioSeleccionadoUid));
            const comentariosSnap = await getDocs(comentariosRef);
            const deletePromises = comentariosSnap.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);

            await updateDoc(doc(db, "usuarios", usuarioSeleccionadoUid), { 
                baneado: false, 
                insultos: 0, 
                historialInsultos: deleteField(), 
                apelacion: deleteField() 
            });
            showToast("Usuario desbaneado. Historial borrado.", "success");
        }
    }
};

window.abrirModalAgregar = () => {
    document.body.classList.add('no-scroll');
    document.getElementById('modalAdmin').style.display = 'flex';
    document.getElementById('form-add-game').reset();
    document.getElementById('new-links-container').innerHTML = '';
    window.agregarInputLink('new-links-container');
};

window.cargarNotificaciones = () => {
    const lista = document.getElementById('notif-list');
    lista.innerHTML = "";
    const ultimos = [...juegos].sort((a,b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 5);
    if(ultimos.length === 0) lista.innerHTML = "<div style='padding:10px; color:#aaa'>No hay novedades.</div>";
    ultimos.forEach(j => {
        const div = document.createElement('div');
        div.className = "notif-item";
        div.onclick = () => abrirDescargas(j);
        const fecha = formatearFecha(j.fecha);
        div.innerHTML = `<div style="font-weight:bold;">${j.titulo}</div><span class="notif-date"> ${fecha}</span>`;
        lista.appendChild(div);
    });
};

window.abrirJuegoAleatorio = () => {
    if(juegos.length === 0) return showToast("Cargando juegos...", "error");
    const random = juegos[Math.floor(Math.random() * juegos.length)];
    abrirDescargas(random);
};

function getYoutubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

window.preVote = (val) => {
    if(esInvitado) return showToast("Los invitados no pueden votar.", "error");
    pendingVote = val;
    renderStars(val);
    document.getElementById('btn-send-vote').style.display = 'block';
    document.getElementById('btn-send-vote').innerText = `Manda (${val})`;
};

window.submitVote = async () => {
    if(esInvitado) return showToast("Inicia sesion para votar.", "error");
    if(!usuarioActual) { showToast("Inicia sesion para votar.", "error"); return; }
    if(usuarioBaneado) { showToast("Estas baneado, no puedes votar.", "error"); return; }
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
        document.getElementById('btn-send-vote').innerText = "Guardado!";
        setTimeout(() => document.getElementById('btn-send-vote').style.display = 'none', 2000);
        renderizarJuegos();
        showToast("Voto guardado", "success");
    } catch(e) { console.error(e); }
};

function updateRatingDisplay(juego) {
    const ratings = juego.puntuaciones || {};
    const values = Object.values(ratings);
    const count = values.length;
    const sum = values.reduce((a,b) => a+b, 0);
    const avg = count > 0 ? (sum / count).toFixed(1) : "0.0";
    document.getElementById('rating-score').innerText = avg + "/10";
    document.getElementById('rating-count').innerText = `(${count} votos)`;
    const myVote = ratings[usuarioActual?.uid] || 0;
    renderStars(myVote);
}

function renderStars(score) {
    score = parseFloat(score);
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

window.enviarComentario = async () => {
    if(esInvitado) return showToast("No puedes comentar en Modo invitado.", "error");
    if(!usuarioActual) { showToast("Inicia sesion para comentar.", "error"); return; }
    
    const userRef = doc(db, "usuarios", usuarioActual.uid);
    const userSnap = await getDoc(userRef);
    if(userSnap.exists() && userSnap.data().baneado) {
        usuarioBaneado = true;
        showToast("Estas baneado. No puedes comentar.", "error");
        return;
    }

    let text = document.getElementById('new-comment-text').value;
    if(!text.trim()) return;

    const textoFinal = censurarTexto(text);

    try {
        await addDoc(collection(db, "juegos", currentGameOpen.id, "comentarios"), {
            user: usuarioActual.displayName || "Usuario",
            uid: usuarioActual.uid,
            role: currentUserRole, 
            photo: usuarioActual.photoURL || null,
            text: textoFinal,
            date: new Date().toISOString(),
            parentId: respondingToId || null,
            anclado: false,
            reactions: {}
        });
        document.getElementById('new-comment-text').value = "";
        cancelarRespuesta();
        cargarComentarios(currentGameOpen.id);
        showToast("Comentario enviado", "success");
    } catch(e) { console.error(e); }
};

document.getElementById('btn-load-more-comments').addEventListener('click', () => {
    currentCommentLimit += 30;
    cargarComentarios(currentGameOpen.id);
});

async function cargarComentarios(gameId, highlightId = null) {
    const list = document.getElementById('comments-list');
    const btnMore = document.getElementById('btn-load-more-comments');
    if(currentCommentLimit === 30) list.innerHTML = "<p style='color:#888'>Cargando...</p>";
    
    const q = query(collection(db, "juegos", gameId, "comentarios"));
    
    try {
        const snap = await getDocs(q);
        list.innerHTML = "";
        if(snap.empty) { list.innerHTML = "<p style='color:#888; text-align:center;'>Se el primero en comentar.</p>"; btnMore.style.display='none'; return; }
        
        let allComments = [];
        snap.forEach(d => allComments.push({id: d.id, ...d.data()}));
        
        allComments.sort((a, b) => {
            if (a.anclado && !b.anclado) return -1;
            if (!a.anclado && b.anclado) return 1;
            return new Date(a.date) - new Date(b.date);
        });

        const parents = allComments.filter(c => !c.parentId);
        
        const visibleParents = parents.slice(0, currentCommentLimit);
        
        if(parents.length > currentCommentLimit) {
            btnMore.style.display = 'block';
        } else {
            btnMore.style.display = 'none';
        }

        visibleParents.forEach(p => {
            renderCommentItem(list, p, gameId, false, highlightId === p.id);
            
            const replies = allComments.filter(r => r.parentId === p.id);
            if (replies.length > 0) {
                const toggleBtn = document.createElement('div');
                toggleBtn.className = "toggle-replies-btn";
                toggleBtn.innerHTML = `<span>---- Ver ${replies.length} respuestas ----</span>`;
                
                const repliesContainer = document.createElement('div');
                repliesContainer.className = "replies-container";
                
                replies.forEach(r => renderCommentItem(repliesContainer, r, gameId, true, highlightId === r.id));
                
                let shouldOpen = replies.some(r => r.id === highlightId);
                if(respondingToId === p.id) shouldOpen = true;

                toggleBtn.onclick = () => {
                    const isHidden = repliesContainer.style.display === "none" || repliesContainer.style.display === "";
                    repliesContainer.style.display = isHidden ? "flex" : "none";
                    toggleBtn.innerHTML = isHidden ? `<span>---- Ocultar respuestas ----</span>` : `<span>---- Ver ${replies.length} respuestas ----</span>`;
                };

                if(shouldOpen) {
                    repliesContainer.style.display = "flex";
                    toggleBtn.innerHTML = `<span>---- Ocultar respuestas ----</span>`;
                }

                list.appendChild(toggleBtn);
                list.appendChild(repliesContainer);
            }
        });

        if(highlightId) {
            setTimeout(() => {
                const el = document.getElementById(`comment-${highlightId}`);
                if(el) el.scrollIntoView({behavior: 'smooth', block: 'center'});
            }, 500);
        }

    } catch(e) { console.error(e); list.innerHTML = "<p>Error cargando comentarios.</p>"; }
}

function renderCommentItem(container, c, gameId, isReply, isHighlight) {
    const isMine = c.uid === usuarioActual?.uid;
    const div = document.createElement('div');
    div.className = `comment-item ${isMine ? 'mine' : ''} ${c.anclado ? 'pinned' : ''} ${isReply ? 'reply' : ''} ${isHighlight ? 'highlight-report' : ''}`;
    div.id = `comment-${c.id}`;
    
    let actions = "";
    if (esDios || isMine) {
        actions += `<button class="btn-mini-action" onclick="editarComentario('${gameId}', '${c.id}', '${c.text.replace(/'/g, "\\'")}')" style="background:#009ee3; margin-right:3px;"><i class="fa-solid fa-pen"></i></button>`;
        actions += `<button class="btn-mini-action" onclick="borrarComentario('${gameId}', '${c.id}')" style="background:#ff4444;"><i class="fa-solid fa-trash"></i></button>`;
    }
    
    if ((esAdmin || esDios) && !isReply) {
        const iconPin = c.anclado ? "fa-thumbtack-slash" : "fa-thumbtack";
        const colorPin = c.anclado ? "#777" : "var(--gold)";
        actions += `<button class="btn-mini-action" onclick="anclarComentario('${gameId}', '${c.id}', ${!c.anclado})" style="background:transparent; color:${colorPin}; border:1px solid ${colorPin}; margin-left:3px;"><i class="fa-solid ${iconPin}"></i></button>`;
    }

    if (usuarioActual && !isMine) {
        actions += `<button class="btn-mini-action" onclick="reportarComentario('${gameId}', '${c.id}', '${c.text.replace(/'/g, "\\'")}')" style="background:transparent; color:#ff4444; border:1px solid #ff4444; margin-left:3px; font-size:0.6rem;" title="Reportar"><i class="fa-solid fa-flag"></i></button>`;
    }

    const avatarUrl = c.photo || "https://ui-avatars.com/api/?name=" + c.user + "&background=random";
    const pinIcon = c.anclado ? `<i class="fa-solid fa-thumbtack pinned-icon"></i>` : '';

    let roleBadge = "";
    if (c.role === 'dios') roleBadge = `<span class="role-tag dios">DIOS</span>`;
    else if (c.role === 'admin') roleBadge = `<span class="role-tag admin">ADMIN</span>`;
    else roleBadge = `<span class="role-tag user">USUARIO</span>`;

    const usernameDisplay = `<span class="username-role ${c.role}">${c.user}</span>`;

    let replyLink = "";
    if (usuarioActual && !isReply) {
        replyLink = `<span class="reply-link" onclick="responderComentario('${c.id}', '${c.user}')">Responder</span>`;
    }

    div.innerHTML = `
        <div class="comment-actions">${actions}</div>
        <div class="comment-meta">
            <div style="display:flex; align-items:center;">
                ${pinIcon}
                <img src="${avatarUrl}" class="user-avatar" alt="av">
                <span class="user-name-span" style="cursor:pointer;" oncontextmenu="abrirContextoUsuario(event, '${c.uid}')">${usernameDisplay}</span>
                ${roleBadge}
            </div>
            <span>${new Date(c.date).toLocaleDateString()}</span>
        </div>
        <div class="comment-body" id="comment-body-${c.id}">${c.text}</div>
        
        ${replyLink}
    `;
    container.appendChild(div);
}

window.responderComentario = (id, user) => {
    if(esInvitado) return showToast("Invitado no puede responder.", "error");
    respondingToId = id;
    document.getElementById('replying-to-bar').style.display = 'flex';
    document.getElementById('reply-target-text').innerText = `Respondiendo a ${user}...`;
    document.getElementById('new-comment-text').focus();
};

window.cancelarRespuesta = () => {
    respondingToId = null;
    document.getElementById('replying-to-bar').style.display = 'none';
};

window.anclarComentario = async (gameId, commentId, estado) => {
    try {
        await updateDoc(doc(db, "juegos", gameId, "comentarios", commentId), { anclado: estado });
        cargarComentarios(gameId);
    } catch(e) { console.error(e); }
};

window.borrarComentario = async (gameId, commentId) => {
    if(!confirm("Borrar comentario?")) return;
    try {
        await deleteDoc(doc(db, "juegos", gameId, "comentarios", commentId));
        cargarComentarios(gameId); 
    } catch(e) { 
        console.error(e);
        showToast("Error al borrar.", "error");
    }
};

window.reportarComentario = async (gameId, commentId, texto) => {
    if (!esAdmin && !esDios) {
        const lastReport = localStorage.getItem('last_report_time');
        if (lastReport && (Date.now() - parseInt(lastReport)) < 3600000) {
            showToast("Debes esperar 1 hora para volver a reportar.", "error");
            return;
        }
    }

    if(!confirm("Reportar este comentario a los administradores?")) return;
    try {
        await addDoc(collection(db, "reportes"), {
            gameId: gameId,
            commentId: commentId,
            text: texto,
            reporter: usuarioActual.email,
            date: new Date().toISOString()
        });
        showToast("Reporte enviado.", "success");
        if (!esAdmin && !esDios) {
            localStorage.setItem('last_report_time', Date.now().toString());
        }
    } catch(e) { showToast("Error al reportar", "error"); }
};

window.editarComentario = (gameId, commentId, textoActual) => {
    const bodyDiv = document.getElementById(`comment-body-${commentId}`);
    bodyDiv.innerHTML = `
        <input type="text" value="${textoActual}" id="edit-input-${commentId}" style="width:100%; background:#111; border:1px solid #444; color:white; padding:5px; border-radius:5px;">
        <div style="margin-top:5px; text-align:right;">
            <button onclick="guardarEdicionComentario('${gameId}', '${commentId}')" style="background:green; color:white; border:none; padding:3px 8px; border-radius:3px; cursor:pointer;">Guardar</button>
            <button onclick="cargarComentarios('${gameId}')" style="background:#555; color:white; border:none; padding:3px 8px; border-radius:3px; cursor:pointer;">Cancelar</button>
        </div>
    `;
};

window.guardarEdicionComentario = async (gameId, commentId) => {
    const nuevoTexto = document.getElementById(`edit-input-${commentId}`).value;
    if(!nuevoTexto.trim()) return;
    const textoFinal = censurarTexto(nuevoTexto);
    try {
        await updateDoc(doc(db, "juegos", gameId, "comentarios", commentId), { text: textoFinal });
        cargarComentarios(gameId);
    } catch(e) { showToast("Error al editar.", "error"); }
};

window.abrirContextoUsuario = (e, uid) => {
    if(!esAdmin && !esDios) return;
    e.preventDefault();
    e.stopPropagation();
    usuarioSeleccionadoUid = uid;
    
    document.getElementById('ctx-game-actions').style.display = 'none';
    document.getElementById('ctx-global-actions').style.display = 'none';
    document.getElementById('ctx-user-actions').style.display = 'block';

    contextMenu.style.top = `${e.pageY}px`;
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.display = 'block';
};

window.abrirModalApelacion = () => {
    if(!usuarioBaneado) return showToast("No estas baneado.", "info");
    document.getElementById('modalApelacion').style.display = 'flex';
};

window.enviarApelacion = async () => {
    const text = document.getElementById('apelacion-text').value;
    if(!text.trim()) return showToast("Escribe algo.", "error");
    try {
        await updateDoc(doc(db, "usuarios", usuarioActual.uid), { apelacion: text });
        showToast("Apelacion enviada al administrador.", "success");
        document.getElementById('modalApelacion').style.display = 'none';
    } catch(e) { showToast("Error al enviar apelacion.", "error"); }
};

let peticionesCache = [];

document.getElementById('req-game-input').addEventListener('input', () => {
    const val = document.getElementById('req-game-input').value.toLowerCase().trim();
    if (val.length >= 3) {
        const exists = peticionesCache.some(p => normalizarTexto(p.game).includes(normalizarTexto(val)));
        if (exists) {
            document.getElementById('req-status-message').innerText = "Este juego ya esta en peticiones.";
            document.getElementById('req-status-message').style.display = 'block';
        } else {
            document.getElementById('req-status-message').style.display = 'none';
        }
    } else {
        document.getElementById('req-status-message').style.display = 'none';
    }
});

window.abrirMuroPeticiones = async () => {
    document.getElementById('modalPeticiones').style.display='flex';
    const list = document.getElementById('requests-list');
    list.innerHTML = "Cargando...";
    
    const snap = await getDocs(collection(db, "peticiones"));
    list.innerHTML = "";
    
    const reqs = [];
    snap.forEach(d => reqs.push({id: d.id, ...d.data()}));
    peticionesCache = reqs;
    
    reqs.sort((a,b) => (b.votes?.length || 0) - (a.votes?.length || 0));

    if (reqs.length === 0) { list.innerHTML = "<p style='color:#888; text-align:center;'>No hay peticiones. Se el primero en pedir un juego.</p>"; }

    reqs.forEach(r => {
        const hasVoted = (r.votes || []).includes(usuarioActual?.uid);
        const isOwner = r.uid === usuarioActual?.uid;
        const isAdminAction = esDios || esAdmin;
        
        const div = document.createElement('div');
        div.className = "request-item";
        
        let adminActions = "";
        if (isAdminAction) {
            adminActions += `<button class="agregado-btn" onclick="marcarPeticionAgregada('${r.id}')" title="Marcar como Agregado"><i class="fa-solid fa-check"></i></button>`;
        }
        if (isAdminAction || isOwner) {
            adminActions += `<button onclick="borrarPeticion('${r.id}', '${r.uid}')" title="Borrar Peticion"><i class="fa-solid fa-trash"></i></button>`;
        }

        div.innerHTML = `
            <div><strong>${r.game}</strong> <small>por ${r.user}</small></div>
            <div style="display:flex; align-items:center;">
                <button class="vote-btn ${hasVoted?'voted':''}" onclick="votarPeticion('${r.id}')">
                    <i class="fa-solid fa-caret-up"></i> ${r.votes?.length || 0}
                </button>
                <div class="req-admin-actions">${adminActions}</div>
            </div>
        `;
        list.appendChild(div);
    });
};

window.borrarPeticion = async (reqId, reqUid) => {
    if (!usuarioActual) return;
    if (reqUid !== usuarioActual.uid && !esAdmin && !esDios) {
        showToast("Solo el creador o un admin/dios puede borrar esto", "error");
        return;
    }
    if(confirm("Borrar esta peticion?")) {
        await deleteDoc(doc(db, "peticiones", reqId));
        showToast("Peticion borrada.", "success");
        abrirMuroPeticiones();
    }
};

window.marcarPeticionAgregada = async (reqId) => {
    if(!esAdmin && !esDios) return;
    if(confirm("Marcar esta peticion como agregada? Se eliminara de la lista.")) {
        await deleteDoc(doc(db, "peticiones", reqId));
        showToast("Juego marcado como agregado y peticion eliminada.", "success");
        abrirMuroPeticiones();
    }
};

window.crearPeticion = async () => {
    if(esInvitado) return showToast("El modo invitado no puede enviar peticiones.", "error");
    if(!usuarioActual) return showToast("Login requerido", "error");
    const val = document.getElementById('req-game-input').value;
    if(!val) return;
    
    if(peticionesCache.some(p => normalizarTexto(p.game).includes(normalizarTexto(val)))) {
        showToast("Esta peticion ya existe. Vota por ella!", "error");
        return;
    }
    
    await addDoc(collection(db, "peticiones"), {
        game: val,
        user: usuarioActual.displayName || "Usuario",
        uid: usuarioActual.uid, 
        votes: [usuarioActual.uid]
    });
    document.getElementById('req-game-input').value = "";
    document.getElementById('req-status-message').style.display = 'none'; 
    showToast("Peticion enviada! Gracias por tu sugerencia.", "success");
    abrirMuroPeticiones();
};

window.votarPeticion = async (reqId) => {
    if(esInvitado) return showToast("El modo invitado no puede votar.", "error");
    if(!usuarioActual) return showToast("Login requerido", "error");
    const ref = doc(db, "peticiones", reqId);
    const snap = await getDoc(ref);
    const votes = snap.data().votes || [];
    if(votes.includes(usuarioActual.uid)) {
        await updateDoc(ref, { votes: arrayRemove(usuarioActual.uid) });
    } else {
        await updateDoc(ref, { votes: arrayUnion(usuarioActual.uid) });
    }
    abrirMuroPeticiones();
};

window.abrirPanelAdmin = async () => {
    if(!esAdmin && !esDios) return;

    const modal = document.getElementById('modalPanelUnificado');
    const btnAdmins = document.getElementById('tab-btn-admins');

    modal.style.display = 'flex';
    contextMenu.style.display = 'none'; 
    window.cambiarTabPanel('banned'); 

    if(esDios) {
        btnAdmins.style.display = 'block';
        if(allUsersCache.length === 0) {
            const snap = await getDocs(collection(db, "usuarios"));
            allUsersCache = snap.docs.map(d => d.data().email);
        }
    } else {
        btnAdmins.style.display = 'none';
    }
};

window.cambiarTabPanel = async (tab) => {
    document.getElementById('view-banned').style.display = 'none';
    document.getElementById('view-reports').style.display = 'none';
    document.getElementById('view-admins').style.display = 'none';
    document.getElementById('view-trash').style.display = 'none';
    document.getElementById('view-genres').style.display = 'none';
    document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));

    if(tab === 'banned') {
        document.getElementById('view-banned').style.display = 'block';
        document.getElementById('tab-btn-banned').classList.add('active');
        cargarListaBaneados();
    } else if (tab === 'reports') {
        document.getElementById('view-reports').style.display = 'block';
        document.getElementById('tab-btn-reports').classList.add('active');
        cargarListaReportes();
    } else if (tab === 'admins') {
        document.getElementById('view-admins').style.display = 'block';
        document.getElementById('tab-btn-admins').classList.add('active');
        cargarListaAdmins();
    } else if (tab === 'trash') {
        document.getElementById('view-trash').style.display = 'block';
        document.getElementById('tab-btn-trash').classList.add('active');
        cargarPapeleraJuegos();
    } else if (tab === 'genres') {
        document.getElementById('view-genres').style.display = 'block';
        document.getElementById('tab-btn-genres').classList.add('active');
        renderizarListaGenerosAdmin();
    }
};

document.getElementById('manual-ban-input').addEventListener('input', function() {
    const val = this.value.toLowerCase();
    const list = document.getElementById('ban-autocomplete-list');
    list.innerHTML = "";
    if(!val) { list.style.display = 'none'; return; }
    
    const matches = allUsersCache.filter(email => email.toLowerCase().includes(val)).slice(0, 5);
    if(matches.length > 0) {
        list.style.display = 'block';
        matches.forEach(email => {
            const div = document.createElement('div');
            div.className = "admin-autocomplete-item";
            div.innerText = email;
            div.onclick = () => {
                document.getElementById('manual-ban-input').value = email;
                list.style.display = 'none';
            };
            list.appendChild(div);
        });
    } else {
        list.style.display = 'none';
    }
});

window.banearUsuarioManual = async () => {
    const email = document.getElementById('manual-ban-input').value;
    if(!email) return showToast("Ingresa un email valido.", "error");
    
    const usersRef = collection(db, "usuarios");
    const q = query(usersRef, where("email", "==", email));
    const snap = await getDocs(q);
    
    if(snap.empty) {
        showToast("Usuario no encontrado.", "error");
        return;
    }
    
    snap.forEach(async (docUser) => {
        const uData = docUser.data();
        if(uData.rol === 'admin' || uData.rol === 'dios') {
            showToast("No puedes banear a un admin.", "error");
            return;
        }
        await updateDoc(doc(db, "usuarios", docUser.id), { baneado: true });
        showToast(`Usuario ${email} ha sido baneado.`, "success");
        document.getElementById('manual-ban-input').value = "";
        cargarListaBaneados();
    });
}

async function cargarListaBaneados() {
    const list = document.getElementById('banned-list-container');
    list.innerHTML = "Cargando...";
    
    const q = query(collection(db, "usuarios"), where("baneado", "==", true));
    const snap = await getDocs(q);
    list.innerHTML = "";
    
    if(snap.empty) {
        list.innerHTML = "No hay usuarios baneados.";
        return;
    }

    snap.forEach(d => {
        const u = d.data();
        const div = document.createElement('div');
        div.className = 'banned-item';
        
        let evidenciaHtml = "";
        if(u.historialInsultos && u.historialInsultos.length > 0) {
            evidenciaHtml = `<ul class="evidence-list" id="evidence-${d.id}">`;
            u.historialInsultos.forEach(insulto => {
                evidenciaHtml += `<li>"${insulto.text}" (${new Date(insulto.date).toLocaleDateString()})</li>`;
            });
            evidenciaHtml += `</ul>`;
        } else {
            evidenciaHtml = `<div class="evidence-list" id="evidence-${d.id}">Sin registro guardado.</div>`;
        }

        div.innerHTML = `
            <div class="banned-header">
                <span class="banned-email">${u.email}</span>
                <button onclick="desbanearDesdePanel('${d.id}')" style="background:green; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">Desbanear</button>
            </div>
            ${u.apelacion ? `<div class="appeal-text">" ${u.apelacion} "</div>` : '<div style="font-size:0.8rem; color:#666;">Sin apelacion</div>'}
            <span class="toggle-evidence" onclick="document.getElementById('evidence-${d.id}').style.display = document.getElementById('evidence-${d.id}').style.display==='block'?'none':'block'">Ver Mensajes Ofensivos</span>
            ${evidenciaHtml}
        `;
        list.appendChild(div);
    });
}

window.desbanearDesdePanel = async (uid) => {
    if(confirm("Desbanear usuario? Se borrara todo su historial (Nacer de nuevo).")) {
        const comentariosRef = query(collectionGroup(db, 'comentarios'), where('uid', '==', uid));
        const comentariosSnap = await getDocs(comentariosRef);
        const deletePromises = comentariosSnap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        await updateDoc(doc(db, "usuarios", uid), { 
            baneado: false, 
            insultos: 0, 
            historialInsultos: deleteField(), 
            apelacion: deleteField() 
        });
        cargarListaBaneados(); 
    }
};

async function cargarListaReportes() {
    const list = document.getElementById('reports-list-container');
    list.innerHTML = "Cargando...";
    const snap = await getDocs(collection(db, "reportes"));
    list.innerHTML = "";
    if(snap.empty) { list.innerHTML = "No hay reportes."; return; }

    snap.forEach(d => {
        const r = d.data();
        const div = document.createElement('div');
        div.className = 'report-item';
        div.innerHTML = `
            <div class="report-header">
                <span style="font-weight:bold; color:orange;">Reporte</span>
                <button onclick="verComentarioReportado('${r.gameId}', '${r.commentId}')" style="background:var(--primary); color:black; border:none; padding:5px; border-radius:3px; cursor:pointer;">Ver Comentario</button>
            </div>
            <div style="font-size:0.9rem;">"${r.text}"</div>
            <div style="font-size:0.75rem; color:#888;">Reportado por: ${r.reporter}</div>
        `;
        list.appendChild(div);
    });
}

window.verComentarioReportado = async (gameId, commentId) => {
    document.getElementById('modalPanelUnificado').style.display = 'none';
    const game = juegos.find(j => j.id === gameId);
    if(game) {
        abrirDescargas(game);
        setTimeout(() => {
            cargarComentarios(gameId, commentId);
        }, 500);
    } else {
        showToast("El juego asociado ya no existe.", "error");
    }
};

async function cargarListaAdmins() {
    const cont = document.getElementById('admin-list-container');
    cont.innerHTML = "Cargando...";
    
    const qAdmin = query(collection(db, "usuarios"), where("rol", "in", ["admin", "dios"]));
    const snap = await getDocs(qAdmin);
    
    cont.innerHTML = "";
    if(snap.empty) { cont.innerHTML = "No hay admins."; return; }

    snap.forEach(d => {
        const u = d.data();
        const div = document.createElement('div');
        div.className = 'admin-list-item';
        
        let btnAction = "";
        if(u.rol === "admin") {
            btnAction = `<button onclick="quitarRangoAdmin('${d.id}')" style="background:#ff4444; color:white; border:none; border-radius:3px; padding:5px; cursor:pointer;">Eliminar Admin</button>`;
        } else {
            btnAction = `<span style="color:var(--god-color); font-weight:bold;">DIOS</span>`;
        }

        div.innerHTML = `
            <span class="admin-list-email">${u.email}</span>
            ${btnAction}
        `;
        cont.appendChild(div);
    });
}

document.getElementById('input-admin-email').addEventListener('input', function() {
    const val = this.value.toLowerCase();
    const list = document.getElementById('admin-autocomplete-list');
    list.innerHTML = "";
    if(!val) { list.style.display = 'none'; return; }
    
    const matches = allUsersCache.filter(email => email.toLowerCase().includes(val)).slice(0, 5);
    if(matches.length > 0) {
        list.style.display = 'block';
        matches.forEach(email => {
            const div = document.createElement('div');
            div.className = "admin-autocomplete-item";
            div.innerText = email;
            div.onclick = () => {
                document.getElementById('input-admin-email').value = email;
                list.style.display = 'none';
            };
            list.appendChild(div);
        });
    } else {
        list.style.display = 'none';
    }
});

window.agregarNuevoAdmin = async () => {
    const email = document.getElementById('input-admin-email').value;
    const btn = document.getElementById('btn-add-admin-submit');
    if(!email) return showToast("Ingresa un correo", "error");
    
    btn.innerText = "Cargando...";
    btn.disabled = true;

    const q = query(collection(db, "usuarios"), where("email", "==", email));
    const snap = await getDocs(q);
    
    if(snap.empty) {
        showToast("Usuario no encontrado.", "error");
        btn.innerText = "AGREGAR";
        btn.disabled = false;
        return;
    }
    
    const docUser = snap.docs[0];
    if(docUser.data().rol === 'dios') {
        showToast("Este usuario es Dios.", "info");
        btn.innerText = "AGREGAR";
        btn.disabled = false;
        return;
    }
    if(docUser.data().rol === 'admin') {
        showToast("Ya es Admin.", "info");
        btn.innerText = "AGREGAR";
        btn.disabled = false;
        return;
    }

    await updateDoc(doc(db, "usuarios", docUser.id), { rol: "admin" });
    
    btn.innerText = "Ya es Admin!";
    setTimeout(() => {
        btn.innerText = "AGREGAR";
        btn.disabled = false;
        document.getElementById('input-admin-email').value = "";
        cargarListaAdmins();
    }, 1500);
};

window.quitarRangoAdmin = async (uid) => {
    if(confirm("Eliminar rango de administrador a este usuario? Volvera a ser usuario normal.")) {
        await updateDoc(doc(db, "usuarios", uid), { rol: "user" });
        cargarListaAdmins();
    }
};

async function cargarPapeleraJuegos() {
    const list = document.getElementById('trash-list-container');
    list.innerHTML = "Cargando...";
    
    const q = query(collection(db, "juegos"), where("softDeleted", "==", true));
    const snap = await getDocs(q);
    list.innerHTML = "";
    
    if(snap.empty) {
        list.innerHTML = "No hay juegos en la papelera.";
        return;
    }

    snap.forEach(d => {
        const j = d.data();
        const div = document.createElement('div');
        div.className = 'banned-item';
        div.style.borderLeft = '3px solid orange';
        
        const deletedDate = new Date(j.deletedAt).toLocaleDateString();

        div.innerHTML = `
            <div class="banned-header">
                <span class="banned-email" style="color:orange;">[ELIMINADO] ${j.titulo}</span>
                <small style="color:#aaa;">Borrado el: ${deletedDate}</small>
            </div>
            <div style="display:flex; gap:10px; margin-top:10px;">
                <button onclick="restaurarJuego('${d.id}')" style="background:green; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">Restaurar</button>
                <button onclick="borrarJuegoPermanentemente('${d.id}', '${j.titulo}')" style="background:#ff4444; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">Borrar Permanentemente</button>
            </div>
        `;
        list.appendChild(div);
    });
}

window.restaurarJuego = async (gameId) => {
    if(confirm("Restaurar este juego?")) {
        await updateDoc(doc(db, "juegos", gameId), { softDeleted: deleteField(), deletedAt: deleteField() });
        showToast("Juego restaurado.", "success");
        cargarJuegos();
        cargarPapeleraJuegos();
    }
};

window.borrarJuegoPermanentemente = async (gameId, title) => {
    if(confirm(`ADVERTENCIA: Eliminar PERMANENTEMENTE el juego "${title}"? Esta accion no se puede deshacer.`)) {
        await deleteDoc(doc(db, "juegos", gameId));
        showToast(`Juego ${title} eliminado permanentemente.`, "error");
        cargarJuegos();
        cargarPapeleraJuegos();
    }
};

// ACA HACEMOS LA MAGIA DEL CARRUSEL ARRASTRABLE CON EL MOUSE
function mostrarSimilares(juego) {
    const container = document.getElementById('similar-games-section');
    const list = document.getElementById('similar-games-list');
    const currentGenres = juego.generos || [];
    if (currentGenres.length === 0) { container.style.display = 'none'; return; }

    let matches = juegos
        .filter(j => j.id !== juego.id) 
        .map(otherGame => {
            const otherGenres = otherGame.generos || [];
            const intersection = otherGenres.filter(g => currentGenres.includes(g));
            return { ...otherGame, matchCount: intersection.length };
        })
        .filter(j => j.matchCount > 0);

    matches.sort((a, b) => b.matchCount - a.matchCount);
    const topCandidates = matches.slice(0, 20);
    const selected = topCandidates.sort(() => 0.5 - Math.random()).slice(0, 10);
    if(selected.length === 0) { container.style.display = 'none'; return; }
    
    container.style.display = 'block';
    list.innerHTML = "";
    
    selected.forEach(j => {
        const div = document.createElement('div');
        div.className = "game"; 
        
        const esFav = favoritos.includes(j.titulo);
        const heartClass = esFav ? "fa-solid fa-heart fav" : "fa-regular fa-heart";
        const rating = getAvgRating(j);
        const views = j.views || 0;

        div.onclick = (e) => { 
            // Si el usuario estaba arrastrando la fila, no abrimos el juego
            if(window.isDraggingCarousel) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            if(!e.target.closest('.heart')) {
                abrirDescargas(j); 
            }
        };

        let ratingHtml = rating > 0 ? 
            `<div class="card-rating"><i class="fa-solid fa-star"></i> ${rating}<div class="view-count-icon"><i class="fa-solid fa-eye"></i> ${views}</div></div>` 
            : `<div class="card-rating"><div class="view-count-icon" style="margin-left:0"><i class="fa-solid fa-eye"></i> ${views}</div></div>`;

        div.innerHTML = `
            <img src="${j.imagen}" loading="lazy" onerror="this.src='https://via.placeholder.com/220x320?text=Sin+Imagen'">
            ${ratingHtml}
            <div class="top-icons"><div class="heart" onclick="window.toggleFav('${j.titulo}', this); event.stopPropagation();"><i class="${heartClass}"></i></div></div>
            <div class="title-overlay">
                <div>${j.titulo}</div>
                <div style="font-size:0.9rem; color:#aaa; margin-top:3px; font-weight:normal;">${formatearFecha(j.fechaSalida || j.fecha)}</div>
            </div>
        `;
        list.appendChild(div);
    });

    // --- EVENTOS DEL MOUSE PARA ARRASTRAR EL CARRUSEL ---
    let isDown = false;
    let startX;
    let scrollLeft;
    let dragDesactivoCarrusel = false;

    list.addEventListener('mousedown', (e) => {
        isDown = true;
        window.isDraggingCarousel = false; 
        dragDesactivoCarrusel = false; // reinicia el estado
        list.classList.add('active');
        startX = e.pageX - list.offsetLeft;
        scrollLeft = list.scrollLeft;
        clearInterval(window.carouselInterval); // pausa auto-scroll al hacer click
    });

    list.addEventListener('mouseleave', () => {
        isDown = false;
        list.classList.remove('active');
        // Solo reanuda si el usuario NUNCA arrastró
        if (!dragDesactivoCarrusel) {
            iniciarCarruselAutomatico(list);
        }
    });

    list.addEventListener('mouseup', () => {
        isDown = false;
        list.classList.remove('active');
        // Pequeño delay para no gatillar el onclick de la tarjeta
        setTimeout(() => { window.isDraggingCarousel = false; }, 50);
        // Solo reanuda si el usuario NUNCA arrastró
        if (!dragDesactivoCarrusel) {
            iniciarCarruselAutomatico(list);
        }
    });

    list.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault(); // Previene comportamientos raros del navegador
        const x = e.pageX - list.offsetLeft;
        const walk = (x - startX) * 1.5; // Velocidad del arrastre
        if (Math.abs(walk) > 10) {
            window.isDraggingCarousel = true; 
            dragDesactivoCarrusel = true; // El usuario arrastró, matamos el auto-scroll para siempre
            clearInterval(window.carouselInterval); // Aseguramos que quede apagado
        }
        list.scrollLeft = scrollLeft - walk;
    });

    iniciarCarruselAutomatico(list);
}

function iniciarCarruselAutomatico(list) {
    clearInterval(window.carouselInterval);
    window.carouselInterval = setInterval(() => {
        if(!list) return;
        if(list.scrollLeft + list.clientWidth >= list.scrollWidth - 10) {
            list.scrollTo({left: 0, behavior: 'smooth'});
        } else {
            list.scrollBy({left: 270, behavior: 'smooth'});
        }
    }, 3000);
}

// LOGICA DE PÁGINA FULL SCREEN AL ABRIR UN JUEGO
function abrirDescargas(juego) {
    currentGameOpen = juego;
    currentCommentLimit = 30; 
    
    // Mostramos la página y bloqueamos el scroll del fondo
    document.body.classList.add('no-scroll');
    const page = document.getElementById('game-details-page');
    page.style.display = 'block';
    
    // Hacer scroll de la página nueva hacia arriba de todo
    setTimeout(() => { page.scrollTop = 0; }, 10);
    
    const containerLinks = document.getElementById('download-buttons-container');
    const passDisplay = document.getElementById('download-password-display');
    const passTextValue = document.getElementById('password-text-value'); 
    const meta = document.getElementById('game-meta-info');
    const trailerContent = document.getElementById('trailer-content');
    const commentInputWrapper = document.getElementById('comments-input-wrapper');

    if(usuarioActual && !esInvitado) {
        if(!userData.juegosVistos || !userData.juegosVistos.includes(juego.id)) {
             updateDoc(doc(db, "juegos", juego.id), { views: increment(1) });
             updateDoc(doc(db, "usuarios", usuarioActual.uid), { 
                 juegosVistos: arrayUnion(juego.id) 
             });
             
             if(!userData.juegosVistos) userData.juegosVistos = [];
             userData.juegosVistos.push(juego.id);
        }
    }

    if(esInvitado) {
        commentInputWrapper.style.display = 'none';
    } else {
        commentInputWrapper.style.display = 'block';
    }

    document.getElementById('download-title').innerText = juego.titulo;
    document.getElementById('game-detail-cover').src = juego.imagen;
    
    // Trailer Directo (sin botón)
    const ytId = juego.trailerUrl ? getYoutubeId(juego.trailerUrl) : null;
    if (ytId) {
        trailerContent.style.display = 'block'; 
        trailerContent.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${ytId}?autoplay=0&rel=0" frameborder="0" allowfullscreen></iframe>`;
    } else {
        trailerContent.style.display = 'none';
        trailerContent.innerHTML = '';
    }
    
    const generosStr = (juego.generos || []).join(' • ') || "Varios";
    const fechaFmt = formatearFecha(juego.fechaSalida || juego.fecha);
    const reqText = juego.requisito ? ` | ${juego.requisito.charAt(0).toUpperCase() + juego.requisito.slice(1)}` : "";
    
    meta.innerHTML = `<div><i class="fa-solid fa-calendar"></i> ${fechaFmt} &nbsp;|&nbsp; <i class="fa-solid fa-hard-drive"></i> ${juego.peso || 'N/A'}${reqText}</div><div style="margin-top:5px; color:var(--primary);">${generosStr}</div>`;
    
    if (juego.password) {
        passTextValue.innerText = juego.password;
        passDisplay.style.display = 'flex';
    } else {
        passTextValue.innerText = "";
        passDisplay.style.display = 'none';
    }

    updateRatingDisplay(juego);
    cargarComentarios(juego.id);
    mostrarSimilares(juego);

    containerLinks.innerHTML = "";
    const enlacesRaw = juego.enlaces || (juego.link ? [{servidor: "Descarga Directa", url: juego.link, nota: "Link"}] : []);
    
    if(enlacesRaw.length === 0) {
        containerLinks.innerHTML = "<p style='color:#aaa'>No hay enlaces disponibles.</p>";
    } else {
        const groups = {};
        enlacesRaw.forEach(l => {
            const srv = l.servidor || "Otros";
            if(!groups[srv]) groups[srv] = [];
            groups[srv].push(l);
        });

        for (const [server, links] of Object.entries(groups)) {
            const item = document.createElement('div');
            item.className = "accordion-item";
            
            let icon = "fa-download";
            let srvLower = server.toLowerCase();
            if(srvLower.includes("mediafire")) icon = "fa-fire";
            else if(srvLower.includes("mega")) icon = "fa-cloud";
            else if(srvLower.includes("drive") || srvLower.includes("google")) icon = "fa-google-drive";
            else if(srvLower.includes("torrent")) icon = "fa-magnet";
            else if(srvLower.includes("update")) icon = "fa-rotate";
            else if(srvLower.includes("fix")) icon = "fa-wrench";

            const btn = document.createElement('button');
            btn.className = "accordion-btn";
            btn.innerHTML = `<i class="fa-brands ${icon}"></i> ${server} <i class="fa-solid fa-chevron-down" style="margin-left:auto"></i>`;
            
            const panel = document.createElement('div');
            panel.className = "accordion-panel";
            
            links.forEach(l => {
                const a = document.createElement('a');
                a.href = l.url; a.target = "_blank";
                a.className = "dl-link-item"; 
                a.innerHTML = `<i class="fa-solid fa-link"></i> ${l.nota || "Descargar Aqui"}`;
                panel.appendChild(a);
            });

            btn.onclick = () => {
                const isOpen = panel.style.display === "flex";
                // Cerramos todos
                document.querySelectorAll('.accordion-panel').forEach(p => p.style.display='none');
                // Abrimos el clickeado si no estaba abierto
                panel.style.display = isOpen ? "none" : "flex";
            };

            item.appendChild(btn);
            item.appendChild(panel);
            containerLinks.appendChild(item);
        }
    }
}

// LOGICA PARA VOLVER A INICIO DESDE LA PÁGINA DEL JUEGO
window.cerrarGameDetails = () => {
    clearInterval(window.carouselInterval); // Corta el carrusel para no consumir recursos
    document.getElementById('game-details-page').style.display = 'none';
    document.body.classList.remove('no-scroll');
    document.getElementById('trailer-content').innerHTML = ''; // Corta el video de yt si estaba reproduciendose
};

window.copiarContrasena = () => {
    const passText = document.getElementById('password-text-value').innerText;
    if (!passText) return;
    navigator.clipboard.writeText(passText).then(() => {
        const btn = document.getElementById('btn-copy-password');
        const originalText = btn.innerText;
        btn.innerText = "Copiado!";
        btn.style.background = "#00ff00"; 
        btn.style.color = "black";
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.background = ""; 
            btn.style.color = "";
        }, 2000);
    }).catch(err => {
        console.error('Error al copiar: ', err);
        showToast("Error al copiar contrasena.", "error");
    });
};

window.compartirJuego = () => {
    if(!currentGameOpen) return;
    const url = `${window.location.origin}${window.location.pathname}?game=${currentGameOpen.id}`;
    navigator.clipboard.writeText(url).then(() => {
        showToast("Enlace copiado al portapapeles", "success");
    }).catch(err => showToast("Error al copiar enlace", "error"));
};

window.cerrarModalDownloads = () => {
    window.cerrarGameDetails();
};

window.pegarEnInput = async (btn) => {
    try {
        const text = await navigator.clipboard.readText();
        const input = btn.parentElement.querySelector('.url-in');
        if(input) input.value = text;
    } catch(e) { showToast("No se pudo pegar. Permiso denegado.", "error"); }
};

window.verificarServidorPersonalizado = (select) => {
    const inputCustom = select.parentElement.querySelector('.custom-srv-in');
    if(select.value === 'Otro') {
        inputCustom.style.display = 'inline-block';
    } else {
        inputCustom.style.display = 'none';
    }
};

window.verificarEtiquetaUpdate = (input) => {
    if(input.value.toLowerCase().includes('update')) {
        const select = input.parentElement.querySelector('.srv-in');
        select.value = 'Update';
        window.verificarServidorPersonalizado(select);
    }
};

window.agregarInputLink = (contId, srv='Mediafire', url='', nota='', srvCustom='') => {
    const div = document.createElement('div');
    div.className = "link-row";
    div.draggable = true; 
    div.style.cursor = "grab"; 

    div.addEventListener('dragstart', (e) => {
        div.classList.add('dragging'); 
    });

    div.addEventListener('dragend', () => {
        div.classList.remove('dragging');
    });
    
    const isCustom = !['Mediafire','Mega','Google Drive','Torrent','Update','Fix'].includes(srv);
    const srvValue = isCustom ? 'Otro' : srv;
    const actualCustom = isCustom ? srv : srvCustom;

    div.innerHTML = `
        <select class="srv-in" style="width:25%" onchange="window.verificarServidorPersonalizado(this)">
            <option value="Mediafire" ${srvValue==='Mediafire'?'selected':''}>Mediafire</option>
            <option value="Mega" ${srvValue==='Mega'?'selected':''}>Mega</option>
            <option value="Google Drive" ${srvValue==='Google Drive'?'selected':''}>Google Drive</option>
            <option value="Torrent" ${srvValue==='Torrent'?'selected':''}>Torrent</option>
            <option value="Update" ${srvValue==='Update'?'selected':''}>Update</option>
            <option value="Fix" ${srvValue==='Fix'?'selected':''}>Fix online</option>
            <option value="Otro" ${srvValue==='Otro'?'selected':''}>Otro</option>
        </select>
        <input type="text" class="custom-srv-in" placeholder="Nombre srv" style="width:15%; display:${isCustom?'inline-block':'none'};" value="${actualCustom}">
        
        <input type="text" placeholder="Etiqueta" class="note-in" style="width:20%" value="${nota}" list="etiquetas-links" oninput="window.verificarEtiquetaUpdate(this)">
        <datalist id="etiquetas-links">
            <option value="Juego">
            <option value="Juego fix online incluido">
            <option value="Fix online">
            <option value="Update">
        </datalist>

        <input type="url" placeholder="URL" class="url-in" style="width:30%" value="${url}">
        <button type="button" class="btn-paste" onclick="pegarEnInput(this)" title="Pegar"><i class="fa-solid fa-paste"></i></button>
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()"><i class="fa-solid fa-trash"></i></button>
    `;
    document.getElementById(contId).appendChild(div);
};

const getLinks = (id) => Array.from(document.querySelectorAll(`#${id} .link-row`)).map(r => {
    let servidor = r.querySelector('.srv-in').value;
    if(servidor === 'Otro') {
        const custom = r.querySelector('.custom-srv-in').value.trim();
        if(custom) servidor = custom;
    }
    return {
        servidor: servidor,
        url: r.querySelector('.url-in').value,
        nota: r.querySelector('.note-in').value
    };
}).filter(l => l.url);

const getGens = (cls) => Array.from(document.querySelectorAll(`.${cls}:checked`)).map(c => c.value);

document.getElementById('form-add-game').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!esAdmin && !esDios) return;
    const newGame = {
        titulo: document.getElementById('new-title').value,
        imagen: document.getElementById('new-image').value,
        trailerUrl: document.getElementById('new-trailer').value,
        password: document.getElementById('new-password').value,
        fechaSalida: document.getElementById('new-date').value,
        peso: document.getElementById('new-size').value,
        requisito: document.getElementById('new-req').value, 
        generos: getGens('chk-genre'),
        enlaces: getLinks('new-links-container'),
        fecha: new Date().toISOString(),
        puntuaciones: {},
        views: 0
    };
    try {
        await addDoc(collection(db, "juegos"), newGame);
        showToast("Juego Publicado!", "success");
        document.getElementById('modalAdmin').style.display = 'none';
        document.body.classList.remove('no-scroll'); 
        cargarJuegos();
    } catch(e) { showToast("Error: " + e.message, "error"); }
});

window.abrirEditar = (id) => {
    const j = juegos.find(x => x.id === id);
    if(!j) return;
    document.body.classList.add('no-scroll'); 
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-title').value = j.titulo;
    document.getElementById('edit-image').value = j.imagen;
    document.getElementById('edit-trailer').value = j.trailerUrl || "";
    document.getElementById('edit-password').value = j.password || "";
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
        password: document.getElementById('edit-password').value,
        fechaSalida: document.getElementById('edit-date').value,
        peso: document.getElementById('edit-size').value,
        requisito: document.getElementById('edit-req').value,
        generos: getGens('chk-genre-edit'),
        enlaces: getLinks('edit-links-container')
    };
    try {
        await updateDoc(doc(db, "juegos", id), upd);
        showToast("Editado correctamente", "success");
        document.getElementById('modalEdit').style.display = 'none';
        document.body.classList.remove('no-scroll'); 
        cargarJuegos();
    } catch(e) { showToast(e.message, "error"); }
});

window.toggleFav = async (t, btn) => {
    let action = ""; 
    if(favoritos.includes(t)) {
        favoritos = favoritos.filter(f => f !== t);
        action = 'remove';
        showToast("Quitado de favoritos", "info");
    } else {
        favoritos.push(t);
        action = 'add';
        showToast("Agregado a favoritos", "success");
    }
    localStorage.setItem("favoritos", JSON.stringify(favoritos));

    window.aplicarFiltrosGlobales(); 

    // ESTO ACTUALIZA LOS CORAZONES SI ESTAMOS EN LA PAGINA FULL SCREEN DEL JUEGO
    if (document.getElementById('game-details-page').style.display === 'block') {
        const esFav = favoritos.includes(t);
        const corazonEnModal = document.querySelector('#game-details-page .heart i');
        if (corazonEnModal) {
            corazonEnModal.className = esFav ? "fa-solid fa-heart fav" : "fa-regular fa-heart";
        }
    }

    if (usuarioActual) {
        try {
            const userRef = doc(db, "usuarios", usuarioActual.uid);
            if (action === 'add') {
                await updateDoc(userRef, { favoritos: arrayUnion(t) });
            } else {
                await updateDoc(userRef, { favoritos: arrayRemove(t) });
            }
        } catch (e) { }
    }
};

window.toggleMostrarFavoritos = (btn) => {
    if (isViewingFavs) {
        window.salirDeFavoritos();
        return;
    }
    
    if (favoritos.length === 0) {
        showToast("Aun no tienes favoritos guardados.", "error");
        return;
    }

    paginaGuardadaAntesDeFavs = paginaActual;
    paginaActual = 1; 

    document.getElementById('searchInput').value = "";
    document.querySelectorAll('.adv-genre-chk').forEach(c => c.checked = false);
    document.querySelectorAll('.adv-req-chk').forEach(c => c.checked = false);
    document.querySelector('input[name="adv_sort"][value="date_release_new"]').checked = true;
    
    btn.classList.add('active-menu');
    isViewingFavs = true;
    document.getElementById('favs-exit-container').style.display = 'flex';

    window.aplicarFiltrosGlobales(); 
    window.scrollTo(0,0);
    showToast("Viendo solo favoritos");
};

window.salirDeFavoritos = () => {
    const btnFavs = document.getElementById('btnFavs');
    if (btnFavs) btnFavs.classList.remove('active-menu');
    isViewingFavs = false;
    
    document.getElementById('favs-exit-container').style.display = 'none';

    document.getElementById('searchInput').value = "";
    document.querySelectorAll('.adv-genre-chk').forEach(c => c.checked = false);
    document.querySelectorAll('.adv-req-chk').forEach(c => c.checked = false);
    
    paginaActual = paginaGuardadaAntesDeFavs;
    if (paginaActual < 1) paginaActual = 1; 
    
    window.aplicarFiltrosGlobales(); 
    window.scrollTo({top:0, behavior:'smooth'});
    showToast("Volviendo a la lista de juegos");
};

window.toggleBuscador = (btn) => {
    window.scrollTo({top:0, behavior:'smooth'});
    setTimeout(() => document.getElementById('searchInput').focus(), 300);
};

window.toggleModo = () => {
    document.body.classList.toggle('light');
    const btn = document.getElementById('btnModo');
    if(document.body.classList.contains('light')) {
        btn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        showToast("Modo Claro activado");
    } else {
        btn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        showToast("Modo Oscuro activado");
    }
};

window.verNotificacionesPanel = () => {
    const btn = document.getElementById('btnNotif');
    window.toggleMenu(btn, 'notifDropdown');
    window.cargarNotificaciones();
};

window.abrirModalDonaciones = () => {
    document.getElementById('modalDonaciones').style.display = 'flex';
};

window.abrirModalCorreo = () => {
    document.getElementById('modalCorreo').style.display = 'flex';
};

window.toggleGameInput = () => {
    const reason = document.getElementById('contact-reason').value;
    const group = document.getElementById('game-input-group');
    if(reason === 'Link Caido' || reason === 'Juego Roto' || reason === 'Pedir Juego') {
        group.style.display = 'block';
    } else {
        group.style.display = 'none';
    }
};

function enableDragSort(containerId) {
    const container = document.getElementById(containerId);
    if(!container) return;
    container.addEventListener('dragover', (e) => {
        e.preventDefault(); 
        const afterElement = getDragAfterElement(container, e.clientY);
        const draggable = document.querySelector('.dragging');
        if (afterElement == null) {
            container.appendChild(draggable);
        } else {
            container.insertBefore(draggable, afterElement);
        }
    });
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.link-row:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

window.abrirModalNotas = () => {
    if(!esAdmin && !esDios) return;
    document.getElementById('modalNotas').style.display = 'flex';
    cargarNotasAdmin();
};

async function cargarNotasAdmin() {
    const cont = document.getElementById('notas-admin-list');
    cont.innerHTML = "Cargando...";
    const q = query(collection(db, "notas_admin"), orderBy("fecha", "desc"));
    const snap = await getDocs(q);
    cont.innerHTML = "";
    if(snap.empty) {
        cont.innerHTML = "No hay notas.";
        return;
    }
    snap.forEach(d => {
        const data = d.data();
        const fechaFmt = new Date(data.fecha).toLocaleString();
        cont.innerHTML += `<div style="background:#222; padding:10px; margin-bottom:10px; border-radius:5px; border:1px solid #444;">
            <div style="font-size:0.8rem; color:var(--primary); margin-bottom:5px;">${data.autor} - ${fechaFmt}</div>
            <div style="font-size:0.95rem; color:white; white-space:pre-wrap;">${data.texto}</div>
            <button onclick="borrarNotaAdmin('${d.id}')" style="background:#ff4444; color:white; border:none; padding:3px 8px; border-radius:3px; font-size:0.8rem; margin-top:5px; cursor:pointer;">Borrar</button>
        </div>`;
    });
}

window.guardarNotaAdmin = async () => {
    const text = document.getElementById('nueva-nota-text').value.trim();
    if(!text) return;
    try {
        await addDoc(collection(db, "notas_admin"), {
            texto: text,
            autor: usuarioActual.email,
            fecha: new Date().toISOString()
        });
        document.getElementById('nueva-nota-text').value = "";
        cargarNotasAdmin();
    } catch(e) { showToast("Error al guardar", "error"); }
};

window.borrarNotaAdmin = async (id) => {
    if(!confirm("Borrar nota?")) return;
    try {
        await deleteDoc(doc(db, "notas_admin", id));
        cargarNotasAdmin();
    } catch(e) { showToast("Error al borrar", "error"); }
};

enableDragSort('new-links-container');
enableDragSort('edit-links-container');

cargarGenerosGlobales();