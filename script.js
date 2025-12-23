// Variables globales
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let workEntries = JSON.parse(localStorage.getItem("workEntries")) || [];
let buttonsExpanded = false;
const buttonDelay = 100;
let entryToDelete = null;
let entryToEdit = null;

// Initialisation de l'application
function initApp() {
    console.log("Initialisation de l'application de suivi des heures");

    // Initialiser les boutons flottants
    initFloatingButtons();

    // Générer le calendrier
    generateCalendar();

    // Mettre à jour les résumés
    updateSummary();

    // Afficher les entrées du mois
    displayMonthEntries();

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
    const monthNames = [
        "Janvier",
        "Février",
        "Mars",
        "Avril",
        "Mai",
        "Juin",
        "Juillet",
        "Août",
        "Septembre",
        "Octobre",
        "Novembre",
        "Décembre"
    ];

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
            const displayText = dayHoursInfo.type === "leave" ? "Congé" : `${dayHoursInfo.hours}h`;

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
                hours: "Congé",
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
        entriesList.innerHTML = '<div class="no-entries">Aucune entrée ce mois-ci</div>';
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
            Congé/Absence
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
                    ${entry.endDate && entry.endDate !== entry.date ? " (nuit)" : ""}
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
                    <button class="entry-edit" onclick="editEntry('${entry.id}')" title="Modifier">
                        <i class="fa-solid fa-pencil"></i>
                    </button>
                    <button class="entry-delete" onclick="showDeleteConfirm('${entry.id}')" title="Supprimer">
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
    return date.toLocaleDateString("fr-FR", {
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
    const labels = {
        normal: "Normales",
        overtime: "Suppl.",
        night: "Nuit",
        weekend: "Week-end",
        leave: "Congé"
    };
    return labels[type] || "Normales";
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

    modal.style.display = "flex";
    toggleButtons();
}

// Afficher/masquer le champ date de fin
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

// Fermer le modal d'ajout
function closeAddEntryModal() {
    document.getElementById("addEntryModal").style.display = "none";
}

// Enregistrer une nouvelle entrée
function saveEntry() {
    const date = document.getElementById("entryDate").value;
    const startTime = document.getElementById("startTime").value;
    const endTime = document.getElementById("endTime").value;
    const type = document.getElementById("entryType").value;
    const notes = document.getElementById("entryNotes").value;
    const spreadOverTwoDays = document.getElementById("spreadOverTwoDays").checked;
    const endDate = spreadOverTwoDays ? document.getElementById("endDate").value : date;

    // Validation
    if (!date || !startTime || !endTime) {
        showSystemMessage("Veuillez remplir tous les champs obligatoires", true);
        return;
    }

    if (spreadOverTwoDays && !endDate) {
        showSystemMessage("Veuillez spécifier la date de fin", true);
        return;
    }

    // Vérifier si la date de fin est après la date de début
    if (spreadOverTwoDays) {
        const startDateObj = new Date(date);
        const endDateObj = new Date(endDate);

        if (endDateObj < startDateObj) {
            showSystemMessage("La date de fin doit être après la date de début", true);
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
            showSystemMessage("La durée des heures doit être positive", true);
            return;
        }
    }

    // Créer l'entrée
    const newEntry = {
        id: Date.now().toString(),
        date: date,
        startTime: startTime,
        endTime: endTime,
        type: type,
        notes: notes,
        spreadOverTwoDays: spreadOverTwoDays,
        createdAt: new Date().toISOString()
    };

    if (spreadOverTwoDays) {
        newEntry.endDate = endDate;
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
    showSystemMessage("Entrée enregistrée avec succès !");
}

// Afficher la confirmation de suppression MODAL
function showDeleteConfirm(id) {
    entryToDelete = id;

    // Afficher le modal de confirmation
    document.getElementById("confirmMessage").textContent = "Voulez-vous vraiment supprimer cette entrée ?";
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

    showSystemMessage("Entrée supprimée", true);
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
        showSystemMessage("Veuillez remplir tous les champs obligatoires", true);
        return;
    }

    if (spreadOverTwoDays && !endDate) {
        showSystemMessage("Veuillez spécifier la date de fin", true);
        return;
    }

    // Vérifier si la date de fin est après la date de début
    if (spreadOverTwoDays) {
        const startDateObj = new Date(date);
        const endDateObj = new Date(endDate);

        if (endDateObj < startDateObj) {
            showSystemMessage("La date de fin doit être après la date de début", true);
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
            showSystemMessage("La durée des heures doit être positive", true);
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
    showSystemMessage("Entrée modifiée avec succès !");
}

// Afficher les entrées d'un jour spécifique
function showDayEntries(day, entries) {
    if (entries.length === 0) {
        let message = `Aucune entrée pour le ${day}/${currentMonth + 1}/${currentYear}`;
        showSystemMessage(message, true); // true pour le style erreur (rouge)
        return;
    }

    let message = `Entrées pour le ${day}/${currentMonth + 1}/${currentYear} :\n\n`;
    let entryIds = []; // Stocker les IDs des entrées pour les boutons

    entries.forEach((entry, index) => {
        entryIds.push(entry.id); // Ajouter l'ID à la liste
        const hours = calculateHours(entry);
        let dateInfo = "";
        let entryNumber = index + 1;

        if (entry.endDate && entry.endDate !== entry.date) {
            const endDate = new Date(entry.endDate);
            dateInfo = ` (du ${new Date(entry.date).toLocaleDateString("fr-FR")} au ${endDate.toLocaleDateString("fr-FR")})`;
        }

        if (entry.type === "leave") {
            message += `${entryNumber}. 📅 Congé/Absence${dateInfo}\n`;
        } else {
            message += `${entryNumber}. ⏰ ${entry.startTime} - ${entry.endTime} (${hours.toFixed(1)}h) - ${getTypeLabel(entry.type)}${dateInfo}\n`;
        }

        if (entry.notes) {
            message += `   📝 Notes: ${entry.notes}\n`;
        }
        message += "\n";
    });

    // Afficher le modal avec les boutons modifier et supprimer
    showDayDetailsModal(message, `Détails du ${day}/${currentMonth + 1}`, entryIds);
}

// Fonction pour afficher le modal avec bouton modifier et supprimer
function showDayDetailsModal(message, title, entryIds) {
    document.getElementById("infoTitle").textContent = title;
    document.getElementById("infoMessage").textContent = message;

    // Remplacer les boutons par Modifier, Supprimer et OK
    const formActions = document.querySelector("#infoModal .form-actions");

    // Supprimer l'ancien bouton OK
    formActions.innerHTML = "";

    // Si il y a des entrées, ajouter les boutons Modifier, Supprimer et OK
    if (entryIds.length > 0) {
        formActions.innerHTML = `
            <button class="btn-delete" onclick="deleteFirstEntry('${entryIds[0]}')">Supprimer</button>
            <button class="btn-save" onclick="editFirstEntry('${entryIds[0]}')">Modifier</button>
            <button class="btn-cancel" onclick="closeInfoModal()">OK</button>
        `;
    } else {
        formActions.innerHTML = '<button class="btn-cancel" onclick="closeInfoModal()">OK</button>';
    }

    const modal = document.getElementById("infoModal");
    modal.style.display = "flex";

    // Changer la couleur du titre
    const infoTitle = document.getElementById("infoTitle");
    infoTitle.style.color = "#00ffcc";
}

// Fonction pour modifier la première entrée du jour
function editFirstEntry(id) {
    closeInfoModal(); // Fermer le modal des détails
    editEntry(id); // Ouvrir le modal d'édition
}

// Fonction pour supprimer la première entrée du jour
function deleteFirstEntry(id) {
    closeInfoModal(); // Fermer le modal des détails
    showDeleteConfirm(id); // Ouvrir le modal de confirmation de suppression
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
        showSystemMessage("Veuillez sélectionner un fichier", true);
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (event) {
        try {
            const importedData = JSON.parse(event.target.result);

            // Validation des données
            if (!Array.isArray(importedData)) {
                showSystemMessage("Le fichier JSON doit contenir un tableau", true);
                return;
            }

            // Vérifier la structure des données
            const isValid = importedData.every(
                (item) => item.id && item.date && item.startTime && item.endTime && item.type
            );

            if (!isValid) {
                showSystemMessage("Le fichier JSON a un format invalide", true);
                return;
            }

            let message = "";

            // Fusionner ou remplacer les données
            if (mergeData) {
                // Fusionner sans doublons (basé sur l'ID)
                const existingIds = new Set(workEntries.map((entry) => entry.id));
                const newEntries = importedData.filter((entry) => !existingIds.has(entry.id));
                workEntries = [...workEntries, ...newEntries];
                message = `${newEntries.length} nouvelles entrées importées (fusion)`;
            } else {
                workEntries = importedData;
                message = `${importedData.length} entrées importées (remplacement)`;
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
            showSystemMessage("Erreur lors de l'importation du fichier", true);
        }
    };

    reader.onerror = function () {
        showSystemMessage("Erreur de lecture du fichier", true);
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
    const daysWorkedSet = new Set();
    monthEntries.forEach((entry) => {
        if (entry.type !== "leave") {
            daysWorkedSet.add(entry.date);
            if (entry.endDate) {
                daysWorkedSet.add(entry.endDate);
            }
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
                labels: ["Aucune donnée"],
                datasets: [
                    {
                        label: "Heures travaillées",
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
                            text: "Heures"
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
                            text: "Semaines"
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
                            ctx.fillText("Aucune donnée ce mois-ci", width / 2, height / 2);
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
                    label: "Heures travaillées",
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
                        text: "Heures"
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
                        text: "Semaines"
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
    const labels = weeks.map((week) => `Sem. ${week}`);
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

    showSystemMessage("Données exportées avec succès !");
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

// Démarrer l'application
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}
