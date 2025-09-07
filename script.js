document.addEventListener('DOMContentLoaded', () => {

    // --- DOM要素の選択 ---
    const characterListElement = document.getElementById('character-list');
    const searchBar = document.getElementById('search-bar');
    const damageTypeFiltersContainer = document.getElementById('damage-type-filters');
    const attributeFiltersContainer = document.getElementById('attribute-filters');
    const specialtyFiltersContainer = document.getElementById('specialty-filters');
    const tagFiltersContainer = document.getElementById('tag-filters');
    const menuButton = document.getElementById('menu-button');
    const sidePanelOverlay = document.getElementById('side-panel-overlay');
    const closePanelButton = document.getElementById('close-panel-button');
    const saveTeamForm = document.getElementById('save-team-form');
    //const teamNameInput = document.getElementById('team-name-input');
    //const teamDescInput = document.getElementById('team-desc-input');
    const savedTeamsList = document.getElementById('saved-teams-list');
    const langButtons = document.querySelectorAll('.lang-button');
    const disclaimerTexts = document.querySelectorAll('.disclaimer-text');
    const loadedTeamInfo = document.getElementById('loaded-team-info');
    const loadedTeamTitle = document.getElementById('loaded-team-title'); 
    const loadedTeamDesc = document.getElementById('loaded-team-desc');
    const saveStatusElement = document.getElementById('save-status');
    const teamStatsContainer = document.getElementById('team-stats-container');
    const modeSelector = document.getElementById('mode-selector');
    const teamSlotsContainer = document.getElementById('team-slots-container');
    const panelNavButtons = document.querySelectorAll('.panel-nav-button');
    const panelContents = document.querySelectorAll('.panel-content');
    const shareModal = document.getElementById('share-modal');
    const closeShareModalButton = document.getElementById('close-modal-button');
    const shareUrlInput = document.getElementById('share-url-input');
    const copyUrlButton = document.getElementById('copy-url-button');
    const qrcodeDisplay = document.getElementById('qrcode-display');
    const loadTeamFromCodeButton = document.getElementById('load-team-from-code-button');
    const teamCodeInput = document.getElementById('team-code-input');
    const clearInputButton = document.getElementById('clear-input-button');
    const resetFiltersButton = document.getElementById('reset-filters-button');
    const clearTeamButton = document.getElementById('clear-team-button');
    const sortButtons = document.querySelectorAll('.sort-btn');
    const characterDetailModal = document.getElementById('character-detail-modal');
    const closeDetailModalButton = document.getElementById('close-detail-modal-button');
    const modalCharacterContent = document.getElementById('modal-character-content');


    // --- グローバル変数 ---
    let allCharacters = [];
    let allPsychubes = []; 
    let currentView = 'characters';
    let selectedDamageType = null;
    let selectedAttribute = null;
    let currentMode = 'mode1'; // 初期モード
    let currentlyLoadedTeamId = null;
    let currentSort = 'default';
    let autoSaveTimeout;
 
    // --- 初期化処理 ---
    // キャラクターと心相の両方のデータを読み込む
    Promise.all([
        fetch('characters.json').then(res => res.json()),
        fetch('psychubes.json').then(res => res.json())
    ])
    .then(([characters, psychubes]) => {
        allCharacters = characters;
        allPsychubes = psychubes;

        // URLにチームデータがあれば読み込む
        const didLoadFromUrl = loadTeamFromUrl();
        if (!didLoadFromUrl) {
            // URLからの読み込みがなければ、自動保存データを試す
            const didLoadFromAutoSave = loadAutoSavedTeam();
            if (!didLoadFromAutoSave) {
                renderTeamSlots();
                updateMiniView();
            }
        }
        createAllFilters();
        applyFilters();
    })
    .catch(error => console.error('Data failed to load:', error));

    // 2. ページ読み込み時に自動保存データを復元する関数を追加（74行目あたり）
    function loadAutoSavedTeam() {
        try {
            const autoSavedData = localStorage.getItem('reverse1999_autosave_team');
            if (autoSavedData) {
                const teamData = JSON.parse(autoSavedData);
                loadTeamData(teamData);
                console.log('Restored auto-saved team draft.');
                return true;
            }
        } catch (e) {
            console.error('Failed to load auto-saved team:', e);
            localStorage.removeItem('reverse1999_autosave_team');
        }
        return false;
    }

    // --- フィルター関連の関数 ---

    // すべてのフィルターを生成
    function createAllFilters() {
        createDamageTypeFilters();
        createAttributeFilters();
        createSpecialtyFilters();
        createTagFilters();
    }
    
    // フィルターを適用してキャラクターリストを更新
    // フィルターを適用して現在のビュー（キャラクター or 心相）を描画
    function applyFilters() {
        if (currentView === 'characters') {
            // --- キャラクターの絞り込みと表示 ---
            const searchTerm = searchBar.value.toLowerCase();
            const selectedTags = Array.from(tagFiltersContainer.querySelectorAll('input:checked')).map(input => input.value);
            const selectedSpecialties = Array.from(specialtyFiltersContainer.querySelectorAll('input:checked')).map(input => input.value);

            const filteredCharacters = allCharacters.filter(character => {
                const nameMatch = character.name.toLowerCase().includes(searchTerm);
                const attributeMatch = !selectedAttribute || character.attribute === selectedAttribute;
                const damageTypeMatch = !selectedDamageType || character.damageType === selectedDamageType;
                const tagMatch = selectedTags.every(tag => character.tags.includes(tag));
                const specialtyMatch = selectedSpecialties.every(spec => character.specialties.includes(spec));
                return nameMatch && attributeMatch && damageTypeMatch && tagMatch && specialtyMatch;
            });
            
            // ソート処理
            let sortedCharacters = [...filteredCharacters];
            // ... (既存のソートのswitch文はここに移動)
            switch (currentSort) {
                case 'rarity-desc': sortedCharacters.sort((a, b) => (b.rarity || 0) - (a.rarity || 0)); break;
                case 'rarity-asc': sortedCharacters.sort((a, b) => (a.rarity || 0) - (b.rarity || 0)); break;
                case 'version-desc':
                    sortedCharacters.sort((a, b) => {
                        const vA = a.version ? parseFloat(a.version) : 0;
                        const vB = b.version ? parseFloat(b.version) : 0;
                        if (vB !== vA) return vB - vA;
                        return b.id - a.id;
                    });
                    break;
                case 'version-asc':
                    sortedCharacters.sort((a, b) => {
                        const vA = a.version ? parseFloat(a.version) : 0;
                        const vB = b.version ? parseFloat(b.version) : 0;
                        if (vA !== vB) return vA - vB;
                        return b.id - a.id;
                    });
                    break;
                default: sortedCharacters.sort((a, b) => b.id - a.id); break;
            }
            displayCharacters(sortedCharacters);

        } else if (currentView === 'psychubes') {
            // --- 心相の絞り込みと表示 ---
            const searchTerm = searchBar.value.toLowerCase();
            const filteredPsychubes = allPsychubes.filter(p => p.name.toLowerCase().includes(searchTerm));
            
            // 心相のソート
            let sortedPsychubes = [...filteredPsychubes];
            switch (currentSort) {
                case 'id-asc':
                    sortedPsychubes.sort((a, b) => (a.id > b.id) ? 1 : -1); // 昇順
                    break;
                case 'id-desc':
                default:
                    sortedPsychubes.sort((a, b) => (a.id < b.id) ? 1 : -1); // 降順
                    break;
            }
            
            displayPsychubes(sortedPsychubes);
        }
    }

    // 心相一覧を表示する関数
    function displayPsychubes(psychubes) {
        characterListElement.innerHTML = '';
        psychubes.forEach(psychube => {
            const card = document.createElement('div');
            card.className = 'character-card';
            card.draggable = true; // Draggableにする
            card.dataset.id = psychube.id; // IDをセット
            card.innerHTML = generatePsychubeCardHTML(psychube);
            
            // dragstartイベントを追加
            card.addEventListener('dragstart', e => {
                e.dataTransfer.setData('text/plain', psychube.id);
                e.dataTransfer.setDragImage(e.target, 20, 20); // プレビュー画像をカード自体に設定
            });

            characterListElement.appendChild(card);
        });
    }

    // --- UI表示と生成の関数 ---

    // キャラクターカードのHTMLを生成する共通関数
    function generateCardHTML(character) {
        const rarityStars = '★'.repeat(character.rarity || 0);
        // 各画像のURLを生成
        const characterImageUrl = `images/characters/${character.id}.png`;
        const rarityShadowUrl = `images/characters/shadow/${character.rarity}star.png`;
        const attributeIconUrl = `images/characters/affirtus/${character.attribute.toLowerCase()}.png`;

        return `
            <img src="${characterImageUrl}" alt="${character.name}" class="character-portrait" loading="lazy" onerror="this.style.display='none'">
            <img src="${rarityShadowUrl}" alt="${character.rarity} star rarity" class="card-rarity-shadow" onerror="this.style.display='none'">
            <img src="${attributeIconUrl}" alt="${character.attribute}" class="card-attribute-icon" onerror="this.style.display='none'">
            
            <div class="card-info-overlay">
                <div class="card-footer">
                    <div class="rarity">${rarityStars}</div>
                    <div class="name">${character.name}</div>
                </div>
            </div>
        `;
    }

    // キャラクター一覧を表示
    function displayCharacters(characters) {
        characterListElement.innerHTML = ''; 
        characters.forEach(character => {
            const card = document.createElement('div');
            card.className = 'character-card';
            card.draggable = true;
            card.dataset.id = character.id;
            card.innerHTML = generateCardHTML(character);
            
            card.addEventListener('dragstart', e => {
                e.dataTransfer.setData('text/plain', character.id);
                e.dataTransfer.setDragImage(e.target, 20, 20); // プレビュー画像をカード自体に設定
            });
            // cardクリックで詳細modalを開く
            card.addEventListener('click', () => openDetailModal(character.id));
            characterListElement.appendChild(card);
        });
    }

    // ▼▼▼ 新しい関数を追加 ▼▼▼
    // 心相カードのHTMLを生成する関数
    function generatePsychubeCardHTML(psychube) {
        const rarityStars = '★'.repeat(psychube.rarity || 0);
        return `
            <img src="images/psychubes/${psychube.id}.png" alt="${psychube.name}" class="character-portrait" loading="lazy" onerror="this.style.display='none'">
            <div class="card-info-overlay">
                <div class="card-header"></div>
                <div class="card-footer">
                    <div class="rarity">${rarityStars}</div>
                    <div class="name">${psychube.name}</div>
                </div>
            </div>
        `;
    }

    // ダメージタイプフィルターを生成
    function createDamageTypeFilters() {
        const damageTypes = ["Reality", "Mental"];
        damageTypes.forEach(type => {
            const btn = document.createElement('button');
            btn.className = `damage-type-filter type-${type.toLowerCase()}`;
            btn.textContent = type;
            btn.addEventListener('click', () => {
                selectedDamageType = (selectedDamageType === type) ? null : type;
                damageTypeFiltersContainer.classList.toggle('filter-active', !!selectedDamageType);
                document.querySelectorAll('.damage-type-filter').forEach(b => b.classList.remove('selected'));
                if(selectedDamageType) btn.classList.add('selected');
                applyFilters();
            });
            damageTypeFiltersContainer.appendChild(btn);
        });
    }

    // 属性フィルターを生成
    function createAttributeFilters() {
        const attributes = ["Beast", "Plant", "Star", "Mineral", "Spirit", "Intellect"];
        attributes.forEach(attr => {
            const btn = document.createElement('button');
            btn.className = `attribute-filter attr-${attr.toLowerCase()}`;
            btn.textContent = attr;
            btn.addEventListener('click', () => {
                selectedAttribute = (selectedAttribute === attr) ? null : attr;
                attributeFiltersContainer.classList.toggle('filter-active', !!selectedAttribute);
                document.querySelectorAll('.attribute-filter').forEach(b => b.classList.remove('selected'));
                if(selectedAttribute) btn.classList.add('selected');
                applyFilters();
            });
            attributeFiltersContainer.appendChild(btn);
        });
    }
    
    // 専門分野・タグフィルターを生成する共通関数
    function createCheckboxFilters(container, sourceFunction, prefix) {
        const allItems = [...new Set(allCharacters.flatMap(sourceFunction))].sort();
        container.innerHTML = '';
        allItems.forEach(item => {
            const itemElement = document.createElement('label');
            itemElement.className = 'tag-filter';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `${prefix}-${item}`;
            checkbox.value = item;
            checkbox.addEventListener('change', () => {
                itemElement.classList.toggle('checked', checkbox.checked);
                applyFilters();
            });
            const text = document.createTextNode(item);
            itemElement.appendChild(checkbox);
            itemElement.appendChild(text);
            container.appendChild(itemElement);
        });
    }

    // 専門分野フィルターを生成
    function createSpecialtyFilters() {
        createCheckboxFilters(specialtyFiltersContainer, c => c.specialties, 'spec');
    }

    // タグフィルターを生成
    function createTagFilters() {
        createCheckboxFilters(tagFiltersContainer, c => c.tags, 'tag');
    }

    // フィルターリセット用の関数を新規追加（315行目あたり、createTagFiltersの後など）
    function resetAllFilters() {
        // 検索バーをクリア
        searchBar.value = '';

        // ダメージタイプフィルターをリセット
        selectedDamageType = null;
        damageTypeFiltersContainer.classList.remove('filter-active');
        document.querySelectorAll('.damage-type-filter').forEach(b => b.classList.remove('selected'));

        // 属性フィルターをリセット
        selectedAttribute = null;
        attributeFiltersContainer.classList.remove('filter-active');
        document.querySelectorAll('.attribute-filter').forEach(b => b.classList.remove('selected'));

        // 専門分野・タグフィルターをリセット
        const allCheckboxes = document.querySelectorAll('#specialty-filters input[type="checkbox"], #tag-filters input[type="checkbox"]');
        allCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                checkbox.checked = false;
                checkbox.parentElement.classList.remove('checked');
            }
        });
        
        // フィルターを適用して再描画
        applyFilters();
    }


    // --- チーム編成とスロット関連の関数 ---

    // チームスロットを現在のモードに合わせて描画
    function renderTeamSlots() {
        teamSlotsContainer.innerHTML = '';

        // ▼▼▼ ミニビューに現在のモードを伝えるクラスを追加 ▼▼▼
        miniTeamView.classList.remove('mode-limbo', 'mode-4parties');
        if (currentMode === 'limbo' || currentMode === '4parties') {
            miniTeamView.classList.add('mode-' + currentMode);
        }

        // ▼▼▼ メインのスロットコンテナにもモードのクラスを追加 ▼▼▼
        teamSlotsContainer.classList.remove('mode-limbo', 'mode-4parties');
        if (currentMode === 'limbo' || currentMode === '4parties') {
            teamSlotsContainer.classList.add('mode-' + currentMode);
        }

        let partyCount = 0;
        let partyLabels = [];
        switch (currentMode) {
            case 'limbo':
                partyCount = 2; partyLabels = ['Party A', 'Party B']; break;
            case '4parties':
                partyCount = 4; partyLabels = ['Party 1', 'Party 2', 'Party 3', 'Party 4']; break;
            default:
                partyCount = 1; partyLabels = ['']; break;
        }

        for (let i = 0; i < partyCount; i++) {
            const partyRow = document.createElement('div');
            partyRow.className = 'party-row';
            if (partyLabels[i]) {
                const label = document.createElement('div');
                label.className = 'party-label';
                label.textContent = partyLabels[i];
                partyRow.appendChild(label);
            }
            const slotsDiv = document.createElement('div');
            slotsDiv.className = 'team-slots';
            for (let j = 0; j < 4; j++) {
                const slotIndex = i * 4 + j;

                // キャラとPsychubeをまとめるコンテナ
                const slotUnit = document.createElement('div');
                slotUnit.className = 'slot-unit';

                // キャラクタースロット
                const charSlot = document.createElement('div');
                charSlot.className = 'team-slot';
                charSlot.dataset.slotIndex = slotIndex;
                charSlot.textContent = `Slot ${j + 1}`;
                
                // Psychubeスロット
                const psychubeSlot = document.createElement('div');
                psychubeSlot.className = 'psychube-slot';
                psychubeSlot.dataset.slotIndex = slotIndex;
                psychubeSlot.textContent = `Psychube`;

                slotUnit.appendChild(charSlot);
                slotUnit.appendChild(psychubeSlot);
                slotsDiv.appendChild(slotUnit);
            }
            partyRow.appendChild(slotsDiv);
            teamSlotsContainer.appendChild(partyRow);
        }
        attachSlotListeners();
        updateTeamStats();
    }

    // 動的に生成されたスロットにイベントリスナーを設定
    // --- スロットへのイベントリスナー設定関数 (attachSlotListeners) を修正 ---
    // 既存のクリックイベントリスナーを全て置き換えます
    function attachSlotListeners() {
        document.querySelectorAll('.team-slot, .psychube-slot').forEach(slot => {
            slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('drag-over'); });
            slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
            slot.addEventListener('drop', handleDrop);
            slot.addEventListener('dragstart', (event) => { /* ... 既存のコードは変更なし ... */ });
            slot.addEventListener('dragend', () => slot.classList.remove('dragging'));
        });

        // ★キャラクタースロットのクリックイベントを修正
        document.querySelectorAll('.team-slot').forEach(slot => {
            slot.addEventListener('click', (event) => {
                const charId = slot.dataset.characterId;
                // 削除ボタンが押された場合
                if (event.target.classList.contains('remove-button')) {
                    clearSlot(slot);
                    // Psychubeも一緒にクリアする場合
                    const psychubeSlot = slot.nextElementSibling;
                    if (psychubeSlot && psychubeSlot.classList.contains('psychube-slot')) {
                        clearPsychubeSlot(psychubeSlot);
                    }
                    return;
                }
                // スロットにキャラクターがいれば詳細モーダルを開く
                if (charId) {
                    openDetailModal(charId);
                }
            });
        });
        
        // ★Psychubeスロットのクリックイベントを修正
        document.querySelectorAll('.psychube-slot').forEach(slot => {
            slot.addEventListener('click', (event) => {
                // 削除ボタンが押された場合
                if (event.target.classList.contains('remove-button')) {
                    clearPsychubeSlot(slot);
                    return;
                }
                // ここではPsychubeの詳細モーダルは未実装のため、何もしない
            });
        });
    }

    // ドロップ処理を一元化
    function handleDrop(event) {
        event.preventDefault();
        const targetSlot = event.currentTarget;
        targetSlot.classList.remove('drag-over');

        const slotDataString = event.dataTransfer.getData('application/json');
        const listDataId = event.dataTransfer.getData('text/plain');

        if (slotDataString) {
            // --- スロットからスロットへの移動（入れ替え） ---
            const sourceData = JSON.parse(slotDataString);
            const sourceSlot = document.querySelector(`.${sourceData.type === 'character' ? 'team-slot' : 'psychube-slot'}[data-slot-index="${sourceData.sourceIndex}"]`);
            if (sourceSlot === targetSlot) return; // 同じスロットなら何もしない

            const targetIsCharSlot = targetSlot.classList.contains('team-slot');
            const targetId = targetIsCharSlot ? targetSlot.dataset.characterId : targetSlot.dataset.psychubeId;

            // タイプの違うスロットへのドロップは禁止
            if ((sourceData.type === 'character' && !targetIsCharSlot) || (sourceData.type === 'psychube' && targetIsCharSlot)) {
                return;
            }

            // ターゲットスロットにソースアイテムを配置
            if (sourceData.type === 'character') {
                const sourceChar = allCharacters.find(c => c.id == sourceData.id);
                fillSlot(targetSlot, sourceChar);
            } else {
                const sourcePsychube = allPsychubes.find(p => p.id === sourceData.id);
                fillPsychubeSlot(targetSlot, sourcePsychube);
            }

            // ソーススロットにターゲットアイテムを配置（入れ替え）
            if (targetId) {
                if (sourceData.type === 'character') {
                    const targetChar = allCharacters.find(c => c.id == targetId);
                    fillSlot(sourceSlot, targetChar);
                } else {
                    const targetPsychube = allPsychubes.find(p => p.id === targetId);
                    fillPsychubeSlot(sourceSlot, targetPsychube);
                }
            } else {
                // ターゲットが空ならソースをクリア
                if (sourceData.type === 'character') clearSlot(sourceSlot);
                else clearPsychubeSlot(sourceSlot);
            }

        } else if (listDataId) {
            // --- リストからスロットへの移動 ---
            const isPsychubeDrop = listDataId.startsWith('P');
            if (targetSlot.classList.contains('psychube-slot') && isPsychubeDrop) {
                const psychube = allPsychubes.find(p => p.id === listDataId);
                if (psychube) fillPsychubeSlot(targetSlot, psychube);
            } else if (targetSlot.classList.contains('team-slot') && !isPsychubeDrop) {
                const character = allCharacters.find(c => c.id == listDataId);
                if (character) fillSlot(targetSlot, character);
            }
        }
        scheduleAutoSave();
    }

    // 現在のチーム状態から共有用データを生成
    function generateCurrentTeamData() {
        const slots = document.querySelectorAll('.slot-unit');
        const teamData = [];
        let isEmpty = true;
        
        slots.forEach(unit => {
            const charSlot = unit.querySelector('.team-slot');
            const psychubeSlot = unit.querySelector('.psychube-slot');
            const charId = charSlot.dataset.characterId || null;
            const psychubeId = psychubeSlot.dataset.psychubeId || null;
            if (charId || psychubeId) isEmpty = false;
            teamData.push({ c: charId, p: psychubeId });
        });
        
        if (isEmpty) return null;

        const teams = [];
        for (let i = 0; i < teamData.length; i += 4) {
            teams.push(teamData.slice(i, i + 4));
        }
        
        return {
            mode: currentMode,
            teams: teams,
            // shareモーダル用に名前と説明もここで取得する
            name: loadedTeamTitle.value.trim(),
            description: loadedTeamDesc.value.trim()
        };
    }

    // チームデータをUIに反映させる共通関数
    function loadTeamData(teamData) {
        currentMode = teamData.mode;
        modeSelector.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === currentMode);
        });
        renderTeamSlots();
        
        const flatTeamData = teamData.teams.flat();
        
        document.querySelectorAll('.slot-unit').forEach((unit, index) => {
            const data = flatTeamData[index];
            const charSlot = unit.querySelector('.team-slot');
            const psychubeSlot = unit.querySelector('.psychube-slot');
            
            // スロットをクリア
            clearSlot(charSlot);
            clearPsychubeSlot(psychubeSlot);

            if (!data) return;

            if (data.c) {
                const character = allCharacters.find(c => c.id == data.c);
                if (character) fillSlot(charSlot, character);
            }
            if (data.p) {
                const psychube = allPsychubes.find(p => p.id === data.p);
                if (psychube) fillPsychubeSlot(psychubeSlot, psychube);
            }
        });

        loadedTeamTitle.value = teamData.name || '';
        loadedTeamDesc.value = teamData.description || '';
        updateMiniView();
    }


    // --- スロットにキャラクターを配置する関数 (fillSlot) を修正 ---
    function fillSlot(slot, character) {
        slot.innerHTML = generateCardHTML(character) + `<button class="remove-button">×</button>`; // 削除ボタンを追加
        slot.classList.add('slot-filled');
        slot.dataset.characterId = character.id;
        slot.setAttribute('draggable', true);
        updateTeamStats();
        updateMiniView();
        scheduleAutoSave();
    }
    
    // スロットを空にする
    function clearSlot(slot) {
        slot.innerHTML = `Slot ${parseInt(slot.dataset.slotIndex) % 4 + 1}`;
        slot.classList.remove('slot-filled');
        delete slot.dataset.characterId;
        slot.setAttribute('draggable', false);
        updateTeamStats();
        updateMiniView();
        scheduleAutoSave();
    }

    // --- スロットにPsychubeを配置する関数 (fillPsychubeSlot) を修正 ---
    function fillPsychubeSlot(slot, psychube) {
        slot.innerHTML = generatePsychubeCardHTML(psychube) + `<button class="remove-button">×</button>`; // 削除ボタンを追加
        slot.classList.add('slot-filled');
        slot.dataset.psychubeId = psychube.id;
        slot.setAttribute('draggable', true);
        updateMiniView();
        scheduleAutoSave();
    }

    // Psychubeスロットを空にする
    function clearPsychubeSlot(slot) {
        slot.innerHTML = `Psychube`;
        slot.classList.remove('slot-filled');
        delete slot.dataset.psychubeId;
        slot.setAttribute('draggable', false);
        updateMiniView();
        scheduleAutoSave();
    }
    
    // チーム統計を更新
    function updateTeamStats() {
        // この機能は複雑なので、一旦基本的な動作を優先し、
        // 必要であれば後で詳細に実装します。
    }

    // チームクリア用の関数を新規追加（622行目あたり、updateTeamStatsの後など）
    function clearCurrentTeam() {
        if (!confirm('Are you sure you want to clear the entire team? This cannot be undone.')) {
            return;
        }

        // 全てのキャラクタースロットとPsychubeスロットをクリア
        document.querySelectorAll('.team-slot').forEach(slot => clearSlot(slot));
        document.querySelectorAll('.psychube-slot').forEach(slot => clearPsychubeSlot(slot));

        // チーム名と説明もクリア
        loadedTeamTitle.value = '';
        loadedTeamDesc.value = '';
        currentlyLoadedTeamId = null; // 読み込み状態も解除
        saveStatusElement.textContent = 'Team Cleared.';
        setTimeout(() => saveStatusElement.textContent = '', 2000);
        scheduleAutoSave();
    }


    // --- サイドパネルとチームデータ管理 ---

    function openSidePanel() {
        sidePanelOverlay.classList.remove('hidden');
        renderSavedTeams();
    }
    function closeSidePanel() {
        sidePanelOverlay.classList.add('hidden');
    }

    function getSavedTeams() {
        try {
            return JSON.parse(localStorage.getItem('reverse1999_saved_teams')) || [];
        } catch (e) {
            return [];
        }
    }
    function saveTeamsToStorage(teams) {
        localStorage.setItem('reverse1999_saved_teams', JSON.stringify(teams));
    }

    // 保存済みチームリストを描画
    function renderSavedTeams() {
        const teams = getSavedTeams();
        savedTeamsList.innerHTML = '';
        if (teams.length === 0) {
            savedTeamsList.innerHTML = '<li>No teams saved yet.</li>';
            return;
        }

        teams.forEach(teamData => {
            const li = document.createElement('li');
            li.dataset.teamId = teamData.id;
            li.innerHTML = `
                <div class="team-info">
                    <strong>${teamData.name}</strong>
                    <p>${teamData.description || ''}</p>
                </div>
                <div class="team-actions">
                    <button class="load-btn">Load</button>
                    <button class="edit-btn">Edit</button>
                    <button class="share-btn">Share</button>
                    <button class="delete-btn">Delete</button>
                </div>
            `;
            li.querySelector('.load-btn').addEventListener('click', () => loadTeam(teamData.id));
            li.querySelector('.edit-btn').addEventListener('click', () => editTeam(teamData.id));
            li.querySelector('.share-btn').addEventListener('click', () => openShareModal(teamData.id));
            li.querySelector('.delete-btn').addEventListener('click', () => deleteTeam(teamData.id));
            savedTeamsList.appendChild(li);
        });
    }
    
    // チーム情報を編集
    function editTeam(teamId) {
        const teams = getSavedTeams();
        const teamData = teams.find(t => t.id === teamId);
        const li = savedTeamsList.querySelector(`li[data-team-id="${teamId}"]`);
        if (!li || li.querySelector('.edit-form')) return; // 既に編集中なら何もしない

        li.innerHTML = `
            <form class="edit-form">
                <input type="text" value="${teamData.name}" required>
                <textarea>${teamData.description || ''}</textarea>
                <div class="edit-form-actions">
                    <button type="submit">Save</button>
                    <button type="button" class="cancel-btn">Cancel</button>
                </div>
            </form>`;
        li.querySelector('.cancel-btn').addEventListener('click', () => renderSavedTeams());
        li.querySelector('.edit-form').addEventListener('submit', (event) => {
            event.preventDefault();
            const newName = li.querySelector('input').value.trim();
            const newDesc = li.querySelector('textarea').value.trim();
            if (!newName) { alert('Team Name is required.'); return; }
            
            const teamIndex = teams.findIndex(t => t.id === teamId);
            if (teamIndex > -1) {
                teams[teamIndex].name = newName;
                teams[teamIndex].description = newDesc;
                saveTeamsToStorage(teams);
                renderSavedTeams();
            }
        });
    }
    
    // チームを読み込む
    function loadTeam(teamId) {
        const teams = getSavedTeams();
        const teamDataToLoad = teams.find(t => t.id === teamId);
        if (!teamDataToLoad) return;

        localStorage.removeItem('reverse1999_autosave_team');
        
        loadTeamData(teamDataToLoad);
        currentlyLoadedTeamId = teamId;
        closeSidePanel();
    }

    // チームを削除
    function deleteTeam(teamId) {
        if (!confirm('Are you sure you want to delete this team?')) return;
        let teams = getSavedTeams();
        teams = teams.filter(t => t.id !== teamId);
        saveTeamsToStorage(teams);
        renderSavedTeams();
    }
    
    // --- チーム共有（URL/コード/QR）関連 ---

    // 共有モーダルを開く
    function openShareModal(teamId = null) {
        const teamData = teamId 
            ? getSavedTeams().find(t => t.id === teamId)
            : generateCurrentTeamData();

        if (!teamData) {
            alert('The team is empty. Please add characters before sharing.');
            return;
        }
        
        const shareData = {
            m: teamData.mode,
            t: teamData.teams,
            n: teamData.name, // チーム名を追加
            d: teamData.description // 説明を追加
        };
        
        const jsonString = JSON.stringify(shareData);
        const encodedString = btoa(encodeURIComponent(jsonString));
        const shareUrl = `${window.location.origin}${window.location.pathname}#${encodedString}`;

        shareUrlInput.value = shareUrl;
        generateQrCode(shareUrl);
        shareModal.classList.remove('hidden');
    }

    function closeShareModal() {
        shareModal.classList.add('hidden');
    }
    
    // QRコードを生成
    function generateQrCode(url) {
        qrcodeDisplay.innerHTML = '';
        try {
            const qr = qrcode(0, 'M');
            qr.addData(url);
            qr.make();
            qrcodeDisplay.innerHTML = qr.createImgTag(4, 8);
        } catch (e) {
            console.error("QR Code generation failed:", e);
            qrcodeDisplay.textContent = "QR Code could not be generated.";
        }
    }
    
    // URLハッシュからチームを読み込む
    function loadTeamFromUrl() {
        const hash = window.location.hash.substring(1);
        if (!hash) return false;

        try {
            const jsonString = decodeURIComponent(atob(hash));
            const sharedData = JSON.parse(jsonString);

            if (sharedData.m && sharedData.t) {
                // 読み込んだデータを内部形式に変換
                const teamDataForLoad = {
                    mode: sharedData.m,
                    teams: sharedData.t,
                    name: sharedData.n || 'Loaded from URL',
                    description: sharedData.d || ''
                };
                loadTeamData(teamDataForLoad);
                alert('Team loaded from URL!');
                // URLからハッシュを削除してリロードを防ぐ
                history.pushState("", document.title, window.location.pathname + window.location.search);
                return true;
            }
        } catch (e) {
            console.error("Failed to load team from URL:", e);
            alert("Could not load team from the provided link.");
            history.pushState("", document.title, window.location.pathname + window.location.search);
        }
        return false;
    }

    // 4. 既存の handleAutoSave 関数を、より汎用的な新しい関数に置き換える（866行目あたり）
    // 元の handleAutoSave は削除してください。
    let saveTimeout;
    function scheduleAutoSave() {
        clearTimeout(saveTimeout);
        saveStatusElement.textContent = 'Saving...';
        
        saveTimeout = setTimeout(() => {
            // 保存済みチームを編集中（IDがある）
            if (currentlyLoadedTeamId) {
                let teams = getSavedTeams();
                const teamIndex = teams.findIndex(t => t.id === currentlyLoadedTeamId);
                if (teamIndex > -1) {
                    const teamData = generateCurrentTeamData();
                    teams[teamIndex].name = loadedTeamTitle.value;
                    teams[teamIndex].description = loadedTeamDesc.value;
                    teams[teamIndex].mode = teamData.mode;
                    teams[teamIndex].teams = teamData.teams;

                    saveTeamsToStorage(teams);
                    saveStatusElement.textContent = 'Saved!';
                    setTimeout(() => saveStatusElement.textContent = '', 2000);
                }
            } 
            // 新規チーム（IDがない）
            else {
                const teamData = generateCurrentTeamData();
                // チームが空でなければ一時保存
                if (teamData) {
                    localStorage.setItem('reverse1999_autosave_team', JSON.stringify(teamData));
                    saveStatusElement.textContent = 'Draft saved.';
                } 
                // チームが空になったら一時データを削除
                else {
                    localStorage.removeItem('reverse1999_autosave_team');
                    saveStatusElement.textContent = '';
                }
            }
        }, 1500); // 1.5秒ごと
    }
    
    // チームコードから読み込み
    function loadTeamFromCode() {
        var code = teamCodeInput.value.trim();
        if (!code) {
            alert('Please paste a team code.');
            return;
        }
        // URLがペーストされた場合でも、#以降のコード部分だけを抽出する
        if (code.includes('#')) {
            code = code.split('#').pop();
        }
        try {
            const jsonString = decodeURIComponent(atob(code));
            const teamData = JSON.parse(jsonString);

            const sharedData = JSON.parse(jsonString); // 変数名を sharedData に統一

            if (sharedData.m && sharedData.t) {
                // 読み込んだデータを内部形式に変換
                const teamDataForLoad = {
                    mode: sharedData.m,
                    teams: sharedData.t,
                    name: sharedData.n || 'Loaded from Code',
                    description: sharedData.d || ''
                };
                loadTeamData(teamDataForLoad);
                currentlyLoadedTeamId = null; // 外部データなので保存済みIDは解除
                alert('Team loaded successfully!');
                closeSidePanel();
            } else {
                throw new Error('Invalid data format');
            }
        } catch(e) {
            alert('Invalid or corrupted team code.');
            console.error('Failed to load from team code:', e);
        }
    }

    // --- イベントリスナーの設定 ---
    loadedTeamTitle.addEventListener('input', scheduleAutoSave);
    loadedTeamDesc.addEventListener('input', scheduleAutoSave);

    const viewSwitcher = document.getElementById('view-switcher');
    const characterFilters = document.querySelector('.filter-row'); // 属性とダメージタイプのフィルター
    
    viewSwitcher.addEventListener('click', (event) => {
        if (event.target.matches('.view-btn')) {
            const selectedView = event.target.dataset.view;
            if (selectedView === currentView) return;

            currentView = selectedView;
            
            // ボタンのアクティブ状態を更新
            viewSwitcher.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');

            // 表示に応じてフィルターの表示/非表示を切り替え
            const isCharacters = currentView === 'characters';
            characterFilters.style.display = isCharacters ? 'flex' : 'none';
            specialtyFiltersContainer.style.display = isCharacters ? 'flex' : 'none';
            tagFiltersContainer.style.display = isCharacters ? 'flex' : 'none';
            sortButtons.forEach(btn => {
                const targetView = btn.dataset.view;
                btn.classList.toggle('hidden', targetView !== currentView && targetView);
            });
            
            // 検索バーのプレースホルダーを更新
            searchBar.placeholder = isCharacters ? 'Search by character name...' : 'Search by psychube name...';

            applyFilters();
        }
    });

    // Sorting functionality
    sortButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Do nothing if the button is already active
            if (button.classList.contains('active')) {
                return;
            }

            // Set the new sort order from the button's data-sort attribute
            currentSort = button.dataset.sort;

            // Update the active state for visual feedback
            sortButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Re-render the list with the new sorting applied
            applyFilters();
        });
    });


    // モード切替
    modeSelector.addEventListener('click', (event) => {
        const target = event.target.closest('.mode-btn');
        if (target) {
            currentMode = target.dataset.mode;
            modeSelector.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
            target.classList.add('active');
            renderTeamSlots();
            updateMiniView(); 
        }
    });

    // サイドパネルの開閉
    menuButton.addEventListener('click', openSidePanel);
    closePanelButton.addEventListener('click', closeSidePanel);
    sidePanelOverlay.addEventListener('click', (event) => {
        if (event.target === sidePanelOverlay) closeSidePanel();
    });

    // サイドパネルのタブ切替
    panelNavButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetPanelId = `panel-content-${button.dataset.panel}`;
            panelNavButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            panelContents.forEach(content => content.classList.remove('active'));
            document.getElementById(targetPanelId).classList.add('active');
        });
    });
    
    // ★★★ 変更点 ★★★「Save Current Team」ボタンは常に新規保存を行う
    saveTeamForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const name = loadedTeamTitle.value.trim();
        if (!name) { alert('Team Name is required.'); return; }

        const teamData = generateCurrentTeamData();
        if (!teamData) { alert('Cannot save an empty team.'); return; }
        
        // 常に新しいIDを生成して新しいチームとして保存
        const newTeam = {
            id: Date.now().toString(),
            name: name,
            description: teamData.description,
            mode: teamData.mode,
            teams: teamData.teams
        };
        
        const savedTeams = getSavedTeams();
        savedTeams.push(newTeam);
        saveTeamsToStorage(savedTeams);
        localStorage.removeItem('reverse1999_autosave_team'); 
        currentlyLoadedTeamId = newTeam.id; 

        saveStatusElement.textContent = 'New Team Saved!';
        setTimeout(() => saveStatusElement.textContent = '', 2000);

        renderSavedTeams();
    });

    // 検索バー
    searchBar.addEventListener('input', applyFilters);

    // reset filter
    resetFiltersButton.addEventListener('click', resetAllFilters);

    // Clear team slots
    clearTeamButton.addEventListener('click', clearCurrentTeam);

    // 言語切替
    langButtons.forEach(button => {
        button.addEventListener('click', () => {
            const selectedLang = button.dataset.lang;
            langButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            disclaimerTexts.forEach(text => {
                text.classList.toggle('hidden', !text.classList.contains(`lang-${selectedLang}`));
            });
        });
    });
    
    // 共有モーダルのURLコピー
    copyUrlButton.addEventListener('click', () => {
        shareUrlInput.select();
        navigator.clipboard.writeText(shareUrlInput.value)
            .then(() => alert('Link copied to clipboard!'))
            .catch(() => alert('Failed to copy link.'));
    });

    // 共有モーダルの閉じるボタン
    closeShareModalButton.addEventListener('click', closeShareModal);
    shareModal.addEventListener('click', (event) => {
        if (event.target === shareModal) closeShareModal();
    });
    
    // チームコード読み込みボタン
    loadTeamFromCodeButton.addEventListener('click', loadTeamFromCode);
    clearInputButton.addEventListener('click', () => teamCodeInput.value = '');


    // 1. 監視対象とミニビューの要素を取得
    const teamSection = document.querySelector('.team-section');
    const miniTeamView = document.getElementById('mini-team-view');
    //const teamSlotsContainer = document.getElementById('team-slots-container');

    // 2. ミニビューの中身を更新する関数
    function updateMiniView() {
        // 現在のチームスロットをコピーしてミニビューに入れる
        miniTeamView.innerHTML = ''; // 一旦空にする
        const clonedSlots = teamSlotsContainer.cloneNode(true);
        miniTeamView.appendChild(clonedSlots);
    }

    // 3. チームに変化があるたびにミニビューも更新する
    // モード変更時も更新
    modeSelector.addEventListener('click', (event) => {
        const target = event.target.closest('.mode-btn');
        if (target) {
            currentMode = target.dataset.mode;
            modeSelector.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
            target.classList.add('active');
            renderTeamSlots();
            updateMiniView(); // 末尾に追加
        }
    });


    // 4. Intersection Observerの設定
    const observerOptions = {
        rootMargin: '0px',
        threshold: 0.05 // 5%見えたらトリガー
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // team-sectionが見えている時はミニビューを隠す
                miniTeamView.classList.add('hidden');
            } else {
                // 見えなくなった時にミニビューを表示する
                miniTeamView.classList.remove('hidden');
            }
        });
    }, observerOptions);

    // 5. team-sectionの監視を開始
    observer.observe(teamSection);

    // ▼▼▼ ここからミニビューのドラッグ＆ドロップ機能を追加 ▼▼▼

    // ミニビューの上をドラッグ中の処理
    miniTeamView.addEventListener('dragover', (event) => {
        event.preventDefault(); // ドロップを許可するために必須
        miniTeamView.classList.add('drag-over');

        // キャラとPsychube両方のスロットを対象にする
        const targetSlot = event.target.closest('.team-slot, .psychube-slot');
        document.querySelectorAll('.mini-team-view .team-slot, .mini-team-view .psychube-slot').forEach(slot => {
            slot.classList.toggle('drag-over-slot', slot === targetSlot);
        });
    });

    // ミニビューからドラッグが離れた時の処理
    miniTeamView.addEventListener('dragleave', () => {
        miniTeamView.classList.remove('drag-over');
        // キャラとPsychube両方のスロットを対象にする
        document.querySelectorAll('.mini-team-view .team-slot, .mini-team-view .psychube-slot').forEach(slot => {
            slot.classList.remove('drag-over-slot');
        });
    });

    // ミニビューにドロップされた時の処理
    miniTeamView.addEventListener('drop', (event) => {
        event.preventDefault();
        miniTeamView.classList.remove('drag-over');
        document.querySelectorAll('.mini-team-view .team-slot, .mini-team-view .psychube-slot').forEach(slot => {
            slot.classList.remove('drag-over-slot');
        });

        const id = event.dataTransfer.getData('text/plain');
        const isPsychubeDrop = id.startsWith('P');
        const targetSlot = event.target.closest('.team-slot, .psychube-slot');
        if (!targetSlot) return;

        const slotIndex = targetSlot.dataset.slotIndex;

        if (isPsychubeDrop && targetSlot.classList.contains('psychube-slot')) {
            // PsychubeをPsychubeスロットにドロップ
            const originalSlot = teamSlotsContainer.querySelector(`.psychube-slot[data-slot-index="${slotIndex}"]`);
            const psychube = allPsychubes.find(p => p.id === id);
            if (originalSlot && psychube) fillPsychubeSlot(originalSlot, psychube);

        } else if (!isPsychubeDrop && targetSlot.classList.contains('team-slot')) {
            // キャラをキャラクタースロットにドロップ
            const originalSlot = teamSlotsContainer.querySelector(`.team-slot[data-slot-index="${slotIndex}"]`);
            const character = allCharacters.find(c => c.id == id);
            if (originalSlot && character) fillSlot(originalSlot, character);
        }
    });

    // ★★★ 変更点 ★★★ MiniViewの削除機能を修正
    miniTeamView.addEventListener('click', (event) => {
        // 1. クリックされたのがキャラクタースロットかPsychubeスロットかを確認
        const targetMiniSlot = event.target.closest('.team-slot, .psychube-slot');

        // スロット以外がクリックされた場合は何もしない
        if (!targetMiniSlot) {
            return;
        }

        const slotIndex = targetMiniSlot.dataset.slotIndex;
        const isCharSlot = targetMiniSlot.classList.contains('team-slot');

        if (isCharSlot) {
            // キャラクタースロットの場合
            if (!targetMiniSlot.dataset.characterId) return; // 空なら何もしない
            const originalSlot = teamSlotsContainer.querySelector(`.team-slot[data-slot-index="${slotIndex}"]`);
            if (originalSlot) {
                clearSlot(originalSlot); // キャラクターを削除
            }
        } else {
            // Psychubeスロットの場合
            if (!targetMiniSlot.dataset.psychubeId) return; // 空なら何もしない
            const originalSlot = teamSlotsContainer.querySelector(`.psychube-slot[data-slot-index="${slotIndex}"]`);
            if (originalSlot) {
                clearPsychubeSlot(originalSlot); // Psychubeを削除
            }
        }
    });

    // ★詳細モーダルを開く関数
    function openDetailModal(characterId) {
        const character = allCharacters.find(c => c.id == characterId);
        if (!character) return;

        const rarityStars = '★'.repeat(character.rarity || 0);
        const attributeClass = `attr-${character.attribute.toLowerCase()}`;
        const damageTypeClass = `type-${character.damageType.toLowerCase()}`;

        const contentHTML = `
            <img src="images/characters/${character.id}.png" alt="${character.name}">
            <div>
                <h3 style="margin-bottom: 5px;">${character.name}</h3>
                <p style="color: #f9ca24; font-size: 20px; margin: 0 0 10px 0;">${rarityStars}</p>
                <p><strong>Attribute:</strong> <span class="${attributeClass}" style="padding: 3px 8px; border-radius: 12px; color: white;">${character.attribute}</span></p>
                <p><strong>Damage Type:</strong> <span class="${damageTypeClass}" style="padding: 3px 8px; border-radius: 12px; color: white;">${character.damageType}</span></p>
                <div class="tags-container">
                    <strong>Specialties:</strong> 
                    ${character.specialties.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
                <div class="tags-container">
                    <strong>Tags:</strong> 
                    ${character.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
        `;

        modalCharacterContent.innerHTML = contentHTML;
        characterDetailModal.classList.remove('hidden');
    }

    // ★詳細モーダルを閉じる関数
    function closeDetailModal() {
        characterDetailModal.classList.add('hidden');
        modalCharacterContent.innerHTML = ''; // 中身をクリア
    }

    // --- イベントリスナーの設定 --- セクションにモーダルを閉じるイベントを追加
    closeDetailModalButton.addEventListener('click', closeDetailModal);
    characterDetailModal.addEventListener('click', (event) => {
        if (event.target === characterDetailModal) {
            closeDetailModal();
        }
    });


});




// TODO: Screen Shot
// TODO: QR code 
// TODO: Team Stats
// TODO: Damage Dealer, Sub Carry, Support, Survivalの分類をそれぞれのキャラに
// TODO: 技の説明や凸の説明
// TODO: Psychube用のカードを作成する -> 画像の比率がおかしくなるため

/* Psychubeの説明 implement
{
  "id": "P6043",
  "name": "A Tingle of a Thought",
  "rarity": 6,
  "effects": {
    "lv1": "If the carrier is of the [Intelligence] afflatus, after casting a channel incantation, ATK +1%, stacking up to 3 times. At the end of the round, for every 1 [Dynamo] infused by allies this round, Critical DMG +1.2%, stacking up to 16 times.",
    "lv5": "If the carrier is of the [Intelligence] afflatus, after casting a channel incantation, ATK +3%, stacking up to 3 times. At the end of the round, for every 1 [Dynamo] infused by allies this round, Critical DMG +2%, stacking up to 16 times."
  }
}
*/



// DONE: Show pop up detail modal when the user clicked a card
// DONE: Pcychube
// DONE: Filter reset button
// DONE: Team Clear button
// DONE: Auto save to the browser 