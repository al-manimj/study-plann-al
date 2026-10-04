document.addEventListener('DOMContentLoaded', () => {
    const taskForm = document.getElementById('taskForm');
    const taskNameInput = document.getElementById('taskName');
    const courseNameInput = document.getElementById('courseName');
    const deadlineInput = document.getElementById('deadline');
    const activeTasksList = document.getElementById('activeTasksList');
    const completedTasksList = document.getElementById('completedTasksList');

    let tasks = [];

    // Load from LocalStorage
    function loadTasks() {
        const storedTasks = localStorage.getItem('studyPlannerTasks');
        if (storedTasks) {
            tasks = JSON.parse(storedTasks);
        }
        renderTasks();
    }

    // Save to LocalStorage
    function saveTasks() {
        localStorage.setItem('studyPlannerTasks', JSON.stringify(tasks));
    }

    // Helper: escape HTML to prevent XSS
    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    // Helper: calculate time differences
    function getTimeDetails(deadlineStr) {
        const now = new Date();
        const deadline = new Date(deadlineStr);
        const diffMs = deadline - now;
        const diffHours = diffMs / (1000 * 60 * 60);
        const diffDays = diffHours / 24;

        return { diffMs, diffHours, diffDays };
    }

    // Get urgency level string based on hours left
    function getUrgencyClass(deadlineStr) {
        const { diffHours } = getTimeDetails(deadlineStr);
        if (diffHours < 24) return 'urgency-red';
        if (diffHours <= 72) return 'urgency-yellow'; // 3 days = 72 hours
        return 'urgency-green';
    }

    // Format countdown text based on remaining time
    function formatCountdown(deadlineStr) {
        const { diffMs, diffHours, diffDays } = getTimeDetails(deadlineStr);
        
        if (diffMs < 0) {
            const absHours = Math.abs(diffHours);
            if (absHours < 24) {
                return `Terlambat ${Math.floor(absHours)} jam!`;
            }
            return `Terlambat ${Math.floor(Math.abs(diffDays))} hari!`;
        }

        if (diffHours < 24) {
            const hours = Math.floor(diffHours);
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            if (hours === 0) return `Sisa ${minutes} menit`;
            return `Sisa ${hours} jam ${minutes} mnt`;
        }
        
        const days = Math.floor(diffDays);
        const remainingHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return `Sisa ${days} hari ${remainingHours} jam`;
    }
    
    // Format date string for display (e.g., "15 Nov 2023, 23:59")
    function formatDate(deadlineStr) {
        const date = new Date(deadlineStr);
        return date.toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Render tasks to DOM
    function renderTasks() {
        activeTasksList.innerHTML = '';
        completedTasksList.innerHTML = '';

        // Separate and sort active tasks (ascending: closest deadline first)
        const activeTasks = tasks.filter(t => t.status === 'aktif');
        activeTasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

        // Separate completed tasks
        const completedTasks = tasks.filter(t => t.status === 'selesai');
        completedTasks.sort((a, b) => new Date(b.deadline) - new Date(a.deadline)); // latest first

        if (activeTasks.length === 0) {
            activeTasksList.innerHTML = '<p class="empty-state">Tidak ada tugas aktif. Waktunya bersantai! 🎉</p>';
        }

        activeTasks.forEach(task => {
            const urgencyClass = getUrgencyClass(task.deadline);
            const countdownText = formatCountdown(task.deadline);
            
            const li = document.createElement('li');
            li.className = `task-item active-task ${urgencyClass}`;
            li.innerHTML = `
                <div class="task-info">
                    <h3>${escapeHTML(task.namaTugas)}</h3>
                    <p class="course-name"><i class="fas fa-book"></i> ${escapeHTML(task.mataKuliah)}</p>
                    <p class="deadline-time"><i class="fas fa-calendar-alt"></i> ${formatDate(task.deadline)}</p>
                    <p class="countdown"><i class="fas fa-clock"></i> ${countdownText}</p>
                </div>
                <div class="task-actions">
                    <button class="btn-icon btn-done" onclick="toggleTaskStatus('${task.id}')" title="Tandai Selesai">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteTask('${task.id}')" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            activeTasksList.appendChild(li);
        });

        if (completedTasks.length === 0) {
            completedTasksList.innerHTML = '<p class="empty-state">Belum ada tugas yang diselesaikan.</p>';
        }

        completedTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item completed-task`;
            li.innerHTML = `
                <div class="task-info">
                    <h3>${escapeHTML(task.namaTugas)}</h3>
                    <p class="course-name"><i class="fas fa-book"></i> ${escapeHTML(task.mataKuliah)}</p>
                </div>
                <div class="task-actions">
                    <button class="btn-icon btn-undo" onclick="toggleTaskStatus('${task.id}')" title="Batal Selesai">
                        <i class="fas fa-undo"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteTask('${task.id}')" title="Hapus">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            completedTasksList.appendChild(li);
        });
    }

    // Handle form submit
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const namaTugas = taskNameInput.value.trim();
        const mataKuliah = courseNameInput.value.trim();
        const deadline = deadlineInput.value;

        if (!namaTugas || !mataKuliah || !deadline) {
            alert('Mohon isi semua field!');
            return;
        }

        const newTask = {
            id: Date.now().toString(),
            namaTugas,
            mataKuliah,
            deadline,
            status: 'aktif',
            createdAt: new Date().toISOString()
        };

        tasks.push(newTask);
        saveTasks();
        renderTasks();

        taskForm.reset(); // clear form
    });

    // Make functions globally accessible for inline onclick handlers
    window.toggleTaskStatus = function(id) {
        const task = tasks.find(t => t.id === id);
        if (task) {
            task.status = task.status === 'aktif' ? 'selesai' : 'aktif';
            saveTasks();
            renderTasks();
        }
    };

    window.deleteTask = function(id) {
        if(confirm('Yakin ingin menghapus tugas ini?')) {
            tasks = tasks.filter(t => t.id !== id);
            saveTasks();
            renderTasks();
        }
    };

    // Initialize application
    loadTasks();

    // Update countdown and visual state every 1 minute
    setInterval(() => {
        renderTasks();
    }, 60000);
});
