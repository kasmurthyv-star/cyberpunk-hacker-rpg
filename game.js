// Cyberpunk Netrunner: Neon Grid - Core Gameplay Logic

document.addEventListener('DOMContentLoaded', () => {
  // --- Game State Variables ---
  const state = {
    // Player Stats
    codename: 'NEO_GHOST',
    archetype: 'codebreaker', // 'codebreaker', 'infiltrator', 'soldier'
    credits: 150,
    ram: { current: 8, max: 8 },
    cpu: 2.4, // GHz
    heat: 0, // Heat percentage (0 to 100)
    programs: [], // Installed cyberware/programs
    depth: 1, // Current subnet depth level (1 to 3)
    
    // Grid Map State
    nodes: [],
    currentNode: null,
    targetNode: null, // Node selected to hack/visit
    
    // Hacking State (Breach Protocol Matrix)
    matrix: [],
    matrixSize: 5,
    bufferSize: 4,
    buffer: [],
    sequences: [], // Target code sequences
    hackTimeLimit: 45, // seconds
    hackTimerInterval: null,
    hackTimeRemaining: 0,
    activeSelectionType: 'row', // 'row' or 'col'
    activeSelectionIndex: 0, // row or col index that is currently active
    usedMatrixCells: [], // index array of clicked cells [r, c]
    
    // Sound engine reference
    soundEnabled: true
  };

  // --- HTML Elements Cache ---
  const screens = {
    startup: document.getElementById('screen-startup'),
    grid: document.getElementById('screen-grid'),
    hack: document.getElementById('screen-hack'),
    shop: document.getElementById('screen-shop'),
    gameover: document.getElementById('screen-gameover')
  };

  const el = {
    soundBtn: document.getElementById('sound-toggle-btn'),
    themeBtn: document.getElementById('theme-toggle-btn'),
    gridDepth: document.getElementById('grid-depth'),
    statCodename: document.getElementById('stat-codename'),
    statClass: document.getElementById('stat-class'),
    statRamCurr: document.getElementById('stat-ram-curr'),
    statRamMax: document.getElementById('stat-ram-max'),
    ramProgress: document.getElementById('ram-progress'),
    statCpu: document.getElementById('stat-cpu'),
    statCredits: document.getElementById('stat-credits'),
    statHeatVal: document.getElementById('stat-heat-val'),
    heatProgress: document.getElementById('heat-progress'),
    traceWarning: document.getElementById('trace-warning'),
    programsList: document.getElementById('programs-list'),
    
    // Startup elements
    codenameInput: document.getElementById('codename-input'),
    classCards: document.querySelectorAll('.class-card'),
    startGameBtn: document.getElementById('start-game-btn'),
    
    // Grid elements
    gridMap: document.getElementById('grid-map'),
    gridNodesWrapper: document.getElementById('grid-nodes-wrapper'),
    gridConnections: document.getElementById('grid-connections'),
    
    // Hacking elements
    hackNodeTitle: document.getElementById('hack-node-title'),
    hackNodeSubtitle: document.getElementById('hack-node-subtitle'),
    hackTimer: document.getElementById('hack-timer'),
    matrixGrid: document.getElementById('matrix-grid'),
    sequencesList: document.getElementById('sequences-list'),
    bufferSlots: document.getElementById('buffer-slots'),
    abortHackBtn: document.getElementById('abort-hack-btn'),
    
    // Shop elements
    shopItemsContainer: document.getElementById('shop-items-container'),
    leaveShopBtn: document.getElementById('leave-shop-btn'),
    
    // Game Over elements
    gameoverTitle: document.getElementById('gameover-title'),
    gameoverGraphic: document.getElementById('gameover-graphic'),
    reportCodename: document.getElementById('report-codename'),
    reportClass: document.getElementById('report-class'),
    reportCredits: document.getElementById('report-credits'),
    reportDepth: document.getElementById('report-depth'),
    reportStatus: document.getElementById('report-status'),
    restartGameBtn: document.getElementById('restart-game-btn'),
    
    // Terminal Log
    terminalBody: document.getElementById('terminal-body')
  };

  // --- Sound Toggle Binding ---
  el.soundBtn.addEventListener('click', () => {
    state.soundEnabled = window.sfx.toggle();
    el.soundBtn.querySelector('.btn-text').innerText = state.soundEnabled ? 'AUDIO: ON' : 'AUDIO: OFF';
    if (state.soundEnabled) {
      window.sfx.playClick();
    }
  });

  // --- Theme Toggle Binding ---
  const themes = ['neon', 'matrix', 'amber', 'chrome'];
  let currentThemeIdx = 0;
  
  el.themeBtn.addEventListener('click', () => {
    // Remove previous theme class
    const prevTheme = themes[currentThemeIdx];
    if (prevTheme !== 'neon') {
      document.body.classList.remove(`theme-${prevTheme}`);
    }
    
    // Cycle index
    currentThemeIdx = (currentThemeIdx + 1) % themes.length;
    const newTheme = themes[currentThemeIdx];
    
    // Add new theme class
    if (newTheme !== 'neon') {
      document.body.classList.add(`theme-${newTheme}`);
    }
    
    el.themeBtn.querySelector('.btn-text').innerText = `THEME: ${newTheme.toUpperCase()}`;
    
    if (state.soundEnabled) {
      window.sfx.playClick();
    }
    
    logToConsole(`System: Display palette shifted to ${newTheme.toUpperCase()}`, 'info');
  });

  // Hover sound bindings for general buttons
  document.querySelectorAll('.cyber-btn, .class-card').forEach(item => {
    item.addEventListener('mouseenter', () => {
      if (state.soundEnabled) window.sfx.playHover();
    });
  });

  // --- Helper: Interactive Terminal Logging ---
  function logToConsole(message, type = 'system') {
    const line = document.createElement('div');
    line.className = `terminal-line ${type}-line`;
    
    const timestamp = new Date().toLocaleTimeString().split(' ')[0];
    line.innerHTML = `<span class="system-line">[${timestamp}]</span> ${message}`;
    
    el.terminalBody.appendChild(line);
    el.terminalBody.scrollTop = el.terminalBody.scrollHeight;

    if (state.soundEnabled) {
      window.sfx.playClick();
    }
  }

  // --- Screen Navigation ---
  function showScreen(screenKey) {
    Object.keys(screens).forEach(key => {
      if (key === screenKey) {
        screens[key].classList.add('active-screen');
      } else {
        screens[key].classList.remove('active-screen');
      }
    });
  }

  // --- Class Selection Setup ---
  el.classCards.forEach(card => {
    card.addEventListener('click', () => {
      el.classCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.archetype = card.dataset.class;
      if (state.soundEnabled) window.sfx.playConfirm();
    });
  });

  // --- Start Game (Jack In) ---
  el.startGameBtn.addEventListener('click', () => {
    // Read input codename
    const enteredName = el.codenameInput.value.trim().toUpperCase();
    state.codename = enteredName || 'NEO_GHOST';
    
    // Initialize Archetype stats
    if (state.archetype === 'codebreaker') {
      state.ram.max = 8;
      state.ram.current = 8;
      state.cpu = 2.4;
      state.bufferSize = 5; // Extra buffer
      state.credits = 150;
      state.programs = ['DECRYPTOR_v1.0'];
    } else if (state.archetype === 'infiltrator') {
      state.ram.max = 10;
      state.ram.current = 10;
      state.cpu = 1.6;
      state.bufferSize = 4;
      state.credits = 100;
      state.programs = ['STEALTH_CLOAK_v1'];
    } else if (state.archetype === 'soldier') {
      state.ram.max = 6;
      state.ram.current = 6;
      state.cpu = 1.2;
      state.bufferSize = 4;
      state.credits = 120;
      state.programs = ['FIREWALL_SHIELD'];
    }

    state.heat = 0;
    state.depth = 1;

    // Play synthesized neural Sweep SFX
    if (state.soundEnabled) window.sfx.playJackIn();

    updateUIStats();
    generateGridMap();
    showScreen('grid');
    
    logToConsole(`Neural connection established for Netrunner: ${state.codename}`, 'success');
    logToConsole(`Cyberdeck hardware active. Class archetype registered: ${state.archetype.toUpperCase()}`, 'info');
    logToConsole(`Alert: Attempting subnet hack depth: LEVEL_1...`, 'warning');
  });

  // --- Update HUD/Sidebar Stats UI ---
  function updateUIStats() {
    el.statCodename.innerText = state.codename;
    el.statClass.innerText = state.archetype.toUpperCase();
    el.statRamCurr.innerText = state.ram.current;
    el.statRamMax.innerText = state.ram.max;
    
    // RAM Progress Bar
    const ramPct = (state.ram.current / state.ram.max) * 100;
    el.ramProgress.style.width = `${ramPct}%`;

    el.statCpu.innerText = `${state.cpu.toFixed(1)} GHz`;
    el.statCredits.innerText = `${state.credits} ₵`;

    // Heat Level Bar
    el.statHeatVal.innerText = `${Math.min(100, Math.floor(state.heat))}%`;
    el.heatProgress.style.width = `${Math.min(100, state.heat)}%`;

    if (state.heat >= 80) {
      el.traceWarning.innerText = 'TRACE STATUS: IMMEDIATE CORP THREAT DETECTED';
      el.traceWarning.classList.add('active');
    } else if (state.heat >= 40) {
      el.traceWarning.innerText = 'TRACE STATUS: NEXUS GRID SWEEP ACTIVE';
      el.traceWarning.classList.add('active');
    } else {
      el.traceWarning.innerText = 'TRACE STATUS: COLD / INACTIVE';
      el.traceWarning.classList.remove('active');
    }

    // Programs list HTML binding
    el.programsList.innerHTML = '';
    if (state.programs.length === 0) {
      el.programsList.innerHTML = '<li>No external modules loaded</li>';
    } else {
      state.programs.forEach(prog => {
        const li = document.createElement('li');
        li.innerText = prog;
        el.programsList.appendChild(li);
      });
    }

    el.gridDepth.innerText = `DEPTH: SUB-LEVEL_${state.depth}`;
  }

  // --- Node Map Procedural Generator ---
  function generateGridMap() {
    el.gridNodesWrapper.innerHTML = '';
    el.gridConnections.innerHTML = '';
    
    const nodes = [];
    const containerWidth = el.gridMap.clientWidth || 800;
    const containerHeight = el.gridMap.clientHeight || 450;
    
    // Setup Columns
    // Column 0: Start Node
    // Column 1, 2, 3: Random Node mix (Credits Data Havens, Store markets, Firewall Hacks)
    // Column 4: Megacorp Core Database Boss Node
    const cols = 5;
    const colWidth = containerWidth / cols;
    
    // Generate nodes by columns
    const nodeIndexMap = [];
    let idCounter = 0;
    
    for (let c = 0; c < cols; c++) {
      nodeIndexMap[c] = [];
      
      if (c === 0) {
        // Start node
        const node = {
          id: idCounter++,
          col: c,
          x: colWidth / 2,
          y: containerHeight / 2,
          type: 'start',
          name: 'LOCAL_GATEWAY',
          label: 'Local Gateway',
          status: 'cleared',
          accessible: true
        };
        nodes.push(node);
        nodeIndexMap[c].push(node);
        state.currentNode = node;
      } 
      else if (c === cols - 1) {
        // Core Boss node
        const node = {
          id: idCounter++,
          col: c,
          x: containerWidth - (colWidth / 2),
          y: containerHeight / 2,
          type: 'boss',
          name: 'NEXUS_CORE_DB',
          label: 'NEXUS Core DB',
          status: 'locked',
          accessible: false
        };
        nodes.push(node);
        nodeIndexMap[c].push(node);
      } 
      else {
        // Intermediary nodes: 2 to 3 nodes per column
        const numNodesInCol = Math.floor(Math.random() * 2) + 2; // 2 or 3
        const ySpacing = containerHeight / (numNodesInCol + 1);
        
        for (let r = 0; r < numNodesInCol; r++) {
          // Determine Node type (Weighted: 45% security breach, 35% data credits, 20% shop market)
          const rand = Math.random();
          let type = 'security';
          let name = 'FIREWALL_SEC';
          let label = 'Corp Firewall';
          
          if (rand < 0.45) {
            type = 'security';
            name = 'FIREWALL_SEC';
            label = 'Corp Firewall';
          } else if (rand < 0.8) {
            type = 'data';
            name = 'DATA_HAVEN';
            label = 'Credits Vault';
          } else {
            type = 'shop';
            name = 'TECH_MARKET';
            label = 'Cyber Market';
          }
          
          const node = {
            id: idCounter++,
            col: c,
            x: c * colWidth + (colWidth / 2) + (Math.random() * 40 - 20),
            y: (r + 1) * ySpacing + (Math.random() * 40 - 20),
            type: type,
            name: `${name}_${Math.floor(Math.random() * 900 + 100)}`,
            label: label,
            status: 'locked',
            accessible: false
          };
          nodes.push(node);
          nodeIndexMap[c].push(node);
        }
      }
    }
    
    // Connect columns sequentially (Col c to Col c+1)
    const connections = [];
    for (let c = 0; c < cols - 1; c++) {
      const currentColsNodes = nodeIndexMap[c];
      const nextColsNodes = nodeIndexMap[c+1];
      
      currentColsNodes.forEach(nodeA => {
        nodeA.connections = nodeA.connections || [];
        
        // Ensure every node connects to at least one in the next column
        // We can distribute connections: NodeA connects to nodes close to it vertically in the next column
        nextColsNodes.forEach(nodeB => {
          nodeB.connections = nodeB.connections || [];
          
          // Connect if vertical distance is reasonable or to ensure path
          const distY = Math.abs(nodeA.y - nodeB.y);
          if (distY < containerHeight * 0.7 || nextColsNodes.length === 1) {
            connections.push({ from: nodeA, to: nodeB });
            nodeA.connections.push(nodeB.id);
            nodeB.connections.push(nodeA.id);
          }
        });
      });
    }

    state.nodes = nodes;
    
    // Mark starting adjacent nodes as accessible
    updateAccessibleNodes();
    
    // Draw connections and render HTML Nodes
    renderGridNodes();
    drawConnections(connections);
  }

  function updateAccessibleNodes() {
    state.nodes.forEach(node => {
      // Clear accessibility first
      if (node.type !== 'start' && node.status !== 'cleared') {
        node.accessible = false;
      }
    });

    if (state.currentNode) {
      // Current node is accessible and cleared
      state.currentNode.status = 'cleared';
      state.currentNode.accessible = true;
      
      // Node IDs connected to current node
      state.currentNode.connections.forEach(connId => {
        const node = state.nodes.find(n => n.id === connId);
        if (node && node.col > state.currentNode.col) {
          node.accessible = true;
        }
      });
    }
  }

  function renderGridNodes() {
    el.gridNodesWrapper.innerHTML = '';
    
    state.nodes.forEach(node => {
      const nodeEl = document.createElement('div');
      let classList = `network-node node-${node.type}`;
      
      if (node.accessible) classList += ' accessible';
      if (node.id === state.currentNode.id) classList += ' current';
      
      nodeEl.className = classList;
      nodeEl.style.left = `${node.x}px`;
      nodeEl.style.top = `${node.y}px`;
      nodeEl.dataset.id = node.id;
      
      // Determine Icon
      let icon = '⚫';
      if (node.type === 'start') icon = '⌂';
      else if (node.type === 'data') icon = '₵';
      else if (node.type === 'security') icon = '⚔';
      else if (node.type === 'shop') icon = '🛒';
      else if (node.type === 'boss') icon = '⚛';
      
      nodeEl.innerHTML = `
        <span class="node-icon">${icon}</span>
        <span class="node-label">${node.label}</span>
      `;
      
      // Event handler
      nodeEl.addEventListener('click', () => handleNodeClick(node));
      
      el.gridNodesWrapper.appendChild(nodeEl);
    });
  }

  function drawConnections(connections) {
    el.gridConnections.innerHTML = '';
    
    connections.forEach(conn => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', conn.from.x);
      line.setAttribute('y1', conn.from.y);
      line.setAttribute('x2', conn.to.x);
      line.setAttribute('y2', conn.to.y);
      
      // Highlight the line if it starts from current node and is available to traverse
      const isTraversed = conn.from.id === state.currentNode.id && conn.to.accessible;
      line.setAttribute('class', isTraversed ? 'connection-line active-route' : 'connection-line');
      
      el.gridConnections.appendChild(line);
    });
  }

  // --- Node Interactions / Movement ---
  function handleNodeClick(node) {
    if (!node.accessible) {
      if (state.soundEnabled) window.sfx.playFailure();
      logToConsole(`Error: Node connection lock active. Complete immediate node breach first.`, 'alert');
      return;
    }

    if (node.id === state.currentNode.id) {
      logToConsole(`Info: Already linked to console gateway. Choose adjacent nodes to progress.`, 'info');
      return;
    }

    state.targetNode = node;
    if (state.soundEnabled) window.sfx.playMove();

    logToConsole(`Target locked: Infiltrating Node ${node.name}...`, 'info');

    // Handle different node types
    if (node.type === 'shop') {
      enterShop();
    } else if (node.type === 'data') {
      // Standard credits node: Instant download with slight Heat penalty
      const rewards = Math.floor(Math.random() * 60) + 40; // 40 - 100 credits
      const heatPenalty = state.archetype === 'infiltrator' ? 8 : 12;
      
      state.credits += rewards;
      state.heat += heatPenalty;
      node.status = 'cleared';
      state.currentNode = node;
      
      if (state.soundEnabled) window.sfx.playSuccess();
      logToConsole(`Data node breach successful! Extracted: ${rewards} ₵`, 'success');
      logToConsole(`Alert: Connection heat increased by +${heatPenalty}%`, 'warning');
      
      updateAccessibleNodes();
      updateUIStats();
      renderGridNodes();
      drawConnectionsBetweenNodes();
    } else if (node.type === 'security' || node.type === 'boss') {
      // Hacking interface initiated
      startHackingGame(node);
    }
  }

  // Re-draw connection lines when layout status updates
  function drawConnectionsBetweenNodes() {
    const list = [];
    state.nodes.forEach(nodeA => {
      nodeA.connections.forEach(connId => {
        const nodeB = state.nodes.find(n => n.id === connId);
        if (nodeB && nodeA.col < nodeB.col) {
          list.push({ from: nodeA, to: nodeB });
        }
      });
    });
    drawConnections(list);
  }

  // --- Hacking Mini-game (Breach Protocol) ---
  function startHackingGame(node) {
    showScreen('hack');
    el.hackNodeTitle.innerText = node.type === 'boss' ? 'NEXUS CORP SECURITY DATABASE CORE' : 'SECURE NODE INFILTRATION';
    el.hackNodeSubtitle.innerText = node.type === 'boss' ? 'SECURITY CODE INTEGRITY: EXTREME' : 'FIREWALL ENCRYPTION DETECTED';
    
    // Config difficulty based on Node and Depth
    const matrixMultiplier = node.type === 'boss' ? 1 : 0;
    state.matrixSize = Math.min(6, 4 + state.depth + matrixMultiplier);
    
    // Set timer based on depth and CPU power
    // Faster CPU = more hack time remaining!
    const baseTime = node.type === 'boss' ? 40 : 35;
    state.hackTimeRemaining = baseTime + Math.floor(state.cpu * 5) - (state.depth * 5);
    el.hackTimer.innerText = `${state.hackTimeRemaining.toFixed(1)}s`;

    // Buffer slots based on archetype
    state.buffer = [];
    const bufferUiCount = state.bufferSize;
    el.bufferSlots.innerHTML = '';
    for (let i = 0; i < bufferUiCount; i++) {
      const slot = document.createElement('div');
      slot.className = 'buffer-slot';
      slot.id = `buffer-slot-${i}`;
      el.bufferSlots.appendChild(slot);
    }

    // Generate breach elements
    generateBreachMatrixAndSequences(node);
    
    // Set selection limits
    state.activeSelectionType = 'row'; // First selection must be in the first row
    state.activeSelectionIndex = 0; // Row 0
    state.usedMatrixCells = [];

    renderHackingUI();

    // Start timer interval
    if (state.hackTimerInterval) clearInterval(state.hackTimerInterval);
    state.hackTimerInterval = setInterval(() => {
      state.hackTimeRemaining -= 0.1;
      if (state.hackTimeRemaining <= 0) {
        state.hackTimeRemaining = 0;
        clearInterval(state.hackTimerInterval);
        handleHackingFailure('BUFFER OVERFLOW // SEC_TRACE DETECTED');
      }
      el.hackTimer.innerText = `${state.hackTimeRemaining.toFixed(1)}s`;
      if (state.hackTimeRemaining <= 5) {
        el.hackTimer.classList.add('text-alert');
        if (state.soundEnabled && Math.random() < 0.1) window.sfx.playAlarm();
      } else {
        el.hackTimer.classList.remove('text-alert');
      }
    }, 100);

    logToConsole(`Firewall breach protocol active. Bypass required sequence before buffer overflow...`, 'warning');
  }

  function generateBreachMatrixAndSequences(node) {
    const hexCodes = ['1C', 'E9', '55', 'BD', '7A', 'FF'];
    
    // 1. Generate Matrix of size (matrixSize x matrixSize)
    state.matrix = [];
    for (let r = 0; r < state.matrixSize; r++) {
      state.matrix[r] = [];
      for (let c = 0; c < state.matrixSize; c++) {
        state.matrix[r][c] = hexCodes[Math.floor(Math.random() * hexCodes.length)];
      }
    }

    // 2. Generate target sequences
    // We will generate 2 target sequences (Primary objective to bypass firewall, Secondary to get bonus Credits/RAM)
    state.sequences = [];
    
    // Create random solvable paths
    const generateSolvableSequence = (len) => {
      const seq = [];
      let curRow = 0;
      let curCol = Math.floor(Math.random() * state.matrixSize);
      let stepRow = true; // start with row matching, wait first choice is in row 0, meaning column is variable.
      
      const visited = new Set();
      visited.add(`${curRow},${curCol}`);
      
      for (let i = 0; i < len; i++) {
        if (stepRow) {
          // select next column in the current row
          let possibleCols = [];
          for (let c = 0; c < state.matrixSize; c++) {
            if (!visited.has(`${curRow},${c}`)) possibleCols.push(c);
          }
          if (possibleCols.length === 0) break;
          curCol = possibleCols[Math.floor(Math.random() * possibleCols.length)];
        } else {
          // select next row in the current column
          let possibleRows = [];
          for (let r = 0; r < state.matrixSize; r++) {
            if (!visited.has(`${r},${curCol}`)) possibleRows.push(r);
          }
          if (possibleRows.length === 0) break;
          curRow = possibleRows[Math.floor(Math.random() * possibleRows.length)];
        }
        
        visited.add(`${curRow},${curCol}`);
        seq.push(state.matrix[curRow][curCol]);
        stepRow = !stepRow;
      }
      return seq.length > 0 ? seq : [hexCodes[0], hexCodes[1]];
    };

    // Primary bypass sequence: length 3 (boss: length 4)
    const primLen = node.type === 'boss' ? 4 : 3;
    const primSeq = generateSolvableSequence(primLen);
    
    // Secondary data leak sequence: length 2
    let secSeq = generateSolvableSequence(2);
    // ensure not identical
    if (secSeq.join(',') === primSeq.join(',')) {
      secSeq = [hexCodes[2], hexCodes[3]];
    }

    state.sequences = [
      {
        name: 'FIREWALL_BYPASS',
        seq: primSeq,
        creditsReward: node.type === 'boss' ? 300 : 100,
        completed: false,
        failed: false,
        primary: true
      },
      {
        name: 'DATABANK_EXTRACT',
        seq: secSeq,
        creditsReward: 70,
        completed: false,
        failed: false,
        primary: false
      }
    ];

    // If player has Decryptor Worm program, auto-complete the first code token of the Primary sequence!
    if (state.programs.includes('DECRYPTOR_v1.0') && state.sequences[0].seq.length > 0) {
      logToConsole(`Decryptor Worm loaded: Firewall primary bypass sequence token [${state.sequences[0].seq[0]}] bypassed automatically!`, 'info');
    }
  }

  function renderHackingUI() {
    el.matrixGrid.innerHTML = '';
    
    // Matrix size styles
    el.matrixGrid.style.gridTemplateColumns = `repeat(${state.matrixSize}, 1fr)`;
    el.matrixGrid.style.gridTemplateRows = `repeat(${state.matrixSize}, 1fr)`;
    
    for (let r = 0; r < state.matrixSize; r++) {
      for (let c = 0; c < state.matrixSize; c++) {
        const cellVal = state.matrix[r][c];
        const cellEl = document.createElement('div');
        cellEl.className = 'matrix-cell';
        cellEl.innerText = cellVal;
        
        const isUsed = state.usedMatrixCells.some(cell => cell[0] === r && cell[1] === c);
        
        if (isUsed) {
          cellEl.classList.add('used');
        } else {
          // Highlight active selection region
          if (state.activeSelectionType === 'row' && r === state.activeSelectionIndex) {
            cellEl.classList.add('highlight-row', 'clickable');
          } else if (state.activeSelectionType === 'col' && c === state.activeSelectionIndex) {
            cellEl.classList.add('highlight-col', 'clickable');
          }
          
          // Click handler for clickable cells
          if (cellEl.classList.contains('clickable')) {
            cellEl.addEventListener('click', () => handleCellClick(r, c, cellVal));
          }
        }
        
        el.matrixGrid.appendChild(cellEl);
      }
    }

    // Render Target Sequences
    el.sequencesList.innerHTML = '';
    state.sequences.forEach(seqObj => {
      const itemEl = document.createElement('div');
      let statusClass = '';
      if (seqObj.completed) statusClass = 'completed';
      else if (seqObj.failed) statusClass = 'failed';
      
      itemEl.className = `seq-item ${statusClass}`;
      
      // Calculate how many characters in sequence are matched already
      // Compare buffer tail with seqObj.seq
      const matchLength = getSequenceMatchCount(state.buffer, seqObj.seq);
      
      let tokensHtml = '';
      seqObj.seq.forEach((tok, idx) => {
        const matchedClass = idx < matchLength ? 'matched' : '';
        tokensHtml += `<span class="code-token ${matchedClass}">${tok}</span>`;
      });

      const label = seqObj.primary ? 'FIREWALL BYPASS (REQUIRED)' : 'DATA EXTRACT (BONUS)';
      const rewardText = seqObj.primary ? `${seqObj.creditsReward} ₵ + NEXT NODE` : `+${seqObj.creditsReward} ₵`;

      itemEl.innerHTML = `
        <div class="seq-name-row">
          <span>${label}</span>
          <span>${rewardText}</span>
        </div>
        <div class="seq-codes">
          ${tokensHtml}
        </div>
      `;
      el.sequencesList.appendChild(itemEl);
    });

    // Render Buffer
    for (let i = 0; i < state.bufferSize; i++) {
      const slot = document.getElementById(`buffer-slot-${i}`);
      if (slot) {
        if (i < state.buffer.length) {
          slot.innerText = state.buffer[i];
          slot.classList.add('filled');
        } else {
          slot.innerText = '';
          slot.classList.remove('filled');
        }
      }
    }
  }

  // Returns count of items matched consecutively from start of target seq in buffer progress
  function getSequenceMatchCount(buffer, targetSeq) {
    // Sliding match check to see how much of targetSeq matches the end or subset of buffer
    // For standard breach protocol, once a token matches, it advances. If a token mismatches, it resets
    // unless the mismatch itself starts the sequence. Let's do a strict subsequence tail matching.
    
    // We check the maximum suffix of buffer that matches a prefix of targetSeq.
    for (let matchLen = targetSeq.length; matchLen > 0; matchLen--) {
      if (buffer.length < matchLen) continue;
      
      const bufferSlice = buffer.slice(-matchLen);
      const targetSlice = targetSeq.slice(0, matchLen);
      
      if (bufferSlice.join(',') === targetSlice.join(',')) {
        return matchLen;
      }
    }
    return 0;
  }

  function handleCellClick(r, c, val) {
    if (state.soundEnabled) window.sfx.playClick();

    // Add code to buffer
    state.buffer.push(val);
    state.usedMatrixCells.push([r, c]);

    // Alternate selection: row clicked -> next column selection; column clicked -> next row selection
    if (state.activeSelectionType === 'row') {
      state.activeSelectionType = 'col';
      state.activeSelectionIndex = c;
    } else {
      state.activeSelectionType = 'row';
      state.activeSelectionIndex = r;
    }

    // Check target sequences
    checkSequences();

    // Re-render UI
    renderHackingUI();

    // Check buffer limit / failure state
    if (state.buffer.length >= state.bufferSize) {
      // Buffer full. Check if primary completed.
      const primarySeq = state.sequences.find(s => s.primary);
      setTimeout(() => {
        if (primarySeq && primarySeq.completed) {
          handleHackingSuccess();
        } else {
          handleHackingFailure('BUFFER FLOW OVERRUN // CRITICAL SECURITY TRIGGERED');
        }
      }, 300);
    } else {
      // Buffer not full yet. Check if ALL sequences are completed or resolved
      const allResolved = state.sequences.every(s => s.completed || s.failed);
      if (allResolved) {
        setTimeout(() => {
          const primarySeq = state.sequences.find(s => s.primary);
          if (primarySeq && primarySeq.completed) {
            handleHackingSuccess();
          } else {
            handleHackingFailure('MATRIX CODE RESOLUTION INCOMPLETE');
          }
        }, 300);
      }
    }
  }

  function checkSequences() {
    state.sequences.forEach(seqObj => {
      if (seqObj.completed || seqObj.failed) return;

      // Check if buffer contains sequence
      const matchedCount = getSequenceMatchCount(state.buffer, seqObj.seq);
      
      if (matchedCount === seqObj.seq.length) {
        seqObj.completed = true;
        if (state.soundEnabled) window.sfx.playSuccess();
        logToConsole(`Hacking log: Sub-sequence [${seqObj.seq.join(' ')}] bypassed!`, 'success');
      } else {
        // Check if sequence is failed: if remaining spaces in buffer are less than needed tokens
        const remainingBufferSlots = state.bufferSize - state.buffer.length;
        const remainingTokensNeeded = seqObj.seq.length - matchedCount;
        
        if (remainingTokensNeeded > remainingBufferSlots) {
          // If we can't possibly fit the sequence anymore, it's failed
          seqObj.failed = true;
        }
      }
    });
  }

  function handleHackingSuccess() {
    clearInterval(state.hackTimerInterval);
    
    // Accumulate rewards
    let earnedCreds = 0;
    state.sequences.forEach(s => {
      if (s.completed) {
        earnedCreds += s.creditsReward;
      }
    });

    // Apply special reduction program effects
    let baseHeatAdded = state.targetNode.type === 'boss' ? 25 : 15;
    if (state.archetype === 'infiltrator') {
      baseHeatAdded = Math.round(baseHeatAdded * 0.7); // -30% heat
    }
    if (state.programs.includes('FIREWALL_BYPASS')) {
      baseHeatAdded = Math.round(baseHeatAdded * 0.8); // -20% heat
    }

    state.credits += earnedCreds;
    state.heat += baseHeatAdded;
    
    state.targetNode.status = 'cleared';
    state.currentNode = state.targetNode;

    if (state.soundEnabled) window.sfx.playHackComplete();
    logToConsole(`SUCCESS! Node ${state.currentNode.name} firewall breached. Extracted: ${earnedCreds} ₵`, 'success');
    logToConsole(`Security Heat traced +${baseHeatAdded}%`, 'warning');

    // Trigger level boss win condition or node map progression
    if (state.targetNode.type === 'boss') {
      advanceSublevel();
    } else {
      updateAccessibleNodes();
      updateUIStats();
      showScreen('grid');
      drawConnectionsBetweenNodes();
    }
  }

  function handleHackingFailure(reason) {
    clearInterval(state.hackTimerInterval);
    if (state.soundEnabled) window.sfx.playGameOver();

    // Damage / Heat penalty on failure
    let baseHeatPenalty = state.targetNode.type === 'boss' ? 40 : 30;
    if (state.archetype === 'soldier') {
      baseHeatPenalty = Math.round(baseHeatPenalty * 0.6); // -40% firewall impact
    }

    state.heat += baseHeatPenalty;
    
    logToConsole(`BREACH FAILURE: ${reason}`, 'alert');
    logToConsole(`Grid traces active! Connection security alert +${baseHeatPenalty}% Heat`, 'alert');

    updateUIStats();

    // Check if Heat triggers Game Over (Corp Strike)
    if (state.heat >= 100) {
      triggerGameOver(false);
    } else {
      // Abort and go back to map, node remains locked but accessible
      showScreen('grid');
      drawConnectionsBetweenNodes();
    }
  }

  el.abortHackBtn.addEventListener('click', () => {
    if (state.soundEnabled) window.sfx.playConfirm();
    clearInterval(state.hackTimerInterval);
    
    // Aborting yields heat penalty
    const abortHeat = 15;
    state.heat += abortHeat;
    
    logToConsole(`Connection aborted by user. Deck system cooling... Security trace alert +${abortHeat}% Heat`, 'warning');
    
    updateUIStats();
    if (state.heat >= 100) {
      triggerGameOver(false);
    } else {
      showScreen('grid');
      drawConnectionsBetweenNodes();
    }
  });

  // --- Advance Grid Depth Levels (1 -> 2 -> 3 -> Win) ---
  function advanceSublevel() {
    if (state.depth >= 3) {
      // Game Win!
      triggerGameOver(true);
    } else {
      state.depth += 1;
      state.heat = Math.max(0, state.heat - 30); // Cool down between levels
      
      logToConsole(`GENESIS CORE SUB-DATABASE DECRYPTED. ADVANCING DEEPER INTO CORPORATE GRID DIRECTORY...`, 'success');
      logToConsole(`Deck heatsink flushed. Cooling down connection by -30% Heat`, 'info');
      
      updateUIStats();
      generateGridMap();
      showScreen('grid');
    }
  }

  // --- Tech Upgrades Market (Shop Node) ---
  const shopInventory = [
    {
      id: 'ram_booster',
      name: 'Neural RAM Module',
      desc: 'Expands available space for deck system threads. RAM capacity +2.',
      cost: 200,
      applied: false,
      onBuy: () => {
        state.ram.max += 2;
        state.ram.current += 2;
      }
    },
    {
      id: 'processor_core',
      name: 'Cybernetic CPU Core',
      desc: 'Advanced clock speeds increase firewall decryption time limit during breaches. CPU +0.6 GHz.',
      cost: 250,
      applied: false,
      onBuy: () => {
        state.cpu += 0.6;
      }
    },
    {
      id: 'heatsink_utility',
      name: 'Grid Flush Utilities (Single Use)',
      desc: 'Instantly vents cyberdeck systems, reducing Connection Heat trace by 50%.',
      cost: 100,
      applied: false,
      onBuy: () => {
        state.heat = Math.max(0, state.heat - 50);
      }
    },
    {
      id: 'decryptor_worm',
      name: 'Decryptor Worm v2.0',
      desc: 'Software program. Auto-solves the first target token of all primary security firewalls.',
      cost: 300,
      applied: false,
      onBuy: () => {
        state.programs.push('DECRYPTOR_v1.0');
      }
    },
    {
      id: 'firewall_bypass',
      name: 'Firewall Bypass Tuner',
      desc: 'Stealth injector. Reduces Security Heat alert levels generated from successful hacks by 20%.',
      cost: 250,
      applied: false,
      onBuy: () => {
        state.programs.push('FIREWALL_BYPASS');
      }
    }
  ];

  function enterShop() {
    showScreen('shop');
    renderShopItems();
    logToConsole(`Black-market connection established. Tech merchant ready to trade credits for hardware.`, 'info');
  }

  function renderShopItems() {
    el.shopItemsContainer.innerHTML = '';
    
    shopInventory.forEach(item => {
      const itemEl = document.createElement('div');
      
      // Determine if already installed (for programs only, standard hardware are buyable repeatedly)
      const isProgram = item.id === 'decryptor_worm' || item.id === 'firewall_bypass';
      const alreadyInstalled = isProgram && state.programs.some(p => p.includes(item.id === 'decryptor_worm' ? 'DECRYPTOR' : 'FIREWALL_BYPASS'));
      
      itemEl.className = `shop-item ${alreadyInstalled ? 'installed' : ''}`;
      
      const canAfford = state.credits >= item.cost;
      const btnText = alreadyInstalled ? 'INSTALLED' : (canAfford ? `INSTALL [₵${item.cost}]` : `CREDITS INSUFFICIENT`);
      const btnDisabled = alreadyInstalled || !canAfford;

      itemEl.innerHTML = `
        <div class="item-info">
          <span class="item-name">${item.name}</span>
          <span class="item-desc">${item.desc}</span>
          <span class="item-cost">Price: ${item.cost} ₵</span>
        </div>
        <div class="buy-btn-container">
          <button class="cyber-btn small-btn purchase-btn" ${btnDisabled ? 'disabled' : ''}>
            <span class="btn-glow"></span>
            <span class="btn-text">${btnText}</span>
          </button>
        </div>
      `;

      if (!btnDisabled) {
        itemEl.querySelector('.purchase-btn').addEventListener('click', () => {
          if (state.soundEnabled) window.sfx.playConfirm();
          
          state.credits -= item.cost;
          item.onBuy();
          
          logToConsole(`Purchased and loaded module: ${item.name}!`, 'success');
          
          updateUIStats();
          renderShopItems(); // refresh buttons
        });
      }

      el.shopItemsContainer.appendChild(itemEl);
    });
  }

  el.leaveShopBtn.addEventListener('click', () => {
    if (state.soundEnabled) window.sfx.playConfirm();
    
    // Move starting location to shop node and mark cleared
    state.targetNode.status = 'cleared';
    state.currentNode = state.targetNode;
    
    updateAccessibleNodes();
    updateUIStats();
    showScreen('grid');
    drawConnectionsBetweenNodes();
    
    logToConsole(`Connection to tech vendor closed. Returning to subnet map grid.`, 'system');
  });

  // --- Game Over / Win State ---
  function triggerGameOver(isWin) {
    showScreen('gameover');
    
    if (isWin) {
      el.gameoverTitle.innerText = 'DATABASE EXTRACTED';
      el.gameoverTitle.setAttribute('data-text', 'DATABASE EXTRACTED');
      el.gameoverTitle.className = 'glitch-text text-glow text-green';
      el.gameoverGraphic.innerText = '🔓';
      el.gameoverGraphic.style.textShadow = '0 0 20px rgba(57, 255, 20, 0.8)';
      
      el.reportStatus.innerText = 'MISSION ACCOMPLISHED // GENESIS CORE ACQUIRED';
      el.reportStatus.className = 'text-green text-glow';
      
      if (state.soundEnabled) window.sfx.playHackComplete();
      logToConsole(`CRITICAL SECURITY BYPASSED. THE GENESIS AI CORE SECURED. PLUGGING OUT SUCCESSFULLY!`, 'success');
    } else {
      el.gameoverTitle.innerText = 'LINK TERMINATED';
      el.gameoverTitle.setAttribute('data-text', 'LINK TERMINATED');
      el.gameoverTitle.className = 'glitch-text text-glow text-alert';
      el.gameoverGraphic.innerText = '💀';
      el.gameoverGraphic.style.textShadow = '0 0 20px rgba(255, 0, 127, 0.8)';
      
      el.reportStatus.innerText = 'NEURAL SHIELD CRASH // BLACK ICE TRACE FIRED';
      el.reportStatus.className = 'text-alert text-glow';
      
      if (state.soundEnabled) window.sfx.playGameOver();
      logToConsole(`SYSTEM ERROR: Neural shield collapsed. Corp black-ICE traces detected... Jacking out forcefully.`, 'alert');
    }

    el.reportCodename.innerText = state.codename;
    el.reportClass.innerText = state.archetype.toUpperCase();
    el.reportCredits.innerText = `${state.credits} ₵`;
    el.reportDepth.innerText = `Subnet Depth ${state.depth}`;
  }

  el.restartGameBtn.addEventListener('click', () => {
    if (state.soundEnabled) window.sfx.playConfirm();
    showScreen('startup');
    logToConsole(`Cyberdeck rebooting... Please authorize client credentials.`, 'info');
  });
});
