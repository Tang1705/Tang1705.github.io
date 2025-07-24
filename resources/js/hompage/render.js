/**
 * 从JSON文件加载数据并渲染到页面
 */
function initPage() {
    // 加载并渲染论文数据
    fetch('./resources/data/publications.json')
        .then(response => response.json())
        .then(data => renderPublications(data))
        .catch(error => console.error('Error loading publications:', error));

    // 加载并渲染项目数据
    fetch('./resources/data/projects.json')
        .then(response => response.json())
        .then(data => renderProjects(data))
        .catch(error => console.error('Error loading projects.json:', error));

    // 加载并渲染荣誉数据
    fetch('./resources/data/honors.json')
        .then(response => response.json())
        .then(data => renderHonors(data))
        .catch(error => console.error('Error loading honors:', error));
}

/**
 * 渲染论文列表
 * @param {Array} publications - 论文数据数组
 */
function renderPublications(publications) {
    const container = document.getElementById('publications-container');
    container.innerHTML = ''; // 清空容器

    publications.forEach(pub => {
        // 生成作者列表HTML
        const authorsHtml = pub.authors.map(author => {
            return author.isFirstAuthor
                ? `<span style="color: #b6262c"><b> ${author.name} </b></span>`
                : `<span> ${author.name} </span>`;
        }).join('<span class="separator">,</span>');

        const tagsHtml=pub.tags.map(tag => {
            return `<span class="publication-tag" style="margin-right: -0.2em">${tag}</span>`}).join('');


        const pubHtml = `
        <div class="publication-item show" data-category="${pub.category}" style="margin-left: -2em">
            <div class="publication-header" style="margin-left: 2.5em">
                <span class="badge-ccf badge-${pub.category}" style="margin-right: 0.5em">${pub.category}</span>
                ${tagsHtml}                
            </div>
            <h3 class="publication-title" style="margin-left: 2em">${pub.title} <i class="fas fa-file-pdf"></i></h3>
            <div class="publication-venue" style="margin-left: 2.5em">${pub.venue}</div>
            <div class="publication-authors" style="margin-left: 2.5em">${authorsHtml}</div>
<!--            <div class="publication-links" style="margin-left: 2.5em">-->
<!--                <a href="#"><i class="fas fa-file-pdf"></i> PDF</a>-->
<!--                <a href="#"><i class="fab fa-github"></i> Code</a>-->
<!--                <a href="#"><i class="fas fa-link"></i> Project Page</a>-->
<!--            </div>-->
        </div>
        `;
        container.innerHTML += pubHtml;
    });
}

/**
 * 渲染项目列表
 * @param {Array} projects - 项目数据数组
 */
function renderProjects(projects) {
    const container = document.getElementById('projects-container');
    container.innerHTML = ''; // 清空容器

    projects.forEach(project => {
        // 生成成员列表HTML
        const membersHtml = project.members.map(member => {
            return member.isLeader
                ? `<span style="color: #b6262c"><b> ${member.name} </b></span>`
                : `<span> ${member.name} </span>`;
        }).join('<span class="separator">,</span>');

        // 生成链接HTML
        let linksHtml = '';
        if (project.links.project && project.links.project !== ".") linksHtml += `<a class="action" href="${project.links.project}"><i class="fab fa-chrome"></i> Project Page</a>`;
        if (project.links.poster && project.links.poster !== ".") linksHtml += `<a class="action" href="${project.links.poster}"><i class="fab fa-slideshare"></i> Poster</a>`;
        if (project.links.code && project.links.code !== ".") linksHtml += `<a class="action" href="${project.links.code}"><i class="fab fa-github"></i> Code</a>`;
        if (project.links.pcDemo && project.links.pcDemo !== ".") linksHtml += `<a class="action" href="${project.links.pcDemo}"><i class="fab fa-windows"></i> PC Demo</a>`;
        if (project.links.sdkDemo && project.links.sdkDemo !== ".") linksHtml += `<a class="action" href="${project.links.sdkDemo}"><i class="fab fa-github"></i> SDK Demo</a>`;
        const projectHtml = `
        <div class="project-card">
            <h3 class="project-title">${project.title}</h3>
            <div class="project-description">
                ${project.venue}
                <br>
                <p style="font-style: italic;">${membersHtml}</p>
            </div>
            <div class="project-links">
                ${linksHtml}
            </div>`;

            container.innerHTML += projectHtml;
            });
            }

            /**
            * 渲染荣誉列表
            * @param {Array} honors - 荣誉数据数组
            */
            function renderHonors(honors) {
            const container = document.getElementById('honors-container');
            container.innerHTML = ''; // 清空容器

            honors.forEach(honor => {
            const honorHtml = `
                <div class="honor-item">
                    <div class="honor-icon">
                        <i class="fas fa-trophy"></i>
                    </div>
                    <div class="honor-content">
                        <span class="honor-title" style="color: #6c757d!important">[${honor.date}]</span> <span class="honor-description">${honor.title}</span>
                    </div>
                </div>
                
        `;
            container.innerHTML += honorHtml;
        });
        }