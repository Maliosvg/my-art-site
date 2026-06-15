(function() {
    const originalPlaylist = [
        { id: 1372721552, name: '又是一天', artist: 'Shanghai Qiutian' },
        { id: 1811964999, name: '我等你们在崇明海边', artist: 'Shanghai Qiutian' },
        { id: 1811964998, name: 'Always a Place', artist: 'Shanghai Qiutian' },
        { id: 2086033930, name: '妳是我見過紫砂最多次的女生', artist: 'snovv' }
    ];
    let playlist = [...originalPlaylist];
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
    const btnLyrics = document.getElementById('ap-lyrics-btn');
    const btnPlaylist = document.getElementById('ap-playlist-btn');
    const playlistBox = document.getElementById('ap-playlist-box');
    const playlistList = document.getElementById('ap-playlist-list');
    let showingList = false;
    
    // Player DOM - Collapsed
    const coverSmall = document.getElementById('ap-cover-small');
    const btnPlaySmall = document.getElementById('ap-play-btn-small');
    const progressWrapSmall = document.getElementById('ap-progress-wrap-small');
    const progressSmall = document.getElementById('ap-progress-small');
    
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

    // --- Mobile Sidebar Logic ---
    const mobileBtn = document.getElementById('mobile-hamburger-btn');
    const mobileOverlay = document.getElementById('sidebar-mobile-overlay');

    if (mobileBtn && mobileOverlay) {
        mobileBtn.addEventListener('click', () => {
            sidebar.classList.add('mobile-open');
            mobileOverlay.classList.add('active');
            mobileBtn.style.transform = 'scale(0)';
            setTimeout(() => mobileBtn.style.display = 'none', 200);
        });

        mobileOverlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            mobileOverlay.classList.remove('active');
            mobileBtn.style.display = 'flex';
            setTimeout(() => mobileBtn.style.transform = 'scale(1)', 10);
        });
    }

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
            // Fetch everything in parallel
            const [detailRes, urlRes, lrcRes] = await Promise.all([
                fetch(`${API_BASE}/song/detail?ids=${id}`),
                fetch(`${API_BASE}/song/url?id=${id}`),
                fetch(`${API_BASE}/lyric?id=${id}`).catch(() => null)
            ]);
            
            const detailData = await detailRes.json();
            const urlData = await urlRes.json();
            const lrcData = lrcRes ? await lrcRes.json() : null;
            
            // Handle Lyrics
            if (lrcData && lrcData.lrc && lrcData.lrc.lyric) {
                parseLyrics(lrcData.lrc.lyric);
            } else {
                parsedLyrics = [{time: 0, text: '纯音乐或暂无歌词'}];
                renderLyrics();
            }

            // Handle Detail
            if (detailData.songs && detailData.songs.length > 0) {
                const song = detailData.songs[0];
                titleEl.textContent = song.name;
                artistEl.textContent = song.ar.map(a => a.name).join(', ');
                const coverUrl = song.al.picUrl + '?param=100y100';
                coverFull.src = coverUrl;
                coverSmall.src = coverUrl;
            }

            // Handle Audio URL
            if (urlData.data && urlData.data.length > 0 && urlData.data[0].url) {
                audio.src = urlData.data[0].url;
                if (isPlaying) {
                    audio.play();
                }
                preloadNextSong();
            } else {
                titleEl.textContent = 'VIP/Copyright limit';
                artistEl.textContent = 'Error';
                setTimeout(() => nextSong(), 2000);
            }

        } catch (e) {
            console.error('Failed to load song', e);
            titleEl.textContent = 'Network Error';
        }
        renderPlaylist();
    }
    
    function preloadNextSong() {
        let nextIndex = (currentIndex + 1) % playlist.length;
        const nextId = playlist[nextIndex].id;
        // Quietly fetch the next song's data to cache it
        fetch(`${API_BASE}/song/detail?ids=${nextId}`);
        fetch(`${API_BASE}/song/url?id=${nextId}`);
        fetch(`${API_BASE}/lyric?id=${nextId}`);
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
                const activeLine = lines[activeIndex];
                const offset = activeLine.offsetTop - (lyricsBox.clientHeight / 2) + (activeLine.clientHeight / 2);
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

    function showLyrics() {
        showingList = false;
        lyricsBox.style.display = 'block';
        playlistBox.style.display = 'none';
        if (btnLyrics) btnLyrics.style.color = 'var(--theme-blue)';
        if (btnPlaylist) btnPlaylist.style.color = '';
    }

    function showPlaylist() {
        showingList = true;
        lyricsBox.style.display = 'none';
        playlistBox.style.display = 'block';
        if (btnPlaylist) btnPlaylist.style.color = 'var(--theme-blue)';
        if (btnLyrics) btnLyrics.style.color = '';
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
        currentIndex++;
        loadSong(currentIndex);
        isPlaying = true;
    }

    function prevSong() {
        currentIndex--;
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

    function shuffleArray(array) {
        let newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    function toggleMode() {
        const currentSongId = playlist[currentIndex].id;
        playMode = (playMode + 1) % 3;
        
        if (playMode === 2) {
            playlist = shuffleArray(originalPlaylist);
        } else {
            playlist = [...originalPlaylist];
        }
        
        currentIndex = playlist.findIndex(s => s.id === currentSongId);
        if (currentIndex === -1) currentIndex = 0;
        renderPlaylist();
        
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
        if (progressSmall) progressSmall.style.width = p + '%';
        updateLyrics();
    });

    function seekAudio(e) {
        if (!audio.duration) return;
        const rect = this.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audio.currentTime = percent * audio.duration;
    }
    
    if (progressWrap) progressWrap.addEventListener('click', seekAudio);
    if (progressWrapSmall) progressWrapSmall.addEventListener('click', seekAudio);

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
    if (btnLyrics) btnLyrics.addEventListener('click', showLyrics);
    if (btnPlaylist) btnPlaylist.addEventListener('click', showPlaylist);

    // Init
    initSidebarState();
    showLyrics();
    loadSong(currentIndex);
})();
