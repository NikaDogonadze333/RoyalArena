// ==========================================
// 1. STATE & DATA (მონაცემთა ბაზა LocalStorage-ში)
// ==========================================
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

let users = JSON.parse(localStorage.getItem('users')) || [];
let tStatus = JSON.parse(localStorage.getItem('tournamentStatus')) || { '1v1 Solo Duel': true, '5v5 Squad': true, '5v5 Random': true };
let lobbies = JSON.parse(localStorage.getItem('lobbies')) || [];
let leaderboard = JSON.parse(localStorage.getItem('leaderboard')) || [];
let notifications = JSON.parse(localStorage.getItem('notifications')) || [];
let currentLobbyId = localStorage.getItem('currentLobbyId') || null;
let tempSquadLogo = null;

// ==========================================
// უნიკალური სახელების (IGN & SQUAD) შემოწმება და რეკომენდაციების გენერატორი
// ==========================================
function isUsernameTaken(name, excludeEmail = '') {
    if (!name) return false;
    const clean = name.trim().toLowerCase();
    if (clean === 'chief admin' || clean === 'admin') return excludeEmail !== 'admin@royal.ge';
    return users.some(u => u.name.trim().toLowerCase() === clean && u.email !== excludeEmail);
}

function isSquadNameTaken(squadName, excludeLeaderEmail = '') {
    if (!squadName) return false;
    const clean = squadName.trim().toLowerCase();
    const inLobbies = lobbies.some(l => l.type === '5v5 Squad' && l.teamName.trim().toLowerCase() === clean && l.leaderEmail !== excludeLeaderEmail);
    const inLb = leaderboard.some(item => item.type === '5v5 Squad' && item.name.trim().toLowerCase() === clean && item.leaderEmail !== excludeLeaderEmail);
    return inLobbies || inLb;
}

// აგენერირებს 4 გარანტირებულად თავისუფალ ვარიანტს
function generateNameSuggestions(baseName, isSquad = false) {
    const cleanBase = baseName.trim().replace(/\s+/g, '_');
    const suffixes = ['_GE', '_PRO', '_77', '_X', '99', '_GG', '_RA', '_KING', '_01', '_VIP'];
    const prefixes = ['RA_', 'Geo_', 'Team_', 'Royal_'];
    const suggestions = [];

    // ვცდილობთ სუფიქსებით და პრეფიქსებით
    const candidates = [
        `${cleanBase}_GE`,
        `RA_${cleanBase}`,
        `${cleanBase}_${Math.floor(Math.random() * 89 + 10)}`,
        `${cleanBase}_PRO`,
        `Royal_${cleanBase}`,
        `${cleanBase}_${Math.floor(Math.random() * 899 + 100)}`
    ];

    for (let cand of candidates) {
        const taken = isSquad ? isSquadNameTaken(cand) : isUsernameTaken(cand);
        if (!taken && !suggestions.includes(cand)) {
            suggestions.push(cand);
        }
        if (suggestions.length >= 4) break;
    }

    // თუ მაინც დააკლდა, ვამატებთ შემთხვევითი რიცხვებით
    while (suggestions.length < 4) {
        const randCand = `${cleanBase}_${Math.floor(Math.random() * 9000 + 1000)}`;
        const taken = isSquad ? isSquadNameTaken(randCand) : isUsernameTaken(randCand);
        if (!taken && !suggestions.includes(randCand)) {
            suggestions.push(randCand);
        }
    }

    return suggestions;
}

// ხატავს რეკომენდაციების ბლოკს კონკრეტული Input-ის ქვემოთ
function renderNameCheckFeedback(inputId, feedbackBoxId, excludeEmail = '', isSquad = false) {
    const inputEl = document.getElementById(inputId);
    if (!inputEl) return true;

    let box = document.getElementById(feedbackBoxId);
    if (!box) {
        box = document.createElement('div');
        box.id = feedbackBoxId;
        box.className = 'mt-2 text-left';
        inputEl.parentNode.appendChild(box);
    }

    const val = inputEl.value.trim();
    if (!val) {
        box.innerHTML = '';
        inputEl.classList.remove('border-red-500', 'border-emerald-500');
        return true;
    }

    const taken = isSquad ? isSquadNameTaken(val, excludeEmail) : isUsernameTaken(val, excludeEmail);

    if (taken) {
        const suggestions = generateNameSuggestions(val, isSquad);
        inputEl.classList.add('border-red-500');
        inputEl.classList.remove('border-emerald-500', 'border-[#232a4d]');

        let chipsHTML = suggestions.map(s => `
            <button type="button" onclick="applySuggestedName('${inputId}', '${feedbackBoxId}', '${s}', '${excludeEmail}', ${isSquad})" 
                class="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600 border border-purple-500/40 text-purple-300 hover:text-white text-[11px] font-mono font-bold transition">
                ${s}
            </button>
        `).join('');

        box.innerHTML = `
            <div class="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <p class="text-[11px] text-red-400 font-bold mb-2">
                    <i class="fa-solid fa-triangle-exclamation mr-1"></i>ეს სახელი უკვე დაკავებულია! აირჩიე თავისუფალი ვარიანტი:
                </p>
                <div class="flex flex-wrap gap-1.5">${chipsHTML}</div>
            </div>
        `;
        return false;
    } else {
        inputEl.classList.remove('border-red-500', 'border-[#232a4d]');
        inputEl.classList.add('border-emerald-500');
        box.innerHTML = `
            <p class="text-[11px] text-emerald-400 font-bold px-1">
                <i class="fa-solid fa-circle-check mr-1"></i>სახელი თავისუფალია!
            </p>
        `;
        return true;
    }
}

window.applySuggestedName = function (inputId, feedbackBoxId, suggestedName, excludeEmail = '', isSquad = false) {
    const inputEl = document.getElementById(inputId);
    if (!inputEl) return;
    inputEl.value = suggestedName;
    renderNameCheckFeedback(inputId, feedbackBoxId, excludeEmail, isSquad);
};

// ფოტოს ავტომატური დაპატარავება/შეკუმშვა
function processImageFile(file, callback) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            const maxDim = 250;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxDim) { height *= maxDim / width; width = maxDim; }
            } else {
                if (height > maxDim) { width *= maxDim / height; height = maxDim; }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            callback(compressedDataUrl);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// პოულობს მოთამაშის ან გუნდის ყველაზე განახლებულ ფოტოს ყველა ბაზიდან
function resolveLatestImage(type, name, email, fallbackImage) {
    if (type !== '5v5 Squad') {
        if (currentUser && ((email && currentUser.email === email) || (name && currentUser.name.toLowerCase() === name.toLowerCase()))) {
            if (currentUser.avatar) return currentUser.avatar;
        }
        const foundUser = users.find(u => (email && u.email === email) || (!email && name && u.name.toLowerCase() === name.toLowerCase()));
        if (foundUser && foundUser.avatar) return foundUser.avatar;
    } else {
        const foundLobby = lobbies.find(l => l.type === '5v5 Squad' && l.teamName.toLowerCase() === (name || '').toLowerCase());
        if (foundLobby && foundLobby.image) return foundLobby.image;
    }
    return fallbackImage || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || 'Player')}`;
}

function saveLobbies() {
    localStorage.setItem('lobbies', JSON.stringify(lobbies));
    updateAdminTable();
    renderDynamicContent();
    updateLobbyIndicator();
    if (currentUser) updateProfileStatsUI();
}

function saveLeaderboard() {
    localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
    updateAdminTable();
    renderDynamicContent();
    if (currentUser) updateProfileStatsUI();
}

// ==========================================
// 2. UI NAVIGATION & ANIMATIONS (PC + MOBILE)
// ==========================================
window.toggleElement = function (id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden');
};

window.switchTab = function (tabId) {
    document.querySelectorAll('.spa-page').forEach(page => { page.classList.add('hidden'); page.classList.remove('fade-in'); });
    const selectedPage = document.getElementById('page-' + tabId);
    if (selectedPage) {
        selectedPage.classList.remove('hidden');
        void selectedPage.offsetWidth;
        selectedPage.classList.add('fade-in');
    }

    document.querySelectorAll('.nav-btn').forEach(btn => { btn.classList.remove('bg-[#3a256a]', 'border-[#553b94]', 'text-white'); btn.classList.add('text-gray-400', 'border-transparent'); });
    const activeBtn = document.getElementById('nav-' + tabId);
    if (activeBtn) { activeBtn.classList.remove('text-gray-400', 'border-transparent'); activeBtn.classList.add('bg-[#3a256a]', 'border-[#553b94]', 'text-white'); }

    document.querySelectorAll('.mnav-btn').forEach(btn => btn.classList.remove('mobile-nav-active'));
    const activeMobileBtn = document.getElementById('mnav-' + tabId);
    if (activeMobileBtn) activeMobileBtn.classList.add('mobile-nav-active');

    if (tabId === 'profile' && currentUser) {
        document.getElementById('profilePageName').textContent = currentUser.name;
        document.getElementById('profilePageAvatar').src = currentUser.avatar;
        const setInput = document.getElementById('settingName');
        if (setInput) {
            setInput.value = currentUser.name;
            setInput.classList.remove('border-red-500', 'border-emerald-500');
            const box = document.getElementById('settingNameFeedback');
            if (box) box.innerHTML = '';
        }
        updateProfileStatsUI();
    }

    if (tabId === 'lobby') {
        renderLobbyPage();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

function updateProfileStatsUI() {
    if (!currentUser) return;
    let totalWins = 0;
    let totalLosses = 0;
    let totalPts = 0;

    leaderboard.forEach(item => {
        const isMe = (item.leaderEmail && item.leaderEmail === currentUser.email) ||
            (!item.leaderEmail && item.name && item.name.toLowerCase() === currentUser.name.toLowerCase()) ||
            (item.members && item.members.includes(currentUser.email));
        if (isMe) {
            totalWins += (item.wins || 0);
            totalLosses += (item.losses || 0);
            totalPts += (item.pts || 0);
        }
    });

    const totalMatches = totalWins + totalLosses;
    const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

    const wrEl = document.getElementById('profileWinRate');
    const mEl = document.getElementById('profileMatches');
    const ptsEl = document.getElementById('profilePts');

    if (wrEl) wrEl.textContent = `${winRate}%`;
    if (mEl) mEl.textContent = `${totalMatches} (${totalWins}W/${totalLosses}L)`;
    if (ptsEl) ptsEl.textContent = totalPts;
}

function updateLobbyIndicator() {
    const dot = document.getElementById('activeLobbyDot');
    const mobileDot = document.getElementById('mobileLobbyDot');
    const hasLobby = Boolean(currentLobbyId && lobbies.find(l => l.id === currentLobbyId));

    if (dot) dot.classList.toggle('hidden', !hasLobby);
    if (mobileDot) mobileDot.classList.toggle('hidden', !hasLobby);
}

// ==========================================
// 3. TOURNAMENT UI & ADMIN SETTINGS
// ==========================================
function updateTournamentUI() {
    for (let type in tStatus) {
        let statusEl = document.getElementById('status-' + type);
        let btnEl = document.getElementById('btn-' + type);
        let adminBtnEl = document.getElementById(type === '1v1 Solo Duel' ? 'adminToggle-1v1' : type === '5v5 Squad' ? 'adminToggle-squad' : 'adminToggle-random');
        let isOpen = tStatus[type];

        if (statusEl) {
            statusEl.textContent = isOpen ? 'ღიაა' : 'დახურული';
            statusEl.className = isOpen ? 'font-bold text-emerald-400 text-xs bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20' : 'font-bold text-red-500 text-xs bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20';
        }
        if (btnEl) {
            btnEl.disabled = !isOpen;
            if (isOpen) { btnEl.classList.remove('opacity-50', 'cursor-not-allowed', 'grayscale'); }
            else { btnEl.classList.add('opacity-50', 'cursor-not-allowed', 'grayscale'); btnEl.textContent = 'ჩაკეტილია'; }
        }
        if (adminBtnEl) {
            adminBtnEl.textContent = isOpen ? 'დახურვა' : 'გახსნა';
            adminBtnEl.className = isOpen ? 'px-3 py-1 rounded text-xs font-bold bg-red-500/20 text-red-400' : 'px-3 py-1 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400';
        }
    }
}

window.toggleRegistration = function (type) {
    tStatus[type] = !tStatus[type];
    localStorage.setItem('tournamentStatus', JSON.stringify(tStatus));
    updateTournamentUI();
    showToast(`სტატუსი შეიცვალა!`, 'info');
};

window.uploadSquadLogo = function (event) {
    if (event.target.files[0]) {
        processImageFile(event.target.files[0], function (compressedDataUrl) {
            tempSquadLogo = compressedDataUrl;
            showToast('სქუადის ლოგო აიტვირთა!', 'success');
            const icon = document.getElementById('squadLogoIcon');
            if (icon) icon.className = 'fa-solid fa-circle-check text-emerald-400 text-xl mr-2';
        });
    }
};

// ==========================================
// 4. REGISTRATION -> CREATING / JOINING A LOBBY (LOCKED UNIQUE IGN)
// ==========================================
window.startRegistration = function (type) {
    if (!currentUser) { showToast('გთხოვთ, გაიაროთ ავტორიზაცია', 'error'); toggleElement('loginModal'); return; }
    if (!tStatus[type]) { showToast('ეს ტურნირი ამჟამად ჩაკეტილია', 'error'); return; }

    tempSquadLogo = null;
    const container = document.getElementById('registerContainer');
    let formHTML = `<div class="text-center mb-6 sm:mb-8"><h3 class="font-orbitron font-black text-2xl sm:text-3xl text-white">${type}</h3><p class="text-xs text-gray-400 mt-2">თქვენ რეგისტრირდებით თქვენი უნიკალური პროფილის სახელით</p></div>`;

    if (type === '1v1 Solo Duel') {
        formHTML += `
        <form onsubmit="createOrJoin1v1Lobby(event)" class="flex flex-col gap-4">
            <div>
                <label class="block text-xs font-bold text-gray-400 uppercase mb-1">შენი უნიკალური IGN <i class="fa-solid fa-lock text-amber-400 ml-1"></i></label>
                <input type="text" id="reg1v1Ign" value="${currentUser.name}" readonly class="w-full bg-[#121629]/60 border border-[#232a4d] rounded-xl px-4 py-3 text-sm text-gray-300 cursor-not-allowed">
            </div>
            <div><label class="block text-xs font-bold text-gray-400 uppercase mb-1">Game ID (Server)</label>
            <input type="text" id="reg1v1GameId" required class="w-full bg-[#121629] border border-[#232a4d] rounded-xl px-4 py-3 text-sm text-white" placeholder="მაგ: 12345678 (1234)"></div>
            <div><label class="block text-xs font-bold text-gray-400 uppercase mb-1">აირჩიე 1v1 კატეგორია</label>
            <select id="reg1v1Category" class="w-full bg-[#121629] border border-[#232a4d] rounded-xl px-4 py-3 text-sm text-white">
                <option value="Fighter vs Fighter">Fighter vs Fighter</option>
                <option value="Assassin vs Assassin">Assassin vs Assassin</option>
                <option value="Mage vs Mage">Mage vs Mage</option>
                <option value="Marksman vs Marksman">Marksman vs Marksman</option>
                <option value="Any (თავისუფალი)">Any (თავისუფალი)</option>
            </select></div>
            <button type="submit" class="gold-btn py-4 rounded-xl font-bold text-xs sm:text-sm uppercase mt-2"><i class="fa-solid fa-couch mr-2"></i> 1v1 ლობიში დაჯდომა</button>
        </form>`;
    } else if (type === '5v5 Squad') {
        formHTML += `
        <div class="flex gap-2 p-1 bg-[#121629] rounded-xl mb-6 border border-[#232a4d]">
            <button type="button" id="btnSquadCreateTab" onclick="switchSquadRegMode('create')" class="flex-1 py-2.5 bg-purple-600 rounded-lg text-white text-[11px] sm:text-xs font-bold transition">ახალი ლობი (ლიდერი)</button>
            <button type="button" id="btnSquadJoinTab" onclick="switchSquadRegMode('join')" class="flex-1 py-2.5 text-gray-400 text-[11px] sm:text-xs font-bold hover:text-white transition">Lobby ID-ით შესვლა</button>
        </div>

        <form id="formSquadCreate" onsubmit="createSquadLobby(event)" class="flex flex-col gap-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">Squad Name (უნიკალური სახელი)</label>
                    <input type="text" id="squadNameInput" oninput="renderNameCheckFeedback('squadNameInput', 'squadNameFeedback', '${currentUser.email}', true)" required placeholder="მაგ: Royal Knights" class="w-full bg-[#121629] border border-[#232a4d] rounded-xl px-4 py-3 text-sm text-white outline-none">
                    <div id="squadNameFeedback"></div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">სქუადის ლოგო (არასავალდებულო)</label>
                    <div class="relative w-full bg-[#121629] border border-[#232a4d] border-dashed hover:border-purple-500 rounded-xl px-4 py-3 text-sm text-center text-gray-400 transition cursor-pointer flex items-center justify-center">
                        <i id="squadLogoIcon" class="fa-solid fa-upload mr-2"></i> <span>ლოგოს ატვირთვა</span>
                        <input type="file" accept="image/*" onchange="uploadSquadLogo(event)" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">ლიდერის IGN <i class="fa-solid fa-lock text-amber-400 ml-1"></i></label>
                    <input type="text" id="squadLeaderIgn" value="${currentUser.name}" readonly class="w-full bg-[#121629]/60 border border-[#232a4d] rounded-xl px-4 py-3 text-sm text-gray-300 cursor-not-allowed">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">ლიდერის Game ID</label>
                    <input type="text" id="squadLeaderGameId" required placeholder="12345678 (1234)" class="w-full bg-[#121629] border border-[#232a4d] rounded-xl px-4 py-3 text-sm text-white">
                </div>
            </div>
            <button type="submit" class="w-full bg-purple-600 hover:bg-purple-700 py-4 rounded-xl font-bold text-xs sm:text-sm text-white uppercase mt-2 shadow-[0_0_20px_rgba(147,51,234,0.4)]"><i class="fa-solid fa-plus mr-2"></i> სქუადის ლობის გახსნა</button>
        </form>

        <form id="formSquadJoin" onsubmit="joinLobbyByIdForm(event)" class="hidden flex flex-col gap-4">
            <div>
                <label class="block text-xs font-bold text-gray-400 uppercase mb-1">შეიყვანე Lobby ID</label>
                <input type="text" id="joinLobbyIdInput" required placeholder="მაგ: RA-4829" class="w-full bg-[#121629] border border-purple-500/50 rounded-xl px-4 py-3 text-sm text-white font-mono uppercase">
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">შენი IGN <i class="fa-solid fa-lock text-amber-400 ml-1"></i></label>
                    <input type="text" id="joinPlayerIgn" value="${currentUser.name}" readonly class="w-full bg-[#121629]/60 border border-[#232a4d] rounded-xl px-4 py-3 text-sm text-gray-300 cursor-not-allowed">
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-400 uppercase mb-1">შენი Game ID</label>
                    <input type="text" id="joinPlayerGameId" required placeholder="12345678 (1234)" class="w-full bg-[#121629] border border-[#232a4d] rounded-xl px-4 py-3 text-sm text-white">
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-400 uppercase mb-1">აირჩიე სლოტი</label>
                <select id="joinSlotType" class="w-full bg-[#121629] border border-[#232a4d] rounded-xl px-4 py-3 text-sm text-white">
                    <option value="main">ძირითადი შემადგენლობა (Main Roster - 5 კაცი)</option>
                    <option value="reserve">რეზერვი (Sub / Reserve - 2 კაცი)</option>
                </select>
            </div>
            <button type="submit" class="w-full gold-btn py-4 rounded-xl font-bold text-xs sm:text-sm uppercase mt-2"><i class="fa-solid fa-right-to-bracket mr-2"></i> ლობიში დაჯდომა</button>
        </form>`;
    } else {
        formHTML += `
        <form onsubmit="createOrJoinRandomLobby(event)" class="flex flex-col gap-4">
            <div><label class="block text-xs font-bold text-gray-400 uppercase mb-1">შენი უნიკალური IGN <i class="fa-solid fa-lock text-amber-400 ml-1"></i></label>
            <input type="text" id="regRandIgn" value="${currentUser.name}" readonly class="w-full bg-[#121629]/60 border border-[#232a4d] rounded-xl px-4 py-3 text-sm text-gray-300 cursor-not-allowed"></div>
            <div><label class="block text-xs font-bold text-gray-400 uppercase mb-1">Game ID</label>
            <input type="text" id="regRandGameId" required class="w-full bg-[#121629] border border-[#232a4d] rounded-xl px-4 py-3 text-sm text-white" placeholder="12345678 (1234)"></div>
            <div><label class="block text-xs font-bold text-gray-400 uppercase mb-1">აირჩიე შენი სლოტი (როლი)</label>
            <select id="regRandRole" class="w-full bg-[#121629] border border-[#232a4d] rounded-xl px-4 py-3 text-sm text-white">
                <option value="EXP Laner">EXP Laner</option>
                <option value="Jungler">Jungler</option>
                <option value="Mid Laner">Mid Laner</option>
                <option value="Gold Laner">Gold Laner</option>
                <option value="Roamer">Roamer</option>
            </select></div>
            <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 py-4 rounded-xl font-bold text-xs sm:text-sm text-white uppercase mt-2"><i class="fa-solid fa-couch mr-2"></i> Random ლობიში დაჯდომა</button>
        </form>`;
    }

    container.innerHTML = formHTML;
    switchTab('register');
};

window.switchSquadRegMode = function (mode) {
    const createForm = document.getElementById('formSquadCreate');
    const joinForm = document.getElementById('formSquadJoin');
    const btnCreate = document.getElementById('btnSquadCreateTab');
    const btnJoin = document.getElementById('btnSquadJoinTab');

    if (mode === 'create') {
        createForm.classList.remove('hidden');
        joinForm.classList.add('hidden');
        btnCreate.className = 'flex-1 py-2.5 bg-purple-600 rounded-lg text-white text-[11px] sm:text-xs font-bold transition';
        btnJoin.className = 'flex-1 py-2.5 text-gray-400 text-[11px] sm:text-xs font-bold hover:text-white transition';
    } else {
        createForm.classList.add('hidden');
        joinForm.classList.remove('hidden');
        btnJoin.className = 'flex-1 py-2.5 bg-purple-600 rounded-lg text-white text-[11px] sm:text-xs font-bold transition';
        btnCreate.className = 'flex-1 py-2.5 text-gray-400 text-[11px] sm:text-xs font-bold hover:text-white transition';
    }
};

function findUserSeatInLobby(lobby, userEmail) {
    if (!lobby || !userEmail) return null;
    for (let i = 0; i < lobby.mainSlots.length; i++) {
        if (lobby.mainSlots[i] && lobby.mainSlots[i].email === userEmail) {
            return { group: 'main', index: i, data: lobby.mainSlots[i] };
        }
    }
    if (lobby.reserveSlots) {
        for (let i = 0; i < lobby.reserveSlots.length; i++) {
            if (lobby.reserveSlots[i] && lobby.reserveSlots[i].email === userEmail) {
                return { group: 'reserve', index: i, data: lobby.reserveSlots[i] };
            }
        }
    }
    return null;
}

window.createSquadLobby = function (e) {
    e.preventDefault();
    const squadName = document.getElementById('squadNameInput').value.trim();
    const ign = currentUser.name;
    const gameId = document.getElementById('squadLeaderGameId').value.trim();

    // ვამოწმებთ დაკავებული ხომ არ არის სქუადის სახელი სხვა ლიდერის მიერ
    if (isSquadNameTaken(squadName, currentUser.email)) {
        renderNameCheckFeedback('squadNameInput', 'squadNameFeedback', currentUser.email, true);
        showToast('ეს გუნდის სახელი უკვე დაკავებულია! აირჩიე შემოთავაზებული ვარიანტი.', 'error');
        return;
    }

    const lobbyId = 'RA-' + (Math.floor(Math.random() * 9000) + 1000);
    const logo = tempSquadLogo ? tempSquadLogo : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(squadName)}`;

    currentUser.gameId = gameId;

    const newLobby = {
        id: lobbyId,
        type: '5v5 Squad',
        teamName: squadName,
        category: '5v5 Squad Championship',
        image: logo,
        leaderEmail: currentUser.email,
        leaderName: ign,
        mainSlots: [
            { email: currentUser.email, player: ign, gameId: gameId, avatar: currentUser.avatar, role: 'Captain / Slot 1', ready: true, isLeader: true },
            null, null, null, null
        ],
        reserveSlots: [null, null]
    };

    lobbies.push(newLobby);
    getOrCreateLeaderboardEntry('5v5 Squad', squadName, '5v5 Squad', logo, currentUser.email, [currentUser.email]);

    currentLobbyId = lobbyId;
    localStorage.setItem('currentLobbyId', currentLobbyId);
    tempSquadLogo = null;
    saveLeaderboard();
    saveLobbies();

    showToast(`ლობი ${lobbyId} შეიქმნა და ლოგო შენახულია!`, 'success');
    switchTab('lobby');
};

window.joinLobbyByIdForm = function (e) {
    e.preventDefault();
    const targetId = document.getElementById('joinLobbyIdInput').value.trim().toUpperCase();
    const ign = currentUser.name;
    const gameId = document.getElementById('joinPlayerGameId').value.trim();
    const slotType = document.getElementById('joinSlotType').value;

    currentUser.gameId = gameId;
    joinExistingLobby(targetId, ign, gameId, slotType);
};

window.joinExistingLobby = function (targetId, ign, gameId, slotType = 'main') {
    const lobby = lobbies.find(l => l.id.toUpperCase() === targetId.toUpperCase());
    if (!lobby) {
        showToast('ამ ID-ით ლობი ვერ მოიძებნა!', 'error');
        return;
    }

    const existingSeat = findUserSeatInLobby(lobby, currentUser.email);
    if (existingSeat) {
        currentLobbyId = lobby.id;
        localStorage.setItem('currentLobbyId', currentLobbyId);
        showToast('თქვენ უკვე ზიხართ ამ ლობიში!', 'info');
        switchTab('lobby');
        return;
    }

    if (lobby.type === '5v5 Squad') {
        const slotsArray = slotType === 'reserve' ? lobby.reserveSlots : lobby.mainSlots;
        const emptyIndex = slotsArray.findIndex(s => s === null);
        if (emptyIndex === -1) {
            showToast('არჩეულ სექციაში ყველა ადგილი დაკავებულია!', 'error');
            return;
        }
        slotsArray[emptyIndex] = {
            email: currentUser.email,
            player: ign,
            gameId: gameId,
            avatar: currentUser.avatar,
            role: slotType === 'reserve' ? `Reserve #${emptyIndex + 1}` : `Slot #${emptyIndex + 1}`,
            ready: true,
            isLeader: false
        };
        getOrCreateLeaderboardEntry('5v5 Squad', lobby.teamName, '5v5 Squad', lobby.image, lobby.leaderEmail, [currentUser.email]);
    } else {
        const emptyIndex = lobby.mainSlots.findIndex(s => s === null);
        if (emptyIndex === -1) {
            showToast('ეს ლობი უკვე სავსეა!', 'error');
            return;
        }
        lobby.mainSlots[emptyIndex] = {
            email: currentUser.email,
            player: ign,
            gameId: gameId,
            avatar: currentUser.avatar,
            role: lobby.category,
            ready: true,
            isLeader: false
        };
        getOrCreateLeaderboardEntry(lobby.type, ign, lobby.category, currentUser.avatar, currentUser.email, [currentUser.email]);
    }

    currentLobbyId = lobby.id;
    localStorage.setItem('currentLobbyId', currentLobbyId);
    saveLeaderboard();
    saveLobbies();
    showToast(`წარმატებით დაჯექით ლობიში (${lobby.id})!`, 'success');
    switchTab('lobby');
};

window.createOrJoin1v1Lobby = function (e) {
    e.preventDefault();
    const ign = currentUser.name;
    const gameId = document.getElementById('reg1v1GameId').value.trim();
    const category = document.getElementById('reg1v1Category').value;

    currentUser.gameId = gameId;

    let openLobby = lobbies.find(l =>
        l.type === '1v1 Solo Duel' &&
        l.category === category &&
        l.mainSlots[1] === null &&
        l.leaderEmail !== currentUser.email
    );

    if (openLobby) {
        openLobby.mainSlots[1] = { email: currentUser.email, player: ign, gameId: gameId, avatar: currentUser.avatar, role: category, ready: true, isLeader: false };
        currentLobbyId = openLobby.id;
        showToast('მეტოქე ნაპოვნია! თქვენ დაჯექით მე-2 სლოტში.', 'success');
    } else {
        const lobbyId = '1V1-' + (Math.floor(Math.random() * 900) + 100);
        const newLobby = {
            id: lobbyId,
            type: '1v1 Solo Duel',
            teamName: ign,
            category: category,
            image: currentUser.avatar,
            leaderEmail: currentUser.email,
            leaderName: ign,
            mainSlots: [
                { email: currentUser.email, player: ign, gameId: gameId, avatar: currentUser.avatar, role: category, ready: true, isLeader: true },
                null
            ],
            reserveSlots: []
        };
        lobbies.push(newLobby);
        currentLobbyId = lobbyId;
        showToast(`1v1 ლობი (${lobbyId}) შეიქმნა! დაელოდეთ მეტოქეს.`, 'success');
    }

    getOrCreateLeaderboardEntry('1v1 Solo Duel', ign, category, currentUser.avatar, currentUser.email, [currentUser.email]);

    localStorage.setItem('currentLobbyId', currentLobbyId);
    saveLeaderboard();
    saveLobbies();
    switchTab('lobby');
};

window.createOrJoinRandomLobby = function (e) {
    e.preventDefault();
    const ign = currentUser.name;
    const gameId = document.getElementById('regRandGameId').value.trim();
    const role = document.getElementById('regRandRole').value;
    const roleOrder = ['EXP Laner', 'Jungler', 'Mid Laner', 'Gold Laner', 'Roamer'];
    const roleIdx = roleOrder.indexOf(role);

    currentUser.gameId = gameId;

    let openRandom = lobbies.find(l =>
        l.type === '5v5 Random' &&
        l.mainSlots[roleIdx] === null &&
        !findUserSeatInLobby(l, currentUser.email)
    );

    if (!openRandom) {
        const lobbyId = 'MIX-' + (Math.floor(Math.random() * 900) + 100);
        openRandom = {
            id: lobbyId,
            type: '5v5 Random',
            teamName: 'Mix Room ' + lobbyId,
            category: role,
            image: currentUser.avatar,
            leaderEmail: currentUser.email,
            leaderName: ign,
            mainSlots: [null, null, null, null, null],
            reserveSlots: []
        };
        lobbies.push(openRandom);
    }

    openRandom.mainSlots[roleIdx] = { email: currentUser.email, player: ign, gameId: gameId, avatar: currentUser.avatar, role: role, ready: true, isLeader: false };
    getOrCreateLeaderboardEntry('5v5 Random', ign, role, currentUser.avatar, currentUser.email, [currentUser.email]);

    currentLobbyId = openRandom.id;
    localStorage.setItem('currentLobbyId', currentLobbyId);
    saveLeaderboard();
    saveLobbies();

    showToast(`დაჯექით Random ლობიში (${role})!`, 'success');
    switchTab('lobby');
};

// ==========================================
// 5. INTERACTIVE LOBBY ROOM RENDERING
// ==========================================
window.renderLobbyPage = function () {
    const container = document.getElementById('lobbyViewContainer');
    if (!container) return;

    const activeLobby = lobbies.find(l => l.id === currentLobbyId);

    if (!activeLobby) {
        let openLobbiesHTML = '';
        if (lobbies.length === 0) {
            openLobbiesHTML = `<p class="text-gray-500 text-xs sm:text-sm text-center py-6">ამჟამად აქტიური ლობები არ არის. შექმენი პირველი ლობი!</p>`;
        } else {
            lobbies.forEach(l => {
                const seatedCount = l.mainSlots.filter(s => s !== null).length;
                const maxCount = l.mainSlots.length;
                openLobbiesHTML += `
                <div class="bg-[#121629] border border-[#232a4d] p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 hover:border-purple-500/50 transition">
                    <div class="flex items-center gap-3 min-w-0">
                        <img src="${l.image}" class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover bg-black border border-[#232a4d] shrink-0">
                        <div class="min-w-0">
                            <p class="text-white font-bold text-xs sm:text-sm truncate">${l.teamName} <span class="text-[11px] text-purple-400 font-mono ml-1">#${l.id}</span></p>
                            <p class="text-[10px] sm:text-[11px] text-gray-400">${l.type} • დაკავებულია: <span class="text-emerald-400 font-bold">${seatedCount}/${maxCount}</span></p>
                        </div>
                    </div>
                    <button onclick="openLobbyRoom('${l.id}')" class="shrink-0 px-3 sm:px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 hover:bg-purple-600 hover:text-white text-[11px] sm:text-xs font-bold transition">შესვლა</button>
                </div>`;
            });
        }

        container.innerHTML = `
            <div class="max-w-3xl mx-auto">
                <div class="glass-panel p-6 sm:p-8 rounded-3xl mb-6 sm:mb-8 text-center">
                    <i class="fa-solid fa-couch text-4xl sm:text-5xl text-purple-400 mb-4"></i>
                    <h2 class="font-orbitron font-extrabold text-2xl sm:text-3xl text-white mb-2">ტურნირის ლობი</h2>
                    <p class="text-xs sm:text-sm text-gray-400 mb-6">შეიყვანე მეგობრის Lobby ID რომ დაჯდე მის სქუადში, ან შექმენი ახალი ლობი ტურნირების გვერდიდან.</p>
                    <div class="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                        <input type="text" id="quickJoinId" placeholder="Lobby ID (მაგ: RA-4829)" class="flex-1 bg-[#121629] border border-[#232a4d] rounded-xl px-4 py-3 text-sm text-white font-mono uppercase outline-none focus:border-purple-500">
                        <button onclick="quickJoinById()" class="gold-btn px-6 py-3 rounded-xl text-xs font-bold uppercase">ID-ით შესვლა</button>
                    </div>
                </div>
                <div class="glass-panel p-5 sm:p-6 rounded-3xl">
                    <h3 class="font-orbitron font-bold text-base sm:text-lg text-white mb-4">მიმდინარე ღია ლობები</h3>
                    <div class="flex flex-col gap-3">${openLobbiesHTML}</div>
                </div>
            </div>`;
        return;
    }

    const isLeader = currentUser && (currentUser.email === activeLobby.leaderEmail || currentUser.isAdmin);
    const seatedMain = activeLobby.mainSlots.filter(s => s !== null).length;
    const totalMain = activeLobby.mainSlots.length;

    let seatsHTML = '';

    if (activeLobby.type === '1v1 Solo Duel') {
        const p1 = activeLobby.mainSlots[0];
        const p2 = activeLobby.mainSlots[1];
        seatsHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 items-center my-6 sm:my-8">
                ${renderSeatCard(activeLobby, 'main', 0, p1, isLeader, 'Fighter 1')}
                <div class="text-center py-2 sm:py-4">
                    <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center mx-auto mb-2 font-orbitron font-black text-xl sm:text-2xl text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.3)]">VS</div>
                    <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">${activeLobby.category}</p>
                </div>
                ${renderSeatCard(activeLobby, 'main', 1, p2, isLeader, 'Challenger 2')}
            </div>`;
    } else {
        const roleLabels = activeLobby.type === '5v5 Random'
            ? ['EXP Laner', 'Jungler', 'Mid Laner', 'Gold Laner', 'Roamer']
            : ['Slot 1 (Captain)', 'Slot 2 (Main)', 'Slot 3 (Main)', 'Slot 4 (Main)', 'Slot 5 (Main)'];

        let mainCards = '';
        activeLobby.mainSlots.forEach((slot, idx) => {
            mainCards += renderSeatCard(activeLobby, 'main', idx, slot, isLeader, roleLabels[idx]);
        });

        let reserveSection = '';
        if (activeLobby.type === '5v5 Squad') {
            let resCards = '';
            activeLobby.reserveSlots.forEach((slot, idx) => {
                resCards += renderSeatCard(activeLobby, 'reserve', idx, slot, isLeader, `რეზერვი / Sub #${idx + 1}`);
            });
            reserveSection = `
                <div class="mt-8 pt-6 border-t border-[#232a4d]">
                    <h4 class="font-orbitron font-bold text-xs sm:text-sm text-gray-400 uppercase tracking-wider mb-4"><i class="fa-solid fa-user-plus mr-2 text-purple-400"></i>სარეზერვო მოთამაშეები (+2 რეზერვი)</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">${resCards}</div>
                </div>`;
        }

        seatsHTML = `
            <div class="mt-6">
                <h4 class="font-orbitron font-bold text-xs sm:text-sm text-amber-400 uppercase tracking-wider mb-4"><i class="fa-solid fa-chair mr-2"></i>ძირითადი შემადგენლობა (${seatedMain}/${totalMain})</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">${mainCards}</div>
                ${reserveSection}
            </div>`;
    }

    container.innerHTML = `
        <div class="glass-panel p-5 sm:p-8 rounded-3xl shadow-2xl">
            <div class="flex flex-col lg:flex-row items-center justify-between gap-5 pb-6 border-b border-[#232a4d]">
                <div class="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                    <div class="relative group">
                        <img src="${activeLobby.image}" class="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-black border-2 border-purple-500 shadow-lg">
                        ${isLeader && activeLobby.type === '5v5 Squad' ? `
                        <label class="absolute inset-0 bg-black/70 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition">
                            <i class="fa-solid fa-camera text-white text-sm"></i>
                            <span class="text-[8px] text-white uppercase font-bold mt-1">ლოგო</span>
                            <input type="file" accept="image/*" onchange="changeLobbyLogo(event, '${activeLobby.id}')" class="hidden">
                        </label>` : ''}
                    </div>
                    <div>
                        <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                            <span class="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">${activeLobby.type}</span>
                            <span class="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ლობი აქტიურია</span>
                        </div>
                        <h2 class="font-orbitron font-black text-xl sm:text-3xl text-white">${activeLobby.teamName}</h2>
                        <p class="text-xs text-gray-400 mt-1">ლიდერი: <span class="text-white font-bold">${activeLobby.leaderName}</span></p>
                    </div>
                </div>

                <div class="flex flex-wrap items-center justify-center gap-2 sm:gap-3 bg-[#121629] p-3 rounded-2xl border border-[#232a4d] w-full lg:w-auto">
                    <div class="px-2 sm:px-3">
                        <p class="text-[9px] text-gray-400 uppercase font-bold">Lobby ID</p>
                        <p class="font-mono font-bold text-base sm:text-lg text-amber-400 tracking-wider">${activeLobby.id}</p>
                    </div>
                    <button onclick="copyLobbyText('${activeLobby.id}', 'Lobby ID დაკოპირდა!')" class="bg-[#1b223d] hover:bg-purple-600 text-white px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
                        <i class="fa-regular fa-copy"></i> ID
                    </button>
                    <button onclick="copyLobbyText(window.location.origin + window.location.pathname + '?lobby=${activeLobby.id}', 'მოსაწვევი ლინკი დაკოპირდა!')" class="bg-purple-600/20 border border-purple-500/40 hover:bg-purple-600 text-purple-200 hover:text-white px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
                        <i class="fa-solid fa-link"></i> ლინკი
                    </button>
                </div>
            </div>

            ${seatsHTML}

            <div class="mt-8 pt-6 border-t border-[#232a4d] flex flex-col sm:flex-row items-center justify-between gap-3">
                <button onclick="leaveCurrentLobby()" class="w-full sm:w-auto px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white text-xs font-bold transition">
                    <i class="fa-solid fa-person-walking-arrow-right mr-1.5"></i> სხვა ლობიების ნახვა / გასვლა
                </button>
                <button onclick="toggleMyReadyStatus()" class="w-full sm:w-auto gold-btn px-6 py-3 rounded-xl text-xs font-bold uppercase">
                    <i class="fa-solid fa-check-double mr-1.5"></i> მზადყოფნის შეცვლა (Ready)
                </button>
            </div>
        </div>
    `;
};

function renderSeatCard(lobby, slotGroup, index, slotData, isLeader, label) {
    const userSeat = currentUser ? findUserSeatInLobby(lobby, currentUser.email) : null;
    const isAdmin = currentUser && currentUser.isAdmin;

    if (slotData) {
        const isMe = currentUser && (slotData.email === currentUser.email || slotData.player === currentUser.name);
        const canRemove = isAdmin || (lobby.type === '5v5 Squad' && isLeader && !slotData.isLeader);
        const avatarSrc = resolveLatestImage('player', slotData.player, slotData.email, slotData.avatar);

        return `
        <div class="bg-[#121629] border ${isMe ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : slotData.ready ? 'border-emerald-500/50' : 'border-[#232a4d]'} rounded-2xl p-4 flex flex-col items-center text-center relative group transition hover:-translate-y-1">
            <span class="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-2">${label}</span>
            <div class="relative mb-3">
                <img src="${avatarSrc}" class="w-16 h-16 rounded-2xl object-cover bg-black border border-purple-500/40">
                ${slotData.isLeader ? '<span class="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center text-xs shadow"><i class="fa-solid fa-crown"></i></span>' : ''}
            </div>
            <p class="font-bold text-white text-sm truncate w-full">${slotData.player} ${isMe ? '<span class="text-[10px] text-purple-400">(შენ)</span>' : ''}</p>
            <p class="text-[10px] text-gray-400 mb-3">ID: ${slotData.gameId}</p>
            <span class="mt-auto text-[10px] font-bold px-3 py-1 rounded-full ${slotData.ready ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}">
                ${slotData.ready ? '<i class="fa-solid fa-check mr-1"></i>მზადაა' : 'ელოდება...'}
            </span>
            ${canRemove ? `
            <button onclick="removePlayerFromSlot('${lobby.id}', '${slotGroup}', ${index})" class="absolute top-2 right-2 w-6 h-6 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white text-xs flex items-center justify-center transition">
                <i class="fa-solid fa-xmark"></i>
            </button>` : ''}
        </div>`;
    }

    if (lobby.type === '1v1 Solo Duel' && userSeat) {
        return `
        <div class="bg-[#121629]/30 border-2 border-dashed border-[#232a4d] rounded-2xl p-4 flex flex-col items-center justify-center text-center min-h-[180px] opacity-75 cursor-not-allowed">
            <span class="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-2">${label}</span>
            <div class="w-12 h-12 rounded-2xl bg-[#121629] border border-[#232a4d] flex items-center justify-center text-amber-400/70 mb-2">
                <i class="fa-solid fa-hourglass-half animate-spin"></i>
            </div>
            <p class="text-xs font-bold text-gray-400">ელოდება მეტოქეს...</p>
            <p class="text-[10px] text-gray-500 mt-1">მეორე მოთამაშე შემოვა თავისი ექაუნთით</p>
        </div>`;
    }

    const actionText = userSeat ? 'აქ გადაჯდომა' : 'დააკლიკე დასაჯდომად';
    return `
    <div onclick="handleEmptySlotClick('${lobby.id}', '${slotGroup}', ${index}, '${label}')" class="bg-[#121629]/40 border-2 border-dashed border-[#232a4d] hover:border-purple-500 rounded-2xl p-4 flex flex-col items-center justify-center text-center min-h-[180px] cursor-pointer transition group">
        <span class="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-2">${label}</span>
        <div class="w-12 h-12 rounded-2xl bg-[#121629] border border-[#232a4d] group-hover:border-purple-500 flex items-center justify-center text-gray-500 group-hover:text-purple-400 mb-2 transition">
            <i class="fa-solid ${userSeat ? 'fa-arrows-left-right' : 'fa-chair'} text-lg"></i>
        </div>
        <p class="text-xs font-bold text-gray-400 group-hover:text-white transition">თავისუფალი სლოტი</p>
        <p class="text-[10px] text-purple-400 mt-1">${actionText}</p>
    </div>`;
}

window.handleEmptySlotClick = function (lobbyId, slotGroup, index, label) {
    if (!currentUser) {
        showToast('ლობიში დასაჯდომად გაიარეთ ავტორიზაცია!', 'error');
        toggleElement('loginModal');
        return;
    }
    const lobby = lobbies.find(l => l.id === lobbyId);
    if (!lobby) return;

    const existingSeat = findUserSeatInLobby(lobby, currentUser.email);

    if (existingSeat) {
        if (lobby.type === '1v1 Solo Duel') {
            showToast('თქვენ უკვე ზიხართ 1v1 ლობიში! დაელოდეთ მეტოქეს.', 'error');
            return;
        }
        const oldArray = existingSeat.group === 'reserve' ? lobby.reserveSlots : lobby.mainSlots;
        const playerData = oldArray[existingSeat.index];
        oldArray[existingSeat.index] = null;

        playerData.role = label;
        const newArray = slotGroup === 'reserve' ? lobby.reserveSlots : lobby.mainSlots;
        newArray[index] = playerData;

        saveLobbies();
        renderLobbyPage();
        showToast(`თქვენ გადაჯექით სლოტში: ${label}`, 'info');
        return;
    }

    let gameId = currentUser.gameId;
    if (!gameId) {
        gameId = prompt(`შეიყვანეთ თქვენი Game ID (Server) ლობიში დასაჯდომად:`, '12345678 (1234)');
        if (!gameId || gameId.trim() === '') return;
        currentUser.gameId = gameId.trim();
    }

    const targetArray = slotGroup === 'reserve' ? lobby.reserveSlots : lobby.mainSlots;
    targetArray[index] = {
        email: currentUser.email,
        player: currentUser.name,
        gameId: currentUser.gameId,
        avatar: currentUser.avatar,
        role: label,
        ready: true,
        isLeader: false
    };

    if (lobby.type === '5v5 Squad') {
        getOrCreateLeaderboardEntry('5v5 Squad', lobby.teamName, '5v5 Squad', lobby.image, lobby.leaderEmail, [currentUser.email]);
    } else {
        getOrCreateLeaderboardEntry(lobby.type, currentUser.name, label, currentUser.avatar, currentUser.email, [currentUser.email]);
    }

    saveLeaderboard();
    saveLobbies();
    renderLobbyPage();
    showToast(`თქვენ დაჯექით სლოტში (${label})!`, 'success');
};

window.removePlayerFromSlot = function (lobbyId, slotGroup, index) {
    const lobby = lobbies.find(l => l.id === lobbyId);
    if (!lobby) return;
    const targetArray = slotGroup === 'reserve' ? lobby.reserveSlots : lobby.mainSlots;
    targetArray[index] = null;
    saveLobbies();
    renderLobbyPage();
    showToast('სლოტი გათავისუფლდა', 'info');
};

window.changeLobbyLogo = function (event, lobbyId) {
    if (event.target.files[0]) {
        processImageFile(event.target.files[0], function (compressedDataUrl) {
            const lobby = lobbies.find(l => l.id === lobbyId);
            if (lobby) {
                lobby.image = compressedDataUrl;
                const lbEntry = leaderboard.find(item => item.type === '5v5 Squad' && item.name.toLowerCase() === lobby.teamName.toLowerCase());
                if (lbEntry) { lbEntry.image = compressedDataUrl; saveLeaderboard(); }
                saveLobbies();
                renderLobbyPage();
                showToast('სქუადის ლოგო განახლდა ლობიშიც და ლიდერბორდშიც!', 'success');
            }
        });
    }
};

window.toggleMyReadyStatus = function () {
    const lobby = lobbies.find(l => l.id === currentLobbyId);
    if (!lobby || !currentUser) return;
    const mySeat = findUserSeatInLobby(lobby, currentUser.email);
    if (!mySeat) {
        showToast('თქვენ არ ზიხართ ამ ლობის სავარძელში!', 'error');
        return;
    }
    mySeat.data.ready = !mySeat.data.ready;
    saveLobbies();
    renderLobbyPage();
    showToast('მზადყოფნის სტატუსი შეიცვალა!', 'info');
};

window.openLobbyRoom = function (id) {
    currentLobbyId = id;
    localStorage.setItem('currentLobbyId', currentLobbyId);
    updateLobbyIndicator();
    renderLobbyPage();
};

window.leaveCurrentLobby = function () {
    currentLobbyId = null;
    localStorage.removeItem('currentLobbyId');
    updateLobbyIndicator();
    renderLobbyPage();
};

window.quickJoinById = function () {
    if (!currentUser) { showToast('ჯერ გაიარეთ ავტორიზაცია!', 'error'); toggleElement('loginModal'); return; }
    const idInput = document.getElementById('quickJoinId').value.trim().toUpperCase();
    if (!idInput) return;
    const lobby = lobbies.find(l => l.id.toUpperCase() === idInput);
    if (!lobby) { showToast('ლობი ვერ მოიძებნა!', 'error'); return; }
    openLobbyRoom(lobby.id);
    showToast(`შეხვედით ლობიში #${lobby.id}`, 'success');
};

window.copyLobbyText = function (text, msg) {
    navigator.clipboard.writeText(text);
    showToast(msg, 'success');
};

// ==========================================
// 6. PROFILE SETTINGS (უნიკალური სახელის შემოწმებით + რეკომენდაციებით!)
// ==========================================
window.saveProfileSettings = function (e) {
    e.preventDefault();
    const newName = document.getElementById('settingName').value.trim();
    const newPass = document.getElementById('settingPassword').value;

    if (newName !== '') {
        // ვამოწმებთ, სხვა მოთამაშეს ხომ არ აქვს უკვე ეს სახელი
        if (isUsernameTaken(newName, currentUser.email)) {
            renderNameCheckFeedback('settingName', 'settingNameFeedback', currentUser.email, false);
            showToast('ეს სახელი უკვე დაკავებულია! აირჩიე შემოთავაზებული ვარიანტი.', 'error');
            return;
        }

        const oldName = currentUser.name;
        currentUser.name = newName;
        let userIndex = users.findIndex(u => u.email === currentUser.email);
        if (userIndex > -1) { users[userIndex].name = newName; }

        lobbies.forEach(l => {
            if (l.leaderEmail === currentUser.email) {
                l.leaderName = newName;
                if (l.type === '1v1 Solo Duel') l.teamName = newName;
            }
            [...l.mainSlots, ...(l.reserveSlots || [])].forEach(s => {
                if (s && s.email === currentUser.email) s.player = newName;
            });
        });

        leaderboard.forEach(item => {
            if (item.type !== '5v5 Squad' && item.leaderEmail === currentUser.email) {
                item.name = newName;
            }
        });
    }

    if (newPass && newPass.trim() !== '') {
        let userIndex = users.findIndex(u => u.email === currentUser.email);
        if (userIndex > -1) { users[userIndex].password = newPass; currentUser.password = newPass; }
        showToast('უნიკალური სახელი და პაროლი წარმატებით შეიცვალა!', 'success');
        document.getElementById('settingPassword').value = '';
    } else {
        showToast('უნიკალური სახელი წარმატებით შეინახა!', 'success');
    }

    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.setItem('users', JSON.stringify(users));
    saveLobbies();
    saveLeaderboard();
    updateAuthUI();
    document.getElementById('profilePageName').textContent = currentUser.name;
};

window.changeProfileAvatar = function (event) {
    if (event.target.files[0]) {
        processImageFile(event.target.files[0], function (compressedDataUrl) {
            currentUser.avatar = compressedDataUrl;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));

            let userIndex = users.findIndex(u => u.email === currentUser.email);
            if (userIndex > -1) {
                users[userIndex].avatar = compressedDataUrl;
                localStorage.setItem('users', JSON.stringify(users));
            }

            lobbies.forEach(l => {
                if (l.type !== '5v5 Squad' && l.leaderEmail === currentUser.email) {
                    l.image = compressedDataUrl;
                }
                [...l.mainSlots, ...(l.reserveSlots || [])].forEach(s => {
                    if (s && s.email === currentUser.email) {
                        s.avatar = compressedDataUrl;
                    }
                });
            });

            leaderboard.forEach(item => {
                if (item.type !== '5v5 Squad' && item.leaderEmail === currentUser.email) {
                    item.image = compressedDataUrl;
                }
            });

            saveLobbies();
            saveLeaderboard();
            document.getElementById('profilePageAvatar').src = compressedDataUrl;
            updateAuthUI();
            showToast('პროფილის ფოტო განახლდა პროფილშიც, ლობიშიც და ლიდერბორდშიც!', 'success');
        });
    }
};

// ==========================================
// 7. DYNAMIC CONTENT (BRACKETS & LEADERBOARD)
// ==========================================
function getRankBadge(rank) {
    if (rank === 1) return `<span class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-400/20 border border-amber-400 text-amber-300 font-orbitron font-black text-xs shadow-[0_0_10px_rgba(251,191,36,0.4)]"><i class="fa-solid fa-trophy mr-0.5 text-[10px]"></i>1</span>`;
    if (rank === 2) return `<span class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-300/20 border border-gray-300 text-gray-200 font-orbitron font-black text-xs">2</span>`;
    if (rank === 3) return `<span class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-700/30 border border-amber-600 text-amber-500 font-orbitron font-black text-xs">3</span>`;
    return `<span class="inline-flex items-center justify-center w-7 h-7 font-orbitron font-bold text-gray-400 text-xs">#${rank}</span>`;
}

window.renderDynamicContent = function () {
    const br1v1 = document.getElementById('bracket-1v1-content');
    if (br1v1) {
        let r1v1 = lobbies.filter(l => l.type === '1v1 Solo Duel');
        if (r1v1.length === 0) br1v1.innerHTML = `<p class="text-gray-500 col-span-full text-center py-4 text-xs sm:text-sm">აქტიური 1v1 ლობები არ არის.</p>`;
        else {
            br1v1.innerHTML = '';
            r1v1.forEach(l => {
                const p1 = l.mainSlots[0] ? l.mainSlots[0].player : 'თავისუფალი';
                const p2 = l.mainSlots[1] ? l.mainSlots[1].player : 'ელოდება...';
                const imgSrc = resolveLatestImage('1v1 Solo Duel', l.leaderName, l.leaderEmail, l.image);
                br1v1.innerHTML += `<div onclick="openLobbyRoom('${l.id}'); switchTab('lobby');" class="cursor-pointer bg-[#121629] border border-[#232a4d] hover:border-amber-400 p-4 rounded-xl flex items-center justify-between transition"><div class="flex items-center gap-3"><img src="${imgSrc}" class="w-10 h-10 rounded-full border border-amber-500/30 object-cover bg-black"><div><p class="text-white font-bold text-sm">${p1} <span class="text-amber-400 mx-1">VS</span> ${p2}</p><p class="text-[10px] text-gray-400">${l.category} • #${l.id}</p></div></div><i class="fa-solid fa-chevron-right text-xs text-gray-500"></i></div>`;
            });
        }
    }

    const brSquad = document.getElementById('bracket-squad-content');
    if (brSquad) {
        let rSquad = lobbies.filter(l => l.type === '5v5 Squad');
        if (rSquad.length === 0) brSquad.innerHTML = `<p class="text-gray-500 col-span-full text-center py-4 text-xs sm:text-sm">აქტიური Squad ლობები არ არის.</p>`;
        else {
            brSquad.innerHTML = '';
            rSquad.forEach(s => {
                const count = s.mainSlots.filter(x => x !== null).length;
                brSquad.innerHTML += `<div onclick="openLobbyRoom('${s.id}'); switchTab('lobby');" class="cursor-pointer bg-[#121629] border border-[#232a4d] hover:border-purple-500 p-4 rounded-xl flex items-center justify-between transition"><div class="flex items-center gap-3"><img src="${s.image}" class="w-12 h-12 rounded-xl border border-purple-500/30 object-cover bg-black"><div><p class="text-white font-bold text-sm">${s.teamName}</p><p class="text-[10px] text-purple-400">Capt: ${s.leaderName} • (${count}/5) • #${s.id}</p></div></div><i class="fa-solid fa-couch text-purple-400"></i></div>`;
            });
        }
    }

    const brRand = document.getElementById('bracket-random-content');
    if (brRand) {
        let rRand = lobbies.filter(l => l.type === '5v5 Random');
        if (rRand.length === 0) brRand.innerHTML = `<p class="text-gray-500 col-span-full text-center py-4 text-xs sm:text-sm">აქტიური Random ლობები არ არის.</p>`;
        else {
            brRand.innerHTML = '';
            rRand.forEach(l => {
                const count = l.mainSlots.filter(x => x !== null).length;
                brRand.innerHTML += `<div onclick="openLobbyRoom('${l.id}'); switchTab('lobby');" class="cursor-pointer bg-[#121629] border border-[#232a4d] hover:border-blue-500 p-4 rounded-xl flex items-center justify-between transition"><div><p class="text-white font-bold text-sm">${l.teamName}</p><p class="text-[10px] text-blue-400">მოთამაშეები ლობიში: ${count}/5</p></div><i class="fa-solid fa-couch text-blue-400"></i></div>`;
            });
        }
    }

    const lbTeams = document.getElementById('lb-teams-body');
    if (lbTeams) {
        let playedSquads = leaderboard
            .filter(item => item.type === '5v5 Squad' && ((item.wins || 0) + (item.losses || 0) > 0))
            .sort((a, b) => (b.pts || 0) - (a.pts || 0) || (b.wins || 0) - (a.wins || 0));

        lbTeams.innerHTML = '';
        if (playedSquads.length === 0) {
            lbTeams.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-500 text-xs sm:text-sm">ჯერ დასრულებული მატჩების შედეგები არ არის.</td></tr>`;
        } else {
            playedSquads.forEach((s, i) => {
                const wins = s.wins || 0;
                const losses = s.losses || 0;
                const wr = Math.round((wins / (wins + losses)) * 100);
                const imgSrc = resolveLatestImage('5v5 Squad', s.name, s.leaderEmail, s.image);
                lbTeams.innerHTML += `
                <tr class="border-b border-[#232a4d] hover:bg-[#121629] transition">
                    <td class="p-3 sm:p-4">${getRankBadge(i + 1)}</td>
                    <td class="p-3 sm:p-4 flex items-center gap-3"><img src="${imgSrc}" class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg object-cover bg-black border border-[#232a4d]"> <span class="font-bold text-white">${s.name}</span></td>
                    <td class="p-3 sm:p-4 text-xs"><span class="text-emerald-400 font-bold">${wins}W</span> - <span class="text-red-400 font-bold">${losses}L</span></td>
                    <td class="p-3 sm:p-4"><span class="px-2.5 py-1 rounded-full text-xs font-bold ${wr >= 50 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}">${wr}%</span></td>
                    <td class="p-3 sm:p-4 text-right font-orbitron font-bold text-amber-400">${s.pts || 0} PTS</td>
                </tr>`;
            });
        }
    }

    const lbPlayers = document.getElementById('lb-players-body');
    if (lbPlayers) {
        let played1v1 = leaderboard
            .filter(item => item.type === '1v1 Solo Duel' && ((item.wins || 0) + (item.losses || 0) > 0))
            .sort((a, b) => (b.pts || 0) - (a.pts || 0) || (b.wins || 0) - (a.wins || 0));

        lbPlayers.innerHTML = '';
        if (played1v1.length === 0) {
            lbPlayers.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-500 text-xs sm:text-sm">ჯერ დასრულებული 1v1 მატჩების შედეგები არ არის.</td></tr>`;
        } else {
            played1v1.forEach((p, i) => {
                const wins = p.wins || 0;
                const losses = p.losses || 0;
                const wr = Math.round((wins / (wins + losses)) * 100);
                const imgSrc = resolveLatestImage('1v1 Solo Duel', p.name, p.leaderEmail, p.image);
                lbPlayers.innerHTML += `
                <tr class="border-b border-[#232a4d] hover:bg-[#121629] transition">
                    <td class="p-3 sm:p-4">${getRankBadge(i + 1)}</td>
                    <td class="p-3 sm:p-4 flex items-center gap-3"><img src="${imgSrc}" class="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover bg-black border border-[#232a4d]"> <span class="font-bold text-white">${p.name}</span></td>
                    <td class="p-3 sm:p-4 text-xs text-purple-300">${p.category}</td>
                    <td class="p-3 sm:p-4 text-xs"><span class="text-emerald-400 font-bold">${wins}W</span> - <span class="text-red-400 font-bold">${losses}L</span></td>
                    <td class="p-3 sm:p-4"><span class="px-2.5 py-1 rounded-full text-xs font-bold ${wr >= 50 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}">${wr}%</span></td>
                    <td class="p-3 sm:p-4 text-right font-orbitron font-bold text-amber-400">${p.pts || 0} PTS</td>
                </tr>`;
            });
        }
    }

    const lbRand = document.getElementById('lb-random-body');
    if (lbRand) {
        let playedRand = leaderboard
            .filter(item => item.type === '5v5 Random' && ((item.wins || 0) + (item.losses || 0) > 0))
            .sort((a, b) => (b.pts || 0) - (a.pts || 0) || (b.wins || 0) - (a.wins || 0));

        lbRand.innerHTML = '';
        if (playedRand.length === 0) {
            lbRand.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-500 text-xs sm:text-sm">ჯერ დასრულებული Random მატჩების შედეგები არ არის.</td></tr>`;
        } else {
            playedRand.forEach((p, i) => {
                const wins = p.wins || 0;
                const losses = p.losses || 0;
                const wr = Math.round((wins / (wins + losses)) * 100);
                const imgSrc = resolveLatestImage('5v5 Random', p.name, p.leaderEmail, p.image);
                lbRand.innerHTML += `
                <tr class="border-b border-[#232a4d] hover:bg-[#121629] transition">
                    <td class="p-3 sm:p-4">${getRankBadge(i + 1)}</td>
                    <td class="p-3 sm:p-4 flex items-center gap-3"><img src="${imgSrc}" class="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover bg-black border border-[#232a4d]"> <span class="font-bold text-white">${p.name}</span></td>
                    <td class="p-3 sm:p-4 text-xs text-blue-300">${p.category}</td>
                    <td class="p-3 sm:p-4 text-xs"><span class="text-emerald-400 font-bold">${wins}W</span> - <span class="text-red-400 font-bold">${losses}L</span></td>
                    <td class="p-3 sm:p-4"><span class="px-2.5 py-1 rounded-full text-xs font-bold ${wr >= 50 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}">${wr}%</span></td>
                    <td class="p-3 sm:p-4 text-right font-orbitron font-bold text-amber-400">${p.pts || 0} PTS</td>
                </tr>`;
            });
        }
    }
};

window.showBracket = function (type) {
    document.querySelectorAll('.bracket-section').forEach(el => el.classList.add('hidden'));
    document.getElementById('bracket-' + type).classList.remove('hidden');
    document.querySelectorAll('[id^="br-tab-"]').forEach(btn => { btn.classList.remove('bg-gradient-to-r', 'from-amber-400', 'to-orange-500', 'text-black', 'shadow-lg'); btn.classList.add('text-gray-400', 'glass-panel'); });
    const activeBtn = document.getElementById('br-tab-' + type);
    activeBtn.classList.remove('text-gray-400', 'glass-panel');
    activeBtn.classList.add('bg-gradient-to-r', 'from-amber-400', 'to-orange-500', 'text-black', 'shadow-lg');
};

window.showLeaderboard = function (type) {
    document.querySelectorAll('.lb-section').forEach(el => el.classList.add('hidden'));
    document.getElementById('board-' + type).classList.remove('hidden');
    document.querySelectorAll('[id^="lb-tab-"]').forEach(btn => { btn.classList.remove('bg-gradient-to-r', 'from-amber-400', 'to-orange-500', 'text-black', 'shadow-lg'); btn.classList.add('text-gray-400', 'glass-panel'); });
    const activeBtn = document.getElementById('lb-tab-' + type);
    activeBtn.classList.remove('text-gray-400', 'glass-panel');
    activeBtn.classList.add('bg-gradient-to-r', 'from-amber-400', 'to-orange-500', 'text-black', 'shadow-lg');
};

// ==========================================
// 8. AUTHENTICATION (UNIQUE IGN + SUGGESTIONS + DISCORD)
// ==========================================
window.switchAuthTab = function (type) {
    const loginTab = document.getElementById('tabLogin');
    const registerTab = document.getElementById('tabRegister');
    const nameField = document.getElementById('authNameField');
    const submitBtn = document.getElementById('authSubmitBtn');
    const title = document.getElementById('authModalTitle');
    const fb = document.getElementById('authNameFeedback');
    if (fb) fb.innerHTML = '';

    if (type === 'login') {
        loginTab.className = 'flex-1 py-2.5 rounded-lg bg-purple-600 text-white text-xs sm:text-sm font-bold shadow-md transition';
        registerTab.className = 'flex-1 py-2.5 rounded-lg text-gray-400 hover:text-white text-xs sm:text-sm font-bold transition';
        nameField.classList.add('hidden');
        document.getElementById('authName').required = false;
        title.textContent = 'სისტემაში შესვლა';
        submitBtn.textContent = 'ავტორიზაცია';
        submitBtn.dataset.action = 'login';
    } else {
        registerTab.className = 'flex-1 py-2.5 rounded-lg bg-purple-600 text-white text-xs sm:text-sm font-bold shadow-md transition';
        loginTab.className = 'flex-1 py-2.5 rounded-lg text-gray-400 hover:text-white text-xs sm:text-sm font-bold transition';
        nameField.classList.remove('hidden');
        document.getElementById('authName').required = true;
        title.textContent = 'ახალი ანგარიში';
        submitBtn.textContent = 'რეგისტრაცია';
        submitBtn.dataset.action = 'register';
    }
};

window.handleAuthSubmit = function (e) {
    e.preventDefault();
    const action = document.getElementById('authSubmitBtn').dataset.action || 'login';
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;

    if (action === 'register') {
        const nameInput = document.getElementById('authName').value.trim();
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            showToast('ეს ელ-ფოსტა უკვე გამოყენებულია!', 'error');
            return;
        }
        // ვამოწმებთ, დაკავებული ხომ არ არის ეს სახელი (IGN) სხვა მომხმარებლის მიერ!
        if (isUsernameTaken(nameInput)) {
            renderNameCheckFeedback('authName', 'authNameFeedback', '', false);
            showToast('ეს სახელი (IGN) უკვე დაკავებულია! აირჩიე შემოთავაზებული ვარიანტი.', 'error');
            return;
        }

        const newUser = { email: email, password: password, name: nameInput, avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=' + encodeURIComponent(nameInput), isAdmin: false };
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        currentUser = newUser;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showToast('რეგისტრაცია წარმატებულია!', 'success');
    } else {
        if (email === 'admin@royal.ge' && password === 'admin') {
            let adminUser = users.find(u => u.email === 'admin@royal.ge');
            if (!adminUser) {
                adminUser = { email: email, password: password, name: 'Chief Admin', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=admin', isAdmin: true };
                users.push(adminUser);
                localStorage.setItem('users', JSON.stringify(users));
            }
            adminUser.isAdmin = true;
            currentUser = adminUser;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showToast('ადმინისტრატორი შემოვიდა', 'success');
        } else {
            const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
            if (foundUser) {
                currentUser = foundUser;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showToast('წარმატებული ავტორიზაცია', 'success');
            } else {
                showToast('არასწორი ფოსტა ან პაროლი', 'error'); return;
            }
        }
    }

    toggleElement('loginModal');
    updateAuthUI();
    switchTab('profile');
};

window.loginWithDiscord = function () {
    showToast('Discord-ით ავტორიზაცია მიმდინარეობს...', 'info');
    setTimeout(() => {
        let uniqueDiscordName = 'DiscordUser_' + Math.floor(Math.random() * 899 + 100);
        while (isUsernameTaken(uniqueDiscordName)) {
            uniqueDiscordName = 'DiscordUser_' + Math.floor(Math.random() * 8999 + 1000);
        }

        const discordUser = {
            email: 'discord_' + Date.now() + '@discord.com',
            password: 'discord_auth',
            name: uniqueDiscordName,
            avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=' + uniqueDiscordName,
            isAdmin: false
        };
        users.push(discordUser);
        localStorage.setItem('users', JSON.stringify(users));
        currentUser = discordUser;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        toggleElement('loginModal');
        updateAuthUI();
        showToast('წარმატებული ავტორიზაცია Discord-ით!', 'success');
        switchTab('profile');
    }, 1200);
};

window.logout = function () {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateAuthUI();
    showToast('თქვენ გამოხვედით', 'info');
    switchTab('home');
};

function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const profBtn = document.getElementById('userProfileBtn');
    const mobileAdminBtn = document.getElementById('mnav-admin');

    if (currentUser) {
        if (loginBtn) loginBtn.classList.add('hidden');
        if (profBtn) profBtn.classList.remove('hidden');
        document.getElementById('headerUserName').textContent = currentUser.name;
        document.getElementById('headerAvatarImg').src = currentUser.avatar;

        if (currentUser.isAdmin) {
            document.getElementById('nav-admin').classList.remove('hidden');
            document.getElementById('dropdownAdminBtn').classList.remove('hidden');
            if (mobileAdminBtn) mobileAdminBtn.classList.remove('hidden');
        } else {
            document.getElementById('nav-admin').classList.add('hidden');
            document.getElementById('dropdownAdminBtn').classList.add('hidden');
            if (mobileAdminBtn) mobileAdminBtn.classList.add('hidden');
        }
    } else {
        if (loginBtn) loginBtn.classList.remove('hidden');
        if (profBtn) profBtn.classList.add('hidden');
        document.getElementById('nav-admin').classList.add('hidden');
        if (mobileAdminBtn) mobileAdminBtn.classList.add('hidden');
    }
}

// ==========================================
// 9. TOASTS, NOTIFICATIONS & INDEPENDENT LEADERBOARD ADMIN
// ==========================================
window.showToast = function (message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-[#121629] border-emerald-500/50' : type === 'error' ? 'bg-[#121629] border-red-500/50' : 'bg-[#121629] border-blue-500/50';
    const iconColor = type === 'success' ? 'text-emerald-400' : type === 'error' ? 'text-red-400' : 'text-blue-400';
    const iconObj = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';
    toast.className = `flex items-center gap-3 p-4 rounded-xl border shadow-2xl transform transition-all duration-300 translate-y-[-100%] opacity-0 ${bgColor}`;
    toast.innerHTML = `<i class="fa-solid ${iconObj} ${iconColor} text-lg"></i><p class="text-xs sm:text-sm font-bold text-white">${message}</p>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.remove('translate-y-[-100%]', 'opacity-0'));
    setTimeout(() => { toast.classList.add('opacity-0', 'translate-y-[-10px]'); setTimeout(() => toast.remove(), 300); }, 3000);
};

// უნიკალური გასაღები (key) იყენებს leaderEmail-ს (თუ მოთამაშეა), რომ ორი სხვადასხვა ექაუნთი არასდროს აირიოს!
function getOrCreateLeaderboardEntry(type, name, category, image, leaderEmail = '', members = []) {
    const cleanName = name.trim();
    const uniqueIdentifier = (type !== '5v5 Squad' && leaderEmail) ? leaderEmail.toLowerCase() : cleanName.toLowerCase();
    const key = `${type}_${uniqueIdentifier}`;
    const bestImage = resolveLatestImage(type, cleanName, leaderEmail, image);

    let entry = leaderboard.find(item => item.key === key || (item.type === type && item.leaderEmail && leaderEmail && item.leaderEmail.toLowerCase() === leaderEmail.toLowerCase()));
    if (!entry) {
        entry = {
            key: key,
            type: type,
            name: cleanName,
            leaderEmail: leaderEmail,
            members: members,
            category: category || type,
            image: bestImage,
            wins: 0,
            losses: 0,
            pts: 0
        };
        leaderboard.push(entry);
    } else {
        entry.name = cleanName;
        if (bestImage) entry.image = bestImage;
        if (leaderEmail && !entry.leaderEmail) entry.leaderEmail = leaderEmail;
        if (members && members.length > 0) {
            entry.members = Array.from(new Set([...(entry.members || []), ...members]));
        }
    }
    return entry;
}

window.recordMatchResult = function (lobbyIndex, resultType) {
    const lobby = lobbies[lobbyIndex];
    if (!lobby) return;

    const memberEmails = lobby.mainSlots.filter(s => s && s.email).map(s => s.email);

    if (lobby.type === '5v5 Squad') {
        const entry = getOrCreateLeaderboardEntry('5v5 Squad', lobby.teamName, '5v5 Squad', lobby.image, lobby.leaderEmail, memberEmails);
        if (resultType === 'win') { entry.wins += 1; entry.pts += 25; }
        else { entry.losses += 1; }
        showToast(`${lobby.teamName}-ის შედეგი და ლოგო შენახულია ლიდერბორდში!`, 'success');
    }
    else if (lobby.type === '1v1 Solo Duel') {
        let targetSlot = lobby.mainSlots[0];
        if (lobby.mainSlots[0] && lobby.mainSlots[1]) {
            const choice = prompt(`რომელ მოთამაშეს ჩაეთვალოს ${resultType === 'win' ? 'მოგება (+25 PTS)' : 'წაგება'}?\n1 = ${lobby.mainSlots[0].player}\n2 = ${lobby.mainSlots[1].player}`, '1');
            if (!choice) return;
            targetSlot = choice.trim() === '2' ? lobby.mainSlots[1] : lobby.mainSlots[0];
        }
        if (targetSlot) {
            const avatar = resolveLatestImage('1v1 Solo Duel', targetSlot.player, targetSlot.email, targetSlot.avatar);
            const entry = getOrCreateLeaderboardEntry('1v1 Solo Duel', targetSlot.player, lobby.category, avatar, targetSlot.email, [targetSlot.email]);
            if (resultType === 'win') { entry.wins += 1; entry.pts += 25; }
            else { entry.losses += 1; }
            showToast(`${targetSlot.player}-ის შედეგი და ფოტო შენახულია ლიდერბორდში!`, 'success');
        }
    }
    else if (lobby.type === '5v5 Random') {
        const seated = lobby.mainSlots.filter(s => s !== null);
        seated.forEach(s => {
            const avatar = resolveLatestImage('5v5 Random', s.player, s.email, s.avatar);
            const entry = getOrCreateLeaderboardEntry('5v5 Random', s.player, s.role || lobby.category, avatar, s.email, [s.email]);
            if (resultType === 'win') { entry.wins += 1; entry.pts += 25; }
            else { entry.losses += 1; }
        });
        showToast(`Random ლობის მოთამაშეებს შედეგი და ფოტოები შეენახათ ლიდერბორდში!`, 'success');
    }

    saveLeaderboard();
};

window.adjustLeaderboardRecord = function (lbIndex, action) {
    const item = leaderboard[lbIndex];
    if (!item) return;

    if (action === 'addWin') {
        item.wins += 1;
        item.pts += 25;
    } else if (action === 'subWin' && item.wins > 0) {
        item.wins -= 1;
        item.pts = Math.max(0, item.pts - 25);
    } else if (action === 'addLoss') {
        item.losses += 1;
    } else if (action === 'subLoss' && item.losses > 0) {
        item.losses -= 1;
    }

    saveLeaderboard();
    showToast(`${item.name}: სტატისტიკა განახლდა (${item.wins}W / ${item.losses}L • ${item.pts} PTS)`, 'info');
};

window.changeLeaderboardEntryImage = function (event, lbIndex) {
    if (event.target.files && event.target.files[0]) {
        processImageFile(event.target.files[0], function (compressedDataUrl) {
            const item = leaderboard[lbIndex];
            if (item) {
                item.image = compressedDataUrl;
                saveLeaderboard();
                showToast(`${item.name}-ის ფოტო განახლდა!`, 'success');
            }
        });
    }
};

window.deleteLeaderboardRecord = function (lbIndex) {
    const item = leaderboard[lbIndex];
    if (!item) return;
    leaderboard.splice(lbIndex, 1);
    saveLeaderboard();
    showToast(`${item.name} წაიშალა ლიდერბორდიდან`, 'info');
};

window.addManualLeaderboardEntry = function () {
    const typeChoice = prompt('აირჩიე ტურნირის ტიპი:\n1 = 5v5 Squad\n2 = 1v1 Solo Duel\n3 = 5v5 Random', '1');
    if (!typeChoice) return;
    const type = typeChoice.trim() === '2' ? '1v1 Solo Duel' : typeChoice.trim() === '3' ? '5v5 Random' : '5v5 Squad';
    const name = prompt(type === '5v5 Squad' ? 'შეიყვანე გუნდის (Squad) სახელი:' : 'შეიყვანე მოთამაშის IGN:');
    if (!name || !name.trim()) return;
    const category = type === '1v1 Solo Duel' ? (prompt('კატეგორია (მაგ: Fighter vs Fighter):', 'Fighter vs Fighter') || '1v1') : type === '5v5 Random' ? (prompt('როლი (მაგ: Jungler):', 'Jungler') || 'Mix') : '5v5 Squad';

    const matchedUser = users.find(u => u.name.toLowerCase() === name.trim().toLowerCase());
    const userEmail = matchedUser ? matchedUser.email : '';
    const existingImg = resolveLatestImage(type, name.trim(), userEmail, null);

    const entry = getOrCreateLeaderboardEntry(type, name.trim(), category, existingImg, userEmail);
    entry.wins += 1;
    entry.pts += 25;
    saveLeaderboard();
    showToast(`${name} დაემატა ლიდერბორდში!`, 'success');
};

function updateAdminTable() {
    const tbody = document.getElementById('adminTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (lobbies.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-500 text-xs">ამჟამად აქტიური ლობები არ არის</td></tr>`;
    } else {
        lobbies.forEach((l, i) => {
            const uniqueId = (l.type !== '5v5 Squad' && l.leaderEmail) ? l.leaderEmail.toLowerCase() : (l.type === '5v5 Squad' ? l.teamName : l.leaderName).toLowerCase();
            const key = `${l.type}_${uniqueId}`;
            const lbMatch = leaderboard.find(item => item.key === key);
            const wins = lbMatch ? lbMatch.wins : 0;
            const losses = lbMatch ? lbMatch.losses : 0;
            const pts = lbMatch ? lbMatch.pts : 0;
            const imgSrc = resolveLatestImage(l.type, l.type === '5v5 Squad' ? l.teamName : l.leaderName, l.leaderEmail, l.image);

            tbody.innerHTML += `
            <tr class="border-b border-[#232a4d] hover:bg-[#121629] transition">
                <td class="p-3"><img src="${imgSrc}" class="w-8 h-8 rounded-lg object-cover bg-black"></td>
                <td class="p-3">
                    <p class="font-bold text-white cursor-pointer hover:text-purple-400" onclick="openLobbyRoom('${l.id}'); switchTab('lobby');">${l.teamName}</p>
                    <p class="text-[10px] font-mono text-gray-400">ლობი: #${l.id} ${l.leaderEmail ? `• ${l.leaderEmail}` : ''}</p>
                </td>
                <td class="p-3"><span class="bg-purple-900/30 text-purple-400 px-2 py-1 rounded text-[10px]">${l.type}</span></td>
                <td class="p-3 text-xs">
                    <span class="text-emerald-400 font-bold">${wins}W</span> / <span class="text-red-400 font-bold">${losses}L</span>
                    <span class="text-amber-400 font-bold ml-1">(${pts} PTS)</span>
                </td>
                <td class="p-3 text-right whitespace-nowrap">
                    <button onclick="recordMatchResult(${i}, 'win')" class="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black text-xs font-bold mr-1 transition">+Win</button>
                    <button onclick="recordMatchResult(${i}, 'loss')" class="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-black text-xs font-bold mr-2 transition">+Loss</button>
                    <button onclick="deleteLobby(${i})" class="text-red-400 hover:text-white px-2 py-1"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>`;
        });
    }

    let lbAdminBox = document.getElementById('adminPermanentLbBox');
    if (!lbAdminBox) {
        const parentCard = tbody.closest('.glass-panel');
        if (parentCard) {
            lbAdminBox = document.createElement('div');
            lbAdminBox.id = 'adminPermanentLbBox';
            lbAdminBox.className = 'mt-8 pt-6 border-t border-[#232a4d]';
            parentCard.appendChild(lbAdminBox);
        }
    }

    if (lbAdminBox) {
        let rowsHTML = '';
        if (leaderboard.length === 0) {
            rowsHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-500 text-xs">ლიდერბორდის ბაზა ცარიელია</td></tr>`;
        } else {
            leaderboard.forEach((item, idx) => {
                const imgSrc = resolveLatestImage(item.type, item.name, item.leaderEmail, item.image);
                const isVisibleOnPublicLb = (item.wins || 0) + (item.losses || 0) > 0;
                rowsHTML += `
                <tr class="border-b border-[#232a4d] hover:bg-[#121629] transition">
                    <td class="p-3">
                        <label class="relative block w-9 h-9 group cursor-pointer">
                            <img src="${imgSrc}" class="w-9 h-9 rounded-lg object-cover bg-black border border-[#232a4d] group-hover:border-purple-400">
                            <span class="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><i class="fa-solid fa-camera text-[10px] text-white"></i></span>
                            <input type="file" accept="image/*" onchange="changeLeaderboardEntryImage(event, ${idx})" class="hidden">
                        </label>
                    </td>
                    <td class="p-3">
                        <p class="font-bold text-white text-xs">${item.name}</p>
                        <p class="text-[10px] text-gray-400">${item.leaderEmail ? `${item.leaderEmail} • ` : ''}${item.category} • ${isVisibleOnPublicLb ? '<span class="text-emerald-400">ჩანს რეიტინგში</span>' : '<span class="text-gray-500">ელოდება 1-ლ მატჩს</span>'}</p>
                    </td>
                    <td class="p-3"><span class="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px]">${item.type}</span></td>
                    <td class="p-3 text-xs font-mono">
                        <span class="text-emerald-400 font-bold">${item.wins}W</span> / <span class="text-red-400 font-bold">${item.losses}L</span> • <span class="text-amber-400 font-bold">${item.pts} PTS</span>
                    </td>
                    <td class="p-3 text-right whitespace-nowrap">
                        <button onclick="adjustLeaderboardRecord(${idx}, 'addWin')" class="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-black text-[10px] font-bold">+W</button>
                        <button onclick="adjustLeaderboardRecord(${idx}, 'subWin')" class="px-2 py-1 rounded bg-gray-700/50 text-gray-300 hover:bg-gray-600 text-[10px] font-bold mr-1">-W</button>
                        <button onclick="adjustLeaderboardRecord(${idx}, 'addLoss')" class="px-2 py-1 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-black text-[10px] font-bold">+L</button>
                        <button onclick="adjustLeaderboardRecord(${idx}, 'subLoss')" class="px-2 py-1 rounded bg-gray-700/50 text-gray-300 hover:bg-gray-600 text-[10px] font-bold mr-2">-L</button>
                        <button onclick="deleteLeaderboardRecord(${idx})" class="text-red-400 hover:text-white px-1.5 py-1"><i class="fa-solid fa-xmark"></i></button>
                    </td>
                </tr>`;
            });
        }

        lbAdminBox.innerHTML = `
            <div class="flex flex-wrap justify-between items-center mb-4 gap-2">
                <div>
                    <h4 class="font-orbitron font-bold text-sm text-amber-400"><i class="fa-solid fa-trophy mr-1.5"></i>ლიდერბორდის მუდმივი ბაზა (უნიკალური მოთამაშეებით)</h4>
                    <p class="text-[11px] text-gray-400">ყველა მოთამაშეს აქვს უნიკალური სახელი და ელ-ფოსტა. ფოტოზე დაკლიკებით შეგიძლია შეცვალო სურათი.</p>
                </div>
                <button onclick="addManualLeaderboardEntry()" class="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition">+ ხელით დამატება</button>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left text-xs sm:text-sm min-w-[500px]">
                    <thead class="text-gray-400 bg-[#121629] text-[10px] sm:text-[11px] uppercase">
                        <tr>
                            <th class="p-3">ფოტო</th>
                            <th class="p-3">მონაწილე / გუნდი</th>
                            <th class="p-3">ტურნირი</th>
                            <th class="p-3">სტატისტიკა</th>
                            <th class="p-3 text-right">W/L რედაქტირება</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHTML}</tbody>
                </table>
            </div>
        `;
    }
}

window.deleteLobby = function (index) {
    const l = lobbies[index];
    if (l) {
        if (l.type === '5v5 Squad') {
            getOrCreateLeaderboardEntry('5v5 Squad', l.teamName, '5v5 Squad', l.image, l.leaderEmail);
        } else {
            l.mainSlots.forEach(s => {
                if (s) getOrCreateLeaderboardEntry(l.type, s.player, s.role || l.category, s.avatar, s.email);
            });
        }
        saveLeaderboard();
    }
    if (l && l.id === currentLobbyId) {
        currentLobbyId = null;
        localStorage.removeItem('currentLobbyId');
    }
    lobbies.splice(index, 1);
    saveLobbies();
    showToast('ლობი დაიხურა (მონაწილე და მისი ფოტო შენარჩუნებულია მუდმივ ბაზაში!)', 'info');
};

window.sendAnnouncement = function (e) {
    e.preventDefault();
    const title = document.getElementById('annTitle').value;
    const text = document.getElementById('annText').value;
    const link = document.getElementById('annLink').value;
    const id = Date.now().toString();

    const newAnn = { id, title, text, link, date: new Date().toLocaleTimeString() };
    notifications.unshift(newAnn);
    localStorage.setItem('notifications', JSON.stringify(notifications));

    document.getElementById('annTitle').value = '';
    document.getElementById('annText').value = '';
    document.getElementById('annLink').value = '';

    updateNotifications();
    showToast('შეტყობინება გაიგზავნა მოთამაშეებთან!', 'success');
};

window.deleteAnnouncement = function (index) {
    notifications.splice(index, 1);
    localStorage.setItem('notifications', JSON.stringify(notifications));
    updateNotifications();
    showToast('შეტყობინება წაიშალა', 'info');
};

window.clearAllAnnouncements = function () {
    notifications = [];
    localStorage.setItem('notifications', JSON.stringify(notifications));
    updateNotifications();
    showToast('შეტყობინებების ისტორია სრულად გასუფთავდა!', 'info');
};

window.handleNotificationClick = function (link) {
    if (link && link !== "") {
        switchTab(link);
        toggleElement('notifDropdown');
    }
};

function updateNotifications() {
    const notifContent = document.getElementById('notifDropdownContent');
    const adminNotifList = document.getElementById('adminAnnouncementsList');
    const dot = document.querySelector('.notif-dot');

    if (notifContent) {
        notifContent.innerHTML = '';
        if (notifications.length === 0) {
            notifContent.innerHTML = '<p class="p-4 text-center text-xs text-gray-500">სიახლეები არ არის</p>';
        } else {
            notifications.forEach(n => {
                const cursorStyle = (n.link && n.link !== "") ? "cursor-pointer hover:bg-[#121629]" : "cursor-default";
                const clickEvent = (n.link && n.link !== "") ? `onclick="handleNotificationClick('${n.link}')"` : "";
                notifContent.innerHTML += `
                    <div class="p-4 border-b border-[#232a4d] transition ${cursorStyle}" ${clickEvent}>
                        <div class="flex justify-between items-start mb-1">
                            <p class="text-xs font-bold text-amber-400">${n.title}</p>
                            ${(n.link && n.link !== "") ? '<i class="fa-solid fa-arrow-up-right-from-square text-[9px] text-gray-500"></i>' : ''}
                        </div>
                        <p class="text-[10px] text-gray-300 leading-relaxed">${n.text}</p>
                        <p class="text-[8px] text-gray-500 mt-2">${n.date}</p>
                    </div>`;
            });
        }
    }

    if (adminNotifList) {
        adminNotifList.innerHTML = '';
        if (notifications.length === 0) {
            adminNotifList.innerHTML = '<p class="text-xs text-gray-500 text-center py-2">ისტორია ცარიელია</p>';
        } else {
            adminNotifList.innerHTML += `
                <button onclick="clearAllAnnouncements()" class="w-full mb-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white text-[10px] font-bold uppercase transition">
                    <i class="fa-solid fa-broom mr-1"></i> ყველას გასუფთავება
                </button>`;
            notifications.forEach((n, index) => {
                adminNotifList.innerHTML += `
                    <div class="bg-[#121629] p-3 rounded-xl border border-[#232a4d] flex justify-between items-start group">
                        <div>
                            <p class="text-xs font-bold text-white mb-1">${n.title}</p>
                            <p class="text-[10px] text-gray-400 line-clamp-1">${n.text}</p>
                        </div>
                        <button type="button" onclick="deleteAnnouncement(${index})" class="text-red-400 hover:text-white transition ml-2 px-2 py-1"><i class="fa-solid fa-trash"></i></button>
                    </div>`;
            });
        }
    }

    if (dot) {
        if (notifications.length > 0) dot.classList.remove('hidden');
        else dot.classList.add('hidden');
    }
}

window.toggleNotifications = function () {
    toggleElement('notifDropdown');
    const dot = document.querySelector('.notif-dot');
    if (dot) dot.classList.add('hidden');
};

// INIT
document.addEventListener('DOMContentLoaded', () => {
    // თუ წინა ტესტირებიდან ბაზაში იყო დუბლირებული სახელები, ავტომატურად განვასხვავოთ
    const seenNames = new Set();
    let usersUpdated = false;
    users.forEach(u => {
        const lower = u.name.trim().toLowerCase();
        if (seenNames.has(lower)) {
            const newUnique = generateNameSuggestions(u.name, false)[0];
            u.name = newUnique;
            if (currentUser && currentUser.email === u.email) {
                currentUser.name = newUnique;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
            usersUpdated = true;
        }
        seenNames.add(u.name.trim().toLowerCase());
    });
    if (usersUpdated) localStorage.setItem('users', JSON.stringify(users));

    // Live უნიკალურობის შემოწმების მიბმა რეგისტრაციის და პროფილის სახელის ველებზე
    const authNameInput = document.getElementById('authName');
    if (authNameInput) {
        authNameInput.addEventListener('input', () => {
            renderNameCheckFeedback('authName', 'authNameFeedback', '', false);
        });
    }

    const settingNameInput = document.getElementById('settingName');
    if (settingNameInput) {
        settingNameInput.addEventListener('input', () => {
            const exclude = currentUser ? currentUser.email : '';
            renderNameCheckFeedback('settingName', 'settingNameFeedback', exclude, false);
        });
    }

    lobbies.forEach(l => {
        if (l.type === '5v5 Squad') {
            getOrCreateLeaderboardEntry('5v5 Squad', l.teamName, '5v5 Squad', l.image, l.leaderEmail);
        } else {
            l.mainSlots.forEach(s => {
                if (s) getOrCreateLeaderboardEntry(l.type, s.player, s.role || l.category, s.avatar, s.email);
            });
        }
    });
    saveLeaderboard();

    const params = new URLSearchParams(window.location.search);
    const invitedLobby = params.get('lobby');
    if (invitedLobby && lobbies.find(l => l.id === invitedLobby)) {
        currentLobbyId = invitedLobby;
        localStorage.setItem('currentLobbyId', currentLobbyId);
    }

    updateAuthUI();
    updateTournamentUI();
    updateAdminTable();
    renderDynamicContent();
    updateNotifications();
    updateLobbyIndicator();

    if (invitedLobby) {
        switchTab('lobby');
    } else {
        switchTab('home');
    }
});