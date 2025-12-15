// Variables globales
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let workEntries = JSON.parse(localStorage.getItem("workEntries")) || [];
let buttonsExpanded = false;
const buttonDelay = 100;

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
        dayElement.classList.remove("type-normal", "type-overtime", "type-night", "type-weekend");

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

            dayElement.innerHTML = `
                <div class="day-number">${day}</div>
                <div class="day-indicator">
                    <i class="fa-solid fa-clock"></i>
                    <span class="day-hours ${typeClass}">${dayHoursInfo.hours}h</span>
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
        // Priorité des types : overtime > weekend > night > normal
        const typePriority = {
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

        // Calculer le total des heures
        entries.forEach((entry) => {
            total += calculateHours(entry);
        });
    }

    return {
        hours: total.toFixed(1),
        type: dominantType
    };
}

// Calculer la durée en heures d'une entrée
function calculateHours(entry) {
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
        // On considère que c'est une nuit qui commence un jour et finit le lendemain
        // La durée est simplement la différence entre l'heure de fin et l'heure de début
        hours = endTotal - startTotal;
        if (hours < 0) {
            hours += 24; // Si l'heure de fin est avant l'heure de début, ajouter 24h
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
        } else {
            overtimeHours += hours;
        }
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
            <button class="entry-delete" onclick="deleteEntry('${entry.id}')">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;

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
        weekend: "type-weekend"
    };
    return classes[type] || "type-normal";
}

// Obtenir le libellé du type d'heures
function getTypeLabel(type) {
    const labels = {
        normal: "Normales",
        overtime: "Suppl.",
        night: "Nuit",
        weekend: "Week-end"
    };
    return labels[type] || "Normales";
}

// Afficher le modal pour ajouter une entrée
function showAddEntryModal() {
    const modal = document.getElementById("addEntryModal");
    const today = new Date().toISOString().split("T")[0];

    document.getElementById("entryDate").value = today;
    document.getElementById("startTime").value = "20:30";
    document.getElementById("endTime").value = "05:30";
    document.getElementById("entryType").value = "normal";
    document.getElementById("entryNotes").value = "";
    document.getElementById("spreadOverTwoDays").checked = false;
    document.getElementById("endDateGroup").style.display = "none";
    document.getElementById("endDate").value = "";

    modal.style.display = "flex";
    toggleButtons(); // Replier les boutons
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

    // Fermer le modal et afficher un message
    closeAddEntryModal();
    showSystemMessage("Entrée enregistrée avec succès !");
}

// Supprimer une entrée
function deleteEntry(id) {
    if (confirm("Voulez-vous vraiment supprimer cette entrée ?")) {
        workEntries = workEntries.filter((entry) => entry.id !== id);
        localStorage.setItem("workEntries", JSON.stringify(workEntries));

        displayMonthEntries();
        updateSummary();
        generateCalendar();

        showSystemMessage("Entrée supprimée", true);
    }
}

// Afficher les entrées d'un jour spécifique
function showDayEntries(day, entries) {
    if (entries.length === 0) {
        showSystemMessage("Aucune entrée pour ce jour", true);
        return;
    }

    let message = `Entrées pour le ${day}/${currentMonth + 1} :\n\n`;
    entries.forEach((entry) => {
        const hours = calculateHours(entry);
        let dateInfo = "";

        if (entry.endDate && entry.endDate !== entry.date) {
            const endDate = new Date(entry.endDate);
            dateInfo = ` (du ${new Date(entry.date).toLocaleDateString("fr-FR")} au ${endDate.toLocaleDateString("fr-FR")})`;
        }

        message += `${entry.startTime} - ${entry.endTime} (${hours.toFixed(1)}h) - ${getTypeLabel(entry.type)}${dateInfo}\n`;
        if (entry.notes) {
            message += `Notes: ${entry.notes}\n`;
        }
        message += "\n";
    });

    alert(message);
}

// Afficher le modal d'importation
function showImportModal() {
    document.getElementById("importModal").style.display = "flex";
    document.getElementById("fileImport").value = "";
    document.getElementById("mergeData").checked = true;
    toggleButtons(); // Replier les boutons
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

            // Fusionner ou remplacer les données
            if (mergeData) {
                // Fusionner sans doublons (basé sur l'ID)
                const existingIds = new Set(workEntries.map((entry) => entry.id));
                const newEntries = importedData.filter((entry) => !existingIds.has(entry.id));
                workEntries = [...workEntries, ...newEntries];
                showSystemMessage(`${newEntries.length} nouvelles entrées importées (fusion)`);
            } else {
                workEntries = importedData;
                showSystemMessage(`${importedData.length} entrées importées (remplacement)`);
            }

            // Sauvegarder dans le localStorage
            localStorage.setItem("workEntries", JSON.stringify(workEntries));

            // Mettre à jour l'affichage
            generateCalendar();
            displayMonthEntries();
            updateSummary();

            closeImportModal();
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

    const daysWorkedSet = new Set();
    monthEntries.forEach((entry) => {
        daysWorkedSet.add(entry.date);
        if (entry.endDate) {
            daysWorkedSet.add(entry.endDate);
        }
    });
    const daysWorked = daysWorkedSet.size;

    const totalHours = monthEntries.reduce((sum, entry) => {
        return sum + calculateHours(entry);
    }, 0);

    const avgHours = daysWorked > 0 ? (totalHours / daysWorked).toFixed(1) : 0;
    const overtimeHours = monthEntries
        .filter((entry) => entry.type !== "normal")
        .reduce((sum, entry) => sum + calculateHours(entry), 0);

    const overtimePercent = totalHours > 0 ? ((overtimeHours / totalHours) * 100).toFixed(0) : 0;

    // Mettre à jour les statistiques
    document.getElementById("statDaysWorked").textContent = daysWorked;
    document.getElementById("statAvgHours").textContent = `${avgHours}h`;
    document.getElementById("statOvertimePercent").textContent = `${overtimePercent}%`;

    // Générer le graphique
    generateChart();

    modal.style.display = "flex";
    toggleButtons(); // Replier les boutons
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

    // Calculer les heures par semaine
    const weeklyHours = calculateWeeklyHours();

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

// Calculer les heures par semaine
function calculateWeeklyHours() {
    const monthEntries = workEntries.filter((entry) => {
        const entryDate = new Date(entry.date);
        return entryDate.getMonth() === currentMonth && entryDate.getFullYear() === currentYear;
    });

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

    const weeks = Object.keys(weeklyHours).sort((a, b) => a - b);
    const labels = weeks.map((week) => `Semaine ${week}`);
    const hours = weeks.map((week) => weeklyHours[week]);

    return { labels, hours };
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
