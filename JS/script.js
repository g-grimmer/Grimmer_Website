// JS/script.js

function afficherSection(nomSection) {
  const content = document.getElementById('content');

  // Loader animé
  content.innerHTML = '<div class="loader"></div>';
  content.style.opacity = 1;

  setTimeout(() => {
    fetch(`SECTION/${nomSection}.html`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Erreur lors du chargement de ${nomSection}.html`);
        }
        return response.text();
      })
      .then((html) => {
        // Transition de fondu
        content.style.opacity = 0;

        setTimeout(() => {
          content.innerHTML = html;
          content.style.opacity = 1;

          // Si on affiche la section "Research",
          // on initialise les viewers Three.js
          if (nomSection === 'sec_research' && window.initAllGlbViewers) {
            window.initAllGlbViewers();
          }
        }, 150);
      })
      .catch((error) => {
        console.error(error);
        content.innerHTML =
          `<p style="color:red;">Erreur : impossible de charger ` +
          `<strong>${nomSection}</strong>.</p>`;
        content.style.opacity = 1;
      });
  }, 200);
}

// Charge la section par défaut
window.addEventListener('DOMContentLoaded', () => {
  afficherSection('sec_biography');
});

function toggleInfos(id, type) {
  const el = document.getElementById(`${id}_${type}`);
  if (!el) return;

  // Si le bloc est caché → on l'affiche, sinon on le cache
  el.style.display = (el.style.display === 'none' || el.style.display === '') 
    ? 'block' 
    : 'none';
}

// ===============================
// 🔗 GESTION DES LIENS INTER-SECTIONS
// ===============================

// Intercepter les clics sur les liens de type "sec_*.html#..."
document.addEventListener('click', function (e) {
  const link = e.target.closest('a[href^="sec_"][href*="#"]');
  if (!link) return; // on ignore les autres liens

  e.preventDefault(); // empêche l’ouverture normale de la page

  const href = link.getAttribute('href');
  const [page, anchor] = href.split('#');

  // Charger dynamiquement la section cible
  fetch(`SECTION/${page}`)
    .then(res => res.text())
    .then(html => {
      const content = document.getElementById('content');
      content.innerHTML = html;

      // Une fois le contenu inséré, attendre un peu avant de scroller
      setTimeout(() => {
        const target = document.getElementById(anchor);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          console.warn(`⚠️ Élément avec id "${anchor}" introuvable dans ${page}`);
        }
      }, 150);
    })
    .catch(err => console.error('Erreur de chargement de la section :', err));
});
