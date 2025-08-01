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
    // 全局存储论文数据
let publicationsData = [];

// 修改后的renderPublications函数
function renderPublications(filter = 'all') {
    const container = document.getElementById('publications-container');
    container.innerHTML = ''; // 清空容器

    // 根据筛选条件过滤论文
    let filteredPublications = publicationsData;
    if (filter !== 'all') {
        // 特殊处理CCF-A类别（包含CCF-T1）
        if (filter === 'CCF-A') {
            filteredPublications = publicationsData.filter(pub =>
                pub.category === 'CCF-A' || pub.category === 'CCF-T1'
            );
        } else {
            filteredPublications = publicationsData.filter(pub => pub.category === filter);
        }

        // 添加紧凑模式类
        container.classList.add('compact');
    } else {
        // 移出紧凑模式类
        container.classList.remove('compact');
    }

    // 如果是ALL筛选，按年份分组显示
    if (filter === 'all') {
        // 按年份分组
        const publicationsByYear = {};
        filteredPublications.forEach(pub => {
            if (!publicationsByYear[pub.year]) {
                publicationsByYear[pub.year] = [];
            }
            publicationsByYear[pub.year].push(pub);
        });

        // 获取年份并降序排序
        const years = Object.keys(publicationsByYear).sort((a, b) => b - a);

        // 遍历每个年份
        // 修改年份组的渲染方式
        years.forEach(year => {
            // 创建年份组容器
            const groupContainer = document.createElement('div');
            groupContainer.className = 'publication-group';
            groupContainer.setAttribute('data-year', year);

            // 添加年份标题和分割线
            const yearHeaderHtml = `
    <div class="year-header">
        <div class="year-divider"></div>
        <div class="year-title">${year}</div>
    </div>
    `;
            groupContainer.innerHTML = yearHeaderHtml;

            // 添加该年份的所有论文
            publicationsByYear[year].forEach(pub => {
                groupContainer.innerHTML += createPublicationHtml(pub);
            });

            // 将年份组添加到主容器
            container.appendChild(groupContainer);
        });
    }
    // 其他筛选，直接显示
    else {
        filteredPublications.forEach(pub => {
            container.innerHTML += createPublicationHtml(pub);
        });
    }
}

// 创建单篇论文HTML的函数
function createPublicationHtml(pub) {
    // 生成作者列表HTML
    const authorsHtml = pub.authors.map(author => {
        return author.isFirstAuthor
            ? `<span style="color: #b6262c"><b> ${author.name} </b></span>`
            : `<span> ${author.name} </span>`;
    }).join('<span class="separator">,</span>');

    const tagsHtml = pub.tags.map(tag => {
        return `<span class="publication-tag" style="margin-right: 0.5em">${tag}</span>`;
    }).join('');


    return `
        <div class="publication-item show" data-category="${pub.category}" style="margin-left: -2em">
            <h3 class="publication-title" style="margin-left: 2.2em;"><a href="${pub.links.paper}"><i class="fas fa-file-pdf"></i></a>&nbsp;&nbsp;${pub.title}&nbsp;&nbsp;${pub.links.project ? `<a href="${pub.links.project}" style="margin-left: 0.5em;"><i class="fas fa-link"></i></a>` : ''}
        </h3>
            <div class="publication-venue" style="margin-left: 2.5em">${pub.venue}, ${pub.year}.</div>
            <div class="publication-authors" style="margin-left: 2.5em">${authorsHtml}</div>
            <div class="publication-header" style="margin-left: 2.5em; margin-top: 0.8em">
                <span class="badge-ccf badge-${pub.category}" style="margin-right: 0.5em">${pub.category}</span>
                ${tagsHtml}                
            </div>
        </div>
        `;
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
                <span>${project.venue}</span>
                <br>
                ${membersHtml}
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