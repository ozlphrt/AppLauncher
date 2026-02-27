async function init() {
    const configResponse = await fetch('apps.config.json');
    const config = await configResponse.json();
    const appGrid = document.getElementById('appGrid');
    const searchInput = document.getElementById('appSearch');
    const filterContainer = document.getElementById('filters');

    let allApps = [];

    try {
        const githubResponse = await fetch(`https://api.github.com/users/${config.githubUsername}/repos?sort=updated&per_page=100`);
        const repos = await githubResponse.json();

        const pinnedApps = config.pinnedApps || [];
        const hiddenApps = config.hiddenApps || [];

        allApps = repos
            .filter(repo => (pinnedApps.length === 0 || pinnedApps.includes(repo.name)) && !hiddenApps.includes(repo.name))
            .map(repo => {
                const override = config.overrides[repo.name] || {};

                // Smart URL detection
                let finalUrl = override.demoUrl || repo.homepage;

                if (!finalUrl && repo.has_pages) {
                    finalUrl = `https://${config.githubUsername}.github.io/${repo.name}/`;
                }

                if (!finalUrl) {
                    finalUrl = repo.html_url;
                }

                // Smart Screenshot detection (looks for preview.png in main branch)
                let screenshot = override.screenshot;
                if (!screenshot) {
                    screenshot = `https://raw.githubusercontent.com/${config.githubUsername}/${repo.name}/main/preview.png`;
                }

                return {
                    id: repo.id,
                    name: override.name || formatName(repo.name),
                    description: override.description || repo.description || "No description provided.",
                    url: finalUrl,
                    screenshot: screenshot,
                    tags: [...(repo.topics || []), ...(override.tags || [])],
                    language: repo.language,
                    repoName: repo.name
                };
            });

        // Sort by pinnedApps order
        if (pinnedApps.length > 0) {
            allApps.sort((a, b) => {
                const indexA = pinnedApps.indexOf(a.repoName);
                const indexB = pinnedApps.indexOf(b.repoName);
                if (indexA === -1 && indexB === -1) return 0;
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            });
        }

        renderApps(allApps);
        // generateFilters(allApps); // Removed as filter functionality is removed

    } catch (error) {
        console.error("Failed to fetch apps:", error);
        appGrid.innerHTML = `<div class="loading">Failed to load apps. Please check your connection.</div>`;
    }

    // searchInput.addEventListener('input', (e) => { // Removed search event listener
    //     const query = e.target.value.toLowerCase();
    //     const filtered = allApps.filter(app =>
    //         app.name.toLowerCase().includes(query) ||
    //         app.description.toLowerCase().includes(query) ||
    //         app.tags.some(tag => tag.toLowerCase().includes(query))
    //     );
    //     renderApps(filtered);
    // });

    // filterContainer.addEventListener('click', (e) => { // Removed filter event listener
    //     if (e.target.classList.contains('filter-btn')) {
    //         document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    //         e.target.classList.add('active');

    //         const filter = e.target.dataset.filter;
    //         if (filter === 'all') {
    //             renderApps(allApps);
    //         } else {
    //             const filtered = allApps.filter(app => app.tags.includes(filter) || app.language === filter);
    //             renderApps(filtered);
    //         }
    //     }
    // });
}

function formatName(name) {
    return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function renderApps(apps) {
    const appGrid = document.getElementById('appGrid');
    if (apps.length === 0) {
        appGrid.innerHTML = `<div class="loading">No projects found.</div>`;
        return;
    }

    appGrid.innerHTML = apps.map(app => {
        // Fallback to a placeholder if no screenshot is provided
        const screenshotUrl = app.screenshot || `https://via.placeholder.com/800x500/161616/555555?text=${encodeURIComponent(app.name)}`;

        return `
            <a href="${app.url}" target="_blank" class="app-card">
                <div class="app-card-image" style="background-image: url('${screenshotUrl}')"></div>
                <div class="app-card-overlay">
                    <h3>${app.name}</h3>
                </div>
            </a>
        `;
    }).join('');
}

function generateFilters(apps) {
    const filterContainer = document.getElementById('filters');
    const languages = [...new Set(apps.map(app => app.language).filter(Boolean))];

    languages.forEach(lang => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.dataset.filter = lang;
        btn.textContent = lang;
        filterContainer.appendChild(btn);
    });
}

init();
