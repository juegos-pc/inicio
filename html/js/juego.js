// Toggle animado y rotación flecha
document.querySelectorAll(".link-group > button").forEach((button) => {
  button.addEventListener("click", () => {
    const linkList = button.nextElementSibling;
    if (!linkList) return;

    linkList.classList.toggle("open");
    button.classList.toggle("open");

    if (linkList.classList.contains("open")) {
      linkList.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

// Función para mostrar mensaje de copia dinámico
function showCopyMessage() {
  const msg = document.createElement("div");
  msg.textContent = "Contraseña copiada al portapapeles";
  Object.assign(msg.style, {
    position: "fixed",
    bottom: "30px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#44444c",
    color: "#eee",
    padding: "12px 24px",
    borderRadius: "10px",
    boxShadow: "0 3px 12px rgba(0,0,0,0.8)",
    fontSize: "1rem",
    opacity: "0",
    pointerEvents: "none",
    transition: "opacity 0.4s ease",
    zIndex: "9999",
  });
  document.body.appendChild(msg);

  // Mostrar mensaje
  requestAnimationFrame(() => {
    msg.style.opacity = "1";
    msg.style.pointerEvents = "auto";
  });

  // Ocultar y remover después de 2 segundos
  setTimeout(() => {
    msg.style.opacity = "0";
    msg.style.pointerEvents = "none";
    msg.addEventListener(
      "transitionend",
      () => {
        msg.remove();
      },
      { once: true }
    );
  }, 2000);
}

// Copiar contraseña al portapapeles con click o teclado
document.querySelectorAll(".links .link-group p").forEach((p) => {
  p.addEventListener("click", () => copyText(p));
  p.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      copyText(p);
    }
  });
});

function copyText(element) {
  const text = element.textContent.trim();
  if (!navigator.clipboard) {
    // fallback
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      showCopyMessage();
    } catch {
      alert("Error al copiar la contraseña.");
    }
    document.body.removeChild(textArea);
    return;
  }
  navigator.clipboard
    .writeText(text)
    .then(() => {
      showCopyMessage();
    })
    .catch(() => {
      alert("Error al copiar la contraseña.");
    });
}
