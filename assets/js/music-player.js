(function() {
    const playlist = [
        { id: 1372721552, name: '又是一天', artist: 'Shanghai Qiutian' },
        { id: 1811964999, name: '我等你们在崇明海边', artist: 'Shanghai Qiutian' },
        { id: 1811964998, name: 'Always a Place', artist: 'Shanghai Qiutian' },
        { id: 2086033930, name: '妳是我見過紫砂最多次的女生', artist: 'snovv' }
    ];
    let currentIndex = 0;
    
    // Play Modes: 0: Loop All, 1: Loop One, 2: Random
    let playMode = 0;
    
    // Sidebar DOM
    const sidebar = document.getElementById('main-sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    let isPinned = false;
    
    // Player DOM - Expanded
    const coverFull = document.getElementById('ap-cover');
    const titleEl = document.getElementById('ap-title');
    const artistEl = document.getElementById('ap-artist');
    const progressWrap = document.getElementById('ap-progress-wrap');
    const progressBar = document.getElementById('ap-progress');
    
    // Player Controls
    const btnPlay = document.getElementById('ap-play-btn');
    const btnPrev = document.getElementById('ap-prev-btn');
    const btnNext = document.getElementById('ap-next-btn');
    const btnRewind = document.getElementById('ap-rewind-btn');
    const btnForward = document.getElementById('ap-forward-btn');
    const btnMode = document.getElementById('ap-mode-btn');
    
    // Lyrics DOM
    const lyricsList = document.getElementById('ap-lyrics-list');
    const lyricsBox = document.getElementById('ap-lyrics-box');
    let parsedLyrics = []; // Array of { time: seconds, text: string }
    let isUserScrolling = false;
    let scrollTimeout;
    
    lyricsBox.addEventListener('wheel', handleUserScroll);
    lyricsBox.addEventListener('touchmove', handleUserScroll);
    
    function handleUserScroll() {
        isUserScrolling = true;
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            isUserScrolling = false;
        }, 3000);
    }
    
    // Playlist DOM
    const btnList = document.getElementById('ap-list-btn');
    const playlistBox = document.getElementById('ap-playlist-box');
    const playlistList = document.getElementById('ap-playlist-list');
    let showingList = false;
    
    // Player DOM - Collapsed
    const coverSmall = document.getElementById('ap-cover-small');
    const btnPlaySmall = document.getElementById('ap-play-btn-small');
    const progressWrapV = document.getElementById('ap-progress-v-wrap');
    const progressV = document.getElementById('ap-progress-v');
    
    // Audio
    const audio = document.getElementById('ap-audio');
    let isPlaying = false;

    // --- Sidebar Hover & Pin Logic ---
    function setSidebarState(expand) {
        if (expand) {
            sidebar.classList.remove('collapsed');
            sidebar.classList.add('expanded');
        } else {
            sidebar.classList.remove('expanded');
            sidebar.classList.add('collapsed');
        }
    }

    function initSidebarState() {
        const savedPin = localStorage.getItem('sidebar-pinned');
        if (savedPin === 'true') {
            isPinned = true;
            sidebar.classList.add('pinned');
            setSidebarState(true);
        } else {
            isPinned = false;
            sidebar.classList.remove('pinned');
            setSidebarState(false);
        }
    }

    toggleBtn.addEventListener('click', () => {
        isPinned = !isPinned;
        localStorage.setItem('sidebar-pinned', isPinned ? 'true' : 'false');
        if (isPinned) {
            sidebar.classList.add('pinned');
            setSidebarState(true);
        } else {
            sidebar.classList.remove('pinned');
        }
    });

    sidebar.addEventListener('mouseenter', () => {
        if (!isPinned) {
            setSidebarState(true);
        }
    });

    sidebar.addEventListener('mouseleave', () => {
        if (!isPinned) {
            setSidebarState(false);
        }
    });

    // --- Audio API & Logic ---
    const API_BASE = 'https://netease-cloud-music-api-theta-three.vercel.app';

    async function loadSong(index) {
        if (index >= playlist.length) index = 0;
        if (index < 0) index = playlist.length - 1;
        const songData = playlist[index];
        const id = songData.id;
        currentIndex = index;

        titleEl.textContent = 'Loading...';
        artistEl.textContent = 'API Request';
        parsedLyrics = [];
        lyricsList.innerHTML = '<li class="lyric-line active">歌词加载中...</li>';
        lyricsBox.scrollTo(0, 0);

        try {
            // Fetch Details
            const detailRes = await fetch(`${API_BASE}/song/detail?ids=${id}`);
            const detailData = await detailRes.json();
            
            // Fetch Audio URL
            const urlRes = await fetch(`${API_BASE}/song/url?id=${id}`);
            const urlData = await urlRes.json();
            
            // Fetch Lyrics
            fetch(`${API_BASE}/lyric?id=${id}`).then(r => r.json()).then(lrcData => {
                if (lrcData.lrc && lrcData.lrc.lyric) {
                    parseLyrics(lrcData.lrc.lyric);
                } else {
                    parsedLyrics = [{time: 0, text: '纯音乐，请欣赏'}];
                    renderLyrics();
                }
            }).catch(() => {
                parsedLyrics = [{time: 0, text: '暂无歌词'}];
                renderLyrics();
            });

            if (detailData.songs && detailData.songs.length > 0) {
                const song = detailData.songs[0];
                titleEl.textContent = song.name;
                artistEl.textContent = song.ar.map(a => a.name).join(', ');
                const coverUrl = song.al.picUrl + '?param=100y100';
                coverFull.src = coverUrl;
                coverSmall.src = coverUrl;
            }

            if (urlData.data && urlData.data.length > 0 && urlData.data[0].url) {
                audio.src = urlData.data[0].url;
                if (isPlaying) {
                    audio.play();
                }
            } else {
                titleEl.textContent = 'VIP/Copyright limit';
                artistEl.textContent = 'Error';
                // skip to next
                setTimeout(() => nextSong(), 2000);
            }

        } catch (e) {
            console.error('Failed to load song', e);
            titleEl.textContent = 'Network Error';
        }
        renderPlaylist();
    }

    // --- Lyrics Parsing ---
    function parseLyrics(lrcString) {
        const lines = lrcString.split('\n');
        parsedLyrics = [];
        const timeExp = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = timeExp.exec(line);
            if (match) {
                const min = parseInt(match[1]);
                const sec = parseInt(match[2]);
                const ms = parseInt(match[3]);
                const time = min * 60 + sec + (ms / (match[3].length === 2 ? 100 : 1000));
                const text = line.replace(timeExp, '').trim();
                if (text) {
                    parsedLyrics.push({ time, text });
                }
            }
        }
        if (parsedLyrics.length === 0) {
            parsedLyrics = [{time: 0, text: '纯音乐，请欣赏'}];
        }
        renderLyrics();
    }

    function renderLyrics() {
        lyricsList.innerHTML = '';
        parsedLyrics.forEach((line, i) => {
            const li = document.createElement('li');
            li.className = 'lyric-line';
            li.textContent = line.text;
            li.dataset.time = line.time;
            li.onclick = () => {
                audio.currentTime = line.time;
                if (!isPlaying) audio.play();
            };
            lyricsList.appendChild(li);
        });
    }

    function updateLyrics() {
        if (!parsedLyrics.length) return;
        const currentTime = audio.currentTime;
        let activeIndex = 0;
        
        for (let i = 0; i < parsedLyrics.length; i++) {
            if (currentTime >= parsedLyrics[i].time) {
                activeIndex = i;
            } else {
                break;
            }
        }

        const lines = lyricsList.querySelectorAll('.lyric-line');
        lines.forEach(l => l.classList.remove('active'));
        if (lines[activeIndex]) {
            lines[activeIndex].classList.add('active');
            
            // Scroll logic (center the active line)
            if (!isUserScrolling) {
                // offset is index * line_height (20px)
                const offset = activeIndex * 20; 
                lyricsBox.scrollTo({ top: offset, behavior: 'smooth' });
            }
        }
    }

    // --- Playlist Rendering ---
    function renderPlaylist() {
        playlistList.innerHTML = '';
        playlist.forEach((song, i) => {
            const li = document.createElement('li');
            li.className = 'playlist-item' + (i === currentIndex ? ' active' : '');
            li.textContent = `${i + 1}. ${song.name} - ${song.artist}`;
            li.onclick = () => {
                loadSong(i).then(() => audio.play());
            };
            playlistList.appendChild(li);
        });
    }

    function togglePlaylist() {
        showingList = !showingList;
        if (showingList) {
            lyricsBox.style.display = 'none';
            playlistBox.style.display = 'block';
            btnList.style.color = 'var(--theme-blue)';
        } else {
            lyricsBox.style.display = 'block';
            playlistBox.style.display = 'none';
            btnList.style.color = '';
        }
    }

    // --- Play Controls ---
    function togglePlay() {
        if (isPlaying) {
            audio.pause();
        } else {
            if (!audio.src) {
                loadSong(currentIndex).then(() => audio.play());
            } else {
                audio.play();
            }
        }
    }

    function nextSong() {
        if (playMode === 2) {
            // Random
            currentIndex = Math.floor(Math.random() * playlist.length);
        } else {
            currentIndex++;
        }
        loadSong(currentIndex);
        isPlaying = true;
    }

    function prevSong() {
        if (playMode === 2) {
            currentIndex = Math.floor(Math.random() * playlist.length);
        } else {
            currentIndex--;
        }
        loadSong(currentIndex);
        isPlaying = true;
    }

    function updatePlayIcon() {
        const pauseIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
        const playIcon = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>`;
        const icon = isPlaying ? pauseIcon : playIcon;
        btnPlay.innerHTML = icon;
        btnPlaySmall.innerHTML = icon;

        if (isPlaying) {
            coverFull.classList.add('playing');
            coverSmall.classList.add('playing');
        } else {
            coverFull.classList.remove('playing');
            coverSmall.classList.remove('playing');
        }
    }

    function toggleMode() {
        playMode = (playMode + 1) % 3;
        // Icons: 0: Loop All, 1: Loop One, 2: Random
        const modeIcons = [
            `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>`,
            `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path><text x="12" y="15" font-size="8" text-anchor="middle" fill="currentColor" stroke="none">1</text></svg>`,
            `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>`
        ];
        btnMode.innerHTML = modeIcons[playMode];
    }

    audio.addEventListener('play', () => {
        isPlaying = true;
        updatePlayIcon();
    });

    audio.addEventListener('pause', () => {
        isPlaying = false;
        updatePlayIcon();
    });

    audio.addEventListener('timeupdate', () => {
        const p = (audio.currentTime / audio.duration) * 100 || 0;
        progressBar.style.width = p + '%';
        progressV.style.width = p + '%';
        updateLyrics();
    });

    audio.addEventListener('ended', () => {
        if (playMode === 1) {
            // Loop One
            audio.currentTime = 0;
            audio.play();
        } else {
            nextSong();
        }
    });

    // Control Listeners
    document.getElementById('player-cover-btn').addEventListener('click', nextSong);
    document.querySelector('.player-cover-container.small').addEventListener('click', nextSong);

    btnPlay.addEventListener('click', togglePlay);
    btnPlaySmall.addEventListener('click', togglePlay);
    btnPrev.addEventListener('click', prevSong);
    btnNext.addEventListener('click', nextSong);
    
    btnRewind.addEventListener('click', () => {
        audio.currentTime = Math.max(0, audio.currentTime - 10);
    });
    btnForward.addEventListener('click', () => {
        audio.currentTime = Math.min(audio.duration, audio.currentTime + 10);
    });
    btnMode.addEventListener('click', toggleMode);
    btnList.addEventListener('click', togglePlaylist);

    // Progress bar click
    progressWrap.addEventListener('click', (e) => {
        const rect = progressWrap.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        if (audio.duration) audio.currentTime = percent * audio.duration;
    });

    progressWrapV.addEventListener('click', (e) => {
        const rect = progressWrapV.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        if (audio.duration) audio.currentTime = percent * audio.duration;
    });

    // Init
    initSidebarState();
    loadSong(currentIndex);
})();
