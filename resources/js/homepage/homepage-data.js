(function () {
    'use strict';

    // GitHub Pages serves these files directly. No build step or application server is required.
    const dataURL = name => new URL('resources/data/' + name + '.json', document.baseURI);
    const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
    const plainTitle = value => String(value ?? '').replace(/<[^>]*>/g, '');
    let pagePromise;

    async function load(name) {
        const response = await fetch(dataURL(name));
        if (!response.ok) throw new Error(name + '.json: HTTP ' + response.status);
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error(name + '.json must contain an array');
        return data;
    }

    function paperHTML(pub, index) {
        const title = plainTitle(pub.title), preview = pub.preview || {}, links = pub.links || {};
        const authors = (pub.authors || []).map(author => author.isFirstAuthor
            ? '<b>' + escapeHTML(author.name) + '</b>' : escapeHTML(author.name)).join(', ');
        const project = links.project ? '<a href="' + escapeHTML(links.project) + '" aria-label="Project"><i class="fas fa-link"></i></a>' : '';
        const code = links.code ? '<a class="code-link" href="' + escapeHTML(links.code) + '">Code ↗</a>' : '';
        return `<article class="publication-item show" data-category="${escapeHTML(pub.category)}" data-node-key="paper-${index}"
            data-preview="${escapeHTML(preview.thumbnail || '')}" data-full-preview="${escapeHTML(preview.full || '')}"
            data-preview-label="论文首页" data-title="${escapeHTML(title)}" data-venue="${escapeHTML(pub.venue)}"
            data-year="${escapeHTML(pub.year)}" data-paper="${escapeHTML(links.paper)}">
            <h3 class="publication-title"><a href="${escapeHTML(links.paper)}" aria-label="Paper"><i class="fas fa-file-pdf"></i></a><span>${escapeHTML(title)}</span> ${project}${code}</h3>
            <div class="publication-authors">${authors}</div>
            <div class="publication-venue"><span>${escapeHTML(pub.venue)}, ${escapeHTML(pub.year)}.</span><span class="pub-rating">${escapeHTML(pub.category)}</span></div>
        </article>`;
    }

    function renderPublications(publications) {
        const container = document.getElementById('publications-container');
        if (!container) return;
        const years = [...new Set(publications.map(pub => pub.year))].sort((a, b) => Number(b) - Number(a));
        container.innerHTML = years.map(year => `<div class="publication-group" data-year="${escapeHTML(year)}" id="publications-${escapeHTML(year)}">
            <div class="year-header"><div class="year-divider"></div><div class="year-title">${escapeHTML(year)}</div></div>
            ${publications.map((pub, index) => pub.year === year ? paperHTML(pub, index) : '').join('')}
        </div>`).join('');
        container.setAttribute('aria-busy', 'false');
    }

    function renderProjects(projects) {
        const container = document.getElementById('projects-container');
        if (!container) return;
        container.innerHTML = projects.map(project => {
            const members = (project.members || []).map(member => member.isLeader
                ? '<b>' + escapeHTML(member.name) + '</b>' : escapeHTML(member.name)).join(', ');
            const links = [['project', 'Project Page'], ['poster', 'Poster'], ['code', 'Code'], ['pcDemo', 'PC Demo'], ['sdkDemo', 'SDK Demo']]
                .filter(([key]) => project.links?.[key] && project.links[key] !== '.')
                .map(([key, label]) => '<a class="action" href="' + escapeHTML(project.links[key]) + '">' + label + '</a>').join(' ');
            return `<div class="project-card"><h3 class="project-title">${escapeHTML(project.title)}</h3>
                <div class="project-description">${escapeHTML(project.venue)}<br>${members}</div>
                <div class="project-links">${links}</div></div>`;
        }).join('');
    }

    function renderHonors(honors) {
        const container = document.getElementById('honors-container');
        if (!container) return;
        container.innerHTML = honors.map(honor => `<div class="honor-item"><div class="honor-icon"><i class="fas fa-trophy"></i></div>
            <div class="honor-content"><span class="honor-title" style="color:#6c757d">[${escapeHTML(honor.date)}]</span>
            <span class="honor-description">${escapeHTML(honor.title)}</span></div></div>`).join('');
    }

    async function section(name, render, id) {
        try {
            const items = await load(name);
            render?.(items);
            return items;
        } catch (error) {
            console.error('Unable to load homepage ' + name, error);
            const container = id && document.getElementById(id);
            if (container) {
                const message = document.createElement('p');
                message.setAttribute('role', 'status');
                message.textContent = 'This section could not be loaded. Please refresh the page.';
                container.replaceChildren(message);
                container.setAttribute('aria-busy', 'false');
            }
            return [];
        }
    }

    function initPage() {
        if (pagePromise) return pagePromise;
        pagePromise = Promise.all([
            section('publications', renderPublications, 'publications-container'),
            section('projects', renderProjects, 'projects-container'),
            section('honors', renderHonors, 'honors-container'),
            section('photography')
        ]).then(([publications, projects, honors, photos]) => {
            window.homepageData = { publications, projects, honors, photos };
            return window.homepageData;
        });
        return pagePromise;
    }

    window.homepageDataReady = initPage();
})();
