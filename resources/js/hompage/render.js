/**
 * 从JSON文件加载数据并渲染到页面
 */
function initPage() {
    // 加载并渲染论文数据
    fetch('https://tang5618.com/resources/data/publications.json')
        .then(response => response.json())
        .then(data => renderPublications(data))
        .catch(error => console.error('Error loading publications:', error));

    // 加载并渲染项目数据
    fetch('https://tang5618.com/resources/data/projects.json')
        .then(response => response.json())
        .then(data => renderProjects(data))
        .catch(error => console.error('Error loading projects.json:', error));

    // 加载并渲染荣誉数据
    fetch('https://tang5618.com/resources/data/honors.json')
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

        // 生成链接HTML
        let linksHtml = '';
        // if (pub.links.project && pub.links.project !== ".") {
        //     linksHtml += `<a class="action" href="${pub.links.project}">Project Page</a>`;
        // }
        // if (pub.links.paper && pub.links.paper !== ".") {
        //     linksHtml += `<a class="action" href="${pub.links.paper}">Paper</a>`;
        // }
        // if (pub.links.code && pub.links.code !== ".") {
        //     linksHtml += `<a class="action" href="${pub.links.code}">Code</a>`;
        // }
        // if (pub.links.honor && pub.links.honor !== ".") {
        //     linksHtml += `<a class="action" href="${pub.links.honor}">Honor</a>`;
        // }

        // 拼接论文HTML
        const pubHtml = `
            <div class="publications row w-100">
                <div class="col w-100">
                    <div class="publication row  w-100">
                        <div class="section-1 w-100">
                         <i class="ai ai-paperclip action"></i><span>${pub.title}</span>
                            <br>
                            <span class="text-muted publication-name">${pub.venue}</span>
                        </div>
                        <div class="section-2 text-muted w-100">${authorsHtml}</div>
                        <div class="actions">${linksHtml}</div>
                    </div>
                </div>
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
    const container = document.getElementById('projects.json-container');
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
        if (project.links.project) linksHtml += `<a class="action" href="${project.links.project}">project page</a>`;
        if (project.links.poster) linksHtml += `<a class="action" href="${project.links.poster}">Poster</a>`;
        if (project.links.code) linksHtml += `<a class="action" href="${project.links.code}">Code</a>`;
        if (project.links.pcDemo) linksHtml += `<a class="action" href="${project.links.pcDemo}">PC Demo</a>`;
        if (project.links.sdkDemo) linksHtml += `<a class="action" href="${project.links.sdkDemo}">SDK Demo</a>`;

        // 拼接项目HTML
        const projectHtml = `
            <div class="row w-100" style="margin-left:-1em ">
            <div class="col w-100">
                <div class="publication row  w-100">
                    <div class="section-1 w-100">
                        <span>${project.title}</span>
                        <br>
                        <span class="text-muted publication-name">${project.venue}</span>
                    </div>
                    <div class="section-2 text-muted w-100">${membersHtml}</div>
                    <div class="actions">${linksHtml}</div>
                </div>
            </div>
            </div>
        `;
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
<!--            <div class="row w-100" style="margin-left:-1em ">-->
<!--            <div class="col w-100">-->
                <div class="publication row  w-100">
                    <div class="section-1 w-100">
                        <span>
                            <span style="color: #6c757d!important">[${honor.date}]</span> <b>${honor.title}</b>
                        </span>
                    </div>
                </div>
<!--            </div>-->
<!--            </div>-->
        `;
        container.innerHTML += honorHtml;
    });
}
