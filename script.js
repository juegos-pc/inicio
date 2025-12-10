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
let activeReqFilter = null;
let currentGameOpen = null; 
let pendingVote = 0;
let allUsersCache = []; 
let respondingToId = null;
let currentCommentLimit = 30; 
let paginaGuardadaAntesDeBusqueda = 1; 
let paginaGuardadaAntesDeFavs = 1; // NUEVA variable para guardar la pagina actual antes de entrar a Favs
let isViewingFavs = false; // NUEVA bandera para saber si estamos viendo favoritos

const malasPalabras = ["estupido", "mierda", "puto", "idiota", "imbecil", "carajo", "verga", "pendejo", "concha", "bobo", "pelotudo","tarado","berga",];

// ELEMENTOS DOM
const gameList = document.getElementById('gameList');
const loginScreen = document.getElementById('login-screen');
const loadingScreen = document.getElementById('loading-screen');
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
const reqGameInput = document.getElementById('req-game-input');
const reqStatusMessage = document.getElementById('req-status-message');
const favsExitContainer = document.getElementById('favs-exit-container'); // Nuevo elemento DOM

// NOTIFICACIONES
window.showToast = (msg, type = 'info') => {
    const container = document.getElementById('toast-container');
    const div = document.createElement('div');
    div.className = `toast ${type}`;
    div.innerHTML = type === 'success' ? `<i class="fa-solid fa-check-circle"></i> ${msg}` : `<i class="fa-solid fa-info-circle"></i> ${msg}`;
    container.appendChild(div);
    setTimeout(() => { div.style.opacity='0'; setTimeout(()=>div.remove(), 300); }, 3000);
};

// SOPORTE HISTORIAL NAVEGADOR
window.onpopstate = (event) => {
    if (event.state && event.state.page) {
        paginaActual = event.state.page;
        renderizarJuegos();
    }
};

// Animacion de carga
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

// CONTROL DE ESTADO DEL SITIO (MANTENIMIENTO)
onSnapshot(doc(db, "configuracion", "general"), (docSnap) => {
    if(docSnap.exists()) {
        const data = docSnap.data();
        if(data.modoMantenimiento) {
            // SI ESTA ACTIVO MANTENIMIENTO
            if(!esAdmin && !esDios) {
                // Si tienes maintenanceScreen en HTML, descomentar:
                // maintenanceScreen.style.display = 'flex';
                appContent.style.display = 'none';
                loginScreen.style.display = 'none';
            }
        } else {
            // maintenanceScreen.style.display = 'none';
            if(usuarioActual || esInvitado) appContent.style.display = 'block';
            else loginScreen.style.display = 'flex';
        }
        // Actualizar texto boton admin
        const btnToggle = document.getElementById('btn-toggle-site');
        if(btnToggle) {
            btnToggle.innerText = data.modoMantenimiento ? "ABRIR PAGINA (Quitar Mantenimiento)" : "CERRAR PAGINA (Activar Mantenimiento)";
            btnToggle.style.background = data.modoMantenimiento ? "green" : "red";
            btnToggle.style.color = "white";
        }
    } else {
        // CREAR DOC SI NO EXISTE
        setDoc(doc(db, "configuracion", "general"), { modoMantenimiento: false });
    }
});

window.toggleEstadoSitio = async () => {
    const btn = document.getElementById('btn-toggle-site');
    const actualText = btn.innerText;
    const nuevoEstado = actualText.includes("CERRAR"); // Si dice cerrar, vamos a true
     
    try {
        await updateDoc(doc(db, "configuracion", "general"), { modoMantenimiento: nuevoEstado });
        showToast(nuevoEstado ? "Sitio puesto en Mantenimiento." : "Sitio Abierto al publico.", "success");
    } catch(e) { showToast("Error al cambiar estado", "error"); }
};

window.mostrarLoginMantenimiento = () => {
    // maintenanceScreen.style.display = 'none';
    loginScreen.style.display = 'flex';
    loginScreen.style.opacity = '1';
};

document.addEventListener('keydown', (e) => {
    if (e.key === "Escape") { 
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none'); 
        document.body.classList.remove('no-scroll'); 
    }
    if (e.key === "/" && !document.querySelector('input:focus')) { e.preventDefault(); document.getElementById('searchInput').focus(); }
    if (e.key === "ArrowRight") {
        const total = Math.ceil(juegosFiltrados.length / juegosPorPagina);
        if(paginaActual < total) { paginaActual++; renderizarJuegos(); window.scrollTo(0,0); }
    }
    if (e.key === "ArrowLeft") {
        if(paginaActual > 1) { paginaActual--; renderizarJuegos(); window.scrollTo(0,0); }
    }
    
    if(e.altKey) {
        if(e.key.toLowerCase() === 'n') {
            if(esAdmin || esDios) window.abrirModalAgregar();
        }
        if(e.key.toLowerCase() === 'l') { 
            if(esAdmin || esDios) window.abrirPanelAdmin();
        }
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
                    
                    document.getElementById('user-role-display').innerText = currentUserRole.toUpperCase();

                    if (data.rol === "dios") {
                        esDios = true; esAdmin = true;
                        document.getElementById('btnAdminTools').style.display = 'block';
                        document.getElementById('spam-warning').style.display = 'none';
                    } else if (data.rol === "admin") {
                        esAdmin = true; esDios = false;
                        document.getElementById('btnAdminTools').style.display = 'block';
                        document.getElementById('spam-warning').style.display = 'none';
                    } else {
                        esAdmin = false; esDios = false;
                        document.getElementById('btnAdminTools').style.display = 'none';
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

let modoRegistro = false;
document.getElementById('btn-auth-submit').addEventListener('click', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    try {
        if(modoRegistro) {
            const cred = await createUserWithEmailAndPassword(auth, email, pass);
            await setDoc(doc(db, "usuarios", cred.user.uid), { email, rol: "user", insultos: 0, baneado: false, visitedGames: 0 });
            showToast("Bienvenido! Cuenta creada.", "success");
        } else {
            await signInWithEmailAndPassword(auth, email, pass);
        }
    } catch(e) { showToast(e.message, 'error'); }
});

document.getElementById('toggle-auth').onclick = () => {
    modoRegistro = !modoRegistro;
    document.getElementById('toggle-auth').innerText = modoRegistro ? "Ya tienes cuenta? Inicia Sesion" : "No tienes cuenta? Registrate gratis";
    document.getElementById('btn-auth-submit').innerText = modoRegistro ? "CREAR CUENTA" : "INGRESAR";
};

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
    if (!e.target.closest('#buscadorExpandido') && !e.target.closest('#btnLupa')) {
        buscadorExpandido.classList.remove('visible');
        document.getElementById('btnLupa').classList.remove('active-menu');
    }
    if (!e.target.closest('#contextMenu')) contextMenu.style.display = 'none';
    if (!e.target.closest('.genres-dropdown-container')) genresPopup.style.display = 'none';
    autocompleteList.style.display = 'none';
    document.getElementById('contact-autocomplete-list').style.display = 'none';
    document.getElementById('admin-autocomplete-list').style.display = 'none';
    
    if(e.target.classList.contains('modal')) {
        if(e.target.id === 'modalAdmin' || e.target.id === 'modalEdit') {
            if(confirm("Estas seguro? Se perderan los datos si sales.")) {
                e.target.style.display = 'none';
                document.body.classList.remove('no-scroll');
            }
        } else if (e.target.id === 'modalDownloads') {
            window.cerrarModalDownloads();
        } else {
            e.target.style.display = 'none';
            document.body.classList.remove('no-scroll');
        }
    }
};

// MENÚ CONTEXTUAL GLOBAL (FONDO) Y JUEGO
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

window.toggleGenresPopup = () => {
    genresPopup.style.display = genresPopup.style.display === 'grid' ? 'none' : 'grid';
};

document.querySelectorAll('.filter-genre-chk').forEach(chk => chk.addEventListener('change', () => window.aplicarFiltrosGlobales()));

searchInput.addEventListener('input', function() {
    const val = normalizarTexto(this.value);
    
    if(val.length > 0 && paginaActual !== 1 && paginaGuardadaAntesDeBusqueda === 1) {
         paginaGuardadaAntesDeBusqueda = paginaActual;
    }
    
    if(val.length === 0) {
        // Restaurar pagina si borra lo que decia
        if(paginaGuardadaAntesDeBusqueda !== 1) {
            paginaActual = paginaGuardadaAntesDeBusqueda;
            paginaGuardadaAntesDeBusqueda = 1; // reset
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
                searchInput.value = j.titulo;
                paginaActual = 1;
                window.aplicarFiltrosGlobales();
                autocompleteList.style.display = 'none';
            };
            autocompleteList.appendChild(div);
        });
        autocompleteList.style.display = 'block';
    } else {
        autocompleteList.style.display = 'none';
    }
});

window.irAlInicio = () => {
    // ESTA FUNCION SE MANTIENE PARA LIMPIAR FILTROS Y BUSQUEDA, PERO SE HA ELIMINADO EL BOTON DE INICIO
    // 1. Limpiar el buscador y filtros visuales
    document.getElementById('searchInput').value = "";
    document.querySelectorAll('.filter-genre-chk').forEach(c => c.checked = false);
    activeReqFilter = null;
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('activo'));

    // 2. APAGAR MODO FAVORITOS
    const btnFavs = document.getElementById('btnFavs');
    if (btnFavs) btnFavs.classList.remove('active-menu');
    isViewingFavs = false;
    favsExitContainer.style.display = 'none';

    // 3. Forzar orden por "Lanzamiento (Nuevos)"
    document.getElementById('sortSelect').value = 'date_release_new'; 

    // 4. Resetear paginacion a la 1
    paginaActual = 1;
    paginaGuardadaAntesDeBusqueda = 1;
    
    // 5. Aplicar los cambios (esto recarga la lista completa de juegos)
    window.aplicarFiltrosGlobales();
    window.scrollTo({top:0, behavior:'smooth'});
};

window.toggleReq = (btn, req) => {
    const isActive = btn.classList.contains('activo');
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('activo'));
    if (isActive) activeReqFilter = null;
    else {
        btn.classList.add('activo');
        activeReqFilter = req;
    }
    window.aplicarFiltrosGlobales();
};

window.aplicarFiltrosGlobales = () => {
    const texto = normalizarTexto(document.getElementById('searchInput').value);
    const selectedGenres = Array.from(document.querySelectorAll('.filter-genre-chk:checked')).map(c => c.value.toLowerCase());
    const sortMode = document.getElementById('sortSelect').value;

    let juegosBase = isViewingFavs ? juegos.filter(j => favoritos.includes(j.titulo)) : juegos;

    juegosFiltrados = juegosBase.filter(j => {
        const matchText = normalizarTexto(j.titulo).includes(texto);
        let matchReq = true;
        if (activeReqFilter) matchReq = (j.requisito || "").includes(activeReqFilter);
        let matchGenres = true;
        if (selectedGenres.length > 0) {
            const gameGenres = (j.generos || []).map(g => g.toLowerCase());
            matchGenres = selectedGenres.every(sel => gameGenres.includes(sel));
        }
        
        return matchText && matchReq && matchGenres;
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

    // AUTO ABRIR JUEGO SI HAY URL PARAM
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
    // Ordenar estrictamente por fecha de subida (fecha) no salida
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

reqGameInput.addEventListener('input', () => {
    const val = reqGameInput.value.toLowerCase().trim();
    if (val.length >= 3) {
        const exists = peticionesCache.some(p => normalizarTexto(p.game).includes(normalizarTexto(val)));
        if (exists) {
            reqStatusMessage.innerText = "Este juego ya esta en peticiones.";
            reqStatusMessage.style.display = 'block';
        } else {
            reqStatusMessage.style.display = 'none';
        }
    } else {
        reqStatusMessage.style.display = 'none';
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
    reqStatusMessage.style.display = 'none'; 
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
    }
};

// AUTOCOMPLETADO PARA BANEAR
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

// NUEVA FUNCION DE BANEAR MANUALMENTE POR INPUT
window.banearUsuarioManual = async () => {
    const email = document.getElementById('manual-ban-input').value;
    if(!email) return showToast("Ingresa un email valido.", "error");
    
    // Buscar usuario por email
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
    const topCandidates = matches.slice(0, 15);
    const selected = topCandidates.sort(() => 0.5 - Math.random()).slice(0, 3);
    if(selected.length === 0) { container.style.display = 'none'; return; }
    
    container.style.display = 'block';
    list.innerHTML = "";
    selected.forEach(j => {
        const div = document.createElement('div');
        div.className = "similar-card";
        div.onclick = () => {
            abrirDescargas(j);
            document.querySelector('.modal-game-details').scrollTop = 0;
        };
        div.innerHTML = `<img src="${j.imagen}" loading="lazy"><div class="similar-title">${j.titulo}</div>`;
        list.appendChild(div);
    });
}

function abrirDescargas(juego) {
    currentGameOpen = juego;
    currentCommentLimit = 30; 
    
    const modal = document.getElementById('modalDownloads');
    const containerLinks = document.getElementById('download-buttons-container');
    const passDisplay = document.getElementById('download-password-display');
    const passTextValue = document.getElementById('password-text-value'); 
    const meta = document.getElementById('game-meta-info');
    const trailerBtnContainer = document.getElementById('trailer-btn-container');
    const trailerContent = document.getElementById('trailer-content');
    const btnTrailerToggle = document.getElementById('btn-trailer-toggle');
    const commentInputWrapper = document.getElementById('comments-input-wrapper');

    document.body.classList.add('no-scroll');

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
    
    const ytId = juego.trailerUrl ? getYoutubeId(juego.trailerUrl) : null;
    if (ytId) {
        trailerBtnContainer.style.display = 'block';
        trailerContent.style.display = 'none'; 
        trailerContent.innerHTML = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${ytId}?autoplay=0&rel=0" frameborder="0" allowfullscreen></iframe>`;
        
        btnTrailerToggle.onclick = () => {
            const isHidden = trailerContent.style.display === 'none';
            trailerContent.style.display = isHidden ? 'block' : 'none';
            document.getElementById('btn-trailer-toggle').innerHTML = `<i class="fa-brands fa-youtube" style="color: red;"></i> ${isHidden ? 'Ocultar Trailer' : 'Ver trailer'} <i class="fa-solid fa-chevron-down" style="margin-left:auto"></i>`;
        };
        document.getElementById('btn-trailer-toggle').innerHTML = `<i class="fa-brands fa-youtube" style="color: red;"></i> Ver trailer <i class="fa-solid fa-chevron-down" style="margin-left:auto"></i>`;

    } else {
        trailerBtnContainer.style.display = 'none';
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
                const open = panel.style.display === "block";
                document.querySelectorAll('.accordion-panel').forEach(p => p.style.display='none');
                panel.style.display = open ? "none" : "block";
            };

            item.appendChild(btn);
            item.appendChild(panel);
            containerLinks.appendChild(item);
        }
    }

    modal.style.display = 'flex';
}

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

// FUNCION COMPARTIR JUEGO
window.compartirJuego = () => {
    if(!currentGameOpen) return;
    const url = `${window.location.origin}${window.location.pathname}?game=${currentGameOpen.id}`;
    navigator.clipboard.writeText(url).then(() => {
        showToast("Enlace copiado al portapapeles", "success");
    }).catch(err => showToast("Error al copiar enlace", "error"));
};

window.cerrarModalDownloads = () => {
    const modal = document.getElementById('modalDownloads');
    const trailerContent = document.getElementById('trailer-content');
    modal.style.display = 'none';
    trailerContent.innerHTML = ''; 
    document.body.classList.remove('no-scroll');
};

window.pegarEnInput = async (btn) => {
    try {
        const text = await navigator.clipboard.readText();
        const input = btn.parentElement.querySelector('.url-in');
        if(input) input.value = text;
    } catch(e) { showToast("No se pudo pegar. Permiso denegado.", "error"); }
};

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
        <input type="url" placeholder="URL" class="url-in" style="width:35%" value="${url}">
        <button type="button" class="btn-paste" onclick="pegarEnInput(this)" title="Pegar"><i class="fa-solid fa-paste"></i></button>
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

// REEMPLAZAR TODA LA FUNCION
window.toggleFav = (t, btn) => {
    let mensaje = "";
    if(favoritos.includes(t)) {
        favoritos = favoritos.filter(f => f !== t);
        mensaje = "Quitado de favoritos";
    } else {
        favoritos.push(t);
        mensaje = "Agregado a favoritos";
    }
    localStorage.setItem("favoritos", JSON.stringify(favoritos));
    
    // Si estamos en modo favoritos, forzar la actualizacion
    if(isViewingFavs) {
        window.aplicarFiltrosGlobales(); 
    } else {
        // Solo para refrescar el icono en la tarjeta si no estamos en modo favoritos
        renderizarJuegos();
    }
    showToast(mensaje, favoritos.includes(t) ? "success" : "info");
};

// REEMPLAZAR TODA LA FUNCION
window.toggleMostrarFavoritos = (btn) => {
    // 1. Comprobar si ya estamos en modo favoritos, si es asi, salir.
    if (isViewingFavs) {
        window.salirDeFavoritos();
        return;
    }
    
    // 2. Si no estamos en favoritos, ENTRAR:
    
    // Si no hay favoritos guardados, no entrar al modo
    if (favoritos.length === 0) {
        showToast("Aun no tienes favoritos guardados.", "error");
        return;
    }

    // Guardar la pagina actual del modo normal antes de cambiar
    paginaGuardadaAntesDeFavs = paginaActual;

    // Limpiar busqueda y filtros visuales (menos el orden)
    document.getElementById('searchInput').value = "";
    document.querySelectorAll('.filter-genre-chk').forEach(c => c.checked = false);
    activeReqFilter = null;
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('activo'));
    
    // Poner el color al boton y activar la bandera
    btn.classList.add('active-menu');
    isViewingFavs = true;

    // Aplicar filtros para mostrar solo favoritos
    window.aplicarFiltrosGlobales(); 

    // Resetear pagina a 1 y re-renderizar
    paginaActual = 1;
    window.scrollTo(0,0);

    showToast("Viendo solo favoritos");
};

// ASEGURATE QUE ESTA FUNCION EXISTA EN TU SCRIPT.JS
// REEMPLAZAR TODA LA FUNCION
window.salirDeFavoritos = () => {
    const btnFavs = document.getElementById('btnFavs');
    
    // 1. Quitar el color al boton y desactivar la bandera
    if (btnFavs) btnFavs.classList.remove('active-menu');
    isViewingFavs = false;
    
    // 2. Ocultar el boton de salida de favoritos
    favsExitContainer.style.display = 'none';

    // 3. Limpiar todos los filtros y busqueda (Visual y de estado)
    document.getElementById('searchInput').value = "";
    document.querySelectorAll('.filter-genre-chk').forEach(c => c.checked = false);
    document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('activo'));
    activeReqFilter = null;
    
    // 4. FORZAR EL ORDEN A "LANZAMIENTO (NUEVOS)"
    document.getElementById('sortSelect').value = 'date_release_new'; 

    // 5. Restaurar la pagina donde estaba antes de entrar a favoritos
    paginaActual = paginaGuardadaAntesDeFavs;
    if (paginaActual < 1) paginaActual = 1; // Seguridad
    
    // 6. Aplicar los cambios y volver a renderizar la lista normal
    window.aplicarFiltrosGlobales(); 
    window.scrollTo({top:0, behavior:'smooth'});
    
    showToast("Volviendo a la lista de juegos");
};


window.toggleBuscador = (btn) => {
    const bar = document.getElementById('buscadorExpandido');
    if(bar.classList.contains('visible')) {
        bar.classList.remove('visible');
        btn.classList.remove('active-menu');
    } else {
        bar.classList.add('visible');
        btn.classList.add('active-menu');
        setTimeout(() => document.getElementById('searchInput').focus(), 100);
    }
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

// Autocompletado Contacto
document.getElementById('contact-game-name').addEventListener('input', function() {
    const val = normalizarTexto(this.value);
    const list = document.getElementById('contact-autocomplete-list');
    list.innerHTML = "";
    if(!val) { list.style.display = 'none'; return; }
    
    const matches = juegos.filter(j => normalizarTexto(j.titulo).includes(val)).slice(0, 5);
    if(matches.length > 0) {
        matches.forEach(j => {
            const div = document.createElement('div');
            div.style.padding = "10px";
            div.style.cursor = "pointer";
            div.style.borderBottom = "1px solid #333";
            div.onmouseover = () => div.style.background = "#333";
            div.onmouseout = () => div.style.background = "transparent";
            div.innerText = j.titulo;
            div.onclick = () => {
                document.getElementById('contact-game-name').value = j.titulo;
                list.style.display = 'none';
            };
            list.appendChild(div);
        });
        list.style.display = 'block';
    } else {
        list.style.display = 'none';
    }
});
