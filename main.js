let currentConfig = null;
let allAppsList = [];
const sectionVisibility = {
    simulations: true,
    games: true,
    apps: true
};

const CATEGORY_META = {
    games: {
        id: 'games',
        title: 'Games',
        icon: '🎮',
        badgeClass: 'cat-games',
        badgeText: 'Game',
        description: 'Interactive puzzles, arcade challenges, and strategy games'
    },
    simulations: {
        id: 'simulations',
        title: 'Simulations',
        icon: '🧪',
        badgeClass: 'cat-simulations',
        badgeText: 'Simulation',
        description: 'Emergent artificial life, swarm intelligence, and physics models'
    },
    apps: {
        id: 'apps',
        title: 'Apps & Tools',
        icon: '📱',
        badgeClass: 'cat-apps',
        badgeText: 'App',
        description: 'Web utilities, expense tools, and training applications'
    }
};

async function init() {
    const showcaseSections = document.getElementById('showcaseSections');

    try {
        const configResponse = await fetch('apps.config.json');
        currentConfig = await configResponse.json();

        let repos = [];
        try {
            const githubResponse = await fetch(`https://api.github.com/users/${currentConfig.githubUsername}/repos?sort=updated&per_page=100`);
            const data = await githubResponse.json();
            if (Array.isArray(data)) {
                repos = data;
            } else {
                console.warn("GitHub rate limit reached, using local config metadata.");
            }
        } catch (e) {
            console.warn("Could not reach GitHub API, using local config:", e);
        }

        const pinnedApps = currentConfig.pinnedApps || [];
        const hiddenApps = currentConfig.hiddenApps || [];
        const overrides = currentConfig.overrides || {};

        allAppsList = pinnedApps
            .filter(name => !hiddenApps.includes(name))
            .map(repoName => {
                const repo = repos.find(r => r.name === repoName) || {};
                const override = overrides[repoName] || {};

                let finalUrl = override.demoUrl || repo.homepage;
                if (!finalUrl && repo.has_pages) {
                    finalUrl = `https://${currentConfig.githubUsername}.github.io/${repoName}/`;
                }
                if (!finalUrl) {
                    finalUrl = `https://${currentConfig.githubUsername}.github.io/${repoName}/`;
                }

                let screenshot = override.screenshot;
                if (!screenshot) {
                    screenshot = `screenshots/${repoName}.png`;
                }

                const category = override.category || 'games';
                const description = override.description || repo.description || "Interactive web application.";

                return {
                    id: repo.id || repoName,
                    name: override.name || formatName(repoName),
                    repoName: repoName,
                    url: finalUrl,
                    screenshot: screenshot,
                    category: category,
                    description: description
                };
            });

        updateCategoryNavBadges();
        renderSections();

    } catch (error) {
        console.error("Failed to load apps:", error);
        showcaseSections.innerHTML = `<div class="loading">Failed to load projects. Please refresh to try again.</div>`;
    }

    // Bind Filter/Toggle Buttons
    const pillAll = document.getElementById('pill-all');
    const pillGames = document.getElementById('pill-games');
    const pillSimulations = document.getElementById('pill-simulations');
    const pillApps = document.getElementById('pill-apps');

    if (pillAll) {
        pillAll.addEventListener('click', toggleAllSections);
    }
    if (pillGames) {
        pillGames.addEventListener('click', () => toggleSection('games'));
    }
    if (pillSimulations) {
        pillSimulations.addEventListener('click', () => toggleSection('simulations'));
    }
    if (pillApps) {
        pillApps.addEventListener('click', () => toggleSection('apps'));
    }
}

function updateCategoryNavBadges() {
    const totalCount = allAppsList.length;
    const gamesCount = allAppsList.filter(a => a.category === 'games').length;
    const simsCount = allAppsList.filter(a => a.category === 'simulations').length;
    const appsCount = allAppsList.filter(a => a.category === 'apps').length;

    const catCountAll = document.getElementById('catCountAll');
    const catCountGames = document.getElementById('catCountGames');
    const catCountSimulations = document.getElementById('catCountSimulations');
    const catCountApps = document.getElementById('catCountApps');

    if (catCountAll) catCountAll.textContent = totalCount;
    if (catCountGames) catCountGames.textContent = gamesCount;
    if (catCountSimulations) catCountSimulations.textContent = simsCount;
    if (catCountApps) catCountApps.textContent = appsCount;

    const appCount = document.getElementById('appCount');
    if (appCount) {
        appCount.textContent = `${totalCount} projects`;
    }
}

function renderSections() {
    const container = document.getElementById('showcaseSections');
    if (!container) return;

    const categories = ['simulations', 'games', 'apps'];
    let sectionsHtml = '';

    categories.forEach(catKey => {
        const meta = CATEGORY_META[catKey];
        if (!meta) return;

        const appsInCategory = allAppsList.filter(a => a.category === catKey);
        if (appsInCategory.length === 0) return;

        const isExpanded = sectionVisibility[catKey];

        const cardsHtml = appsInCategory.map(app => `
            <a href="${app.url}" target="_blank" class="app-card">
                <div class="app-card-image" style="background-image: url('${app.screenshot}')"></div>
                <div class="app-card-overlay">
                    <div class="card-header-row">
                        <h3 class="card-title">${app.name}</h3>
                        <span class="card-cat-badge ${meta.badgeClass}">${meta.badgeText}</span>
                    </div>
                    <p class="card-desc">${app.description}</p>
                </div>
            </a>
        `).join('');

        sectionsHtml += `
            <section class="category-section section-${catKey} ${isExpanded ? '' : 'is-collapsed'}" id="section-${catKey}">
                <div class="section-header" onclick="toggleSection('${catKey}')" title="Click to toggle ${meta.title}">
                    <div class="section-header-left">
                        <div class="section-title-row">
                            <h2 class="section-title">${meta.title}</h2>
                            <span class="section-count">${appsInCategory.length}</span>
                        </div>
                        <p class="section-desc">${meta.description}</p>
                    </div>
                    <div class="section-header-right">
                        <span class="section-toggle-btn">
                            <span class="toggle-label">${isExpanded ? 'Hide' : 'Show'}</span>
                            <svg class="section-chevron" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                        </span>
                    </div>
                </div>
                <div class="section-body">
                    <div class="section-grid">
                        ${cardsHtml}
                    </div>
                </div>
            </section>
        `;
    });

    container.innerHTML = sectionsHtml;
    updatePillStates();
}

function toggleSection(catKey) {
    sectionVisibility[catKey] = !sectionVisibility[catKey];

    const sectionEl = document.getElementById(`section-${catKey}`);
    if (sectionEl) {
        sectionEl.classList.toggle('is-collapsed', !sectionVisibility[catKey]);
        const stateText = sectionEl.querySelector('.toggle-label');
        if (stateText) {
            stateText.textContent = sectionVisibility[catKey] ? 'Hide' : 'Show';
        }
    }

    updatePillStates();
}

function toggleAllSections() {
    // If all are open, collapse all. Otherwise open all.
    const allOpen = Object.values(sectionVisibility).every(Boolean);
    const newState = !allOpen;

    ['simulations', 'games', 'apps'].forEach(k => {
        sectionVisibility[k] = newState;
        const sectionEl = document.getElementById(`section-${k}`);
        if (sectionEl) {
            sectionEl.classList.toggle('is-collapsed', !newState);
            const stateText = sectionEl.querySelector('.toggle-label');
            if (stateText) {
                stateText.textContent = newState ? 'Hide' : 'Show';
            }
        }
    });

    updatePillStates();
}

function updatePillStates() {
    const pillGames = document.getElementById('pill-games');
    const pillSimulations = document.getElementById('pill-simulations');
    const pillApps = document.getElementById('pill-apps');
    const pillAll = document.getElementById('pill-all');

    if (pillGames) pillGames.classList.toggle('active', Boolean(sectionVisibility.games));
    if (pillSimulations) pillSimulations.classList.toggle('active', Boolean(sectionVisibility.simulations));
    if (pillApps) pillApps.classList.toggle('active', Boolean(sectionVisibility.apps));

    const allOpen = Object.values(sectionVisibility).every(Boolean);
    if (pillAll) pillAll.classList.toggle('active', allOpen);
}

function formatName(name) {
    return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

window.toggleSection = toggleSection;

init();
