let favoritos = JSON.parse(localStorage.getItem("favoritos") || "[]");
let mostrandoFavoritos = false;
let filtroRequisito = null;

function normalizar(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .toLowerCase()
    .trim();
}

function toggleBuscador() {
  const buscador = document.getElementById("buscadorExpandido");
  buscador.style.display = buscador.style.display === "flex" ? "none" : "flex";
  if (buscador.style.display === "flex") {
    document.getElementById("searchInput").focus();
  }
}

document.getElementById("searchInput").addEventListener("input", () => {
  aplicarFiltros();
  ordenarJuegosAlfabeticamente(); // ordena después de filtrar
});

document.querySelectorAll(".filtro-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (filtroRequisito === btn.dataset.requisito) {
      filtroRequisito = null;
      btn.classList.remove("activo");
    } else {
      document.querySelectorAll(".filtro-btn").forEach(b => b.classList.remove("activo"));
      filtroRequisito = btn.dataset.requisito;
      btn.classList.add("activo");
    }
    aplicarFiltros();
    ordenarJuegosAlfabeticamente(); // ordena después de aplicar filtro requisito
  });
});

function aplicarFiltros() {
  const texto = normalizar(document.getElementById("searchInput").value);
  document.querySelectorAll(".game").forEach(game => {
    const titulo = normalizar(game.title);
    const req = normalizar(game.dataset.requisito || "");
    let visible = (!texto || titulo.includes(texto)) &&
      (!filtroRequisito || req === filtroRequisito);
    game.style.display = visible ? "block" : "none";
  });
}

document.querySelectorAll(".heart i").forEach(icon => {
  icon.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const game = e.target.closest(".game");
    const titulo = game.title;
    if (favoritos.includes(titulo)) {
      favoritos = favoritos.filter(t => t !== titulo);
    } else {
      favoritos.push(titulo);
    }
    localStorage.setItem("favoritos", JSON.stringify(favoritos));
    actualizarFavoritos();
    if (mostrandoFavoritos) mostrarFavoritos(); // refresca favoritos si está activo
    ordenarJuegosAlfabeticamente();
  });
});

function actualizarFavoritos() {
  document.querySelectorAll(".game").forEach(game => {
    const icon = game.querySelector(".heart i");
    if (favoritos.includes(game.title)) {
      icon.classList.remove("fa-heart-circle-plus");
      icon.classList.add("fa-heart-circle-minus");
      icon.classList.add("fav");
    } else {
      icon.classList.add("fa-heart-circle-plus");
      icon.classList.remove("fa-heart-circle-minus");
      icon.classList.remove("fav");
    }
  });
}

function toggleMostrarFavoritos() {
  mostrandoFavoritos = !mostrandoFavoritos;
  document.querySelector('#menuClosed button[title="Favoritos"]').classList.toggle("activo", mostrandoFavoritos);
  mostrarFavoritos();
  ordenarJuegosAlfabeticamente();
}

function mostrarFavoritos() {
  document.querySelectorAll(".game").forEach(game => {
    game.style.display =
      mostrandoFavoritos && !favoritos.includes(game.title) ? "none" : "block";
  });
}

function ordenarJuegosAlfabeticamente() {
  const contenedor = document.getElementById("gameList");
  if (!contenedor) return;
  // Filtrar solo los juegos visibles para ordenarlos y reinsertarlos
  const juegosVisibles = Array.from(contenedor.querySelectorAll(".game"))
    .filter(game => game.style.display !== "none");

  juegosVisibles.sort((a, b) => {
    const tituloA = normalizar(a.title);
    const tituloB = normalizar(b.title);
    return tituloA.localeCompare(tituloB);
  });

  juegosVisibles.forEach(juego => contenedor.appendChild(juego));
}

function toggleModo() {
  document.body.classList.toggle("light");
  const modoActual = document.body.classList.contains("light") ? "light" : "dark";
  localStorage.setItem("modo", modoActual);
  actualizarIconoModo();
  actualizarFavoritos();
}

function actualizarIconoModo() {
  const btn = document.getElementById("btnModo");
  btn.textContent = document.body.classList.contains("light") ? "☀️" : "🌙";
}

window.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("modo") === "light") {
    document.body.classList.add("light");
  }
  actualizarIconoModo();
  actualizarFavoritos();
  aplicarFiltros();
  mostrarFavoritos();
  ordenarJuegosAlfabeticamente();
});

function abrirModalCorreo() {
  document.getElementById("modalCorreo").style.display = "block";
}

function cerrarModalCorreo() {
  document.getElementById("modalCorreo").style.display = "none";
}

window.addEventListener("click", function (event) {
  const modal = document.getElementById("modalCorreo");
  if (event.target === modal) {
    modal.style.display = "none";
  }
});
