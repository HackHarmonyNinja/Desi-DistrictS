// Open and Close Glassmorphism Modals
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('open');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('open');
}

// Switch between Studio Home, Feed, Finance, and Profile panels
function showSellerTab(tabId) {
  const tabs = document.querySelectorAll('.seller-tab-content');
  tabs.forEach(tab => tab.classList.remove('active-tab'));

  const activeTab = document.getElementById(tabId);
  if (activeTab) activeTab.classList.add('active-tab');
}

// Adjust Listing Quantity (+ / -)
function adjustQty(elementId, delta) {
  const qtyElem = document.getElementById(elementId);
  if (qtyElem) {
    let currentQty = parseInt(qtyElem.innerText) || 0;
    currentQty = Math.max(0, currentQty + delta);
    qtyElem.innerText = currentQty;
  }
}

// Delete Listing
function deleteListing(listingId) {
  const item = document.getElementById(listingId);
  if (item && confirm("Are you sure you want to delete this product listing?")) {
    item.remove();
  }
}

// Pronunciation Bot (Text-to-Speech)
function readFinancialSummary() {
  const textToRead = "Your total monthly revenue is 84,500 Rupees with a net profit margin of 73.5%. You have completed 142 orders this month.";
  if ('speechSynthesis' in window) {
    const speech = new SpeechSynthesisUtterance(textToRead);
    speech.rate = 0.9;
    window.speechSynthesis.speak(speech);
  } else {
    alert("Speech synthesis is not supported on this browser.");
  }
}

// Post Order to Feed Panel
function postOrderToFeed(itemTitle) {
  alert(`Successfully shared item "${itemTitle}" to Community Feed!`);
  closeModal('ordersModal');
  showSellerTab('feedTab');
}

// Form Submission Alert Helper
function handleFormSubmit(event, successMessage) {
  event.preventDefault();
  alert(successMessage);
  const openModals = document.querySelectorAll('.modal-overlay.open');
  openModals.forEach(m => m.classList.remove('open'));
}

// --- ACTUAL VOICE TYPING & API INTEGRATION ---
let mediaRecorder;
let audioChunks = [];

async function toggleVoiceInput(statusElemId, descriptionInputId) {
  const statusElem = document.getElementById(statusElemId);
  const descriptionInput = document.getElementById(descriptionInputId);

  if (!mediaRecorder || mediaRecorder.state === 'inactive') {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        if (statusElem) statusElem.innerText = "Processing audio with AI... Please wait.";
        
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result;
          
          try {
            const response = await fetch('http://localhost:5050/api/ai/catalog-product', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                audioData: base64Audio, 
                language: 'auto' 
              })
            });
            
            const data = await response.json();
            
            if (data.success && data.catalog) {
              if (statusElem) statusElem.innerText = "AI generated description successfully!";
              if (descriptionInput) {
                descriptionInput.value = data.catalog.descriptionEn; 
              }
            } else {
              if (statusElem) statusElem.innerText = "Failed to process audio.";
            }
          } catch(e) {
            console.error(e);
            if (statusElem) statusElem.innerText = "Error connecting to server.";
          }
        };
      };

      mediaRecorder.start();
      if (statusElem) statusElem.innerText = "🔴 Listening... Click mic again to stop.";

    } catch (err) {
      console.error("Mic error:", err);
      if (statusElem) statusElem.innerText = "Microphone access denied or not found.";
    }
  } 
  else if (mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
}

// --- IMAGE UPLOAD & PREVIEW INTEGRATION ---
let currentProductImageBase64 = null;

function handleImageSelect(event, previewImgId) {
  const file = event.target.files[0];
  
  if (file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const base64String = e.target.result;
      currentProductImageBase64 = base64String;
      
      const previewImg = document.getElementById(previewImgId);
      if (previewImg) {
        previewImg.src = base64String;
        previewImg.style.display = 'block';
      }
    };
    
    reader.readAsDataURL(file);
  }
}

async function removeImageBackground(previewImgId) {
  if (!currentProductImageBase64) {
      alert("Please select an image first!");
      return;
  }
  
  try {
      const response = await fetch('http://localhost:5050/api/ai/remove-background', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData: currentProductImageBase64 })
      });
      
      const data = await response.json();
      
      if (data.success) {
          currentProductImageBase64 = data.imageData;
          const previewImg = document.getElementById(previewImgId);
          if (previewImg) previewImg.src = data.imageData;
      } else {
          alert("Failed to remove background: " + data.message);
      }
  } catch (err) {
      console.error(err);
      alert("Error connecting to background removal service.");
  }
}
