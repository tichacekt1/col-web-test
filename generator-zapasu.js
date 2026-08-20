const TWITCH_URL = 'https://www.twitch.tv/col_official';

const teams = [
    { name: 'Abominations', code: 'ABO', logo: 'Abominatios.png' },
    { name: 'Apex Predators', code: 'APX', logo: 'Apex_Predators.png' },
    { name: 'Arcanists', code: 'ARC', logo: 'Arcanists.png' },
    { name: 'Draconics', code: 'DRA', logo: 'Draconics.png' },
    { name: 'Eternals', code: 'ETE', logo: 'Eternals.png' },
    { name: 'Forgottens', code: 'FOR', logo: 'Forgottens.png' },
    { name: 'Hellions', code: 'HEL', logo: 'Hellions.png' },
    { name: 'Imperials', code: 'IMP', logo: 'Imperials.png' },
    { name: 'Lunars', code: 'LUN', logo: 'Lunars.png' },
    { name: 'Mystics', code: 'MYS', logo: 'Mystics.png' },
    { name: 'Protectors', code: 'PRO', logo: 'Protectors.png' },
    { name: 'Redeemed', code: 'RED', logo: 'Redeemed.png' },
    { name: 'Revenants', code: 'REV', logo: 'Revenants.png' },
    { name: 'Solars', code: 'SOL', logo: 'Solars.png' },
    { name: 'Soul Stealers', code: 'SST', logo: 'Soul_Stealers.png' },
    { name: 'Vanguards', code: 'VAN', logo: 'Vanguards.png' }
];

const form = document.querySelector('#matchGeneratorForm');
const team1Select = document.querySelector('#team1');
const team2Select = document.querySelector('#team2');
const preview = document.querySelector('#matchPreview');
const codeOutput = document.querySelector('#generatedCode');
const errorBox = document.querySelector('#generatorError');
const copyButton = document.querySelector('#copyCode');
const copyStatus = document.querySelector('#copyStatus');
const resetButton = document.querySelector('#resetGenerator');
const scoreFields = document.querySelector('#scoreFields');
const pasteTarget = document.querySelector('#pasteTarget');
const pasteHint = document.querySelector('#pasteHint');

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function logoPath(team) {
    return team.logo ? `assets/team-logos/${team.logo}` : '';
}

function teamLogoMarkup(team, decorative = false) {
    if (!team.logo) {
        return `<span class="team-logo-fallback" aria-hidden="true">${escapeHtml(team.code)}</span>`;
    }

    const alt = decorative ? '' : `Logo týmu ${escapeHtml(team.name)}`;
    return `<img src="${logoPath(team)}" alt="${alt}">`;
}

function populateTeams() {
    const options = teams.map((team, index) =>
        `<option value="${index}">${escapeHtml(team.name)}</option>`
    ).join('');

    team1Select.innerHTML = options;
    team2Select.innerHTML = options;
    team1Select.value = '0';
    team2Select.value = '1';
}

function setDefaultDate() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(19, 0, 0, 0);
    const localIso = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    document.querySelector('#startAt').value = localIso;
}

function selectedTeam(select) {
    return teams[Number(select.value)] || teams[0];
}

function formatRecord(wins, losses) {
    return `${Math.max(0, Number(wins) || 0)} VÝHER / ${Math.max(0, Number(losses) || 0)} PROHER`;
}

function formatDate(value) {
    if (!value) return { display: 'DOPLŇ DATUM', dateOnly: 'DOPLŇ DATUM', iso: '' };
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return { display: 'DOPLŇ DATUM', dateOnly: 'DOPLŇ DATUM', iso: '' };

    const datePart = new Intl.DateTimeFormat('cs-CZ', {
        day: 'numeric',
        month: 'numeric'
    }).format(date);
    const timePart = new Intl.DateTimeFormat('cs-CZ', {
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);

    const dateOnly = new Intl.DateTimeFormat('cs-CZ', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric'
    }).format(date);

    return { display: `${datePart} · ${timePart}`, dateOnly, iso: value };
}

function updateTeamChoicePreview(targetId, team) {
    const target = document.querySelector(targetId);
    target.innerHTML = `
        ${teamLogoMarkup(team)}
        <div><strong>${escapeHtml(team.name)}</strong><span>${team.logo ? escapeHtml(team.logo) : 'Logo zatím chybí'}</span></div>
    `;
}

function readValues() {
    return {
        team1: selectedTeam(team1Select),
        team2: selectedTeam(team2Select),
        team1Record: formatRecord(form.team1Wins.value, form.team1Losses.value),
        team2Record: formatRecord(form.team2Wins.value, form.team2Losses.value),
        phase: form.phase.value,
        round: String(Math.max(1, Number(form.round.value) || 1)).padStart(2, '0'),
        date: formatDate(form.startAt.value),
        state: form.matchState.value,
        format: form.format.value,
        broadcast: form.broadcast.checked,
        team1Score: Math.max(0, Number(form.team1Score.value) || 0),
        team2Score: Math.max(0, Number(form.team2Score.value) || 0)
    };
}

function createSnippet(values) {
    const team1Name = escapeHtml(values.team1.name);
    const team2Name = escapeHtml(values.team2.name);
    const broadcastBadge = values.broadcast
        ? `\n                <a class="match-badge match-badge--live" href="${TWITCH_URL}" target="_blank" rel="noopener">Twitch broadcast</a>`
        : '';
    const isFinished = values.state === 'finished';
    const articleClass = isFinished ? 'match-card-new match-card-new--finished' : 'match-card-new';
    const centerContent = isFinished
        ? `<div class="match-meta">${escapeHtml(values.phase)} · KOLO ${values.round} · ${escapeHtml(values.date.dateOnly)}</div>
        <div class="match-score">${values.team1Score} : ${values.team2Score}</div>
        <div class="match-badges">
            <span class="match-badge">DOHRÁNO</span>
            <span class="match-badge">${escapeHtml(values.format)}</span>${broadcastBadge}
        </div>`
        : `<div class="match-meta">${escapeHtml(values.phase)} · KOLO ${values.round}</div>
        <time class="match-time" datetime="${escapeHtml(values.date.iso)}">${escapeHtml(values.date.display)}</time>
        <div class="match-badges">
            <span class="match-badge">${escapeHtml(values.format)}</span>${broadcastBadge}
        </div>`;

    return `<article class="${articleClass}">
    <div class="match-team">
        <div class="team-mark">${teamLogoMarkup(values.team1)}</div>
        <div>
            <div class="match-team__name">${team1Name}</div>
            <div class="match-team__record">${values.team1Record}</div>
        </div>
    </div>
    <div class="match-center">
        ${centerContent}
    </div>
    <div class="match-team match-team--right">
        <div class="team-mark">${teamLogoMarkup(values.team2)}</div>
        <div>
            <div class="match-team__name">${team2Name}</div>
            <div class="match-team__record">${values.team2Record}</div>
        </div>
    </div>
</article>`;
}

function validate(values, showMessage = true) {
    let message = '';
    if (values.team1.name === values.team2.name) {
        message = 'Vyber dva rozdílné týmy.';
    } else if (!form.startAt.value) {
        message = 'Doplň datum a čas zápasu.';
    } else if (values.state === 'finished' && (form.team1Score.value === '' || form.team2Score.value === '')) {
        message = 'Doplň výsledné skóre obou týmů.';
    }

    errorBox.hidden = !message || !showMessage;
    errorBox.textContent = message;
    return !message;
}

function render(showErrors = false) {
    const values = readValues();
    const isFinished = values.state === 'finished';
    scoreFields.hidden = !isFinished;
    pasteTarget.textContent = isFinished ? '#odehrane' : '#nejblizsi';
    pasteHint.textContent = isFinished ? ' mezi ostatní odehrané zápasy' : ' pod komentář „NOVÝ VYGENEROVANÝ ZÁPAS“';
    updateTeamChoicePreview('#team1Preview', values.team1);
    updateTeamChoicePreview('#team2Preview', values.team2);

    if (!validate(values, showErrors)) {
        if (showErrors) return false;
    }

    const snippet = createSnippet(values);
    preview.innerHTML = snippet;
    codeOutput.value = snippet;
    copyStatus.textContent = '';
    copyStatus.classList.remove('is-success');
    return true;
}

async function copyCode() {
    if (!render(true)) return;

    try {
        await navigator.clipboard.writeText(codeOutput.value);
    } catch {
        codeOutput.focus();
        codeOutput.select();
        document.execCommand('copy');
    }

    copyStatus.textContent = 'Kód je zkopírovaný. Teď ho vlož do zapasy.html.';
    copyStatus.classList.add('is-success');
}

form.addEventListener('input', () => render(false));
form.addEventListener('change', () => render(false));
form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!render(true)) return;
    codeOutput.focus();
});

copyButton.addEventListener('click', copyCode);
resetButton.addEventListener('click', () => {
    form.reset();
    team1Select.value = '0';
    team2Select.value = '1';
    setDefaultDate();
    errorBox.hidden = true;
    render(false);
});

populateTeams();
setDefaultDate();
render(false);
