/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI } from "@google/genai";

// --- STATE MANAGEMENT ---
interface Wallpaper {
  id: string;
  prompt: string;
  imageUrl: string;
  aspectRatio: AspectRatio;
  timestamp: number;
  source: 'user' | 'demo';
}

type AspectRatio = "9:16" | "1:1" | "16:9";

let history: Wallpaper[] = []; // User's personal history
let demoHistory: Wallpaper[] = []; // Persistent history of all demos
let allGenerations: Wallpaper[] = []; // Global feed of user + demo
let demoPrompts: string[] = [];
let selectedAspectRatio: AspectRatio = "9:16";
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const PROMPT_POOL = [
  "Epic anime warrior under the moonlight",
  "Cute anime girl with cherry blossoms",
  "A futuristic cityscape in anime style",
  "Magical girl casting a powerful spell",
  "Steampunk airship flying through clouds",
  "A samurai warrior in a neon-lit Tokyo street",
  "Anime character enjoying a bowl of ramen",
  "A serene Japanese garden with a pagoda",
  "Gundam-style mech in a dynamic pose",
  "A ninja moving silently through the shadows",
  "Fantasy knight with a glowing sword",
  "Cyberpunk hacker in a high-tech hideout",
];

// --- DOM ELEMENTS ---
let promptInput: HTMLTextAreaElement,
  generateBtn: HTMLButtonElement,
  demoPromptsContainer: HTMLDivElement,
  historyGrid: HTMLDivElement,
  demoGrid: HTMLDivElement,
  demoHistoryGrid: HTMLDivElement,
  generationsGrid: HTMLDivElement,
  modal: HTMLDivElement,
  modalImage: HTMLImageElement,
  modalDownloadBtn: HTMLButtonElement,
  modalShareBtn: HTMLButtonElement,
  modalCloseBtn: HTMLButtonElement,
  themeToggle: HTMLButtonElement,
  historyPlaceholder: HTMLParagraphElement,
  demoHistoryPlaceholder: HTMLParagraphElement,
  generationsPlaceholder: HTMLParagraphElement,
  errorToast: HTMLDivElement,
  btnText: HTMLSpanElement,
  spinner: HTMLDivElement,
  aspectRatioSelector: HTMLDivElement,
  tabsContainer: HTMLDivElement;

function queryDOMElements() {
  promptInput = document.getElementById("prompt-input") as HTMLTextAreaElement;
  generateBtn = document.getElementById("generate-btn") as HTMLButtonElement;
  demoPromptsContainer = document.getElementById("demo-prompts") as HTMLDivElement;
  historyGrid = document.getElementById("history-grid") as HTMLDivElement;
  demoGrid = document.getElementById("demo-grid") as HTMLDivElement;
  demoHistoryGrid = document.getElementById("demo-history-grid") as HTMLDivElement;
  generationsGrid = document.getElementById("generations-grid") as HTMLDivElement;
  modal = document.getElementById("modal") as HTMLDivElement;
  modalImage = document.getElementById("modal-image") as HTMLImageElement;
  modalDownloadBtn = document.getElementById("modal-download") as HTMLButtonElement;
  modalShareBtn = document.getElementById("modal-share") as HTMLButtonElement;
  modalCloseBtn = document.getElementById("modal-close") as HTMLButtonElement;
  themeToggle = document.getElementById("theme-toggle") as HTMLButtonElement;
  historyPlaceholder = document.getElementById("history-placeholder") as HTMLParagraphElement;
  demoHistoryPlaceholder = document.getElementById("demo-history-placeholder") as HTMLParagraphElement;
  generationsPlaceholder = document.getElementById("generations-placeholder") as HTMLParagraphElement;
  errorToast = document.getElementById("error-toast") as HTMLDivElement;
  btnText = generateBtn.querySelector(".btn-text") as HTMLSpanElement;
  spinner = generateBtn.querySelector(".spinner") as HTMLDivElement;
  aspectRatioSelector = document.getElementById("aspect-ratio-selector") as HTMLDivElement;
  tabsContainer = document.querySelector(".tabs") as HTMLDivElement;
}


// --- API CALLS ---
async function generateWallpaper(prompt: string, aspectRatio: AspectRatio): Promise<string | null> {
  setLoading(true);
  try {
    const response = await ai.models.generateImages({
      model: "imagen-4.0-generate-001",
      prompt: `${prompt}, anime style, high resolution, wallpaper`,
      config: {
        numberOfImages: 1,
        outputMimeType: "image/jpeg",
        aspectRatio: aspectRatio,
      },
    });
    const base64Image = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64Image}`;
  } catch (error) {
    console.error("Error generating wallpaper:", error);
    showError("Failed to generate wallpaper. Please try again.");
    return null;
  } finally {
    setLoading(false);
  }
}


// --- UI RENDERING & UPDATES ---
function createWallpaperCard(wallpaper: Wallpaper, isLoading = false, showSourceTag = false): HTMLElement {
  const card = document.createElement("div");
  card.className = "wallpaper-card";
  card.dataset.id = wallpaper.id;
  card.dataset.aspectRatio = wallpaper.aspectRatio;
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");
  card.setAttribute("aria-label", `View wallpaper: ${wallpaper.prompt}`);

  if (isLoading) {
    const cardSpinner = document.createElement("div");
    cardSpinner.className = "spinner card-spinner";
    card.appendChild(cardSpinner);
  } else {
    const img = document.createElement("img");
    img.src = wallpaper.imageUrl;
    img.alt = wallpaper.prompt;
    img.loading = "lazy";
    card.appendChild(img);

    const overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.textContent = wallpaper.prompt;
    card.appendChild(overlay);

    if (showSourceTag) {
        const sourceTag = document.createElement('div');
        sourceTag.className = 'source-tag';
        sourceTag.textContent = wallpaper.source === 'user' ? 'User' : 'Demo';
        card.appendChild(sourceTag);
    }

    card.addEventListener("click", () => openModal(wallpaper));
    card.addEventListener("keydown", (e) => {
        if(e.key === 'Enter' || e.key === ' ') {
            openModal(wallpaper)
        }
    });
  }
  return card;
}

function renderHistory() {
  historyGrid.innerHTML = "";
  if (history.length > 0) {
    if (historyPlaceholder) historyPlaceholder.style.display = 'none';
    history.slice().reverse().forEach((wallpaper) => {
      const card = createWallpaperCard(wallpaper);
      historyGrid.appendChild(card);
    });
  } else {
     if (historyPlaceholder) historyPlaceholder.style.display = 'block';
  }
}

function renderDemoHistory() {
  demoHistoryGrid.innerHTML = "";
  if (demoHistory.length > 0) {
    if (demoHistoryPlaceholder) demoHistoryPlaceholder.style.display = 'none';
    demoHistory.slice().reverse().forEach((wallpaper) => {
      const card = createWallpaperCard(wallpaper);
      demoHistoryGrid.appendChild(card);
    });
  } else {
     if (demoHistoryPlaceholder) demoHistoryPlaceholder.style.display = 'block';
  }
}

function renderAllGenerations() {
  generationsGrid.innerHTML = "";
  if (allGenerations.length > 0) {
    if (generationsPlaceholder) generationsPlaceholder.style.display = 'none';
    allGenerations.slice().reverse().forEach((wallpaper) => {
      const card = createWallpaperCard(wallpaper, false, true);
      generationsGrid.appendChild(card);
    });
  } else {
     if (generationsPlaceholder) generationsPlaceholder.style.display = 'block';
  }
}


function renderDemoPrompts() {
  demoPromptsContainer.innerHTML = "";
  demoPrompts.forEach((prompt) => {
    const button = document.createElement("button");
    button.className = "demo-prompt-btn";
    button.textContent = prompt;
    button.addEventListener("click", () => handleDemoPromptClick(prompt));
    demoPromptsContainer.appendChild(button);
  });
}

function setLoading(isLoading: boolean) {
  if (isLoading) {
    generateBtn.disabled = true;
    btnText.style.display = "none";
    spinner.style.display = "block";
  } else {
    generateBtn.disabled = false;
    btnText.style.display = "inline";
    spinner.style.display = "none";
  }
}

function showError(message: string) {
    errorToast.textContent = message;
    errorToast.classList.add('show');
    setTimeout(() => {
        errorToast.classList.remove('show');
    }, 3000);
}


// --- EVENT HANDLERS & LOGIC ---
async function handleFormSubmit(event: Event) {
  event.preventDefault();
  const prompt = promptInput.value.trim();
  if (!prompt) return;

  const placeholderWallpaper: Wallpaper = { id: 'temp', prompt: '', imageUrl: '', aspectRatio: selectedAspectRatio, timestamp: 0, source: 'user' };
  const placeholderCard = createWallpaperCard(placeholderWallpaper, true);
  if (historyPlaceholder) historyPlaceholder.style.display = 'none';
  historyGrid.prepend(placeholderCard);
  
  const imageUrl = await generateWallpaper(prompt, selectedAspectRatio);
  placeholderCard.remove();
  
  if (imageUrl) {
    const newWallpaper: Wallpaper = {
      id: Date.now().toString(),
      prompt,
      imageUrl,
      aspectRatio: selectedAspectRatio,
      timestamp: Date.now(),
      source: 'user',
    };
    history.push(newWallpaper);
    allGenerations.push(newWallpaper);
    saveData();
    renderHistory();
    renderAllGenerations();
    promptInput.value = "";
  }
}

function handleDemoPromptClick(prompt: string) {
  promptInput.value = prompt;
  handleFormSubmit(new Event("submit"));
  refreshDemoPrompt(prompt);
}

function handleAspectRatioChange(event: Event) {
    const target = event.target as HTMLElement;
    const button = target.closest('.aspect-ratio-btn');
    if (!button) return;

    const ratio = button.getAttribute('data-ratio') as AspectRatio;
    if (ratio) {
        selectedAspectRatio = ratio;
        aspectRatioSelector.querySelectorAll('.aspect-ratio-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-checked', 'false');
        });
        button.classList.add('active');
        button.setAttribute('aria-checked', 'true');
    }
}

function handleTabClick(event: Event) {
    const target = event.target as HTMLButtonElement;
    if (!target.matches('.tab-btn')) return;

    const tabId = target.dataset.tab;

    tabsContainer.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    target.classList.add('active');

    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    document.getElementById(`${tabId}-panel`)?.classList.add('active');
}

function refreshDemoPrompt(usedPrompt: string) {
    const index = demoPrompts.indexOf(usedPrompt);
    if (index === -1) return;

    let newPrompt: string;
    do {
        newPrompt = PROMPT_POOL[Math.floor(Math.random() * PROMPT_POOL.length)];
    } while (demoPrompts.includes(newPrompt));

    demoPrompts[index] = newPrompt;
    renderDemoPrompts();
}


// --- MODAL LOGIC ---
function openModal(wallpaper: Wallpaper) {
  modalImage.src = wallpaper.imageUrl;
  modalImage.alt = wallpaper.prompt;
  modal.classList.add("visible");
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  const newDownloadBtn = modalDownloadBtn.cloneNode(true) as HTMLButtonElement;
  modalDownloadBtn.parentNode?.replaceChild(newDownloadBtn, modalDownloadBtn);
  modalDownloadBtn = newDownloadBtn;
  
  const newShareBtn = modalShareBtn.cloneNode(true) as HTMLButtonElement;
  modalShareBtn.parentNode?.replaceChild(newShareBtn, modalShareBtn);
  modalShareBtn = newShareBtn;

  modalDownloadBtn.onclick = () => downloadImage(wallpaper);
  modalShareBtn.onclick = () => shareImage(wallpaper);
}

function closeModal() {
  modal.classList.remove("visible");
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

async function downloadImage(wallpaper: Wallpaper) {
  const a = document.createElement("a");
  a.href = wallpaper.imageUrl;
  a.download = `${wallpaper.prompt.slice(0, 20).replace(/\s/g, '_')}.jpeg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function shareImage(wallpaper: Wallpaper) {
    try {
        const response = await fetch(wallpaper.imageUrl);
        const blob = await response.blob();
        const file = new File([blob], `${wallpaper.prompt.slice(0, 20)}.jpeg`, { type: 'image/jpeg' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: 'AI Anime Wallpaper',
                text: wallpaper.prompt,
            });
        } else {
            showError("Sharing is not supported on this browser.");
        }
    } catch (error) {
        console.error('Share failed:', error);
        showError("Couldn't share the image.");
    }
}


// --- THEME & LOCAL STORAGE ---
function applyTheme(theme: string) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
  const newTheme = currentTheme === "light" ? "dark" : "light";
  applyTheme(newTheme);
}

function loadData() {
  const savedHistory = localStorage.getItem("userHistory");
  const savedDemoHistory = localStorage.getItem("demoHistory");
  const savedAllGenerations = localStorage.getItem("allGenerations");

  if (savedHistory) history = JSON.parse(savedHistory);
  if (savedDemoHistory) demoHistory = JSON.parse(savedDemoHistory);
  if (savedAllGenerations) allGenerations = JSON.parse(savedAllGenerations);
}

function saveData() {
  localStorage.setItem("userHistory", JSON.stringify(history));
  localStorage.setItem("demoHistory", JSON.stringify(demoHistory));
  localStorage.setItem("allGenerations", JSON.stringify(allGenerations));
}


// --- INITIALIZATION ---
async function generateLiveDemos() {
    const demoCount = 4;
    const initialPrompts = [...PROMPT_POOL].sort(() => 0.5 - Math.random()).slice(0, demoCount);
    const demoAspectRatio: AspectRatio = '9:16';

    for(let i = 0; i < demoCount; i++) {
        const placeholder = createWallpaperCard({ id: `demo-${i}`, prompt: '', imageUrl: '', aspectRatio: demoAspectRatio, timestamp: 0, source: 'demo' }, true);
        demoGrid.appendChild(placeholder);
    }

    const promises = initialPrompts.map((prompt, i) => {
        return generateWallpaper(prompt, demoAspectRatio).then(imageUrl => {
            if(imageUrl) {
                const wallpaper: Wallpaper = { 
                    id: `demo-${Date.now()}-${i}`, 
                    prompt, 
                    imageUrl, 
                    aspectRatio: demoAspectRatio, 
                    timestamp: Date.now(),
                    source: 'demo'
                };
                return wallpaper;
            }
            return null;
        });
    });

    const results = (await Promise.all(promises)).filter(Boolean) as Wallpaper[];
    
    demoGrid.innerHTML = '';
    results.forEach(wallpaper => {
        demoGrid.appendChild(createWallpaperCard(wallpaper));
        demoHistory.push(wallpaper);
        allGenerations.push(wallpaper);
    });

    if (results.length > 0) {
      saveData();
      renderDemoHistory();
      renderAllGenerations();
    }
}

function initializeApp() {
  queryDOMElements();

  const savedTheme = localStorage.getItem("theme") || "dark";
  applyTheme(savedTheme);

  loadData();
  renderHistory();
  renderDemoHistory();
  renderAllGenerations();
  
  demoPrompts = [...PROMPT_POOL].sort(() => 0.5 - Math.random()).slice(0, 3);
  renderDemoPrompts();

  generateLiveDemos();

  // Setup event listeners
  document.getElementById("prompt-form")?.addEventListener("submit", handleFormSubmit);
  aspectRatioSelector.addEventListener("click", handleAspectRatioChange);
  tabsContainer.addEventListener('click', handleTabClick);
  themeToggle.addEventListener("click", toggleTheme);
  modalCloseBtn.addEventListener("click", closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('visible')) {
        closeModal();
    }
  });
}

document.addEventListener("DOMContentLoaded", initializeApp);