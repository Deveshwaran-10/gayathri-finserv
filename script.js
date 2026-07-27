/**
 * Gayatri Finserv - Co-Investment Profit Sharing Dashboard
 * Vanilla JS logic for state management, localStorage persistence, calculations, and visual updates.
 */

// ==========================================================================
// Application State & Default Config
// ==========================================================================
const DEFAULT_MEMBERS = [
    { id: '1', name: 'Jaya', investment: '' },
    { id: '2', name: 'Yazhini', investment: '' },
    { id: '3', name: 'Ulagu', investment: '' },
    { id: '4', name: 'Chandru', investment: '' },
    { id: '5', name: 'Dharani', investment: '' },
    { id: '6', name: 'Kiruthika', investment: '' }
];

let state = {
    members: [...DEFAULT_MEMBERS],
    portfolioValue: '',
    results: null,
    previousMembersState: null, // Stores pre-calculation inputs for Undo Rollover
    holdings: [],
    activeSection: 'investment'
};

// ==========================================================================
// DOM Elements Cache
// ==========================================================================
const membersTbody = document.getElementById('members-tbody');
const btnAddMember = document.getElementById('btn-add-member');
const btnCalculate = document.getElementById('btn-calculate');
const btnUndoRollover = document.getElementById('btn-undo-rollover');
const btnReset = document.getElementById('btn-reset');
const portfolioInput = document.getElementById('portfolio-value');

// Modal Elements
const modalContainer = document.getElementById('modal-container');
const modalClose = document.getElementById('modal-close');
const modalCancel = document.getElementById('modal-cancel');
const modalSubmit = document.getElementById('modal-submit');
const newMemberNameInput = document.getElementById('new-member-name');

// Results & Stats Elements
const resultsDisplayCard = document.getElementById('results-display-card');
const resultsPlaceholder = document.getElementById('results-placeholder');
const resultsTableArea = document.getElementById('results-table-area');
const resultsTbody = document.getElementById('results-tbody');
const btnNextRound = document.getElementById('btn-next-round');
const btnExport = document.getElementById('btn-export');

// Stats Cards Values
const statTotalMembers = document.getElementById('stat-total-members');
const statTotalInvestment = document.getElementById('stat-total-investment');
const statCurrentPortfolio = document.getElementById('stat-current-portfolio');
const statTotalProfit = document.getElementById('stat-total-profit');
const statHighestInvestor = document.getElementById('stat-highest-investor');
const statHighestProfit = document.getElementById('stat-highest-profit');

// Navigation & Holdings Elements
const navTabs = document.querySelectorAll('.nav-tab');
const sectionInvestment = document.getElementById('section-investment');
const sectionHoldings = document.getElementById('section-holdings');
const holdingsTbody = document.getElementById('holdings-tbody');
const holdingsGrandTotal = document.getElementById('holdings-grand-total');
const btnAddHolding = document.getElementById('btn-add-holding');

// ==========================================================================
// Local Storage Persistence
// ==========================================================================
function saveToLocalStorage() {
    localStorage.setItem('gayatri_finserv_members', JSON.stringify(state.members));
    localStorage.setItem('gayatri_finserv_portfolio', state.portfolioValue || '');
    if (state.results) {
        localStorage.setItem('gayatri_finserv_results', JSON.stringify(state.results));
    } else {
        localStorage.removeItem('gayatri_finserv_results');
    }
    localStorage.setItem('gayatri_finserv_holdings', JSON.stringify(state.holdings));
    localStorage.setItem('gayatri_finserv_active_section', state.activeSection);
}

function loadFromLocalStorage() {
    const savedMembers = localStorage.getItem('gayatri_finserv_members');
    if (savedMembers) {
        try {
            state.members = JSON.parse(savedMembers);
        } catch (e) {
            console.error("Failed to parse saved members", e);
            state.members = [...DEFAULT_MEMBERS];
        }
    } else {
        state.members = [...DEFAULT_MEMBERS];
    }
    
    const savedPortfolio = localStorage.getItem('gayatri_finserv_portfolio');
    if (savedPortfolio !== null) {
        state.portfolioValue = savedPortfolio;
        portfolioInput.value = savedPortfolio;
    }
    
    const savedResults = localStorage.getItem('gayatri_finserv_results');
    if (savedResults) {
        try {
            state.results = JSON.parse(savedResults);
        } catch (e) {
            console.error("Failed to parse saved results", e);
            state.results = null;
        }
    }

    const savedHoldings = localStorage.getItem('gayatri_finserv_holdings');
    if (savedHoldings) {
        try {
            state.holdings = JSON.parse(savedHoldings);
        } catch (e) {
            console.error("Failed to parse saved holdings", e);
            state.holdings = [];
        }
    }

    const savedSection = localStorage.getItem('gayatri_finserv_active_section');
    if (savedSection === 'investment' || savedSection === 'holdings') {
        state.activeSection = savedSection;
    } else if (savedSection === 'savings') {
        state.activeSection = 'investment';
    }
}

function clearLocalStorage() {
    localStorage.removeItem('gayatri_finserv_members');
    localStorage.removeItem('gayatri_finserv_portfolio');
    localStorage.removeItem('gayatri_finserv_results');
    localStorage.removeItem('gayatri_finserv_holdings');
    localStorage.removeItem('gayatri_finserv_active_section');
}

// ==========================================================================
// Initialisation & Binds
// ==========================================================================
function init() {
    loadFromLocalStorage();
    renderMembersTable();
    updateMembersCountStat();
    renderHoldingsTable();
    switchSection(state.activeSection, false);
    
    // If results were previously calculated and stored, display them directly on load
    if (state.results) {
        renderResultsViewTable();
        restoreStatsCardsFromState();
        resultsPlaceholder.classList.add('hidden');
        resultsTableArea.classList.remove('hidden');
        resultsDisplayCard.classList.remove('inactive');
    }
    
    bindEvents();
}

function bindEvents() {
    // Member list interactive event delegations
    membersTbody.addEventListener('input', handleInvestmentInput);
    membersTbody.addEventListener('click', handleDeleteClick);
    
    // Portfolio input event
    portfolioInput.addEventListener('input', handlePortfolioInput);
    
    // Core Actions
    btnCalculate.addEventListener('click', calculateProfit);
    btnUndoRollover.addEventListener('click', undoRollover);
    btnReset.addEventListener('click', resetDashboard);
    
    // Modal controls
    btnAddMember.addEventListener('click', openAddMemberModal);
    modalClose.addEventListener('click', closeAddMemberModal);
    modalCancel.addEventListener('click', closeAddMemberModal);
    modalSubmit.addEventListener('click', submitAddMember);
    newMemberNameInput.addEventListener('keydown', handleModalKeydown);
    
    // Results Controls
    btnNextRound.addEventListener('click', startNewRound);
    btnExport.addEventListener('click', exportCSV);

    // Close modal on clicking backdrop
    modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
            closeAddMemberModal();
        }
    });

    // Navigation tabs
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchSection(tab.dataset.section);
        });
    });

    // Holdings events
    btnAddHolding.addEventListener('click', addNewHolding);
    holdingsTbody.addEventListener('input', handleHoldingInput);
    holdingsTbody.addEventListener('change', handleHoldingInput);
    holdingsTbody.addEventListener('click', handleHoldingDeleteClick);
}

// ==========================================================================
// Helper Utilities
// ==========================================================================
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

function formatNumber(num) {
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrency(num) {
    return `INR ${formatNumber(num)}`;
}

function formatProfit(profit) {
    if (profit >= 0) {
        return `+${formatCurrency(profit)}`;
    } else {
        return `-${formatCurrency(Math.abs(profit))}`;
    }
}

// Toast System
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let iconSvg = '';
    if (type === 'error') {
        iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    } else if (type === 'success') {
        iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else {
        iconSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }
    
    toast.innerHTML = `
        ${iconSvg}
        <div class="toast-message">${escapeHtml(message)}</div>
        <button type="button" class="toast-close">&times;</button>
    `;
    
    container.appendChild(toast);
    
    // Close button event
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%) scale(0.9)';
        setTimeout(() => toast.remove(), 200);
    });
    
    // Auto-remove after timeout
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%) scale(0.9)';
            setTimeout(() => toast.remove(), 200);
        }
    }, 4500);
}

// ==========================================================================
// Rendering / View Updates
// ==========================================================================
function renderMembersTable() {
    membersTbody.innerHTML = '';
    
    if (state.members.length === 0) {
        membersTbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; color: var(--text-muted); padding: 30px;">
                    No members in portfolio. Click "Add New Member" to start.
                </td>
            </tr>
        `;
        return;
    }
    
    state.members.forEach((m) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="member-name-cell">${escapeHtml(m.name)}</td>
            <td>
                <div class="table-input-wrapper">
                    <span class="table-input-symbol">INR</span>
                    <input type="number" 
                           class="table-input" 
                           data-id="${m.id}" 
                           value="${m.investment}" 
                           placeholder="0.00" 
                           step="any" 
                           min="0">
                </div>
            </td>
            <td class="col-action">
                <button type="button" class="btn-delete" data-id="${m.id}" title="Remove Member">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </td>
        `;
        membersTbody.appendChild(tr);
    });
}

function updateMembersCountStat() {
    statTotalMembers.textContent = state.members.length;
}

function resetStatsCards() {
    statTotalInvestment.textContent = "-";
    statCurrentPortfolio.textContent = "-";
    statTotalProfit.textContent = "-";
    statHighestInvestor.textContent = "-";
    statHighestProfit.textContent = "-";
}

function restoreStatsCardsFromState() {
    if (!state.results) return;
    
    let totalInvestment = 0;
    state.results.forEach(r => {
        totalInvestment += r.investment;
    });
    const portfolioValue = Number(state.portfolioValue) || 0;
    const totalProfit = portfolioValue - totalInvestment;
    
    let highestInvestorName = "N/A";
    let highestInvestorAmt = -1;
    let highestProfitName = "N/A";
    let highestProfitAmt = -1;
    
    state.results.forEach(r => {
        if (r.investment > highestInvestorAmt) {
            highestInvestorAmt = r.investment;
            highestInvestorName = r.name;
        }
        if (r.profit > highestProfitAmt) {
            highestProfitAmt = r.profit;
            highestProfitName = r.name;
        }
    });
    
    statTotalInvestment.textContent = formatCurrency(totalInvestment);
    statCurrentPortfolio.textContent = formatCurrency(portfolioValue);
    statTotalProfit.textContent = formatCurrency(totalProfit);
    
    statHighestInvestor.textContent = highestInvestorAmt > 0 
        ? `${highestInvestorName} (${formatCurrency(highestInvestorAmt)})`
        : "N/A";
        
    statHighestProfit.textContent = highestProfitAmt > 0 
        ? `${highestProfitName} (${formatCurrency(highestProfitAmt)})`
        : "N/A";
}

function invalidateResults() {
    state.results = null;
    resultsPlaceholder.classList.remove('hidden');
    resultsTableArea.classList.add('hidden');
    resultsDisplayCard.classList.add('inactive');
    resetStatsCards();
    
    // Clear undo rollover backup
    state.previousMembersState = null;
    if (btnUndoRollover) {
        btnUndoRollover.classList.add('hidden');
    }
    
    saveToLocalStorage();
}

// ==========================================================================
// Handlers & Event Callback Logics
// ==========================================================================
function handleInvestmentInput(e) {
    if (e.target.classList.contains('table-input')) {
        const id = e.target.dataset.id;
        const val = e.target.value;
        
        const member = state.members.find(m => m.id === id);
        if (member) {
            member.investment = val;
            invalidateResults();
            saveToLocalStorage();
        }
    }
}

function handlePortfolioInput() {
    state.portfolioValue = portfolioInput.value;
    invalidateResults();
    saveToLocalStorage();
}

function handleDeleteClick(e) {
    const btn = e.target.closest('.btn-delete');
    if (btn) {
        const id = btn.dataset.id;
        deleteMember(id);
    }
}

function deleteMember(id) {
    const memberIndex = state.members.findIndex(m => m.id === id);
    if (memberIndex === -1) return;
    
    const name = state.members[memberIndex].name;
    state.members.splice(memberIndex, 1);
    
    renderMembersTable();
    updateMembersCountStat();
    invalidateResults();
    saveToLocalStorage();
    showToast(`Removed member "${name}".`, "info");
}

// ==========================================================================
// Modals Form Controls
// ==========================================================================
function openAddMemberModal() {
    newMemberNameInput.value = '';
    modalContainer.classList.add('open');
    newMemberNameInput.focus();
}

function closeAddMemberModal() {
    modalContainer.classList.remove('open');
    newMemberNameInput.blur();
}

function handleModalKeydown(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        submitAddMember();
    } else if (e.key === 'Escape') {
        closeAddMemberModal();
    }
}

function submitAddMember() {
    const name = newMemberNameInput.value.trim();
    if (!name) {
        showToast("Member name cannot be empty.", "error");
        return;
    }
    
    // Check duplicates case-insensitively
    const exists = state.members.some(m => m.name.toLowerCase() === name.toLowerCase());
    if (exists) {
        showToast(`Member "${name}" already exists.`, "error");
        return;
    }
    
    const newId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    state.members.push({
        id: newId,
        name: name,
        investment: ''
    });
    
    renderMembersTable();
    updateMembersCountStat();
    invalidateResults();
    saveToLocalStorage();
    closeAddMemberModal();
    showToast(`Added member "${name}".`, "success");
}

// ==========================================================================
// Calculation and Math Processing
// ==========================================================================
function validateInputs() {
    if (state.members.length === 0) {
        showToast("Please add at least one member to calculate profit.", "error");
        return null;
    }
    
    // Check for negative investments
    for (let m of state.members) {
        const val = Number(m.investment);
        if (isNaN(val)) {
            showToast(`Investment for ${m.name} must be a number.`, "error");
            return null;
        }
        if (val < 0) {
            showToast(`Investment for ${m.name} cannot be negative.`, "error");
            return null;
        }
    }
    
    const portInputStr = portfolioInput.value.trim();
    if (portInputStr === '') {
        showToast("Please enter the Current Portfolio Value.", "error");
        return null;
    }
    
    const portfolioValue = Number(portInputStr);
    if (isNaN(portfolioValue) || portfolioValue < 0) {
        showToast("Portfolio value must be a valid positive number.", "error");
        return null;
    }
    
    // Compute total investment treating blank as 0
    let totalInvestment = 0;
    state.members.forEach(m => {
        totalInvestment += Number(m.investment) || 0;
    });
    
    if (totalInvestment <= 0) {
        showToast("Total investment must be greater than INR 0.00 to calculate profit sharing.", "error");
        return null;
    }
    
    if (portfolioValue < totalInvestment) {
        showToast(`Current portfolio value (${formatCurrency(portfolioValue)}) cannot be less than total investment (${formatCurrency(totalInvestment)}).`, "error");
        return null;
    }
    
    return {
        totalInvestment,
        portfolioValue
    };
}

function calculateProfit() {
    const validation = validateInputs();
    if (!validation) return;
    
    const { totalInvestment, portfolioValue } = validation;
    const totalProfit = portfolioValue - totalInvestment;
    
    let totalRoundedFinal = 0;
    let maxInvestmentValue = -1;
    let maxInvestmentIndex = -1;
    
    // Save current member state backup to enable Undo Rollover before overwriting inputs
    state.previousMembersState = JSON.parse(JSON.stringify(state.members));
    
    // First round of exact calculations
    let calculatedMembers = state.members.map((m, index) => {
        const inv = Number(m.investment) || 0;
        
        // Ownership formulas
        const ownershipPct = (inv / totalInvestment) * 100;
        const finalAmount = (inv / totalInvestment) * portfolioValue;
        
        if (inv > maxInvestmentValue) {
            maxInvestmentValue = inv;
            maxInvestmentIndex = index;
        }
        
        const roundedOwnership = Number(ownershipPct.toFixed(2));
        const roundedFinal = Number(finalAmount.toFixed(2));
        const roundedProfit = Number((roundedFinal - inv).toFixed(2));
        
        totalRoundedFinal += roundedFinal;
        
        return {
            name: m.name,
            investment: inv,
            ownership: roundedOwnership,
            profit: roundedProfit,
            finalAmount: roundedFinal
        };
    });
    
    // Rounding adjustment for final amount pennies (to match portfolioValue exactly)
    const diff = portfolioValue - totalRoundedFinal;
    if (diff !== 0 && maxInvestmentIndex !== -1) {
        calculatedMembers[maxInvestmentIndex].finalAmount = Number((calculatedMembers[maxInvestmentIndex].finalAmount + diff).toFixed(2));
        // Recalculate profit for the adjusted member
        calculatedMembers[maxInvestmentIndex].profit = Number((calculatedMembers[maxInvestmentIndex].finalAmount - calculatedMembers[maxInvestmentIndex].investment).toFixed(2));
    }
    
    // Rounding adjustment for Ownership Percentages (to sum up to 100.00%)
    const totalRoundedOwnership = calculatedMembers.reduce((s, m) => s + m.ownership, 0);
    const ownershipDiff = 100.00 - totalRoundedOwnership;
    if (ownershipDiff !== 0 && maxInvestmentIndex !== -1) {
        calculatedMembers[maxInvestmentIndex].ownership = Number((calculatedMembers[maxInvestmentIndex].ownership + ownershipDiff).toFixed(2));
    }
    
    // Find highest stats
    let highestInvestorName = "N/A";
    let highestInvestorAmt = -1;
    let highestProfitName = "N/A";
    let highestProfitAmt = -1;
    
    calculatedMembers.forEach(m => {
        if (m.investment > highestInvestorAmt) {
            highestInvestorAmt = m.investment;
            highestInvestorName = m.name;
        }
        if (m.profit > highestProfitAmt) {
            highestProfitAmt = m.profit;
            highestProfitName = m.name;
        }
    });
    
    // Update State
    state.results = calculatedMembers;
    state.portfolioValue = portfolioValue;
    
    // Automatically rollover calculated Final Amounts to the input values immediately
    state.members = state.members.map((m, idx) => {
        return {
            id: m.id,
            name: m.name,
            investment: calculatedMembers[idx].finalAmount.toFixed(2)
        };
    });
    
    // Re-render members table to show rolled-over amounts in inputs
    renderMembersTable();
    
    // Save state to local storage
    saveToLocalStorage();
    
    // Render Results table
    renderResultsViewTable();
    
    // Render Stats panel
    statTotalInvestment.textContent = formatCurrency(totalInvestment);
    statCurrentPortfolio.textContent = formatCurrency(portfolioValue);
    statTotalProfit.textContent = formatCurrency(totalProfit);
    
    statHighestInvestor.textContent = highestInvestorAmt > 0 
        ? `${highestInvestorName} (${formatCurrency(highestInvestorAmt)})`
        : "N/A";
        
    statHighestProfit.textContent = highestProfitAmt > 0 
        ? `${highestProfitName} (${formatCurrency(highestProfitAmt)})`
        : "N/A";
        
    // Toggle displays
    resultsPlaceholder.classList.add('hidden');
    resultsTableArea.classList.remove('hidden');
    resultsDisplayCard.classList.remove('inactive');
    
    // Reveal Undo Rollover button
    btnUndoRollover.classList.remove('hidden');
    
    showToast("Calculations completed. Final amounts automatically rolled over as new investment inputs.", "success");
}

function renderResultsViewTable() {
    resultsTbody.innerHTML = '';
    
    state.results.forEach(r => {
        const tr = document.createElement('tr');
        if (r.profit < 0) {
            tr.classList.add('negative-profit');
        }
        
        tr.innerHTML = `
            <td class="member-name-cell">${escapeHtml(r.name)}</td>
            <td>${formatCurrency(r.investment)}</td>
            <td>${r.ownership.toFixed(2)}%</td>
            <td>${formatProfit(r.profit)}</td>
            <td>${formatCurrency(r.finalAmount)}</td>
        `;
        resultsTbody.appendChild(tr);
    });
}

function undoRollover() {
    if (state.previousMembersState) {
        state.members = state.previousMembersState;
        state.previousMembersState = null;
        btnUndoRollover.classList.add('hidden');
        
        invalidateResults();
        renderMembersTable();
        saveToLocalStorage();
        showToast("Rollover undone. Original investments restored.", "info");
    }
}

// ==========================================================================
// Additional Actions (Start Round, Reset, CSV Export)
// ==========================================================================
function startNewRound() {
    if (!state.results) {
        showToast("No active calculations found to begin a new round.", "error");
        return;
    }
    
    // Clear portfolio input and results
    portfolioInput.value = '';
    state.portfolioValue = '';
    state.previousMembersState = null;
    btnUndoRollover.classList.add('hidden');
    
    // Clear results view and reset stats cards
    invalidateResults();
    
    showToast("New round started. You can now enter the next portfolio value.", "success");
}

function exportCSV() {
    if (!state.results) {
        showToast("No data available to export. Run calculations first.", "error");
        return;
    }
    
    let csvRows = [];
    // CSV Header using Rupees
    csvRows.push(["Member Name", "Investment Amount (INR)", "Ownership Share (%)", "Profit Earned (INR)", "Final Valuation (INR)"].join(","));
    
    state.results.forEach(r => {
        csvRows.push([
            `"${r.name.replace(/"/g, '""')}"`,
            r.investment.toFixed(2),
            r.ownership.toFixed(2) + "%",
            r.profit.toFixed(2),
            r.finalAmount.toFixed(2)
        ].join(","));
    });
    
    // Append Totals row
    let totalInv = state.results.reduce((s, r) => s + r.investment, 0);
    let totalOwn = state.results.reduce((s, r) => s + r.ownership, 0);
    let totalProf = state.results.reduce((s, r) => s + r.profit, 0);
    let totalFinal = state.results.reduce((s, r) => s + r.finalAmount, 0);
    
    csvRows.push([
        `"TOTAL (SUM)"`,
        totalInv.toFixed(2),
        totalOwn.toFixed(2) + "%",
        totalProf.toFixed(2),
        totalFinal.toFixed(2)
    ].join(","));
    
    // Prepend UTF-8 BOM so Excel opens CSV correctly
    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `investment_distribution_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("CSV sheet compiled and downloaded.", "success");
}

function resetDashboard() {
    state.members = [
        { id: '1', name: 'Jaya', investment: '' },
        { id: '2', name: 'Yazhini', investment: '' },
        { id: '3', name: 'Ulagu', investment: '' },
        { id: '4', name: 'Chandru', investment: '' },
        { id: '5', name: 'Dharani', investment: '' },
        { id: '6', name: 'Kiruthika', investment: '' }
    ];
    state.results = null;
    state.portfolioValue = '';
    state.previousMembersState = null;
    
    portfolioInput.value = '';
    if (btnUndoRollover) {
        btnUndoRollover.classList.add('hidden');
    }
    
    renderMembersTable();
    updateMembersCountStat();
    resetStatsCards();
    
    // Reset view panels
    resultsPlaceholder.classList.remove('hidden');
    resultsTableArea.classList.add('hidden');
    resultsDisplayCard.classList.add('inactive');
    
    clearLocalStorage();
    
    showToast("Dashboard reset successfully.", "info");
}

// ==========================================================================
// Navigation
// ==========================================================================
function switchSection(section, save = true) {
    state.activeSection = section;

    navTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.section === section);
    });

    sectionInvestment.classList.toggle('hidden', section !== 'investment');
    sectionHoldings.classList.toggle('hidden', section !== 'holdings');

    if (save) {
        saveToLocalStorage();
    }
}

// ==========================================================================
// Holdings Management
// ==========================================================================
function getNextSerialNumber() {
    if (state.holdings.length === 0) return 1;
    const maxSerial = state.holdings.reduce((max, h) => {
        const serial = Number(h.serialNumber) || 0;
        return serial > max ? serial : max;
    }, 0);
    return maxSerial + 1;
}

function calculateHoldingTotal(quantity, price) {
    const qty = Number(quantity) || 0;
    const prc = Number(price) || 0;
    return qty * prc;
}

function renderHoldingsTable() {
    holdingsTbody.innerHTML = '';

    if (state.holdings.length === 0) {
        holdingsTbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">
                    No coins in holdings. Click "Add New Coin" to start tracking.
                </td>
            </tr>
        `;
        holdingsGrandTotal.textContent = 'INR 0.00';
        return;
    }

    let grandTotal = 0;

    state.holdings.forEach((h) => {
        const rowTotal = calculateHoldingTotal(h.quantity, h.price);
        grandTotal += rowTotal;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="serial-cell">${escapeHtml(h.serialNumber)}</td>
            <td>
                <input type="date" 
                       class="table-input holdings-date-input" 
                       data-id="${h.id}" 
                       data-field="purchaseDate"
                       value="${escapeHtml(h.purchaseDate)}">
            </td>
            <td>
                <input type="text" 
                       class="table-input holdings-text-input" 
                       data-id="${h.id}" 
                       data-field="coinName"
                       value="${escapeHtml(h.coinName)}" 
                       placeholder="e.g. Bitcoin">
            </td>
            <td>
                <input type="number" 
                       class="table-input holdings-num-input" 
                       data-id="${h.id}" 
                       data-field="quantity"
                       value="${escapeHtml(h.quantity)}" 
                       placeholder="0.00" 
                       step="any" 
                       min="0">
            </td>
            <td>
                <div class="table-input-wrapper">
                    <span class="table-input-symbol">INR</span>
                    <input type="number" 
                           class="table-input holdings-num-input" 
                           data-id="${h.id}" 
                           data-field="price"
                           value="${escapeHtml(h.price)}" 
                           placeholder="0.00" 
                           step="any" 
                           min="0">
                </div>
            </td>
            <td class="holdings-row-total">${formatCurrency(rowTotal)}</td>
            <td class="col-action">
                <button type="button" class="btn-delete" data-holding-id="${h.id}" title="Remove Coin">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </td>
        `;
        holdingsTbody.appendChild(tr);
    });

    holdingsGrandTotal.textContent = formatCurrency(grandTotal);
}

function addNewHolding() {
    const newId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const today = new Date().toISOString().split('T')[0];

    state.holdings.push({
        id: newId,
        serialNumber: getNextSerialNumber(),
        purchaseDate: today,
        coinName: '',
        quantity: '',
        price: ''
    });

    renderHoldingsTable();
    saveToLocalStorage();
    showToast('New coin entry added.', 'success');
}

function handleHoldingInput(e) {
    const target = e.target;
    const id = target.dataset.id;
    const field = target.dataset.field;
    if (!id || !field) return;

    const holding = state.holdings.find(h => h.id === id);
    if (!holding) return;

    holding[field] = target.value;

    const row = target.closest('tr');
    if (row && (field === 'quantity' || field === 'price')) {
        const rowTotal = calculateHoldingTotal(holding.quantity, holding.price);
        const totalCell = row.querySelector('.holdings-row-total');
        if (totalCell) {
            totalCell.textContent = formatCurrency(rowTotal);
        }

        let grandTotal = 0;
        state.holdings.forEach(h => {
            grandTotal += calculateHoldingTotal(h.quantity, h.price);
        });
        holdingsGrandTotal.textContent = formatCurrency(grandTotal);
    }

    saveToLocalStorage();
}

function handleHoldingDeleteClick(e) {
    const btn = e.target.closest('.btn-delete[data-holding-id]');
    if (!btn) return;

    const id = btn.dataset.holdingId;
    const index = state.holdings.findIndex(h => h.id === id);
    if (index === -1) return;

    const name = state.holdings[index].coinName || `Entry #${state.holdings[index].serialNumber}`;
    state.holdings.splice(index, 1);

    renderHoldingsTable();
    saveToLocalStorage();
    showToast(`Removed "${name}" from holdings.`, 'info');
}

// Start application
document.addEventListener('DOMContentLoaded', init);
