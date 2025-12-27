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

    // Appeler la fonction pour gérer l'état initial des champs
    handleEntryTypeChange();

    modal.style.display = "flex";
    toggleButtons();
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
        showSystemMessage("Veuillez sélectionner une date", true);
        return;
    }

    // Si ce n'est pas un congé, valider les heures
    if (type !== "leave") {
        if (!startTime || !endTime) {
            showSystemMessage("Veuillez remplir les heures de début et de fin", true);
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
            showSystemMessage("La durée des heures doit être positive", true);
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
    const message = type === "leave" ? "Congé enregistré avec succès !" : "Entrée enregistrée avec succès !";
    showSystemMessage(message);
}

// Modifier la fonction de modification d'entrée de la même manière
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
            dateInfo = ` (jusqu'au ${endDay}/${endMonth})`;
        }

        // Pour les congés/absences
        if (entry.type === "leave") {
            message += `
                <div style="margin-bottom: 20px; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 10px;"> <!-- SUPPRIMÉ: border-left: 4px solid #ffcc00 -->
                    <div style="font-weight: bold; margin-bottom: 8px; color: #00ffcc; font-size: 16px;">
                        ${emoji} Congé/Absence${dateInfo}
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
                            Modifier
                        </button>
                        <button onclick="showDeleteConfirm('${entry.id}'); closeInfoModal();" style="padding: 8px 12px; background: #ff5555; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; flex: 1; font-weight: bold; transition: all 0.3s;">
                            Supprimer
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
                        🏷️ Type : ${getTypeLabel(entry.type)}
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
                            Modifier
                        </button>
                        <button onclick="showDeleteConfirm('${entry.id}'); closeInfoModal();" style="padding: 8px 12px; background: #ff5555; color: white; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; flex: 1; font-weight: bold; transition: all 0.3s;">
                            Supprimer
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
        formActions.innerHTML =
            '<button class="btn-cancel" onclick="closeInfoModal()" style="width: 100%; font-weight: bold; padding: 12px; font-size: 14px;">OK</button>';
    }

    // Mettre à jour le titre avec une taille plus grande
    document.getElementById("infoTitle").textContent = `Détails du ${titleDate}`;
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
    showSystemMessage(`${deletedCount} entrée(s) supprimée(s) pour ce jour`);
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

// Fermer le modal d'ajout d'entrée
function closeAddEntryModal() {
    const modal = document.getElementById("addEntryModal");
    modal.style.display = "none";
    document.getElementById("addEntryForm").reset();
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
    showInfoMessage("Toutes les entrées ont été supprimées définitivement.", "Suppression terminée", false);

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
    document.getElementById("pdfTitle").value =
        `Suivi des Heures - ${today.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}`;

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
    const pdfTitle = document.getElementById("pdfTitle").value || "Suivi des Heures de Travail";

    if (!startDate || !endDate) {
        showSystemMessage("Veuillez sélectionner une période", true);
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        showSystemMessage("La date de début doit être antérieure à la date de fin", true);
        return;
    }

    // Filtrer les entrées dans la période sélectionnée
    const filteredEntries = workEntries
        .filter((entry) => {
            const entryDate = new Date(entry.date);
            const entryEndDate = entry.endDate ? new Date(entry.endDate) : entryDate;
            const start = new Date(startDate);
            const end = new Date(endDate);

            // Vérifier si l'entrée est dans la période (début ou fin)
            return (entryDate >= start && entryDate <= end) || (entryEndDate >= start && entryEndDate <= end);
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (filteredEntries.length === 0) {
        showSystemMessage("Aucune entrée dans la période sélectionnée", true);
        return;
    }

    // Créer le PDF
    createPDF(filteredEntries, startDate, endDate, includeSummary, includeNotes, pdfTitle);
    closePDFModal();
}

function createPDF(entries, startDate, endDate, includeSummary, includeNotes, title) {
    console.log("Création du PDF complet avec", entries.length, "entrées");

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF("p", "mm", "a4");

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let yPosition = margin;

        // ==================== EN-TÊTE DU DOCUMENT ====================
        doc.setFontSize(20);
        doc.setTextColor(0, 150, 136);
        doc.setFont("helvetica", "bold");
        doc.text("SUIVI DES HEURES DE TRAVAIL", pageWidth / 2, yPosition, { align: "center" });
        yPosition += 8;

        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "normal");
        doc.text(title, pageWidth / 2, yPosition, { align: "center" });
        yPosition += 10;

        // ==================== LIGNE PÉRIODE ET DATE ====================
        const startFormatted = new Date(startDate).toLocaleDateString("fr-FR");
        const endFormatted = new Date(endDate).toLocaleDateString("fr-FR");
        const periodText = `Période : ${startFormatted} - ${endFormatted}`;

        const now = new Date();
        const genText = `Généré le ${now.toLocaleDateString("fr-FR")} à ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;

        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(periodText, margin, yPosition);
        doc.text(genText, pageWidth - margin, yPosition, { align: "right" });
        yPosition += 20;

        // ==================== STATISTIQUES GLOBALES ====================
        if (includeSummary) {
            const summary = calculatePeriodSummary(entries);
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "bold");
            doc.text("Résumé Global", margin, yPosition);
            yPosition += 8;

            doc.setDrawColor(0, 150, 136);
            doc.setLineWidth(0.5);
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 10;

            const summaryData = [
                ["Heures totales", `${summary.totalHours.toFixed(1)} h`],
                ["Heures normales", `${summary.normalHours.toFixed(1)} h`],
                ["Heures supplémentaires", `${summary.overtimeHours.toFixed(1)} h`],
                ["Jours travaillés", `${summary.daysWorked} jours`]
            ];

            summaryData.forEach((row, index) => {
                const rowY = yPosition + index * 6;
                doc.setFontSize(10);
                doc.setTextColor(80, 80, 80);
                doc.setFont("helvetica", "normal");
                doc.text(row[0], margin + 5, rowY + 4);
                doc.setTextColor(0, 0, 0);
                doc.setFont("helvetica", "bold");
                doc.text(row[1], pageWidth - margin - 5, rowY + 4, { align: "right" });
                if (index < summaryData.length - 1) {
                    doc.setDrawColor(240, 240, 240);
                    doc.setLineWidth(0.2);
                    doc.line(margin, rowY + 5, pageWidth - margin, rowY + 5);
                }
            });
            yPosition += summaryData.length * 6 + 20;
        }

        // ==================== ORGANISATION PAR MOIS ====================
        const entriesByMonth = groupEntriesByMonth(entries);
        const months = Object.keys(entriesByMonth).sort((a, b) => {
            const [yearA, monthA] = a.split("-").map(Number);
            const [yearB, monthB] = b.split("-").map(Number);
            return yearA === yearB ? monthA - monthB : yearA - yearB;
        });

        // --- Fonctions Helper ---

        const createTableData = (monthEntries, includeNotesParam) => {
            return monthEntries.map((entry) => {
                const dateStr = new Date(entry.date).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                });

                let timeInfo, durationInfo;
                if (entry.type === "leave") {
                    timeInfo = ""; // Vide pour la croix
                    durationInfo = "";
                } else {
                    timeInfo = `${entry.startTime} - ${entry.endTime}`;
                    if (entry.endDate && entry.endDate !== entry.date) timeInfo += " (nuit)";
                    durationInfo = `${calculateHours(entry).toFixed(1)} h`;
                }

                const row = [dateStr, timeInfo, durationInfo, getTypeLabel(entry.type)];
                if (includeNotesParam) row.push(entry.notes || "");
                return row;
            });
        };

        const didParseCell = (data) => {
            if (data.row.section === "head") {
                data.cell.styles.halign = "center";
                data.cell.styles.fontStyle = "bold";
                data.cell.styles.fillColor = [66, 139, 202];
                data.cell.styles.textColor = 255;
                return;
            }

            // Centrage colonnes Date, Heures, Durée, Type
            if (data.column.index <= 3) data.cell.styles.halign = "center";

            // Style de la colonne Notes (Italique)
            if (includeNotes && data.column.index === 4) {
                data.cell.styles.fontStyle = "italic";
                data.cell.styles.halign = "left";
            }

            // Couleur spécifique pour la colonne Type
            if (data.column.index === 3) {
                const val = data.cell.raw || "";
                if (val.includes("Normales")) data.cell.styles.textColor = [76, 175, 80];
                else if (val.includes("Suppl.")) data.cell.styles.textColor = [255, 152, 0];
                else if (val.includes("Nuit")) data.cell.styles.textColor = [156, 39, 176];
                else if (val.includes("Week-end")) data.cell.styles.textColor = [243, 33, 33];
                else if (val.includes("Congé")) data.cell.styles.textColor = [255, 204, 0]; // Jaune original
                data.cell.styles.fontStyle = "bold";
            }
        };

        // DESSIN DE LA CROIX
        const didDrawCell = (data) => {
            const rowData = data.row.raw;
            const isLeave = rowData[3] && rowData[3].includes("Congé");

            // On dessine la croix seulement dans Heures (1) et Durée (2) si c'est un congé
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

            doc.setFontSize(13);
            doc.setTextColor(0, 0, 0);
            doc.setFont("helvetica", "bold");
            doc.text(`${monthName} ${year}`, margin, yPosition);
            yPosition += 7;

            doc.setDrawColor(66, 139, 202);
            doc.setLineWidth(0.5);
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 5;

            doc.autoTable({
                startY: yPosition,
                head: [["Date", "Heures", "Durée", "Type", ...(includeNotes ? ["Notes"] : [])]],
                body: createTableData(monthEntries, includeNotes),
                margin: { left: margin, right: margin },
                theme: "striped",
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

            yPosition = doc.lastAutoTable.finalY + 15;
        }

        // Pied de page
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Page ${i} / ${totalPages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, {
                align: "center"
            });
        }

        // ==================== SAUVEGARDE ====================
        const startClean = startDate.replace(/-/g, "");
        const endClean = endDate.replace(/-/g, "");
        const fileName = `heures_travail_${startClean}_${endClean}.pdf`;
        doc.save(fileName);

        showSystemMessage("PDF généré avec succès !");
    } catch (error) {
        console.error("Erreur détaillée:", error);
        showSystemMessage("Erreur lors de la génération du PDF", true);
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
    return monthNames[monthNumber - 1];
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
            daysSet.add(entry.date);
            if (entry.endDate) {
                daysSet.add(entry.endDate);
            }
        }
    });

    return {
        normalHours,
        overtimeHours,
        totalHours,
        daysWorked: daysSet.size
    };
}

// Démarrer l'application
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}
