// Variables globales
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let workEntries = JSON.parse(localStorage.getItem("workEntries")) || [];
let buttonsExpanded = false;
const buttonDelay = 100;
let entryToDelete = null;
let entryToEdit = null;
let verificationCode = "";
let deleteAllRequested = false;

// ==================== INTERNATIONALISATION ====================

let i18n = {};
let currentLang = localStorage.getItem("appLang") || "fr";

function t(key) {
    if (i18n[currentLang] && i18n[currentLang][key] !== undefined) { return i18n[currentLang][key]; }
    if (i18n.fr && i18n.fr[key] !== undefined) { return i18n.fr[key]; }
    return key;
}

function loadLanguages() {
    return fetch("lang.json?v=" + new Date().getTime())
        .then((r) => r.json())
        .then((data) => {
            i18n = data;
        })
        .catch(() => {
            console.warn("Impossible de charger lang.json — fallback vide.");
            i18n = { fr: {}, en: {} };
        });
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem("appLang", lang);
    document.querySelectorAll(".lang-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.lang === lang);
    });
    applyI18n();
    generateCalendar();
    displayMonthEntries();
    updateSummary();
    document.getElementById("hamburgerDropdown").style.display = "none";
    document.getElementById("hamburgerBtn").classList.remove("active");
    document.removeEventListener("click", closeHamburgerOnOutsideClick);
}

function applyI18n() {
    // Éléments texte simples
    document.querySelectorAll("[data-i18n]").forEach((el) => {
        el.textContent = t(el.getAttribute("data-i18n"));
    });

    // Éléments avec HTML (ex: <strong>)
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
        el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });

    // Placeholders traduits
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
    });

    // Jours de la semaine du calendrier (tableau calendar.days)
    const days = t("calendar.days");
    if (Array.isArray(days)) {
        document.querySelectorAll("[data-i18n-day]").forEach((el) => {
            const idx = parseInt(el.getAttribute("data-i18n-day"), 10);
            if (days[idx] !== undefined) { el.textContent = days[idx]; }
        });
    }
}

function applyInitialLanguage() {
    applyI18n();
    document.querySelectorAll(".lang-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.lang === currentLang);
    });
}

// ==================== MENU HAMBURGER ====================

function toggleHamburgerMenu() {
    const dropdown = document.getElementById("hamburgerDropdown");
    const btn = document.getElementById("hamburgerBtn");
    const isOpen = dropdown.style.display !== "none";

    dropdown.style.display = isOpen ? "none" : "block";
    btn.classList.toggle("active", !isOpen);

    // Fermer en cliquant ailleurs
    if (!isOpen) {
        setTimeout(() => {
            document.addEventListener("click", closeHamburgerOnOutsideClick);
        }, 10);
    }
}

function closeHamburgerOnOutsideClick(e) {
    const menu = document.getElementById("hamburgerMenu");
    if (!menu.contains(e.target)) {
        document.getElementById("hamburgerDropdown").style.display = "none";
        document.getElementById("hamburgerBtn").classList.remove("active");
        document.removeEventListener("click", closeHamburgerOnOutsideClick);
    }
}

// ==================== CHANGELOG ====================

function showChangelogModal() {
    document.getElementById("changelogModal").style.display = "flex";
    loadChangelog();
    clearChangelogBadge();
}

function closeChangelogModal() {
    document.getElementById("changelogModal").style.display = "none";
}

function loadChangelog() {
    const container = document.getElementById("changelogContent");
    container.innerHTML = `<div class="changelog-loading">${t("changelog.loading")}</div>`;

    fetch("changelog.json?v=" + new Date().getTime())
        .then((r) => r.json())
        .then((versions) => {
            renderChangelog(versions);
        })
        .catch(() => {
            container.innerHTML = `<div class="changelog-loading">${t("changelog.error")}</div>`;
        });
}

function renderChangelog(versions) {
    const container = document.getElementById("changelogContent");
    const iconMap = {
        new: '<i class="fa-solid fa-plus changelog-change-icon icon-new"></i>',
        improvement: '<i class="fa-solid fa-arrow-up changelog-change-icon icon-improvement"></i>',
        fix: '<i class="fa-solid fa-wrench changelog-change-icon icon-fix"></i>'
    };

    const labelMap = {
        new: t("changelog.label.new"),
        improvement: t("changelog.label.improvement"),
        fix: t("changelog.label.fix"),
        launch: t("changelog.label.launch")
    };

    container.innerHTML = versions
        .map((v) => {
            const date = new Date(v.date).toLocaleDateString(currentLang === "en" ? "en-GB" : "fr-FR", {
                day: "2-digit",
                month: "long",
                year: "numeric"
            });
            const labelClass = "changelog-label-" + (v.labelType || "new");
            const label = labelMap[v.labelType] || v.label || "Nouveauté";

            const changes = v.changes
                .map((c) => {
                    const icon = iconMap[c.type] || iconMap.new;
                    return `<div class="changelog-change-item">${icon}<span>${c.text}</span></div>`;
                })
                .join("");

            return `
            <div class="changelog-version-block">
                <div class="changelog-version-header">
                    <span class="changelog-version-number">v${v.version}</span>
                    <span class="changelog-version-label ${labelClass}">${label}</span>
                    <span class="changelog-version-date">${date}</span>
                </div>
                <div class="changelog-changes">${changes}</div>
            </div>
        `;
        })
        .join("");
}

// ==================== PASTILLE CHANGELOG ====================

function initChangelogBadge() {
    fetch("changelog.json?v=" + new Date().getTime())
        .then((r) => r.json())
        .then((versions) => {
            if (!versions || versions.length === 0) { return; }
            const latestVersion = versions[0].version;
            const seenVersion   = localStorage.getItem("changelogSeenVersion");

            if (seenVersion !== latestVersion) {
                showChangelogBadge();
            }
        })
        .catch(() => { /* silencieux */ });
}

function showChangelogBadge() {
    const badge     = document.getElementById("hamburgerBadge");
    const itemBadge = document.getElementById("changelogItemBadge");
    if (badge)     { badge.style.display     = "inline-block"; }
    if (itemBadge) { itemBadge.style.display = "inline-block"; }
}

function clearChangelogBadge() {
    const badge     = document.getElementById("hamburgerBadge");
    const itemBadge = document.getElementById("changelogItemBadge");
    if (badge)     { badge.style.display     = "none"; }
    if (itemBadge) { itemBadge.style.display = "none"; }

    // Mémoriser la version vue
    fetch("changelog.json?v=" + new Date().getTime())
        .then((r) => r.json())
        .then((versions) => {
            if (versions && versions.length > 0) {
                localStorage.setItem("changelogSeenVersion", versions[0].version);
            }
        })
        .catch(() => { /* silencieux */ });
}

// Initialisation de l'application
function initApp() {
    console.log("Initialisation de l'application de suivi des heures");

    // Appliquer la langue sauvegardée
    applyInitialLanguage();

    // Initialiser les boutons flottants
    initFloatingButtons();

    // Générer le calendrier
    generateCalendar();

    // Mettre à jour les résumés
    updateSummary();

    // Afficher les entrées du mois
    displayMonthEntries();

    // Vérifier la pastille changelog
    initChangelogBadge();

    console.log("Application initialisée");
}

// Initialiser les boutons flottants
function initFloatingButtons() {
    const mainButton = document.getElementById("mainFloatingButton");

    if (!mainButton) {
        console.error("Bouton principal non trouvé");
        return;
    }

    mainButton.addEventListener("click", toggleButtons);
    console.log("Boutons flottants initialisés");
}

// Basculer l'état des boutons
function toggleButtons() {
    const mainButton = document.getElementById("mainFloatingButton");
    const allButtons = document.querySelectorAll(".floating-buttons button:not(.main-button)");

    if (!mainButton) return;

    if (!buttonsExpanded) {
        mainButton.innerHTML = '<i class="fa-solid fa-minus"></i>';
        Array.from(allButtons).forEach((button, index) => {
            setTimeout(() => {
                button.classList.add("visible");
            }, index * buttonDelay);
        });
    } else {
        mainButton.innerHTML = '<i class="fa-solid fa-plus"></i>';
        Array.from(allButtons)
            .reverse()
            .forEach((button, index) => {
                setTimeout(() => {
                    button.classList.remove("visible");
                }, index * buttonDelay);
            });
    }

    buttonsExpanded = !buttonsExpanded;
}

// Générer le calendrier
function generateCalendar() {
    const monthNames = t("calendar.months");

    // Mettre à jour l'affichage du mois
    document.getElementById("currentMonth").textContent = `${monthNames[currentMonth]} ${currentYear}`;

    // Calculer le premier jour du mois
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Lundi = 0

    // Générer la grille du calendrier
    const calendarGrid = document.getElementById("calendarGrid");
    calendarGrid.innerHTML = "";

    // Ajouter les cases vides pour les jours précédents
    for (let i = 0; i < startingDay; i++) {
        const emptyDay = document.createElement("div");
        emptyDay.className = "calendar-day empty";
        calendarGrid.appendChild(emptyDay);
    }

    // Ajouter les jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement("div");
        dayElement.className = "calendar-day";

        // Nettoyer les classes de type précédentes
        dayElement.classList.remove("type-normal", "type-overtime", "type-night", "type-weekend", "type-leave");

        const date = new Date(currentYear, currentMonth, day);
        const isToday = isSameDay(date, new Date());

        if (isToday) {
            dayElement.classList.add("today");
        }

        // Vérifier s'il y a des entrées pour ce jour
        const dayEntries = getEntriesForDate(date);
        const hasEntries = dayEntries.length > 0;

        if (hasEntries) {
            const dayHoursInfo = calculateDayHoursWithType(dayEntries);
            const typeClass = getTypeClass(dayHoursInfo.type);

            // Ajouter la classe de type au jour du calendrier
            dayElement.classList.add(typeClass);

            // Vérifier si au moins une entrée a des notes
            const hasNotes = dayEntries.some((entry) => entry.notes && entry.notes.trim() !== "");

            // Pour les congés, afficher "Congé" au lieu des heures
            const displayText = dayHoursInfo.type === "leave" ? t("type.leave") : `${dayHoursInfo.hours}h`;

            dayElement.innerHTML = `
                <div class="day-number">
                    ${day}
                    ${hasNotes ? '<i class="fa-solid fa-pencil notes-icon"></i>' : ""}
                </div>
                <div class="day-indicator">
                    <i class="fa-solid ${dayHoursInfo.type === "leave" ? "fa-umbrella-beach" : "fa-clock"}"></i>
                    <span class="day-hours ${typeClass}">${displayText}</span>
                </div>
            `;
        } else {
            dayElement.innerHTML = `<div class="day-number">${day}</div>`;
        }

        // Ajouter un événement de clic
        dayElement.addEventListener("click", showDayEntries.bind(null, day, dayEntries));

        calendarGrid.appendChild(dayElement);
    }

    // Ajouter les événements aux boutons de navigation
    document.getElementById("prevMonth").addEventListener("click", prevMonth);
    document.getElementById("nextMonth").addEventListener("click", nextMonth);
}

// Aller au mois précédent
function prevMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    generateCalendar();
    displayMonthEntries();
    updateSummary();
}

// Aller au mois suivant
function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    generateCalendar();
    displayMonthEntries();
    updateSummary();
}

// Vérifier si deux dates sont le même jour
function isSameDay(date1, date2) {
    return (
        date1.getDate() === date2.getDate() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear()
    );
}

// Obtenir les entrées pour une date spécifique (pour le calendrier)
function getEntriesForDate(date) {
    return workEntries.filter((entry) => {
        const entryDate = new Date(entry.date);
        // Pour le calendrier : afficher uniquement sur la date de début
        return isSameDay(entryDate, date);
    });
}

// Calculer les heures et le type dominant pour un jour
function calculateDayHoursWithType(entries) {
    let total = 0;
    let dominantType = "normal"; // Type par défaut

    if (entries.length > 0) {
        // Priorité des types : leave > overtime > weekend > night > normal
        const typePriority = {
            leave: 5,
            overtime: 4,
            weekend: 3,
            night: 2,
            normal: 1
        };

        // Trouver le type avec la plus haute priorité
        entries.forEach((entry) => {
            const priority = typePriority[entry.type] || 1;
            const currentPriority = typePriority[dominantType] || 1;

            if (priority > currentPriority) {
                dominantType = entry.type;
            }
        });

        // Pour les congés/absences, on affiche "Congé" au lieu des heures
        if (dominantType === "leave") {
            return {
                hours: t("type.leave"),
                type: "leave"
            };
        }

        // Calculer le total des heures
        entries.forEach((entry) => {
            if (entry.type !== "leave") {
                total += calculateHours(entry);
            }
        });
    }

    return {
        hours: total.toFixed(1),
        type: dominantType
    };
}

// Calculer la durée en heures d'une entrée
function calculateHours(entry) {
    // Pour les congés/absences, retourner 0 heures
    if (entry.type === "leave") {
        return 0;
    }

    const startParts = entry.startTime.split(":");
    const endParts = entry.endTime.split(":");

    const startHour = parseInt(startParts[0]);
    const startMinute = parseInt(startParts[1]);
    const endHour = parseInt(endParts[0]);
    const endMinute = parseInt(endParts[1]);

    const startTotal = startHour + startMinute / 60;
    const endTotal = endHour + endMinute / 60;

    let hours = 0;

    if (entry.endDate && entry.endDate !== entry.date) {
        // Calcul pour les nuits sur 2 jours
        hours = endTotal - startTotal;
        if (hours < 0) {
            hours += 24;
        }
    } else {
        // Calcul normal pour le même jour
        hours = Math.max(0, endTotal - startTotal);
    }

    return hours;
}

// Mettre à jour le résumé
function updateSummary() {
    const monthEntries = workEntries.filter((entry) => {
        const entryDate = new Date(entry.date);
        const entryEndDate = entry.endDate ? new Date(entry.endDate) : entryDate;

        // Vérifier si l'entrée est dans le mois courant (début ou fin)
        return (
            (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) ||
            (entry.endDate && entryEndDate.getMonth() === currentMonth && entryEndDate.getFullYear() === currentYear)
        );
    });

    let normalHours = 0;
    let overtimeHours = 0;
    let totalHours = 0;

    monthEntries.forEach((entry) => {
        const hours = calculateHours(entry);
        totalHours += hours;

        if (entry.type === "normal") {
            normalHours += hours;
        } else if (entry.type === "overtime" || entry.type === "night" || entry.type === "weekend") {
            overtimeHours += hours;
        }
        // Les congés/absences ne comptent pas dans les heures
    });

    document.getElementById("normalHours").textContent = `${normalHours.toFixed(1)} h`;
    document.getElementById("overtimeHours").textContent = `${overtimeHours.toFixed(1)} h`;
    document.getElementById("totalHours").textContent = `${totalHours.toFixed(1)} h`;
}

// Afficher les entrées du mois
function displayMonthEntries() {
    const entriesList = document.getElementById("entriesList");
    entriesList.innerHTML = "";

    const monthEntries = workEntries
        .filter((entry) => {
            const entryDate = new Date(entry.date);
            const entryEndDate = entry.endDate ? new Date(entry.endDate) : entryDate;

            return (
                (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) ||
                (entry.endDate &&
                    entryEndDate.getMonth() === currentMonth &&
                    entryEndDate.getFullYear() === currentYear)
            );
        })
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (monthEntries.length === 0) {
        entriesList.innerHTML = `<div class="no-entries">${t("entries.none")}</div>`;
        return;
    }

    monthEntries.forEach((entry) => {
        const entryElement = document.createElement("div");
        entryElement.className = "entry-item";

        const entryDate = new Date(entry.date);
        const hours = calculateHours(entry);
        const typeClass = getTypeClass(entry.type);

        let dateText = formatDate(entryDate);
        if (entry.endDate && entry.endDate !== entry.date) {
            const endDate = new Date(entry.endDate);
            dateText += ` → ${formatDate(endDate)}`;
        }

        // Pour les congés/absences, afficher des informations différentes
        if (entry.type === "leave") {
            entryElement.innerHTML = `
        <div class="entry-date">
            <i class="fa-solid fa-calendar-day"></i>
            ${dateText}
        </div>
        <div class="entry-time">
            <i class="fa-solid fa-umbrella-beach"></i>
            ${t("type.leave.full")}
        </div>
        <div class="entry-details">
            <!-- Vide à gauche pour aligner le badge à droite -->
            <span style="visibility: hidden;">0h</span>
            <span class="entry-type ${typeClass}">
                ${getTypeLabel(entry.type)}
            </span>
        </div>
        ${entry.notes ? `<div class="entry-notes">${entry.notes}</div>` : ""}
        <div class="entry-actions">
            <button class="entry-edit" onclick="editEntry('${entry.id}')" title="Modifier">
                <i class="fa-solid fa-pencil"></i>
            </button>
            <button class="entry-delete" onclick="showDeleteConfirm('${entry.id}')" title="Supprimer">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `;
        } else {
            entryElement.innerHTML = `
                <div class="entry-date">
                    <i class="fa-solid fa-calendar-day"></i>
                    ${dateText}
                </div>
                <div class="entry-time">
                    <i class="fa-solid fa-clock"></i>
                    ${entry.startTime} - ${entry.endTime}
                    ${entry.endDate && entry.endDate !== entry.date ? " " + t("entry.night.label") : ""}
                </div>
                <div class="entry-details">
                    <span class="entry-hours ${typeClass}">
                        ${hours.toFixed(1)}h
                    </span>
                    <span class="entry-type ${typeClass}">
                        ${getTypeLabel(entry.type)}
                    </span>
                </div>
                ${entry.notes ? `<div class="entry-notes">${entry.notes}</div>` : ""}
                <div class="entry-actions">
                    <button class="entry-edit" onclick="editEntry('${entry.id}')" title="${t("btn.edit")}">
                        <i class="fa-solid fa-pencil"></i>
                    </button>
                    <button class="entry-delete" onclick="showDeleteConfirm('${entry.id}')" title="${t("btn.delete")}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
        }

        entriesList.appendChild(entryElement);
    });
}

// Formater une date
function formatDate(date) {
    const locale = currentLang === "en" ? "en-GB" : "fr-FR";
    return date.toLocaleDateString(locale, {
        weekday: "short",
        day: "2-digit",
        month: "short"
    });
}

// Obtenir la classe CSS pour le type d'heures
function getTypeClass(type) {
    const classes = {
        normal: "type-normal",
        overtime: "type-overtime",
        night: "type-night",
        weekend: "type-weekend",
        leave: "type-leave"
    };
    return classes[type] || "type-normal";
}

// Obtenir le libellé du type d'heures
function getTypeLabel(type) {
    const keys = {
        normal: "type.normal",
        overtime: "type.overtime",
        night: "type.night",
        weekend: "type.weekend",
        leave: "type.leave"
    };
    return t(keys[type] || "type.normal");
}

// Afficher le modal pour ajouter une entrée
function showAddEntryModal() {
    const modal = document.getElementById("addEntryModal");
    const today = new Date().toISOString().split("T")[0];

    document.getElementById("entryDate").value = today;
    document.getElementById("startTime").value = "08:00";
    document.getElementById("endTime").value = "17:00";
    document.getElementById("entryType").value = "normal";
    document.getElementById("entryNotes").value = "";
    document.getElementById("spreadOverTwoDays").checked = false;
    document.getElementById("endDateGroup").style.display = "none";
    document.getElementById("endDate").value = "";

    // Revenir à l'onglet unique et réinitialiser le multi
    switchTab("single");
    initMultiPanel();

    // Appeler la fonction pour gérer l'état initial des champs
    handleEntryTypeChange();

    modal.style.display = "flex";
    toggleButtons();
}

// Basculer entre les onglets du modal d'ajout
function switchTab(tab) {
    document.getElementById("panelSingle").style.display = tab === "single" ? "block" : "none";
    document.getElementById("panelMulti").style.display = tab === "multi" ? "block" : "none";
    document.getElementById("tabSingle").classList.toggle("active", tab === "single");
    document.getElementById("tabMulti").classList.toggle("active", tab === "multi");
}

// Initialiser le panneau multi avec une première ligne vide
function initMultiPanel() {
    const list = document.getElementById("multiEntriesList");
    list.innerHTML = "";
    addMultiRow();
}

// Ajouter une ligne dans le panneau multi-entrées
function addMultiRow() {
    const list = document.getElementById("multiEntriesList");
    const index = list.children.length;
    const today = new Date().toISOString().split("T")[0];

    const row = document.createElement("div");
    row.className = "multi-entry-row";
    row.dataset.index = index;

    row.innerHTML = `
        <div class="multi-row-header">
            <span class="multi-row-number">${t("multi.entry.label")} ${index + 1}</span>
            <div style="display:flex;gap:0.4rem;">
                <button class="multi-row-duplicate" onclick="duplicateMultiRow(this)" title="${t("multi.row.duplicate")}">
                    <i class="fa-solid fa-copy"></i>
                </button>
                <button class="multi-row-delete" onclick="removeMultiRow(this)" title="${t("multi.row.delete")}">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="multi-row-grid">
            <div class="form-group">
                <label>${t("multi.row.date")}</label>
                <input type="date" class="form-input mr-date" value="${today}" />
            </div>
            <div class="form-group">
                <label>${t("multi.row.type")}</label>
                <div class="select-wrapper">
                    <select class="form-input mr-type" onchange="handleMultiRowTypeChange(this)">
                        <option value="normal">${t("multi.type.normal")}</option>
                        <option value="overtime">${t("multi.type.overtime")}</option>
                        <option value="night">${t("multi.type.night")}</option>
                        <option value="weekend">${t("multi.type.weekend")}</option>
                        <option value="leave">${t("multi.type.leave")}</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>${t("multi.row.start")}</label>
                <input type="time" class="form-input mr-start" value="08:00" />
            </div>
            <div class="form-group">
                <label>${t("multi.row.end")}</label>
                <input type="time" class="form-input mr-end" value="17:00" />
            </div>
            <div class="multi-row-night">
                <input type="checkbox" class="mr-night" onchange="toggleMultiRowNight(this)" />
                <label>${t("multi.row.night")}</label>
            </div>
            <div class="form-group multi-row-enddate mr-enddate-group">
                <label>${t("multi.row.endDate")}</label>
                <input type="date" class="form-input mr-enddate" />
            </div>
            <div class="form-group multi-row-full">
                <label>${t("multi.row.notes")}</label>
                <input type="text" class="form-input mr-notes" :placeholder="${t("multi.row.notesPlaceholder")}" placeholder="${t("multi.row.notesPlaceholder")}" />
            </div>
        </div>
    `;

    list.appendChild(row);
    renumberMultiRows();
}

// Supprimer une ligne multi
function removeMultiRow(btn) {
    const row = btn.closest(".multi-entry-row");
    const list = document.getElementById("multiEntriesList");
    if (list.children.length <= 1) {
        showSystemMessage(t("error.minRow"), true);
        return;
    }
    row.remove();
    renumberMultiRows();
}

// Dupliquer une ligne multi
function duplicateMultiRow(btn) {
    const row = btn.closest(".multi-entry-row");
    const list = document.getElementById("multiEntriesList");

    // Lire les valeurs de la ligne source
    const date = row.querySelector(".mr-date").value;
    const type = row.querySelector(".mr-type").value;
    const startTime = row.querySelector(".mr-start").value;
    const endTime = row.querySelector(".mr-end").value;
    const night = row.querySelector(".mr-night").checked;
    const endDate = row.querySelector(".mr-enddate").value;
    const notes = row.querySelector(".mr-notes").value;

    // Ajouter une nouvelle ligne vide puis remplir avec les valeurs copiées
    addMultiRow();
    const newRow = list.lastElementChild;

    newRow.querySelector(".mr-date").value = date;
    newRow.querySelector(".mr-type").value = type;
    newRow.querySelector(".mr-start").value = startTime;
    newRow.querySelector(".mr-end").value = endTime;
    newRow.querySelector(".mr-notes").value = notes;

    // Appliquer le type (peut désactiver les heures si congé)
    handleMultiRowTypeChange(newRow.querySelector(".mr-type"));

    // Gérer la nuit étalée
    if (night) {
        const nightCheck = newRow.querySelector(".mr-night");
        nightCheck.checked = true;
        toggleMultiRowNight(nightCheck);
        newRow.querySelector(".mr-enddate").value = endDate;
    }
}

// Renuméroter les lignes après ajout/suppression
function renumberMultiRows() {
    const rows = document.querySelectorAll(".multi-entry-row");
    rows.forEach((row, i) => {
        row.dataset.index = i;
        const label = row.querySelector(".multi-row-number");
        if (label) {
            label.textContent = t("multi.entry.label") + " " + (i + 1);
        }
    });
}

// Gérer le changement de type dans une ligne multi
function handleMultiRowTypeChange(select) {
    const row = select.closest(".multi-entry-row");
    const startInput = row.querySelector(".mr-start");
    const endInput = row.querySelector(".mr-end");
    const nightCheck = row.querySelector(".mr-night");
    const nightLabel = row.querySelector(".multi-row-night");

    if (select.value === "leave") {
        startInput.disabled = true;
        endInput.disabled = true;
        startInput.style.opacity = "0.5";
        endInput.style.opacity = "0.5";
        nightCheck.checked = false;
        nightCheck.disabled = true;
        nightLabel.style.opacity = "0.4";
        toggleMultiRowNight(nightCheck);
    } else {
        startInput.disabled = false;
        endInput.disabled = false;
        startInput.style.opacity = "1";
        endInput.style.opacity = "1";
        nightCheck.disabled = false;
        nightLabel.style.opacity = "1";
        if (!startInput.value) {
            startInput.value = "08:00";
        }
        if (!endInput.value) {
            endInput.value = "17:00";
        }
    }
}

// Afficher/masquer la date de fin dans une ligne multi
function toggleMultiRowNight(checkbox) {
    const row = checkbox.closest(".multi-entry-row");
    const endDateGroup = row.querySelector(".mr-enddate-group");
    const dateInput = row.querySelector(".mr-date");
    const endDateInput = row.querySelector(".mr-enddate");

    if (checkbox.checked) {
        endDateGroup.style.display = "block";
        // Proposer le lendemain par défaut
        if (dateInput.value && !endDateInput.value) {
            const d = new Date(dateInput.value);
            d.setDate(d.getDate() + 1);
            endDateInput.value = d.toISOString().split("T")[0];
        }
    } else {
        endDateGroup.style.display = "none";
        endDateInput.value = "";
    }
}

// Enregistrer toutes les entrées du panneau multi
function saveMultiEntries() {
    const rows = document.querySelectorAll(".multi-entry-row");
    const toSave = [];
    let hasError = false;

    rows.forEach((row, i) => {
        const date = row.querySelector(".mr-date").value;
        const type = row.querySelector(".mr-type").value;
        const startTime = row.querySelector(".mr-start").value;
        const endTime = row.querySelector(".mr-end").value;
        const night = row.querySelector(".mr-night").checked;
        const endDate = night ? row.querySelector(".mr-enddate").value : date;
        const notes = row.querySelector(".mr-notes").value;

        if (!date) {
            showSystemMessage(`${t("multi.entry.label")} ${i + 1}${t("error.rowDate")}`, true);
            hasError = true;
            return;
        }
        if (type !== "leave" && (!startTime || !endTime)) {
            showSystemMessage(`${t("multi.entry.label")} ${i + 1}${t("error.rowTimes")}`, true);
            hasError = true;
            return;
        }
        if (night && !endDate) {
            showSystemMessage(`${t("multi.entry.label")} ${i + 1}${t("error.rowEndDate")}`, true);
            hasError = true;
            return;
        }

        const entry = {
            id: Date.now().toString() + "_" + i,
            date: date,
            startTime: type === "leave" ? "00:00" : startTime,
            endTime: type === "leave" ? "00:00" : endTime,
            type: type,
            notes: notes,
            spreadOverTwoDays: night,
            createdAt: new Date().toISOString()
        };
        if (night) {
            entry.endDate = endDate;
        }

        toSave.push(entry);
    });

    if (hasError) {
        return;
    }

    toSave.forEach((entry) => {
        workEntries.push(entry);
    });
    localStorage.setItem("workEntries", JSON.stringify(workEntries));

    generateCalendar();
    displayMonthEntries();
    updateSummary();

    closeAddEntryModal();
    showSystemMessage(`${toSave.length} ${t("msg.multiSaved")}`);
}

// Ajouter cette fonction pour gérer les changements de type d'entrée
function handleEntryTypeChange() {
    const entryType = document.getElementById("entryType");
    const startTimeInput = document.getElementById("startTime");
    const endTimeInput = document.getElementById("endTime");
    const spreadCheckbox = document.getElementById("spreadOverTwoDays");

    if (!entryType || !startTimeInput || !endTimeInput) return;

    // Si le type est "leave" (congé)
    if (entryType.value === "leave") {
        // Désactiver les champs d'heure
        startTimeInput.disabled = true;
        endTimeInput.disabled = true;
        startTimeInput.style.opacity = "0.5";
        endTimeInput.style.opacity = "0.5";
        startTimeInput.style.cursor = "not-allowed";
        endTimeInput.style.cursor = "not-allowed";

        // Désactiver la case à cocher pour l'étalement sur 2 jours
        if (spreadCheckbox) {
            spreadCheckbox.disabled = true;
            spreadCheckbox.style.opacity = "0.5";
            spreadCheckbox.style.cursor = "not-allowed";

            // Si elle était cochée, la décocher
            if (spreadCheckbox.checked) {
                spreadCheckbox.checked = false;
                document.getElementById("endDateGroup").style.display = "none";
                document.getElementById("endDate").value = "";
            }
        }

        // Vider les champs d'heure (optionnel, mais recommandé)
        startTimeInput.value = "";
        endTimeInput.value = "";
    } else {
        // Réactiver les champs pour les autres types
        startTimeInput.disabled = false;
        endTimeInput.disabled = false;
        startTimeInput.style.opacity = "1";
        endTimeInput.style.opacity = "1";
        startTimeInput.style.cursor = "pointer";
        endTimeInput.style.cursor = "pointer";

        // Réactiver la case à cocher
        if (spreadCheckbox) {
            spreadCheckbox.disabled = false;
            spreadCheckbox.style.opacity = "1";
            spreadCheckbox.style.cursor = "pointer";
        }

        // Remettre des valeurs par défaut si les champs sont vides
        if (!startTimeInput.value) {
            startTimeInput.value = "08:00";
        }
        if (!endTimeInput.value) {
            endTimeInput.value = "17:00";
        }
    }
}

// Modifier la fonction saveEntry pour valider les congés sans heures
function saveEntry() {
    const date = document.getElementById("entryDate").value;
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;
    const type = document.getElementById("entryType").value;
    const notes = document.getElementById("entryNotes").value;
    const spreadOverTwoDays = document.getElementById("spreadOverTwoDays").checked;
    const endDate = spreadOverTwoDays ? document.getElementById("endDate").value : date;

    // Validation de base
    if (!date) {
        showSystemMessage(t("error.date"), true);
        return;
    }

    // Si ce n'est pas un congé, valider les heures
    if (type !== "leave") {
        if (!startTime || !endTime) {
            showSystemMessage(t("error.times"), true);
            return;
        }

        if (spreadOverTwoDays && !endDate) {
            showSystemMessage(t("error.endDate"), true);
            return;
        }

        // Vérifier si la date de fin est après la date de début
        if (spreadOverTwoDays) {
            const startDateObj = new Date(date);
            const endDateObj = new Date(endDate);

            if (endDateObj < startDateObj) {
                showSystemMessage(t("error.endDateOrder"), true);
                return;
            }
        }

        // Calculer les heures pour vérifier la durée
        const entryData = {
            date: date,
            startTime: startTime,
            endTime: endTime,
            type: type,
            notes: notes,
            spreadOverTwoDays: spreadOverTwoDays
        };

        if (spreadOverTwoDays) {
            entryData.endDate = endDate;
        }

        const hours = calculateHours(entryData);
        if (hours <= 0) {
            showSystemMessage(t("error.duration"), true);
            return;
        }
    }

    // Pour les congés, on peut mettre des valeurs par défaut pour les heures
    const finalStartTime = type === "leave" ? "00:00" : startTime;
    const finalEndTime = type === "leave" ? "00:00" : endTime;
    const finalSpreadOverTwoDays = type === "leave" ? false : spreadOverTwoDays;
    const finalEndDate = type === "leave" ? date : spreadOverTwoDays ? endDate : date;

    // Créer l'entrée
    const newEntry = {
        id: Date.now().toString(),
        date: date,
        startTime: finalStartTime,
        endTime: finalEndTime,
        type: type,
        notes: notes,
        spreadOverTwoDays: finalSpreadOverTwoDays,
        createdAt: new Date().toISOString()
    };

    if (finalSpreadOverTwoDays) {
        newEntry.endDate = finalEndDate;
    }

    // Ajouter à la liste
    workEntries.push(newEntry);

    // Sauvegarder dans le localStorage
    localStorage.setItem("workEntries", JSON.stringify(workEntries));

    // Mettre à jour l'affichage
    generateCalendar();
    displayMonthEntries();
    updateSummary();

    // Fermer le modal et afficher un message système
    closeAddEntryModal();
    const message = type === "leave" ? t("msg.leave.saved") : t("msg.saved");
    showSystemMessage(message);
}

// Modifier la fonction de modification d'entrée de la même manière
function editEntry(id) {
    entryToEdit = workEntries.find((entry) => entry.id === id);

    if (!entryToEdit) {
        showSystemMessage(t("msg.notFound"), true);
        return;
    }

    // Remplir le formulaire d'édition
    document.getElementById("editEntryDate").value = entryToEdit.date;
    document.getElementById("editStartTime").value = entryToEdit.startTime;
    document.getElementById("editEndTime").value = entryToEdit.endTime;
    document.getElementById("editEntryType").value = entryToEdit.type;
    document.getElementById("editEntryNotes").value = entryToEdit.notes || "";

    // Gérer l'état initial des champs
    handleEditEntryTypeChange();

    // Gérer l'étalement sur 2 jours (seulement si ce n'est pas un congé)
    if (entryToEdit.type !== "leave") {
        const hasEndDate = entryToEdit.endDate && entryToEdit.endDate !== entryToEdit.date;
        document.getElementById("editSpreadOverTwoDays").checked = hasEndDate;

        if (hasEndDate) {
            document.getElementById("editEndDateGroup").style.display = "block";
            document.getElementById("editEndDate").value = entryToEdit.endDate;
        } else {
            document.getElementById("editEndDateGroup").style.display = "none";
            document.getElementById("editEndDate").value = "";
        }
    } else {
        document.getElementById("editSpreadOverTwoDays").checked = false;
        document.getElementById("editEndDateGroup").style.display = "none";
        document.getElementById("editEndDate").value = "";
    }

    // Afficher le modal
    document.getElementById("editEntryModal").style.display = "flex";
}

// Ajouter cette fonction pour gérer les changements de type dans l'édition
function handleEditEntryTypeChange() {
    const entryType = document.getElementById("editEntryType");
    const startTimeInput = document.getElementById("editStartTime");
    const endTimeInput = document.getElementById("editEndTime");
    const spreadCheckbox = document.getElementById("editSpreadOverTwoDays");

    if (!entryType || !startTimeInput || !endTimeInput) return;

    // Si le type est "leave" (congé)
    if (entryType.value === "leave") {
        // Désactiver les champs d'heure
        startTimeInput.disabled = true;
        endTimeInput.disabled = true;
        startTimeInput.style.opacity = "0.5";
        endTimeInput.style.opacity = "0.5";
        startTimeInput.style.cursor = "not-allowed";
        endTimeInput.style.cursor = "not-allowed";

        // Désactiver la case à cocher pour l'étalement sur 2 jours
        if (spreadCheckbox) {
            spreadCheckbox.disabled = true;
            spreadCheckbox.style.opacity = "0.5";
            spreadCheckbox.style.cursor = "not-allowed";

            // Si elle était cochée, la décocher et masquer le champ date de fin
            if (spreadCheckbox.checked) {
                spreadCheckbox.checked = false;
                document.getElementById("editEndDateGroup").style.display = "none";
                document.getElementById("editEndDate").value = "";
            }
        }

        // Vider les champs d'heure
        startTimeInput.value = "";
        endTimeInput.value = "";
    } else {
        // Réactiver les champs pour les autres types
        startTimeInput.disabled = false;
        endTimeInput.disabled = false;
        startTimeInput.style.opacity = "1";
        endTimeInput.style.opacity = "1";
        startTimeInput.style.cursor = "pointer";
        endTimeInput.style.cursor = "pointer";

        // Réactiver la case à cocher
        if (spreadCheckbox) {
            spreadCheckbox.disabled = false;
            spreadCheckbox.style.opacity = "1";
            spreadCheckbox.style.cursor = "pointer";
        }

        // Si les champs sont vides, mettre des valeurs par défaut
        if (!startTimeInput.value) {
            startTimeInput.value = "08:00";
        }
        if (!endTimeInput.value) {
            endTimeInput.value = "17:00";
        }
    }
}

// Afficher la confirmation de suppression MODAL
function showDeleteConfirm(id) {
    entryToDelete = id;

    // Afficher le modal de confirmation
    document.getElementById("confirmMessage").textContent = t(
        "confirm.delete" in i18n[currentLang] ? "confirm.delete" : "error.fields"
    );
    document.getElementById("confirmModal").style.display = "flex";

    // Configurer le bouton de confirmation
    const confirmBtn = document.getElementById("confirmDeleteBtn");
    confirmBtn.onclick = function () {
        deleteEntry(entryToDelete);
        closeConfirmModal();
    };
}

// Fermer le modal de confirmation
function closeConfirmModal() {
    document.getElementById("confirmModal").style.display = "none";
    entryToDelete = null;
}

// Supprimer une entrée
function deleteEntry(id) {
    workEntries = workEntries.filter((entry) => entry.id !== id);
    localStorage.setItem("workEntries", JSON.stringify(workEntries));

    displayMonthEntries();
    updateSummary();
    generateCalendar();

    showSystemMessage(t("msg.deleted"), true);
}

// Afficher le modal d'édition
function editEntry(id) {
    entryToEdit = workEntries.find((entry) => entry.id === id);

    if (!entryToEdit) {
        showSystemMessage("Entrée non trouvée", true);
        return;
    }

    // Remplir le formulaire d'édition
    document.getElementById("editEntryDate").value = entryToEdit.date;
    document.getElementById("editStartTime").value = entryToEdit.startTime;
    document.getElementById("editEndTime").value = entryToEdit.endTime;
    document.getElementById("editEntryType").value = entryToEdit.type;
    document.getElementById("editEntryNotes").value = entryToEdit.notes || "";

    // Gérer l'étalement sur 2 jours
    const hasEndDate = entryToEdit.endDate && entryToEdit.endDate !== entryToEdit.date;
    document.getElementById("editSpreadOverTwoDays").checked = hasEndDate;

    if (hasEndDate) {
        document.getElementById("editEndDateGroup").style.display = "block";
        document.getElementById("editEndDate").value = entryToEdit.endDate;
    } else {
        document.getElementById("editEndDateGroup").style.display = "none";
        document.getElementById("editEndDate").value = "";
    }

    // Afficher le modal
    document.getElementById("editEntryModal").style.display = "flex";
}

// Afficher/masquer le champ date de fin dans l'édition
function toggleEditEndDate() {
    const isChecked = document.getElementById("editSpreadOverTwoDays").checked;
    const endDateGroup = document.getElementById("editEndDateGroup");
    const startDate = document.getElementById("editEntryDate").value;

    if (isChecked) {
        endDateGroup.style.display = "block";
        if (!entryToEdit.endDate || entryToEdit.endDate === entryToEdit.date) {
            // Par défaut, mettre le jour suivant
            const startDateObj = new Date(startDate);
            startDateObj.setDate(startDateObj.getDate() + 1);
            const nextDay = startDateObj.toISOString().split("T")[0];
            document.getElementById("editEndDate").value = nextDay;
        }
    } else {
        endDateGroup.style.display = "none";
        document.getElementById("editEndDate").value = "";
    }
}

// Fermer le modal d'édition
function closeEditEntryModal() {
    document.getElementById("editEntryModal").style.display = "none";
    entryToEdit = null;
}

// Enregistrer l'entrée modifiée
function saveEditedEntry() {
    if (!entryToEdit) return;

    const date = document.getElementById("editEntryDate").value;
    const startTime = document.getElementById("editStartTime").value;
    const endTime = document.getElementById("editEndTime").value;
    const type = document.getElementById("editEntryType").value;
    const notes = document.getElementById("editEntryNotes").value;
    const spreadOverTwoDays = document.getElementById("editSpreadOverTwoDays").checked;
    const endDate = spreadOverTwoDays ? document.getElementById("editEndDate").value : date;

    // Validation
    if (!date || !startTime || !endTime) {
        showSystemMessage(t("error.fields"), true);
        return;
    }

    if (spreadOverTwoDays && !endDate) {
        showSystemMessage(t("error.endDate"), true);
        return;
    }

    // Vérifier si la date de fin est après la date de début
    if (spreadOverTwoDays) {
        const startDateObj = new Date(date);
        const endDateObj = new Date(endDate);

        if (endDateObj < startDateObj) {
            showSystemMessage(t("error.endDateOrder"), true);
            return;
        }
    }

    // Pour les congés/absences, les heures ne sont pas nécessaires
    if (type !== "leave") {
        const entryData = {
            date: date,
            startTime: startTime,
            endTime: endTime,
            type: type,
            notes: notes,
            spreadOverTwoDays: spreadOverTwoDays
        };

        if (spreadOverTwoDays) {
            entryData.endDate = endDate;
        }

        const hours = calculateHours(entryData);
        if (hours <= 0) {
            showSystemMessage(t("error.duration"), true);
            return;
        }
    }

    // Mettre à jour l'entrée
    entryToEdit.date = date;
    entryToEdit.startTime = startTime;
    entryToEdit.endTime = endTime;
    entryToEdit.type = type;
    entryToEdit.notes = notes;
    entryToEdit.spreadOverTwoDays = spreadOverTwoDays;

    if (spreadOverTwoDays) {
        entryToEdit.endDate = endDate;
    } else {
        delete entryToEdit.endDate;
    }

    // Sauvegarder dans le localStorage
    localStorage.setItem("workEntries", JSON.stringify(workEntries));

    // Mettre à jour l'affichage
    generateCalendar();
    displayMonthEntries();
    updateSummary();

    // Fermer le modal et afficher un message système
    closeEditEntryModal();
    showSystemMessage(t("msg.edited"));
}

// Afficher les entrées d'un jour spécifique
function showDayEntries(day, entries) {
    if (entries.length === 0) {
        let message = `${t("entries.day.none")} ${day}/${currentMonth + 1}/${currentYear}`;
        showSystemMessage(message, true);
        return;
    }

    // Formater la date d'affichage pour le titre (JJ/MM/AAAA)
    const dateObj = new Date(currentYear, currentMonth, day);
    const dayFormatted = day.toString().padStart(2, "0");
    const monthFormatted = (currentMonth + 1).toString().padStart(2, "0");
    const yearFormatted = currentYear.toString();
    const titleDate = `${dayFormatted}/${monthFormatted}/${yearFormatted}`;

    // Créer le message avec toutes les entrées
    let message = `<div style="text-align: left; line-height: 1.8;">`;

    // Variables pour les boutons
    let allEntryIds = [];
    let hasMultipleEntries = entries.length > 1;

    // Afficher chaque entrée
    entries.forEach((entry, index) => {
        allEntryIds.push(entry.id);
        const hours = calculateHours(entry);

        // Emojis selon le type
        const emojis = {
            normal: "📅",
            overtime: "🔥",
            night: "🌙",
            weekend: "🏖️",
            leave: "🏝️"
        };

        const emoji = emojis[entry.type] || "📝";

        // Informations de date supplémentaires
        let dateInfo = "";
        if (entry.endDate && entry.endDate !== entry.date) {
            const endDate = new Date(entry.endDate);
            const endDay = endDate.getDate().toString().padStart(2, "0");
            const endMonth = (endDate.getMonth() + 1).toString().padStart(2, "0");
            dateInfo = ` (${t("entry.until")} ${endDay}/${endMonth})`;
        }

        // Pour les congés/absences
        if (entry.type === "leave") {
            message += `
                <div style="margin-bottom: 20px; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 10px;"> <!-- SUPPRIMÉ: border-left: 4px solid #ffcc00 -->
                    <div style="font-weight: bold; margin-bottom: 8px; color: #00ffcc; font-size: 16px;">
                        ${emoji} ${t("type.leave.full")}${dateInfo}
                    </div>`;

            if (entry.notes && entry.notes.trim() !== "") {
                message += `
                    <div style="margin-top: 8px; color: #ddd; font-style: italic; font-size: 14px; padding: 8px; background: rgba(255, 255, 255, 0.03); border-radius: 6px;">
                        📝 ${entry.notes}
                    </div>`;
            }

            message += `
                    <div style="margin-top: 12px; display: flex; gap: 12px;">
                        <button onclick="editEntry('${entry.id}'); closeInfoModal();" style="padding: 8px 12px; background: #00ffcc; color: #000; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; flex: 1; font-weight: bold; transition: all 0.3s;">
                            ${t("btn.edit")}
                        </button>
                        <button onclick="showDeleteConfirm('${entry.id}'); closeInfoModal();" style="padding: 8px 12px; background: #ff5555; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; flex: 1; font-weight: bold; transition: all 0.3s;">
                            ${t("btn.delete")}
                        </button>
                    </div>
                </div>
            `;
        } else {
            message += `
                <div style="margin-bottom: 20px; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 10px;"> <!-- SUPPRIMÉ: border-left: 4px solid #00ffcc -->
                    <div style="font-weight: bold; margin-bottom: 8px; color: #00ffcc; font-size: 16px;">
                        ${emoji} ${entry.startTime} - ${entry.endTime} <span style="color: #ffffff; font-weight: normal;">(${hours.toFixed(1)}h)</span>${dateInfo}
                    </div>
                    <div style="margin-left: 5px; margin-top: 6px; color: #ccc; font-size: 14px;">
                        ${t("entry.tag.type")} ${getTypeLabel(entry.type)}
                    </div>`;

            if (entry.notes && entry.notes.trim() !== "") {
                message += `
                    <div style="margin-left: 5px; margin-top: 8px; color: #ddd; font-style: italic; font-size: 14px; padding: 8px; background: rgba(255, 255, 255, 0.03); border-radius: 6px;">
                        📝 ${entry.notes}
                    </div>`;
            }

            message += `
                    <div style="margin-top: 12px; display: flex; gap: 12px;">
                        <button onclick="editEntry('${entry.id}'); closeInfoModal();" style="padding: 8px 12px; background: #00ffcc; color: #000; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; flex: 1; font-weight: bold; transition: all 0.3s;">
                            ${t("btn.edit")}
                        </button>
                        <button onclick="showDeleteConfirm('${entry.id}'); closeInfoModal();" style="padding: 8px 12px; background: #ff5555; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; flex: 1; font-weight: bold; transition: all 0.3s;">
                            ${t("btn.delete")}
                        </button>
                    </div>
                </div>
            `;
        }
    });

    message += `</div>`;

    // Afficher le modal
    const infoMessageElement = document.getElementById("infoMessage");
    infoMessageElement.innerHTML = "";

    const messageContainer = document.createElement("div");
    messageContainer.style.cssText = `
        text-align: left;
        font-size: 15px;
        line-height: 1.8;
        max-height: 500px;
        overflow-y: auto;
        padding: 15px;
        margin-bottom: 20px;
        background: rgba(40, 40, 40, 0.7);
        border-radius: 10px;
        scrollbar-width: thin;
        scrollbar-color: #00ffcc #2a2a2a;
    `;

    messageContainer.innerHTML = message;
    infoMessageElement.appendChild(messageContainer);

    // Configurer les boutons du bas (Supprimer tout et OK)
    const formActions = document.querySelector("#infoModal .form-actions");
    formActions.innerHTML = "";

    // Si plusieurs entrées, ajouter un bouton "Supprimer tout"
    if (hasMultipleEntries) {
        formActions.innerHTML = `
            <button class="btn-delete" onclick="deleteAllEntriesForDay(${day}, ${currentMonth}, ${currentYear})" style="background: #ff5555; flex: 1; font-weight: bold; padding: 12px; font-size: 14px;">
                Supprimer tout
            </button>
            <button class="btn-cancel" onclick="closeInfoModal()" style="flex: 1; font-weight: bold; padding: 12px; font-size: 14px;">
                OK
            </button>
        `;
    } else {
        formActions.innerHTML = `<button class="btn-cancel" onclick="closeInfoModal()" style="width: 100%; font-weight: bold; padding: 12px; font-size: 14px;">${t("btn.ok")}</button>`;
    }

    // Mettre à jour le titre avec une taille plus grande
    document.getElementById("infoTitle").textContent = `${t("entries.day.title")} ${titleDate}`;
    document.getElementById("infoTitle").style.fontSize = "22px";

    const modal = document.getElementById("infoModal");
    modal.style.display = "flex";

    // Changer la couleur du titre
    const infoTitle = document.getElementById("infoTitle");
    infoTitle.style.color = "#00ffcc";
    infoTitle.style.fontWeight = "bold";
    infoTitle.style.marginBottom = "15px";
}

// Fonction pour supprimer toutes les entrées d'un jour
function deleteAllEntriesForDay(day, month, year) {
    const targetDate = new Date(year, month, day);

    // Filtrer les entrées pour garder celles qui ne correspondent pas à cette date
    const initialCount = workEntries.length;
    workEntries = workEntries.filter((entry) => {
        const entryDate = new Date(entry.date);
        const entryEndDate = entry.endDate ? new Date(entry.endDate) : entryDate;

        // Ne pas garder les entrées qui commencent OU finissent ce jour
        return !isSameDay(entryDate, targetDate) && !(entry.endDate && isSameDay(entryEndDate, targetDate));
    });

    const deletedCount = initialCount - workEntries.length;

    // Sauvegarder dans le localStorage
    localStorage.setItem("workEntries", JSON.stringify(workEntries));

    // Mettre à jour l'affichage
    displayMonthEntries();
    updateSummary();
    generateCalendar();

    // Fermer le modal et afficher un message
    closeInfoModal();
    showSystemMessage(`${deletedCount} ${t("msg.deleted.day")}`);
}

// Afficher le modal d'information
function showInfoMessage(message, title = "Information", isError = false) {
    document.getElementById("infoTitle").textContent = title;
    document.getElementById("infoMessage").textContent = message;

    // Réinitialiser les boutons (par défaut juste OK)
    const formActions = document.querySelector("#infoModal .form-actions");
    formActions.innerHTML = '<button class="btn-cancel" onclick="closeInfoModal()">OK</button>';

    const modal = document.getElementById("infoModal");
    modal.style.display = "flex";

    // Changer la couleur du titre pour les erreurs
    const infoTitle = document.getElementById("infoTitle");
    if (isError) {
        infoTitle.style.color = "#ff5555";
    } else {
        infoTitle.style.color = "#00ffcc";
    }
}

// Fermer le modal d'information
function closeInfoModal() {
    document.getElementById("infoModal").style.display = "none";
}

// Afficher le modal d'importation
function showImportModal() {
    document.getElementById("importModal").style.display = "flex";
    document.getElementById("fileImport").value = "";
    document.getElementById("mergeData").checked = true;
    toggleButtons();
}

// Fermer le modal d'importation
function closeImportModal() {
    document.getElementById("importModal").style.display = "none";
}

// Importer des données
function importData() {
    const fileInput = document.getElementById("fileImport");
    const mergeData = document.getElementById("mergeData").checked;

    if (!fileInput.files.length) {
        showSystemMessage(t("error.file"), true);
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (event) {
        try {
            const importedData = JSON.parse(event.target.result);

            // Validation des données
            if (!Array.isArray(importedData)) {
                showSystemMessage(t("error.jsonArray"), true);
                return;
            }

            // Vérifier la structure des données
            const isValid = importedData.every(
                (item) => item.id && item.date && item.startTime && item.endTime && item.type
            );

            if (!isValid) {
                showSystemMessage(t("error.jsonFormat"), true);
                return;
            }

            let message = "";

            // Fusionner ou remplacer les données
            if (mergeData) {
                // Fusionner sans doublons (basé sur l'ID)
                const existingIds = new Set(workEntries.map((entry) => entry.id));
                const newEntries = importedData.filter((entry) => !existingIds.has(entry.id));
                workEntries = [...workEntries, ...newEntries];
                message = `${newEntries.length} ${t("import.merged")}`;
            } else {
                workEntries = importedData;
                message = `${importedData.length} ${t("import.replaced")}`;
            }

            // Sauvegarder dans le localStorage
            localStorage.setItem("workEntries", JSON.stringify(workEntries));

            // Mettre à jour l'affichage
            generateCalendar();
            displayMonthEntries();
            updateSummary();

            closeImportModal();
            showSystemMessage(message);
        } catch (error) {
            console.error("Erreur d'importation:", error);
            showSystemMessage(t("msg.importError"), true);
        }
    };

    reader.onerror = function () {
        showSystemMessage(t("msg.importReadError"), true);
    };

    reader.readAsText(file);
}

// Afficher le modal des statistiques
function showStatsModal() {
    const modal = document.getElementById("statsModal");

    // Calculer les statistiques
    const monthEntries = workEntries.filter((entry) => {
        const entryDate = new Date(entry.date);
        const entryEndDate = entry.endDate ? new Date(entry.endDate) : entryDate;

        return (
            (entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear) ||
            (entry.endDate && entryEndDate.getMonth() === currentMonth && entryEndDate.getFullYear() === currentYear)
        );
    });

    // Compter les jours travaillés (exclure les congés)
    // On n'ajoute que entry.date (jour de début) : pour un shift de nuit étalé sur 2 jours,
    // endDate est simplement la date de fin du shift, pas un jour travaillé supplémentaire.
    const daysWorkedSet = new Set();
    monthEntries.forEach((entry) => {
        if (entry.type !== "leave") {
            daysWorkedSet.add(entry.date);
        }
    });
    const daysWorked = daysWorkedSet.size;

    // Calculer les heures totales (exclure les congés)
    const totalHours = monthEntries.reduce((sum, entry) => {
        if (entry.type !== "leave") {
            return sum + calculateHours(entry);
        }
        return sum;
    }, 0);

    const avgHours = daysWorked > 0 ? (totalHours / daysWorked).toFixed(1) : 0;

    // Calculer les heures supplémentaires (night, weekend, overtime)
    const overtimeHours = monthEntries
        .filter((entry) => entry.type === "overtime" || entry.type === "night" || entry.type === "weekend")
        .reduce((sum, entry) => sum + calculateHours(entry), 0);

    const overtimePercent = totalHours > 0 ? ((overtimeHours / totalHours) * 100).toFixed(0) : 0;

    // Mettre à jour les statistiques
    document.getElementById("statDaysWorked").textContent = daysWorked;
    document.getElementById("statAvgHours").textContent = `${avgHours}h`;
    document.getElementById("statOvertimePercent").textContent = `${overtimePercent}%`;

    // Générer le graphique
    generateChart();

    modal.style.display = "flex";
    toggleButtons();
}

// Fermer le modal des statistiques
function closeStatsModal() {
    document.getElementById("statsModal").style.display = "none";
}

// Fermer le modal d'ajout d'entrée
function closeAddEntryModal() {
    const modal = document.getElementById("addEntryModal");
    modal.style.display = "none";
}

// Afficher/masquer le champ date de fin (pour l'ajout)
function toggleEndDate() {
    const isChecked = document.getElementById("spreadOverTwoDays").checked;
    const endDateGroup = document.getElementById("endDateGroup");
    const startDate = document.getElementById("entryDate").value;

    if (isChecked) {
        endDateGroup.style.display = "block";
        // Par défaut, mettre le jour suivant
        const startDateObj = new Date(startDate);
        startDateObj.setDate(startDateObj.getDate() + 1);
        const nextDay = startDateObj.toISOString().split("T")[0];
        document.getElementById("endDate").value = nextDay;
    } else {
        endDateGroup.style.display = "none";
        document.getElementById("endDate").value = "";
    }
}

// Fermer tous les modals (fonction utilitaire)
function closeAllModals() {
    const modals = document.querySelectorAll(".modal");
    modals.forEach((modal) => {
        modal.style.display = "none";
    });
}

// Générer le graphique des heures
function generateChart() {
    const ctx = document.getElementById("hoursChart").getContext("2d");
 
    // Supprimer l'ancien graphique s'il existe
    if (window.hoursChartInstance) {
        window.hoursChartInstance.destroy();
    }
 
    // Calculer les heures par semaine (exclure les congés)
    const weeklyHours = calculateWeeklyHours();
 
    // Si pas de données, afficher un message
    if (weeklyHours.labels.length === 0 || weeklyHours.hours.every((h) => h === 0)) {
        // Créer un graphique vide avec un message
        window.hoursChartInstance = new Chart(ctx, {
            type: "bar",
            data: {
                labels: [t("chart.noDataLabel")],
                datasets: [
                    {
                        label: t("chart.worked"),
                        data: [0],
                        backgroundColor: "#333",
                        borderColor: "#555",
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: t("chart.hours")
                        },
                        ticks: {
                            callback: function (value) {
                                return value + "h";
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: t("chart.weeks")
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                }
            },
            plugins: [
                {
                    id: "noData",
                    afterDraw: function (chart) {
                        if (chart.data.datasets[0].data[0] === 0) {
                            const ctx = chart.ctx;
                            const width = chart.width;
                            const height = chart.height;
 
                            chart.clear();
                            ctx.save();
                            ctx.textAlign = "center";
                            ctx.textBaseline = "middle";
                            ctx.font = "16px Gotham";
                            ctx.fillStyle = "#aaa";
                            ctx.fillText(t("chart.noData"), width / 2, height / 2);
                            ctx.restore();
                        }
                    }
                }
            ]
        });
        return;
    }
 
    // Sinon, créer le graphique normal
    window.hoursChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: weeklyHours.labels,
            datasets: [
                {
                    label: t("chart.worked"),
                    data: weeklyHours.hours,
                    backgroundColor: "#00ffcc",
                    borderColor: "#00ccaa",
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: t("chart.hours")
                    },
                    ticks: {
                        callback: function (value) {
                            return value + "h";
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: t("chart.weeks")
                    }
                }
            }
        }
    });
}

// Calculer les heures par semaine (exclure les congés)
function calculateWeeklyHours() {
    const monthEntries = workEntries.filter((entry) => {
        const entryDate = new Date(entry.date);
        return (
            entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear && entry.type !== "leave"
        );
    });

    // Si pas d'entrées, retourner des tableaux vides
    if (monthEntries.length === 0) {
        return {
            labels: [],
            hours: []
        };
    }

    const weeklyHours = {};

    monthEntries.forEach((entry) => {
        const date = new Date(entry.date);
        const weekNumber = getWeekNumber(date);
        const hours = calculateHours(entry);

        if (!weeklyHours[weekNumber]) {
            weeklyHours[weekNumber] = 0;
        }
        weeklyHours[weekNumber] += hours;
    });

    // Trier les semaines
    const weeks = Object.keys(weeklyHours)
        .map((w) => parseInt(w))
        .sort((a, b) => a - b);

    // Afficher simplement les numéros de semaine
    const labels = weeks.map((week) => `${t("chart.weekPrefix")} ${week}`);
    const hours = weeks.map((week) => weeklyHours[week]);

    return {
        labels,
        hours
    };
}

// Obtenir le numéro de semaine
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Exporter les données
function exportData() {
    const dataStr = JSON.stringify(workEntries, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = `heures-travail-${new Date().toISOString().split("T")[0]}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();

    showSystemMessage(t("msg.exported"));
}

// Fonction de rafraîchissement de la page
function refreshPage() {
    location.reload();
}

// Afficher un message système
function showSystemMessage(message, isError = false) {
    const existingMsg = document.querySelector(".system-message");
    if (existingMsg) {
        existingMsg.remove();
    }

    const msg = document.createElement("div");
    msg.className = "system-message";
    msg.textContent = message;
    if (isError) {
        msg.classList.add("error-message");
    }
    document.body.appendChild(msg);
    setTimeout(() => {
        msg.style.opacity = "0";
        setTimeout(() => msg.remove(), 500);
    }, 3000);
}

// ==================== FONCTIONS POUR LA SUPPRESSION COMPLÈTE ====================

// Afficher le modal de confirmation pour suppression complète
function showDeleteAllConfirm() {
    // Afficher le modal de confirmation
    document.getElementById("deleteAllModal").style.display = "flex";

    // Configurer le bouton de confirmation
    const confirmBtn = document.getElementById("confirmDeleteAllBtn");
    confirmBtn.onclick = function () {
        closeDeleteAllModal();
        showVerificationModal();
    };

    toggleButtons(); // Replier les boutons flottants
}

// Fermer le modal de suppression complète
function closeDeleteAllModal() {
    document.getElementById("deleteAllModal").style.display = "none";
}

// Afficher le modal de vérification avec code
function showVerificationModal() {
    // Générer un code à 4 chiffres
    verificationCode = Math.floor(1000 + Math.random() * 9000).toString();

    // Afficher le code
    document.getElementById("verificationCode").textContent = verificationCode;

    // Réinitialiser le champ de saisie
    document.getElementById("userVerificationCode").value = "";

    // Désactiver le bouton de vérification
    document.getElementById("confirmVerifyBtn").disabled = true;

    // Ajouter l'écouteur d'événement pour la saisie
    const inputField = document.getElementById("userVerificationCode");
    const verifyBtn = document.getElementById("confirmVerifyBtn");

    inputField.oninput = function () {
        // Nettoyer l'entrée (uniquement chiffres)
        this.value = this.value.replace(/\D/g, "");

        // Vérifier si le code correspond
        if (this.value === verificationCode) {
            verifyBtn.disabled = false;
        } else {
            verifyBtn.disabled = true;
        }
    };

    // Configurer le bouton de vérification
    verifyBtn.onclick = function () {
        if (document.getElementById("userVerificationCode").value === verificationCode) {
            deleteAllEntries();
            closeVerifyModal();
        }
    };

    // Focus sur le champ de saisie
    inputField.focus();

    // Afficher le modal
    document.getElementById("verifyDeleteModal").style.display = "flex";
}

// Fermer le modal de vérification
function closeVerifyModal() {
    document.getElementById("verifyDeleteModal").style.display = "none";
    verificationCode = "";
}

// Supprimer toutes les entrées
function deleteAllEntries() {
    // Vider le tableau des entrées
    workEntries = [];

    // Supprimer du localStorage
    localStorage.removeItem("workEntries");

    // Mettre à jour l'affichage
    displayMonthEntries();
    updateSummary();
    generateCalendar();

    // Afficher un message dans un modal d'information
    showInfoMessage(t("msg.deleteAll.done"), t("msg.deleteAll.title"), false);

    console.log("Toutes les entrées ont été supprimées");
}

// Export fichier PDF

// Variables globales (ajoutez en haut avec les autres)
const { jsPDF } = window.jspdf;

// ==================== FONCTIONS PDF ====================

// Afficher le modal PDF
function showPDFModal() {
    console.log("showPDFModal appelé");

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    document.getElementById("pdfStartDate").value = firstDay.toISOString().split("T")[0];
    document.getElementById("pdfEndDate").value = lastDay.toISOString().split("T")[0];
    document.getElementById("includeSummary").checked = true;
    document.getElementById("includeNotes").checked = true;
    document.getElementById("colorizeRows").checked = true;
    document.getElementById("pdfTitle").value =
        `${t("pdf.title.month")} - ${today.toLocaleDateString(currentLang === "en" ? "en-GB" : "fr-FR", { month: "long", year: "numeric" })}`;

    // Init sélecteur de thème
    document.querySelectorAll(".pdf-theme-btn").forEach((btn) => {
        btn.classList.remove("active");
        btn.onclick = function () {
            document.querySelectorAll(".pdf-theme-btn").forEach((b) => b.classList.remove("active"));
            this.classList.add("active");
        };
    });
    const firstThemeBtn = document.querySelector(".pdf-theme-btn");
    if (firstThemeBtn) {
        firstThemeBtn.classList.add("active");
    }

    document.getElementById("pdfModal").style.display = "flex";
    toggleButtons();
}

// Fermer le modal PDF
function closePDFModal() {
    document.getElementById("pdfModal").style.display = "none";
}

// Générer le PDF
function generatePDF() {
    console.log("generatePDF appelé");

    const startDate = document.getElementById("pdfStartDate").value;
    const endDate = document.getElementById("pdfEndDate").value;
    const includeSummary = document.getElementById("includeSummary").checked;
    const includeNotes = document.getElementById("includeNotes").checked;
    const colorizeRows = document.getElementById("colorizeRows").checked;
    const pdfTitle = document.getElementById("pdfTitle").value || "Suivi des Heures de Travail";
    const pdfAuthor = document.getElementById("pdfAuthor").value.trim();
    const pdfCompany = document.getElementById("pdfCompany").value.trim();

    const activeThemeBtn = document.querySelector(".pdf-theme-btn.active");
    const selectedTheme = activeThemeBtn ? activeThemeBtn.dataset.theme : "teal";

    if (!startDate || !endDate) {
        showSystemMessage(t("error.period"), true);
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        showSystemMessage(t("error.periodOrder"), true);
        return;
    }

    const filteredEntries = workEntries
        .filter((entry) => {
            const entryDate = new Date(entry.date);
            const entryEndDate = entry.endDate ? new Date(entry.endDate) : entryDate;
            const start = new Date(startDate);
            const end = new Date(endDate);
            return (entryDate >= start && entryDate <= end) || (entryEndDate >= start && entryEndDate <= end);
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (filteredEntries.length === 0) {
        showSystemMessage(t("error.noEntries"), true);
        return;
    }

    createPDF(
        filteredEntries,
        startDate,
        endDate,
        includeSummary,
        includeNotes,
        pdfTitle,
        pdfAuthor,
        pdfCompany,
        selectedTheme,
        colorizeRows
    );
    closePDFModal();
}

function createPDF(
    entries,
    startDate,
    endDate,
    includeSummary,
    includeNotes,
    title,
    author,
    company,
    themeName,
    colorizeRows
) {
    console.log("Création du PDF complet avec", entries.length, "entrées");

    // ==================== PALETTES DE THÈMES ====================
    const themes = {
        teal:   { primary: [0, 191, 165],    light: [220, 252, 248], border: [140, 230, 220] },
        blue:   { primary: [30, 136, 229],   light: [220, 240, 255], border: [140, 200, 245] },
        purple: { primary: [142, 36, 170],   light: [240, 220, 252], border: [200, 155, 230] },
        red:    { primary: [229, 57, 53],    light: [255, 225, 225], border: [240, 165, 163] },
        green:  { primary: [67, 160, 71],    light: [220, 248, 222], border: [150, 220, 155] },
        orange: { primary: [251, 140, 0],    light: [255, 243, 220], border: [245, 200, 140] },
        pink:   { primary: [233, 30, 140],   light: [255, 220, 242], border: [240, 155, 205] },
        indigo: { primary: [57, 73, 171],    light: [225, 228, 252], border: [155, 162, 235] },
        cyan:   { primary: [0, 172, 193],    light: [218, 248, 252], border: [140, 225, 235] },
        lime:   { primary: [192, 202, 51],   light: [245, 248, 210], border: [215, 225, 150] },
        amber:  { primary: [255, 179, 0],    light: [255, 248, 218], border: [245, 215, 140] },
        coral:  { primary: [255, 82, 82],    light: [255, 228, 228], border: [245, 170, 170] },
        mint:   { primary: [0, 230, 118],    light: [215, 255, 238], border: [140, 240, 195] },
        violet: { primary: [124, 77, 255],   light: [235, 225, 255], border: [185, 165, 250] },
        rose:   { primary: [245, 0, 87],     light: [255, 218, 232], border: [245, 150, 190] },
        sky:    { primary: [41, 182, 246],   light: [218, 245, 255], border: [145, 215, 250] }
    };
    const theme = themes[themeName] || themes.teal;
    const T = theme.primary; // couleur principale [r,g,b]
    const TL = theme.light; // fond clair
    const TB = theme.border; // bordure

    // Couleurs fixes par type de ligne
    const typeRowColors = {
        normal: [240, 250, 241],
        overtime: [255, 245, 230],
        night: [245, 235, 252],
        weekend: [255, 232, 232],
        leave: [255, 252, 220]
    };
    const typeTextColors = {
        normal: [76, 175, 80],
        overtime: [255, 152, 0],
        night: [156, 39, 176],
        weekend: [243, 33, 33],
        leave: [180, 140, 0]
    };

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("p", "mm", "a4");

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        let yPosition = margin;

        // ==================== EN-TÊTE ====================
        // Bande colorée en haut
        doc.setFillColor(...T);
        doc.rect(0, 0, pageWidth, 28, "F");

        doc.setFontSize(16);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text(t("pdf.header.main"), pageWidth / 2, 11, { align: "center" });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(255, 255, 255);
        doc.text(title, pageWidth / 2, 19, { align: "center" });

        // Nom / Société à droite dans la bande
        if (author || company) {
            doc.setFontSize(8.5);
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            if (author) {
                doc.text(author, pageWidth - margin, 10, { align: "right" });
            }
            if (company) {
                doc.setFont("helvetica", "normal");
                doc.text(company, pageWidth - margin, company && author ? 16 : 10, { align: "right" });
            }
        }

        yPosition = 36;

        // Ligne période / date de génération
        const pdfLocale = currentLang === "en" ? "en-GB" : "fr-FR";
        const startFormatted = new Date(startDate).toLocaleDateString(pdfLocale);
        const endFormatted = new Date(endDate).toLocaleDateString(pdfLocale);
        const periodText = `${t("pdf.period")} ${startFormatted} – ${endFormatted}`;
        const now = new Date();
        const genText = `${t("pdf.generated")} ${now.toLocaleDateString(pdfLocale)} ${t("pdf.generatedAt")} ${now.toLocaleTimeString(pdfLocale, { hour: "2-digit", minute: "2-digit" })}`;

        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "normal");
        doc.text(periodText, margin, yPosition);
        doc.text(genText, pageWidth - margin, yPosition, { align: "right" });
        yPosition += 12;

        // ==================== RÉSUMÉ GLOBAL ====================
        if (includeSummary) {
            const summary = calculatePeriodSummary(entries);

            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "bold");
            doc.text(t("pdf.globalSummary"), margin, yPosition);
            yPosition += 5;

            doc.setDrawColor(...T);
            doc.setLineWidth(0.5);
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 5;

            // Bande horizontale 4 colonnes
            const gStripW = pageWidth - margin * 2;
            const gStripH = 26;
            const gStripCols = 4;
            const gColW = gStripW / gStripCols;

            doc.setFillColor(248, 248, 248);
            doc.setDrawColor(...TB);
            doc.setLineWidth(0.3);
            doc.roundedRect(margin, yPosition, gStripW, gStripH, 2, 2, "FD");

            // Accent coloré en haut
            doc.setFillColor(...T);
            doc.roundedRect(margin, yPosition, gStripW, 3, 1, 1, "F");
            doc.rect(margin, yPosition + 2, gStripW, 1, "F");

            const globalItems = [
                { label: t("pdf.stat.total"), value: `${summary.totalHours.toFixed(1)} h`, color: T },
                { label: t("pdf.stat.normal"), value: `${summary.normalHours.toFixed(1)} h`, color: [46, 125, 50] },
                { label: t("pdf.stat.overtime"), value: `${summary.overtimeHours.toFixed(1)} h`, color: [200, 100, 0] },
                {
                    label: t("pdf.stat.days"),
                    value: `${summary.daysWorked} ${t("pdf.stat.daysUnit")}`,
                    color: [21, 101, 192]
                }
            ];

            for (let i = 0; i < globalItems.length; i++) {
                const item = globalItems[i];
                const midX = margin + i * gColW + gColW / 2;

                if (i > 0) {
                    doc.setDrawColor(215, 215, 215);
                    doc.setLineWidth(0.3);
                    doc.line(margin + i * gColW, yPosition + 5, margin + i * gColW, yPosition + gStripH - 2);
                }

                doc.setFontSize(16);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(...item.color);
                doc.text(item.value, midX, yPosition + 16, { align: "center" });

                doc.setFontSize(7.5);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(140, 140, 140);
                doc.text(item.label, midX, yPosition + 23, { align: "center" });
            }

            yPosition += gStripH + 12;
        }

        // ==================== ORGANISATION PAR MOIS ====================
        const entriesByMonth = groupEntriesByMonth(entries);
        const months = Object.keys(entriesByMonth).sort((a, b) => {
            const [yearA, monthA] = a.split("-").map(Number);
            const [yearB, monthB] = b.split("-").map(Number);
            return yearA === yearB ? monthA - monthB : yearA - yearB;
        });

        const createTableData = (mEntries, includeNotesParam) => {
            return mEntries.map((entry) => {
                const dateStr = new Date(entry.date).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                });
                let timeInfo, durationInfo;
                if (entry.type === "leave") {
                    timeInfo = "";
                    durationInfo = "";
                } else {
                    timeInfo = `${entry.startTime} - ${entry.endTime}`;
                    if (entry.endDate && entry.endDate !== entry.date) {
                        timeInfo += " " + t("pdf.night");
                    }
                    durationInfo = `${calculateHours(entry).toFixed(1)} h`;
                }
                const row = [dateStr, timeInfo, durationInfo, getTypeLabel(entry.type)];
                if (includeNotesParam) {
                    row.push(entry.notes || "");
                }
                return row;
            });
        };

        const didParseCell = (data) => {
            if (data.row.section === "head") {
                data.cell.styles.halign = "center";
                data.cell.styles.fontStyle = "bold";
                data.cell.styles.fillColor = T;
                data.cell.styles.textColor = 255;
                return;
            }

            if (data.column.index <= 3) {
                data.cell.styles.halign = "center";
            }

            if (includeNotes && data.column.index === 4) {
                data.cell.styles.fontStyle = "italic";
                data.cell.styles.halign = "left";
            }

            // Colorisation des lignes par type — comparaison insensible à la langue via les valeurs traduites
            if (colorizeRows && data.row.raw) {
                const typeLabel = data.row.raw[3] || "";
                let rowBg = null;
                if (typeLabel === t("type.normal")) {
                    rowBg = typeRowColors.normal;
                } else if (typeLabel === t("type.overtime")) {
                    rowBg = typeRowColors.overtime;
                } else if (typeLabel === t("type.night")) {
                    rowBg = typeRowColors.night;
                } else if (typeLabel === t("type.weekend")) {
                    rowBg = typeRowColors.weekend;
                } else if (typeLabel === t("type.leave")) {
                    rowBg = typeRowColors.leave;
                }
                if (rowBg) {
                    data.cell.styles.fillColor = rowBg;
                }
            }

            // Couleur texte colonne Type
            if (data.column.index === 3) {
                const val = data.cell.raw || "";
                if (val === t("type.normal")) {
                    data.cell.styles.textColor = typeTextColors.normal;
                } else if (val === t("type.overtime")) {
                    data.cell.styles.textColor = typeTextColors.overtime;
                } else if (val === t("type.night")) {
                    data.cell.styles.textColor = typeTextColors.night;
                } else if (val === t("type.weekend")) {
                    data.cell.styles.textColor = typeTextColors.weekend;
                } else if (val === t("type.leave")) {
                    data.cell.styles.textColor = typeTextColors.leave;
                }
                data.cell.styles.fontStyle = "bold";
            }
        };

        const didDrawCell = (data) => {
            const rowData = data.row.raw;
            const isLeave = rowData && rowData[3] && rowData[3] === t("type.leave");
            if (data.row.section === "body" && isLeave && (data.column.index === 1 || data.column.index === 2)) {
                const iconSize = data.cell.height * 0.4;
                const centerX = data.cell.x + data.cell.width / 2;
                const centerY = data.cell.y + data.cell.height / 2;
                doc.setDrawColor(231, 76, 60);
                doc.setLineWidth(0.8);
                doc.setLineCap("butt");
                doc.line(
                    centerX - iconSize / 2,
                    centerY - iconSize / 2,
                    centerX + iconSize / 2,
                    centerY + iconSize / 2
                );
                doc.line(
                    centerX + iconSize / 2,
                    centerY - iconSize / 2,
                    centerX - iconSize / 2,
                    centerY + iconSize / 2
                );
            }
        };

        for (const monthKey of months) {
            const monthEntries = entriesByMonth[monthKey];
            const [year, month] = monthKey.split("-").map(Number);
            const monthName = getMonthName(month);

            if (yPosition > 230) {
                doc.addPage();
                yPosition = margin;
            }

            // Titre du mois — centrage vertical précis (baseline jsPDF)
            const monthFontSize = 11;
            const monthBlockH = 12;
            const monthTextY = yPosition + monthBlockH / 2 + (monthFontSize * 0.352) / 2;

            doc.setFillColor(...TL);
            doc.setDrawColor(...TB);
            doc.setLineWidth(0.3);
            doc.roundedRect(margin, yPosition, pageWidth - margin * 2, monthBlockH, 2, 2, "FD");

            doc.setFontSize(monthFontSize);
            doc.setTextColor(...T);
            doc.setFont("helvetica", "bold");
            doc.text(`${monthName} ${year}`, margin + 4, monthTextY);
            yPosition += monthBlockH + 2;

            doc.autoTable({
                startY: yPosition,
                head: [
                    [
                        t("pdf.col.date"),
                        t("pdf.col.hours"),
                        t("pdf.col.duration"),
                        t("pdf.col.type"),
                        ...(includeNotes ? [t("pdf.col.notes")] : [])
                    ]
                ],
                body: createTableData(monthEntries, includeNotes),
                margin: { left: margin, right: margin },
                theme: "plain",
                styles: {
                    fontSize: 9,
                    cellPadding: 3,
                    valign: "middle",
                    lineColor: [220, 220, 220],
                    lineWidth: 0.1
                },
                columnStyles: {
                    0: { cellWidth: 30 },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 21 },
                    3: { cellWidth: 25 },
                    4: { cellWidth: "auto" }
                },
                didParseCell: didParseCell,
                didDrawCell: didDrawCell
            });

            yPosition = doc.lastAutoTable.finalY + 8;

            // ==================== RÉCAPITULATIF MENSUEL — BANDE HORIZONTALE ====================
            if (includeSummary) {
            const monthSummary = calculatePeriodSummary(monthEntries);
            const stripH = 22;
            const stripW = pageWidth - margin * 2;
            const stripCols = 4;
            const colW = stripW / stripCols;

            if (yPosition + stripH + 10 > pageHeight - margin) {
                doc.addPage();
                yPosition = margin;
            }

            // Titre récap
            doc.setFontSize(8);
            doc.setTextColor(140, 140, 140);
            doc.setFont("helvetica", "bolditalic");
            doc.text(`${t("pdf.recap")} — ${monthName} ${year}`, margin, yPosition + 3);
            yPosition += 6;

            // Fond de la bande
            doc.setFillColor(248, 248, 248);
            doc.setDrawColor(...TB);
            doc.setLineWidth(0.3);
            doc.roundedRect(margin, yPosition, stripW, stripH, 2, 2, "FD");

            // Barre colorée en haut de la bande (accent)
            doc.setFillColor(...T);
            doc.roundedRect(margin, yPosition, stripW, 2.5, 1, 1, "F");
            // Recouvrir le bas des coins arrondis du trait supérieur pour qu'il soit droit en bas
            doc.rect(margin, yPosition + 1.5, stripW, 1, "F");

            const monthStripItems = [
                { label: t("pdf.stat.total"), value: `${monthSummary.totalHours.toFixed(1)} h`, color: T },
                {
                    label: t("pdf.stat.normal"),
                    value: `${monthSummary.normalHours.toFixed(1)} h`,
                    color: [46, 125, 50]
                },
                {
                    label: t("pdf.stat.overtime"),
                    value: `${monthSummary.overtimeHours.toFixed(1)} h`,
                    color: [200, 100, 0]
                },
                {
                    label: t("pdf.stat.days"),
                    value: `${monthSummary.daysWorked} ${t("pdf.stat.daysUnit")}`,
                    color: [21, 101, 192]
                }
            ];

            for (let i = 0; i < monthStripItems.length; i++) {
                const item = monthStripItems[i];
                const colX = margin + i * colW;
                const midX = colX + colW / 2;

                // Séparateur vertical (sauf avant la 1ère colonne)
                if (i > 0) {
                    doc.setDrawColor(215, 215, 215);
                    doc.setLineWidth(0.3);
                    doc.line(colX, yPosition + 4, colX, yPosition + stripH - 2);
                }

                // Valeur (grande, colorée, centrée)
                doc.setFontSize(16);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(...item.color);
                doc.text(item.value, midX, yPosition + 13, { align: "center" });

                // Label (petit, gris, centré en dessous)
                doc.setFontSize(7);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(140, 140, 140);
                doc.text(item.label, midX, yPosition + 19, { align: "center" });
            }

            yPosition += stripH + 14;
            } else {
                yPosition += 6;
            }
        }

        // ==================== PIED DE PAGE ====================
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);

            // Ligne de séparation
            doc.setDrawColor(...TB);
            doc.setLineWidth(0.3);
            doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

            doc.setFontSize(7.5);
            doc.setTextColor(150, 150, 150);
            doc.setFont("helvetica", "normal");

            // Nom/société à gauche si renseigné
            const footerLeft = author || company || "";
            if (footerLeft) {
                doc.text(footerLeft, margin, pageHeight - 9);
            }

            doc.text(`${t("pdf.page")} ${i} / ${totalPages}`, pageWidth / 2, pageHeight - 9, { align: "center" });
            doc.text(title, pageWidth - margin, pageHeight - 9, { align: "right" });
        }

        // ==================== SAUVEGARDE ====================
        const startClean = startDate.replace(/-/g, "");
        const endClean = endDate.replace(/-/g, "");
        const fileName = `${t("pdf.filename")}_${startClean}_${endClean}.pdf`;
        doc.save(fileName);

        showSystemMessage(t("msg.pdfOk"));
    } catch (error) {
        console.error("Erreur détaillée:", error);
        showSystemMessage(t("msg.pdfError"), true);
    }
}

// Fonction pour grouper les entrées par mois
function groupEntriesByMonth(entries) {
    const groups = {};

    entries.forEach((entry) => {
        const date = new Date(entry.date);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;

        if (!groups[monthKey]) {
            groups[monthKey] = [];
        }

        groups[monthKey].push(entry);
    });

    // Trier les entrées dans chaque mois par date
    Object.keys(groups).forEach((monthKey) => {
        groups[monthKey].sort((a, b) => new Date(a.date) - new Date(b.date));
    });

    return groups;
}

// Fonction pour obtenir le nom du mois
function getMonthName(monthNumber) {
    const names = t("calendar.months");
    return Array.isArray(names) ? names[monthNumber - 1] : monthNumber;
}

// Fonction pour calculer le résumé d'une période (inchangée)
function calculatePeriodSummary(entries) {
    let normalHours = 0;
    let overtimeHours = 0;
    let totalHours = 0;
    const daysSet = new Set();

    entries.forEach((entry) => {
        const hours = calculateHours(entry);
        totalHours += hours;

        if (entry.type === "normal") {
            normalHours += hours;
        } else if (entry.type === "overtime" || entry.type === "night" || entry.type === "weekend") {
            overtimeHours += hours;
        }

        if (entry.type !== "leave") {
            // On n'ajoute que la date de début : pour un travail de nuit (ex: vendredi soir → samedi matin),
            // endDate est uniquement la date de fin du shift, pas un jour travaillé supplémentaire.
            daysSet.add(entry.date);
        }
    });

    return {
        normalHours,
        overtimeHours,
        totalHours,
        daysWorked: daysSet.size
    };
}

// Démarrer l'application — charger lang.json avant tout
function startApp() {
    loadLanguages().then(() => {
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", initApp);
        } else {
            initApp();
        }
    });
}

startApp();