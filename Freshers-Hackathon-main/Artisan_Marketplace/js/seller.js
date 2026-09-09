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

// Simulated Voice Typing
function toggleVoiceInput(statusElemId) {
  const statusElem = document.getElementById(statusElemId);
  if (statusElem) {
    statusElem.innerText = "Listening... Speak your product description now.";
    setTimeout(() => {
      statusElem.innerText = "Captured: Handcrafted using organic regional clays.";
    }, 2500);
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