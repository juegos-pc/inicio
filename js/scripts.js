let favoritos = JSON.parse(localStorage.getItem("favoritos") || "[]");
    let mostrandoFavoritos = false;

    function toggleFavorito(e) {
      e.preventDefault();
      e.stopPropagation();
      const game = e.target.closest(".game");
      const titulo = game.title;

      const index = favoritos.indexOf(titulo);
      if (index === -1) favoritos.push(titulo);
      else favoritos.splice(index, 1);

      localStorage.setItem("favoritos", JSON.stringify(favoritos));
      actualizarFavoritos();
      if (mostrandoFavoritos) mostrarFavoritos();
    }

    function actualizarFavoritos() {
      document.querySelectorAll(".game").forEach((div) => {
        const titulo = div.title;
        const heartIcon = div.querySelector(".heart i");

        if (favoritos.includes(titulo)) {
          heartIcon.classList.remove("fa-heart-circle-plus");
          heartIcon.classList.add("fa-heart-circle-minus");
          heartIcon.classList.add("fav");
        } else {
          heartIcon.classList.remove("fa-heart-circle-minus");
          heartIcon.classList.add("fa-heart-circle-plus");
          heartIcon.classList.remove("fav");
          heartIcon.style.color = document.body.classList.contains("light") ? "#444" : "white";
        }
      });
    }

    function toggleMostrarFavoritos() {
      mostrandoFavoritos = !mostrandoFavoritos;
      const btnFavoritos = document.querySelector('#menuClosed button[title="Favoritos"]');
      if (mostrandoFavoritos) {
        mostrarFavoritos();
        btnFavoritos.classList.add('activo');
      } else {
        mostrarTodos();
        btnFavoritos.classList.remove('activo');
      }
    }

    function mostrarFavoritos() {
      document.querySelectorAll(".game").forEach((j) => {
        const titulo = j.title;
        j.style.display = favoritos.includes(titulo) ? "block" : "none";
      });
    }

    function mostrarTodos() {
      document.querySelectorAll(".game").forEach((j) => {
        j.style.display = "block";
      });
    }

    function toggleBuscador() {
      const buscador = document.getElementById("buscadorExpandido");
      if (buscador.style.display === "flex") {
        ocultarBuscador();
      } else {
        mostrarBuscador();
      }
    }

    function mostrarBuscador() {
      const buscador = document.getElementById("buscadorExpandido");
      buscador.style.display = "flex";
      document.getElementById("searchInput").focus();
    }

    function ocultarBuscador() {
      const buscador = document.getElementById("buscadorExpandido");
      buscador.style.display = "none";
      document.getElementById("searchInput").value = "";
      mostrarTodos();
    }

    function normalizar(str) {
      return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .toLowerCase()
        .trim();
    }

    document.getElementById("searchInput").addEventListener("input", () => {
      const filtro = normalizar(document.getElementById("searchInput").value);
      document.querySelectorAll(".game").forEach((j) => {
        const title = normalizar(j.title);
        j.style.display = title.includes(filtro) ? "block" : "none";
      });
    });

    document.getElementById("searchInput").addEventListener("blur", () => {
      ocultarBuscador();
    });

    document.getElementById("searchInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        ocultarBuscador();
      }
    });

    document.querySelectorAll(".heart i").forEach((heartIcon) => {
      heartIcon.addEventListener("click", toggleFavorito);
    });

    function toggleModo() {
      document.body.classList.toggle("light");
      const modoActual = document.body.classList.contains("light") ? "light" : "dark";
      localStorage.setItem("modo", modoActual);
      actualizarIconoModo();
      actualizarFavoritos();
    }

    function actualizarIconoModo() {
      const btn = document.getElementById("btnModo");
      const modoActual = document.body.classList.contains("light") ? "light" : "dark";
      btn.textContent = modoActual === "light" ? "☀️" : "🌙";
    }

    function ordenarJuegosAlfabeticamente() {
      const contenedor = document.getElementById("gameList");
      const juegos = Array.from(contenedor.querySelectorAll(".game"));

      juegos.sort((a, b) => {
        const tituloA = a.querySelector(".title-overlay").textContent.toLowerCase();
        const tituloB = b.querySelector(".title-overlay").textContent.toLowerCase();
        return tituloA.localeCompare(tituloB);
      });

      contenedor.innerHTML = "";
      juegos.forEach(juego => contenedor.appendChild(juego));
    }

    function abrirModalCorreo() {
      document.getElementById("modalCorreo").style.display = "block";
    }

    function cerrarModalCorreo() {
      document.getElementById("modalCorreo").style.display = "none";
    }

    window.addEventListener("DOMContentLoaded", () => {
      const modoGuardado = localStorage.getItem("modo");
      if (modoGuardado === "light") {
        document.body.classList.add("light");
      } else {
        document.body.classList.remove("light");
      }
      actualizarIconoModo();
      actualizarFavoritos();
      ordenarJuegosAlfabeticamente();
      mostrarTodos();
    });